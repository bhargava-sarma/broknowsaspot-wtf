import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Rate limiting, counted in Postgres rather than in memory.
 *
 * An in-memory counter is worse than useless on serverless: each instance
 * keeps its own, so the real limit is (limit × instances) and it resets
 * whenever a function goes cold. Counting rows in a shared table is the
 * only version that means anything here.
 */

export const SUBMISSION_LIMIT = 5;
export const SUBMISSION_WINDOW_MINUTES = 60;

// Notes get their own budget, counted in their own table. Leaving a note
// is a far smaller act than adding a spot — someone reporting back on
// four places they walked this weekend is normal behaviour, not abuse —
// so the two must not share a counter where either can exhaust the other.
export const NOTE_LIMIT = 10;
export const NOTE_WINDOW_MINUTES = 60;

export type RateLimitResult =
  { allowed: true } | { allowed: false; retryAfterMinutes: number };

async function countRecent(
  supabase: SupabaseClient,
  table: "submission_log" | "note_log",
  submitterKey: string,
  windowMinutes: number,
  limit: number,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("submitter_key", submitterKey)
    .gte("created_at", since);

  if (error) {
    // Fail open on a counting failure: a database hiccup shouldn't stop
    // genuine contributions. Turnstile is still in front of this, so the
    // endpoint is not left bare.
    console.warn(`[rate-limit] could not count ${table}`, error);
    return { allowed: true };
  }

  if ((count ?? 0) >= limit) {
    return { allowed: false, retryAfterMinutes: windowMinutes };
  }

  return { allowed: true };
}

export function checkSubmissionRate(
  supabase: SupabaseClient,
  submitterKey: string,
): Promise<RateLimitResult> {
  return countRecent(
    supabase,
    "submission_log",
    submitterKey,
    SUBMISSION_WINDOW_MINUTES,
    SUBMISSION_LIMIT,
  );
}

export function checkNoteRate(
  supabase: SupabaseClient,
  submitterKey: string,
): Promise<RateLimitResult> {
  return countRecent(
    supabase,
    "note_log",
    submitterKey,
    NOTE_WINDOW_MINUTES,
    NOTE_LIMIT,
  );
}
