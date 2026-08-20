import "server-only";

import { ID, Query, TablesDB } from "node-appwrite";

import { adminSessionClient } from "@/lib/appwrite/auth";
import { notePermissions, spotPermissions } from "@/lib/appwrite/permissions";
import { DATABASE_ID, TABLES } from "@/lib/appwrite/schema";
import { adminTables } from "@/lib/appwrite/server";

/**
 * The moderation queue and the actions on it.
 *
 * Reads go through the *signed-in admin's* session, not the API key, so
 * that the database is the thing deciding: a hidden row carries
 * read("team:admins"), and Appwrite works out per row whether this person
 * sees it. If the membership check in readAdminGate were somehow wrong,
 * the queue would come back empty rather than full — the failure lands on
 * the safe side without our code having to be right twice.
 *
 * Writes go through the API key, because no row grants update to anyone —
 * and every one of them runs inside a transaction that moves the data and
 * the permissions together.
 */

export type QueueState = "visible" | "hidden" | "removed";

export type QueueEntry = {
  id: string;
  slug: string;
  name: string;
  region: string;
  country: string;
  state: QueueState;
  addedAt: string;
  hiddenReason: string | null;
  reportCount: number;
  autoHidden: boolean;
};

export type NoteEntry = {
  id: string;
  spotId: string;
  spotSlug: string;
  spotName: string;
  author: string;
  body: string;
  notedOn: string;
  hidden: boolean;
};

type Row = Record<string, unknown> & { $id: string; $createdAt: string };

function stateOf(row: Row): QueueState {
  if (row.removedAt) return "removed";
  if (row.hiddenAt) return "hidden";
  return "visible";
}

export async function readQueue(secret: string): Promise<QueueEntry[]> {
  const client = adminSessionClient(secret);
  if (!client) return [];

  const { rows } = await new TablesDB(client).listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
    queries: [Query.limit(500)],
  });

  return (rows as unknown as Row[])
    .map((row) => ({
      id: row.$id,
      slug: String(row.slug),
      name: String(row.name),
      region: String(row.region),
      country: String(row.country),
      state: stateOf(row),
      addedAt: row.$createdAt,
      hiddenReason: (row.hiddenReason as string | null) ?? null,
      reportCount: Number(row.reportCount ?? 0),
      autoHidden: String(row.hiddenReason ?? "").startsWith("auto-hidden"),
    }))
    .sort((a, b) => {
      // Everything needing a decision first, then everything else. A spot
      // with one report is not urgent but is exactly what you want to see
      // before it becomes ten.
      const urgent = (e: QueueEntry) => (e.state === "hidden" ? 1 : 0);
      return (
        urgent(b) - urgent(a) ||
        b.reportCount - a.reportCount ||
        b.addedAt.localeCompare(a.addedAt)
      );
    });
}

export async function readNoteQueue(secret: string): Promise<NoteEntry[]> {
  const client = adminSessionClient(secret);
  if (!client) return [];
  const tables = new TablesDB(client);

  const [{ rows: noteRows }, { rows: spotRows }] = await Promise.all([
    tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.notes,
      queries: [Query.orderDesc("$createdAt"), Query.limit(200)],
    }),
    tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.spots,
      queries: [Query.limit(500)],
    }),
  ]);

  const spots = new Map(
    (spotRows as unknown as Row[]).map((row) => [
      row.$id,
      { slug: String(row.slug), name: String(row.name) },
    ]),
  );

  return (noteRows as unknown as Row[]).map((row) => {
    const parent = spots.get(String(row.spotId));
    return {
      id: row.$id,
      spotId: String(row.spotId),
      spotSlug: parent?.slug ?? "—",
      spotName: parent?.name ?? "unknown spot",
      author: String(row.author ?? "anonymous"),
      body: String(row.body ?? ""),
      notedOn: String(row.notedOn ?? "").slice(0, 10),
      hidden: Boolean(row.hiddenAt),
    };
  });
}

export type LogEntry = {
  id: string;
  action: string;
  reason: string | null;
  actor: string | null;
  at: string;
  slug: string;
  isNote: boolean;
};

export async function readLog(secret: string): Promise<LogEntry[]> {
  const client = adminSessionClient(secret);
  if (!client) return [];
  const tables = new TablesDB(client);

  const [{ rows }, { rows: spotRows }] = await Promise.all([
    tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.moderationLog,
      queries: [Query.orderDesc("$createdAt"), Query.limit(30)],
    }),
    tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.spots,
      queries: [Query.limit(500)],
    }),
  ]);

  const slugs = new Map(
    (spotRows as unknown as Row[]).map((row) => [row.$id, String(row.slug)]),
  );

  return (rows as unknown as Row[]).map((row) => ({
    id: row.$id,
    action: String(row.action),
    reason: (row.reason as string | null) ?? null,
    // Null for the automatic hides, which is the honest answer: nobody
    // decided them.
    actor: (row.actorEmail as string | null) ?? null,
    at: row.$createdAt,
    slug: slugs.get(String(row.spotId)) ?? "—",
    isNote: Boolean(row.noteId),
  }));
}

/* --------------------------------------------------------- actions -- */

