import "server-only";

import {
  getServerSupabase,
  isAuthConfigured,
} from "@/lib/supabase/server-client";

/**
 * Who is asking, and are they allowed.
 *
 * Four outcomes rather than a boolean, because each one deserves a
 * different page. "Signed in but not an admin" in particular must not
 * redirect back to the login screen — the visitor already logged in, so
 * bouncing them there is an infinite loop and a lie about what happened.
 */
export type AdminGate =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "not-admin"; email: string }
  | { state: "admin"; userId: string; email: string };

export async function readAdminGate(): Promise<AdminGate> {
  if (!isAuthConfigured) return { state: "unconfigured" };

  const supabase = await getServerSupabase();
  if (!supabase) return { state: "unconfigured" };

  // getUser() over getSession(): it validates the token against the auth
  // server rather than trusting a cookie this process was handed. On an
  // admin surface, catching a revoked session on the next request is
  // worth one round trip.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { state: "signed-out" };

  // The membership check *is* an RLS-governed read. `admins` has one
  // policy — `using (public.is_admin())` — so a non-admin gets an empty
  // result from Postgres rather than a row this code has to remember to
  // inspect. Being authenticated grants nothing on its own; Supabase
  // projects accept public sign-ups by default.
  const { data, error: lookupError } = await supabase
    .from("admins")
    .select("user_id, email")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (lookupError) {
    // Fail closed. A database that cannot answer "is this person an
    // admin" has answered "no".
    console.error("[admin] membership lookup failed", lookupError);
    return { state: "not-admin", email: user.email ?? "unknown" };
  }

  if (!data) return { state: "not-admin", email: user.email ?? "unknown" };

  return {
    state: "admin",
    userId: user.id,
    // The session's email is the live one; the column is a stale copy kept
    // so the moderation log can name an actor without reading auth.users.
    email: user.email ?? (data.email as string),
  };
}
