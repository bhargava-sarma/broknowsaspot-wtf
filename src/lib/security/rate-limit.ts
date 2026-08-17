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

export type RateLimitResult =
  { allowed: true } | { allowed: false; retryAfterMinutes: number };

export async function checkSubmissionRate(
  supabase: SupabaseClient,
  submitterKey: string,
): Promise<RateLimitResult> {
  const since = new Date(
    Date.now() - SUBMISSION_WINDOW_MINUTES * 60_000,
  ).toISOString();

  const { count, error } = await supabase
    .from("submission_log")
    .select("id", { count: "exact", head: true })
    .eq("submitter_key", submitterKey)
    .gte("created_at", since);

  if (error) {
    // Fail open on a counting failure: a database hiccup shouldn't stop
    // genuine contributions. Turnstile is still in front of this, so the
    // endpoint is not left bare.
    console.warn("[rate-limit] could not count submissions", error);
    return { allowed: true };
  }

  if ((count ?? 0) >= SUBMISSION_LIMIT) {
    return { allowed: false, retryAfterMinutes: SUBMISSION_WINDOW_MINUTES };
  }

  return { allowed: true };
}