export type ModerationAction = "hide" | "restore" | "remove";

/**
 * Change a spot's visibility.
 *
 * One transaction covers the timestamps, the row's permissions, every
 * note's permissions and the audit row. Splitting any of it apart leaves
 * an entry whose data and enforcement disagree, which is the single
 * failure this design has to defend against: a spot marked hidden that
 * the public can still read.
 *
 * `restore` clears both timestamps. A moderator thinks in terms of "put
 * it back", not "which of the two is set", and leaving one would silently
 * no-op from their point of view.
 */
export async function moderateSpot(
  slug: string,
  action: ModerationAction,
  reason: string | null,
  actor: { id: string; email: string },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const tables = adminTables();
  if (!tables) return { ok: false, reason: "no database connection" };

  const { rows } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
    queries: [Query.equal("slug", slug), Query.limit(1)],
  });
  const spot = rows[0] as Row | undefined;
  if (!spot) return { ok: false, reason: "no such spot" };

  const now = new Date().toISOString();
  const data =
    action === "hide"
      ? {
          hiddenAt: now,
          hiddenReason: reason?.trim() || "hidden by an admin",
          removedAt: null,
        }
      : action === "restore"
        ? { hiddenAt: null, hiddenReason: null, removedAt: null }
        : {
            removedAt: now,
            hiddenAt: (spot.hiddenAt as string | null) ?? now,
            hiddenReason:
              reason?.trim() ||
              (spot.hiddenReason as string | null) ||
              "removed by an admin",
          };

  const visible = action === "restore";

  const { rows: noteRows } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.notes,
    queries: [Query.equal("spotId", spot.$id), Query.limit(500)],
  });

  return runTransaction(tables, [
    {
      action: "update",
      databaseId: DATABASE_ID,
      tableId: TABLES.spots,
      rowId: spot.$id,
      data,
      permissions: spotPermissions(visible),
    },
    // Cascade. An ACL cannot say "public while the parent is visible", so
    // a restored spot's own hidden notes must stay hidden while the rest
    // come back with it.
    ...(noteRows as unknown as Row[]).map((note) => ({
      action: "update",
      databaseId: DATABASE_ID,
      tableId: TABLES.notes,
      rowId: note.$id,
      permissions: notePermissions(!note.hiddenAt, visible),
    })),
    {
      action: "create",
      databaseId: DATABASE_ID,
      tableId: TABLES.moderationLog,
      rowId: ID.unique(),
      data: {
        spotId: spot.$id,
        action,
        reason: reason?.trim() || null,
        actorId: actor.id,
        actorEmail: actor.email,
      },
    },
  ]);
}

/**
 * Hide or restore one note.
 *
 * No `remove`: that tier exists for spots because a takedown at a
 * landowner's request is worth distinguishing from a reversible hide, and
 * a note is two sentences.
 */
export async function moderateNote(
  noteId: string,
  action: "hide" | "restore",
  reason: string | null,
  actor: { id: string; email: string },
): Promise<{ ok: true; slug: string } | { ok: false; reason: string }> {
  const tables = adminTables();
  if (!tables) return { ok: false, reason: "no database connection" };

  let note: Row;
  try {
    note = (await tables.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.notes,
      rowId: noteId,
    })) as unknown as Row;
  } catch {
    return { ok: false, reason: "no such note" };
  }

  const { rows } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
    queries: [Query.equal("$id", String(note.spotId)), Query.limit(1)],
  });
  const parent = rows[0] as Row | undefined;
  if (!parent) return { ok: false, reason: "the note has no spot" };

  const parentVisible = !parent.hiddenAt && !parent.removedAt;
  const noteVisible = action === "restore";

  const result = await runTransaction(tables, [
    {
      action: "update",
      databaseId: DATABASE_ID,
      tableId: TABLES.notes,
      rowId: noteId,
      data: { hiddenAt: noteVisible ? null : new Date().toISOString() },
      // Restoring a note on a hidden spot must not make it public. The
      // parent decides the ceiling.
      permissions: notePermissions(noteVisible, parentVisible),
    },
    {
      action: "create",
      databaseId: DATABASE_ID,
      tableId: TABLES.moderationLog,
      rowId: ID.unique(),
      data: {
        spotId: parent.$id,
        noteId,
        action,
        reason: reason?.trim() || null,
        actorId: actor.id,
        actorEmail: actor.email,
      },
    },
  ]);

  if (!result.ok) return result;
  return { ok: true, slug: String(parent.slug) };
}

async function runTransaction(
  tables: ReturnType<typeof adminTables>,
  operations: object[],
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!tables) return { ok: false, reason: "no database connection" };

  const transaction = (await tables.createTransaction({})) as { $id: string };
  try {
    await tables.createOperations({
      transactionId: transaction.$id,
      operations,
    });
    await tables.updateTransaction({
      transactionId: transaction.$id,
      commit: true,
    });
    return { ok: true };
  } catch (error) {
    await tables
      .updateTransaction({ transactionId: transaction.$id, rollback: true })
      .catch(() => {});
    console.error("[moderate] transaction failed", error);
    return { ok: false, reason: "could not apply that" };
  }
}
