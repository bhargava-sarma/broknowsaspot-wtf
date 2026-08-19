import "server-only";

import * as appwrite from "@/lib/appwrite/write";
import {
  isAppwriteConfigured,
  isAppwriteWriteEnabled,
} from "@/lib/appwrite/server";
import {
  NOTE_LIMIT,
  NOTE_WINDOW_MINUTES,
  SUBMISSION_LIMIT,
  SUBMISSION_WINDOW_MINUTES,
  type RateLimitResult,
} from "@/lib/security/rate-limit";
import type { SpotDraft } from "@/lib/types/spot";

/**
 * One shape for every write, whichever database is behind it.
 *
 * The route handlers used to reach for the Supabase admin client
 * directly, which meant porting them meant rewriting them. They call
 * through here instead, so the cutover is a configuration change and the
 * guard order — shape, then bot check, then rate limit — stays in the
 * routes where it can be read in one place.
 *
 * The Supabase branch is deliberately absent: this module only ever
 * serves Appwrite. Supabase writes still live in the route handlers'
 * legacy path until the cutover removes them, and duplicating them here
 * would mean two copies of the same logic drifting apart during exactly
 * the window when they must not.
 */

export const useAppwriteWrites = isAppwriteConfigured;
export const isAppwriteWritable = isAppwriteWriteEnabled;

export type WriteResult<T> =
  { ok: true; value: T } | { ok: false; reason: string };

export function createSpot(
  draft: SpotDraft,
  submitterKey: string,
): Promise<WriteResult<{ slug: string }>> {
  return appwrite.createSpot(draft, submitterKey);
}

export function createNote(
  slug: string,
  note: { author: string; body: string; notedOn: string },
  submitterKey: string,
): Promise<
  WriteResult<{ id: string; author: string; body: string; date: string }>
> {
  return appwrite.createNote(slug, note, submitterKey);
}

export function reportSpot(
  slug: string,
  reason: string,
  detail: string | null,
  reporterKey: string,
): Promise<WriteResult<{ hidden: boolean }>> {
  return appwrite.reportSpot(slug, reason, detail, reporterKey);
}

/**
 * Rate limits, counted in the database rather than in memory.
 *
 * An in-memory counter is worse than useless on serverless: each instance
 * keeps its own, so the real limit is (limit × instances) and it resets
 * whenever a function goes cold.
 *
 * Fails open on a counting failure, as the Supabase version did. A
 * database hiccup should not stop genuine contributions, and Turnstile is
 * still in front of this, so the endpoint is not left bare.
 */
async function rate(
  table: "submission_log" | "note_log",
  key: string,
  windowMinutes: number,
  limit: number,
): Promise<RateLimitResult> {
  try {
    const count = await appwrite.countRecentWrites(table, key, windowMinutes);
    if (count === null) return { allowed: true };
    if (count >= limit) {
      return { allowed: false, retryAfterMinutes: windowMinutes };
    }
    return { allowed: true };
  } catch (error) {
    console.warn(`[rate-limit] could not count ${table}`, error);
    return { allowed: true };
  }
}

export function checkSubmissionRate(key: string): Promise<RateLimitResult> {
  return rate(
    "submission_log",
    key,
    SUBMISSION_WINDOW_MINUTES,
    SUBMISSION_LIMIT,
  );
}

export function checkNoteRate(key: string): Promise<RateLimitResult> {
  return rate("note_log", key, NOTE_WINDOW_MINUTES, NOTE_LIMIT);
}
