import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether the app has credentials at all. False locally until someone
 * writes a .env.local, which is why every read path keeps a seed fallback
 * rather than assuming a database is reachable.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

/**
 * Read-only client, safe on both server and browser: it carries the
 * publishable (anon) key, so everything it can reach is governed by row
 * level security. The only public policy is SELECT on visible spots, so
 * this client physically cannot write.
 *
 * Writes go through route handlers with the service role key instead —
 * that key is never imported here, and never carries a NEXT_PUBLIC_
 * prefix, so it cannot end up in the browser bundle.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  cached ??= createClient(url!, anonKey!, {
    auth: { persistSession: false },
  });
  return cached;
}
