import "server-only";

import { countRecentWrites } from "@/lib/appwrite/write";

/**
 * Rate limiting, counted in the database rather than in memory.
 *
 * An in-memory counter is worse than useless on serverless: each instance
 * keeps its own, so the real limit is (limit × instances) and it resets
 * whenever a function goes cold. Counting rows in a shared table is the
 * only version that means anything here.
 *
 * Spots and notes have separate budgets on purpose. Adding a spot is a
 * much larger act than leaving a note — someone reporting back on four
 * places they walked this weekend is normal behaviour, not abuse — so
 * they are counted in separate tables and neither can exhaust the other.
 */

export const SUBMISSION_LIMIT = 5;
export const SUBMISSION_WINDOW_MINUTES = 60;

export const NOTE_LIMIT = 10;
export const NOTE_WINDOW_MINUTES = 60;

/**
 * Comfortably above the most photos an honest hour produces — five spots
 * with three plates each, plus a note or two — and far below what makes
 * the bucket a free file host.
 */
export const PHOTO_LIMIT = 24;
export const PHOTO_WINDOW_MINUTES = 60;

export type RateLimitResult =
  { allowed: true } | { allowed: false; retryAfterMinutes: number };

async function within(
  table: "submission_log" | "note_log" | "photo_log",
  key: string,
  windowMinutes: number,
  limit: number,
): Promise<RateLimitResult> {
  try {
    const count = await countRecentWrites(table, key, windowMinutes);
    // Fail open on a counting failure. A database hiccup should not stop
    // genuine contributions, and Turnstile is still in front of this, so
    // the endpoint is not left bare.
    if (count === null || count < limit) return { allowed: true };
    return { allowed: false, retryAfterMinutes: windowMinutes };
  } catch (error) {
    console.warn(`[rate-limit] could not count ${table}`, error);
    return { allowed: true };
  }
}

export function checkSubmissionRate(key: string): Promise<RateLimitResult> {
  return within(
    "submission_log",
    key,
    SUBMISSION_WINDOW_MINUTES,
    SUBMISSION_LIMIT,
  );
}

export function checkNoteRate(key: string): Promise<RateLimitResult> {
  return within("note_log", key, NOTE_WINDOW_MINUTES, NOTE_LIMIT);
}

export async function withinPhotoLimit(
  key: string,
): Promise<{ ok: true } | { ok: false; retryInMinutes: number }> {
  const result = await within(
    "photo_log",
    key,
    PHOTO_WINDOW_MINUTES,
    PHOTO_LIMIT,
  );
  return result.allowed
    ? { ok: true }
    : { ok: false, retryInMinutes: result.retryAfterMinutes };
}
