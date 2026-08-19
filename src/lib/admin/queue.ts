import "server-only";

import * as appwriteModerate from "@/lib/appwrite/moderate";
import { isAppwriteConfigured } from "@/lib/appwrite/server";
import { getServerSupabase } from "@/lib/supabase/server-client";
import type { ReportReason } from "@/lib/spots/reports";

/**
 * The moderation queue, straight out of `admin_spot_queue()`.
 *
 * Aggregation happens in Postgres so report rows never leave the
 * database — the dashboard needs "how many, and what kind", not who.
 */

export type QueueState = "visible" | "hidden" | "removed";

export type QueueEntry = {
  slug: string;
  name: string;
  region: string;
  country: string;
  state: QueueState;
  addedAt: string;
  hiddenAt: string | null;
  hiddenReason: string | null;
  reportCount: number;
  lastReportAt: string | null;
  reasons: ReportReason[];
  /** True when the report threshold hid this rather than a person. */
  autoHidden: boolean;
};

type QueueRow = {
  slug: string;
  name: string;
  region: string;
  country: string;
  created_at: string;
  hidden_at: string | null;
  hidden_reason: string | null;
  removed_at: string | null;
  report_count: number | string;
  last_report_at: string | null;
  reasons: string[] | null;
};

function toEntry(row: QueueRow): QueueEntry {
  const state: QueueState = row.removed_at
    ? "removed"
    : row.hidden_at
      ? "hidden"
      : "visible";

  return {
    slug: row.slug,
    name: row.name,
    region: row.region,
    country: row.country,
    state,
    addedAt: row.created_at,
    hiddenAt: row.hidden_at,
    hiddenReason: row.hidden_reason,
    // count(*) is bigint, which arrives as a string.
    reportCount: Number(row.report_count),
    lastReportAt: row.last_report_at,
    reasons: (row.reasons ?? []) as ReportReason[],
    autoHidden: Boolean(row.hidden_reason?.startsWith("auto-hidden")),
  };
}

export type QueueResult =
  { ok: true; entries: QueueEntry[] } | { ok: false; message: string };

export async function readQueue(secret?: string): Promise<QueueResult> {
  if (isAppwriteConfigured) {
    if (!secret) {
      return { ok: false, message: "no admin session." };
    }
    try {
      // Read as the admin, not on the API key: hidden rows carry
      // read("team:admins"), so Appwrite decides per row what comes back.
      // A membership check that was somehow wrong yields an empty queue
      // rather than a full one.
      const entries = await appwriteModerate.readQueue(secret);
      return {
        ok: true,
        entries: entries.map((entry) => ({
          slug: entry.slug,
          name: entry.name,
          region: entry.region,
          country: entry.country,
          state: entry.state,
          addedAt: entry.addedAt,
          hiddenAt: entry.state === "visible" ? null : entry.addedAt,
          hiddenReason: entry.hiddenReason,
          reportCount: entry.reportCount,
          lastReportAt: null,
          reasons: [],
          autoHidden: entry.autoHidden,
        })),
      };
    } catch (thrown) {
      console.error("[admin] appwrite queue failed", thrown);
      return { ok: false, message: "couldn't load the queue." };
    }
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      ok: false,
      message: "no database credentials in this environment.",
    };
  }

  try {
    const { data, error } = await supabase.rpc("admin_spot_queue");

    if (error) {
      console.error("[admin] queue query failed", error);
      // 42501 is the function's own authorisation check firing. Reaching
      // it means the page guard let through someone Postgres won't, which
      // is worth saying plainly rather than rendering an empty queue — an
      // empty moderation queue reads as "nothing to do".
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "the database refused this account. it is not an admin."
            : "couldn't load the queue.",
      };
    }

    return { ok: true, entries: (data as QueueRow[]).map(toEntry) };
  } catch (thrown) {
    console.error("[admin] queue query threw", thrown);
    return { ok: false, message: "couldn't reach the database." };
  }
}

/* ------------------------------------------------------------ notes -- */

export type NoteEntry = {
  id: string;
  spotSlug: string;
  spotName: string;
  author: string;
  body: string;
  notedOn: string;
  createdAt: string;
  hidden: boolean;
};

