import "server-only";

import * as moderate from "@/lib/appwrite/moderate";
import type { ReportDetail } from "@/lib/spots/reports";

/**
 * What the moderation screen reads.
 *
 * Every query here runs through the **signed-in admin's session**, not
 * the API key. Hidden rows carry `read("team:admins")`, so Appwrite
 * decides per row what comes back — a membership check that was somehow
 * wrong yields an empty queue rather than a full one. That is the piece
 * of the old row-level-security design worth having kept.
 */

export type QueueState = moderate.QueueState;

export type QueueEntry = {
  slug: string;
  name: string;
  region?: string;
  country?: string;
  state: QueueState;
  addedAt: string;
  hiddenReason: string | null;
  reportCount: number;
  /** Why it was reported. Never who by — see moderate.readReports. */
  reports: ReportDetail[];
  autoHidden: boolean;
};

export type NoteEntry = {
  id: string;
  spotSlug: string;
  spotName: string;
  author: string;
  body: string;
  notedOn: string;
  hidden: boolean;
  /** Why it was reported. Never who by. */
  reports: ReportDetail[];
};

export type LogEntry = {
  id: string;
  action: "hide" | "restore" | "remove";
  reason: string | null;
  actor: string | null;
  at: string;
  slug: string;
};

type Result<T> = { ok: true; entries: T[] } | { ok: false; message: string };

/** One place to decide what a failed admin read looks like. */
async function read<T>(
  what: string,
  secret: string | undefined,
  run: (secret: string) => Promise<T[]>,
): Promise<Result<T>> {
  if (!secret) return { ok: false, message: "no admin session." };
  try {
    return { ok: true, entries: await run(secret) };
  } catch (error) {
    console.error(`[admin] could not read ${what}`, error);
    // 401 means the database refused this account — worth saying plainly
    // rather than rendering an empty queue, which reads as "all clear".
    return {
      ok: false,
      message:
        (error as { code?: number }).code === 401
          ? "the database refused this account. it is not an admin."
          : `couldn't load ${what}.`,
    };
  }
}

export function readQueue(secret?: string): Promise<Result<QueueEntry>> {
  return read("the queue", secret, async (session) => {
    const entries = await moderate.readQueue(session);

    // Only for spots that have been reported at all — most have not, and
    // there is no reason to ask the reports table about them.
    const reported = entries.filter((e) => e.reportCount > 0).map((e) => e.id);
    const reports = await moderate.readReports(session, reported);

    return entries.map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      ...(entry.region ? { region: String(entry.region) } : {}),
      ...(entry.country ? { country: String(entry.country) } : {}),
      state: entry.state,
      addedAt: entry.addedAt,
      hiddenReason: entry.hiddenReason,
      reportCount: entry.reportCount,
      // What was reported, never who reported it. `readReports` drops
      // reporterKey before this sees a row; the count on the spot row is
      // still what the sort uses.
      reports: reports.get(entry.id) ?? [],
      autoHidden: entry.autoHidden,
    }));
  });
}

export function readNoteQueue(secret?: string): Promise<Result<NoteEntry>> {
  return read("the notes", secret, async (session) =>
    (await moderate.readNoteQueue(session)).map((note) => ({
      id: note.id,
      spotSlug: note.spotSlug,
      spotName: note.spotName,
      author: note.author,
      body: note.body,
      notedOn: note.notedOn,
      hidden: note.hidden,
      reports: note.reports,
    })),
  );
}

export function readLog(
  limit = 20,
  secret?: string,
): Promise<Result<LogEntry>> {
  return read("the log", secret, async (session) =>
    (await moderate.readLog(session)).slice(0, limit).map((row) => ({
      id: row.id,
      action: row.action as LogEntry["action"],
      reason: row.reason,
      // Null for the automatic hides, which is the honest answer: nobody
      // decided them.
      actor: row.actor,
      at: row.at,
      slug: row.isNote ? `${row.slug} (note)` : row.slug,
    })),
  );
}
