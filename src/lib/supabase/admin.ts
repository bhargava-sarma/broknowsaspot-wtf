import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses row level security entirely.
 *
 * The `server-only` import at the top is the point of this file: if any
 * client component ever imports it, even transitively, the build fails
 * rather than shipping the service key to a browser. That is a much better
 * failure than a code review that almost catches it.
 *
 * Everything reaching for this client must already have run validation,
 * bot checks and rate limiting — RLS is not going to catch anything here.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

export function getAdminSupabase(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  cached ??= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Writes are impossible without it; routes return 503 rather than 500. */
export const isWriteEnabled = Boolean(url && serviceKey);
