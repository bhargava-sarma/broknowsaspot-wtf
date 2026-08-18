import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A Supabase client bound to the signed-in user's cookies.
 *
 * This is *not* the service-role client. It carries the publishable key
 * and the caller's session, so everything it touches is governed by row
 * level security exactly as it would be from a browser. That is the
 * point: the admin screens run under the same rules as everyone else,
 * and the rules happen to say more when the caller is in `public.admins`.
 *
 * A new client per request, never a module-level cache — a cached client
 * would hand one visitor's session to the next.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isAuthConfigured = Boolean(url && anonKey);

export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!url || !anonKey) return null;

  const store = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies — by the time one runs,
          // the response headers are already going out. Swallowing this
          // is the documented pattern and is safe *because* middleware
          // refreshes the session on every /admin request; the only thing
          // lost here is a duplicate write of a cookie already set there.
        }
      },
    },
  });
}