type NoteRow = {
  id: string;
  spot_slug: string;
  spot_name: string;
  author: string;
  body: string;
  noted_on: string;
  created_at: string;
  hidden_at: string | null;
};

export type NoteQueueResult =
  { ok: true; entries: NoteEntry[] } | { ok: false; message: string };

/**
 * Recent community notes, newest first, hidden ones included.
 *
 * No report threshold pushes a note upward the way it does a spot, so
 * recency is the only useful order: what a moderator wants is "what
 * arrived since I last looked".
 */
export async function readNoteQueue(secret?: string): Promise<NoteQueueResult> {
  if (isAppwriteConfigured) {
    if (!secret) return { ok: false, message: "no admin session." };
    try {
      const entries = await appwriteModerate.readNoteQueue(secret);
      return {
        ok: true,
        entries: entries.map((note) => ({
          id: note.id,
          spotSlug: note.spotSlug,
          spotName: note.spotName,
          author: note.author,
          body: note.body,
          notedOn: note.notedOn,
          createdAt: note.notedOn,
          hidden: note.hidden,
        })),
      };
    } catch (thrown) {
      console.error("[admin] appwrite note queue failed", thrown);
      return { ok: false, message: "couldn't load the notes." };
    }
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return { ok: false, message: "no database connection." };
  }

  try {
    const { data, error } = await supabase.rpc("admin_note_queue");

    if (error) {
      console.error("[admin] note queue failed", error);
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "the database refused this account. it is not an admin."
            : "couldn't load the notes.",
      };
    }

    return {
      ok: true,
      entries: (data as NoteRow[]).map((row) => ({
        id: row.id,
        spotSlug: row.spot_slug,
        spotName: row.spot_name,
        author: row.author,
        body: row.body,
        notedOn: row.noted_on,
        createdAt: row.created_at,
        hidden: row.hidden_at !== null,
      })),
    };
  } catch (thrown) {
    console.error("[admin] note queue threw", thrown);
    return { ok: false, message: "couldn't reach the database." };
  }
}

/** Recent moderation decisions, newest first. */
export type LogEntry = {
  id: string;
  action: "hide" | "restore" | "remove";
  reason: string | null;
  actor: string | null;
  at: string;
  slug: string;
};

export type LogResult =
  { ok: true; entries: LogEntry[] } | { ok: false; message: string };

/**
 * An empty log and a failed query are not the same thing, and this is the
 * one place on the site where confusing them matters: "no decisions
 * recorded" is a claim about moderation history, and printing it because
 * a join broke would be a lie about the audit trail.
 */
export async function readLog(limit = 20, secret?: string): Promise<LogResult> {
  if (isAppwriteConfigured) {
    if (!secret) return { ok: false, message: "no admin session." };
    try {
      const entries = await appwriteModerate.readLog(secret);
      return {
        ok: true,
        entries: entries.slice(0, limit).map((row) => ({
          id: row.id,
          action: row.action as LogEntry["action"],
          reason: row.reason,
          actor: row.actor,
          at: row.at,
          slug: row.isNote ? `${row.slug} (note)` : row.slug,
        })),
      };
    } catch (thrown) {
      console.error("[admin] appwrite log failed", thrown);
      return { ok: false, message: "couldn't read the log." };
    }
  }

  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, message: "no database connection." };

  try {
    const { data, error } = await supabase
      .from("moderation_log")
      .select(
        "id, action, reason, created_at, spots ( slug ), admins ( email )",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      if (error) console.error("[admin] log query failed", error);
      return { ok: false, message: "couldn't read the log." };
    }

    // `actor_id` is nullable, so PostgREST embeds `admins` as a left join
    // and the key comes back null for anything not attributed to a person.
    // Handled rather than assumed away.
    const entries = (data as unknown as Array<Record<string, unknown>>).map(
      (row) => ({
        id: row.id as string,
        action: row.action as LogEntry["action"],
        reason: (row.reason as string | null) ?? null,
        actor: (row.admins as { email?: string } | null)?.email ?? null,
        at: row.created_at as string,
        slug: (row.spots as { slug?: string } | null)?.slug ?? "—",
      }),
    );

    return { ok: true, entries };
  } catch (thrown) {
    console.error("[admin] log query threw", thrown);
    return { ok: false, message: "couldn't reach the database." };
  }
}
