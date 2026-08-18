import "server-only";

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

export async function readQueue(): Promise<QueueResult> {
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
export async function readLog(limit = 20): Promise<LogResult> {
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
