import "server-only";

import { ID, Query } from "node-appwrite";

import { notePermissions, spotPermissions } from "@/lib/appwrite/permissions";
import { DATABASE_ID, REPORT_THRESHOLD, TABLES } from "@/lib/appwrite/schema";
import { adminTables } from "@/lib/appwrite/server";
import { toSlug } from "@/lib/spots/slug";
import type { SpotDraft } from "@/lib/types/spot";

/**
 * Every write the public can cause.
 *
 * All of it runs on the API key, because no row grants create, update or
 * delete to anyone — a browser cannot write to this database at all.
 * Every write therefore has to come through a route handler, which is
 * what keeps Turnstile, the rate limiter and the validator on the only
 * path in.
 */

type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

function conflict(error: unknown): boolean {
  return (error as { code?: number })?.code === 409;
}

/**
 * A slug nobody else holds.
 *
 * The approach is to *let the insert fail*: the unique index on `slug` is
 * the arbiter, and a 409 means someone took the name between our check
 * and our write. Querying first for a free slug and then trusting the
 * answer is the racy version of this, not the safe one — there is no way
 * to hold the gap open, so the only reliable check is the one the
 * database performs as part of the write itself.
 */
async function insertWithUniqueSlug(
  base: string,
  build: (slug: string) => Record<string, unknown>,
  permissions: string[],
): Promise<Result<{ id: string; slug: string }>> {
  const tables = adminTables();
  if (!tables) return { ok: false, reason: "no database connection" };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    // First try the clean slug, then -2, -3, … which reads better than a
    // random suffix on a URL someone is going to share.
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      const row = await tables.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.spots,
        rowId: ID.unique(),
        data: build(slug),
        permissions,
      });
      return { ok: true, value: { id: (row as { $id: string }).$id, slug } };
    } catch (error) {
      if (!conflict(error)) throw error;
    }
  }
  return { ok: false, reason: "could not find a free slug" };
}

export async function createSpot(
  draft: SpotDraft,
  submitterKey: string,
  photos: { src: string; alt: string }[] = [],
): Promise<Result<{ slug: string }>> {
  const tables = adminTables();
  if (!tables) return { ok: false, reason: "no database connection" };

  const inserted = await insertWithUniqueSlug(
    toSlug(draft.name),
    (slug) => ({
      slug,
      name: draft.name,
      region: draft.region,
      country: draft.country,
      lat: draft.lat,
      lng: draft.lng,
      // [longitude, latitude] — Appwrite's order, and the reverse of how
      // people say it. Swapped, this puts the spot in the wrong
      // hemisphere and nothing complains.
      location: [draft.lng, draft.lat],
      category: draft.category,
      difficulty: draft.difficulty,
      access: draft.access,
      summary: draft.summary,
      description: draft.description,
      watchOut: draft.watchOut,
      bestWindow: "",
      walkInKm: 0,
      photos: JSON.stringify(photos),
      reportCount: 0,
    }),
    // Live on arrival: submissions publish immediately, per the product
    // decision. Nothing waits in a queue.
    spotPermissions(true),
  );

  if (!inserted.ok) return inserted;

  // Audit trail and the rate limiter's source of truth, linked to the
  // spot so one key's whole output can be found in a single query.
  await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.submissionLog,
    rowId: ID.unique(),
    data: { submitterKey, spotId: inserted.value.id },
  });

  return { ok: true, value: { slug: inserted.value.slug } };
}

/** The row a note is being attached to, or null if it is not public. */
async function visibleSpotBySlug(slug: string) {
  const tables = adminTables();
  if (!tables) return null;

  const { rows } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
    queries: [Query.equal("slug", slug), Query.limit(1)],
  });

  const row = rows[0] as
    | { $id: string; hiddenAt?: string | null; removedAt?: string | null }
    | undefined;
  if (!row) return null;
  // An entry pulled down by reports should not keep collecting notes
  // while it is under review.
  if (row.hiddenAt || row.removedAt) return null;
  return row;
}

export async function createNote(
  slug: string,
  note: { author: string; body: string; notedOn: string },
  submitterKey: string,
  photoIds: string[] = [],
): Promise<Result<{ id: string; author: string; body: string; date: string }>> {
  const tables = adminTables();
  if (!tables) return { ok: false, reason: "no database connection" };

  const spot = await visibleSpotBySlug(slug);
  if (!spot) return { ok: false, reason: "no such spot" };

  // Cast after the call, not inline: createRow is generic over the row
  // shape and infers it from an inline assertion, which then rejects
  // every data key that assertion does not mention.
  const created = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.notes,
    rowId: ID.unique(),
    data: {
      spotId: spot.$id,
      author: note.author,
      body: note.body,
      notedOn: new Date(`${note.notedOn}T12:00:00Z`).toISOString(),
      photos: JSON.stringify(photoIds),
    },
    // The parent is visible — checked above — so the note is too.
    permissions: notePermissions(true, true),
  });
  const row = created as { $id: string };

  await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.noteLog,
    rowId: ID.unique(),
    data: { submitterKey, noteId: row.$id },
  });

  return {
    ok: true,
    value: {
      id: row.$id,
      author: note.author,
      body: note.body,
      date: note.notedOn,
    },
  };
}

/**
 * Record a report and hide the spot if enough distinct people have now
 * reported it.
 *
 * The threshold is enforced in application code, not by the database, so
 * it holds only because there is exactly one way to write a report: this
 * module, on the API key, reached through one route handler. Every other
 * path is refused by Appwrite outright. Worth stating plainly because a
 * database-side trigger would have been stronger — it would fire however
 * the row arrived — and this does not have that property.
 *
 * The count-then-hide is not atomic with the insert, and deliberately so:
 * a read cannot be staged into a transaction. Two simultaneous tenth
 * reports would both count 10 and both hide the spot, which is
 * idempotent. The transaction covers the part that must not tear — the
 * timestamp, the permissions and the count moving together.
 */
export async function reportSpot(
  slug: string,
  reason: string,
  detail: string | null,
  reporterKey: string,
): Promise<Result<{ hidden: boolean }>> {
  const tables = adminTables();
  if (!tables) return { ok: false, reason: "no database connection" };

  const { rows } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
    queries: [Query.equal("slug", slug), Query.limit(1)],
  });
  const spot = rows[0] as
    | { $id: string; hiddenAt?: string | null; removedAt?: string | null }
    | undefined;
  if (!spot) return { ok: false, reason: "no such spot" };

  try {
    await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.reports,
      rowId: ID.unique(),
      data: { spotId: spot.$id, reason, detail: detail || null, reporterKey },
    });
  } catch (error) {
    // The unique index on (spotId, reporterKey) fired: this person has
    // already reported this spot. Answered as success on purpose — the
    // outcome they wanted is already true, and saying "you already
    // reported this" confirms the key is stable and invites probing.
    if (!conflict(error)) throw error;
    return { ok: true, value: { hidden: Boolean(spot.hiddenAt) } };
  }

  const { total } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.reports,
    queries: [Query.equal("spotId", spot.$id), Query.limit(1)],
  });
  const reporters = total ?? 0;

  const shouldHide = reporters >= REPORT_THRESHOLD && !spot.hiddenAt;

  if (!shouldHide) {
    // Keep the denormalised count honest even when nothing else changes;
    // the moderation queue orders by it.
    await tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.spots,
      rowId: spot.$id,
      data: { reportCount: reporters },
    });
    return { ok: true, value: { hidden: Boolean(spot.hiddenAt) } };
  }

  await hideSpotRow(spot.$id, reporters);
  return { ok: true, value: { hidden: true } };
}

/**
 * Hide a spot and everything that hangs off it, in one transaction.
 *
 * The transaction is the whole point. `hiddenAt` is the data and
 * `$permissions` is the enforcement, and a run that set one without the
 * other would leave an entry the site calls hidden and Appwrite still
 * serves. Notes cascade for the same reason: an ACL cannot say "public
 * while the parent is visible", so hiding a parent has to rewrite its
 * children.
 */
async function hideSpotRow(spotId: string, reporters: number): Promise<void> {
  const tables = adminTables();
  if (!tables) return;

  const { rows: noteRows } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.notes,
    queries: [Query.equal("spotId", spotId), Query.limit(500)],
  });

  const transaction = (await tables.createTransaction({})) as { $id: string };

  try {
    const hidden = spotPermissions(false);
    // Staged with `updateRow` / `createRow` carrying the transaction id
    // rather than with `createOperations`. The latter has no permissions
    // field — its operations are typed as a bare `object[]`, so the ones
    // written here were accepted by TypeScript and refused by Appwrite,
    // which meant the report threshold could not actually take anything
    // down. See the note on runTransaction in moderate.ts.
    await Promise.all([
      tables.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.spots,
        rowId: spotId,
        data: {
          hiddenAt: new Date().toISOString(),
          hiddenReason: `auto-hidden at ${reporters} reports`,
          reportCount: reporters,
        },
        permissions: hidden,
        transactionId: transaction.$id,
      }),
      ...(noteRows as Array<{ $id: string }>).map((note) =>
        tables.updateRow({
          databaseId: DATABASE_ID,
          tableId: TABLES.notes,
          rowId: note.$id,
          permissions: hidden,
          transactionId: transaction.$id,
        }),
      ),
      tables.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.moderationLog,
        rowId: ID.unique(),
        data: {
          spotId,
          action: "hide",
          reason: `auto-hidden at ${reporters} reports`,
          // No actor, because no person decided this. The admin screen
          // reads the absence and says so, rather than attributing an
          // automatic hide to whoever happens to be looking.
          actorId: null,
          actorEmail: null,
        },
        transactionId: transaction.$id,
      }),
    ]);
    await tables.updateTransaction({
      transactionId: transaction.$id,
      commit: true,
    });
  } catch (error) {
    await tables
      .updateTransaction({ transactionId: transaction.$id, rollback: true })
      .catch(() => {});
    throw error;
  }
}

/** Rows written by one key inside a window — the rate limiter's counter. */
/** Records an uploaded file against the key that sent it. */
export async function logPhoto(
  fileId: string,
  submitterKey: string,
): Promise<void> {
  const tables = adminTables();
  if (!tables) return;
  await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.photoLog,
    rowId: ID.unique(),
    data: { fileId, submitterKey },
  });
}

export async function countRecentWrites(
  table: "submission_log" | "note_log" | "photo_log",
  submitterKey: string,
  windowMinutes: number,
): Promise<number | null> {
  const tables = adminTables();
  if (!tables) return null;

  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { total } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: table,
    queries: [
      Query.equal("submitterKey", submitterKey),
      Query.greaterThan("$createdAt", since),
      Query.limit(1),
    ],
  });
  return total ?? 0;
}
