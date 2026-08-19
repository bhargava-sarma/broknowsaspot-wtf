import "server-only";

import { Account, Client, Query, Teams } from "node-appwrite";
import { cookies } from "next/headers";

import { ADMIN_TEAM_ID } from "@/lib/appwrite/schema";

/**
 * Admin sessions on Appwrite.
 *
 * The shape is the same as the Supabase version and the reasons are the
 * same, so the differences are what is worth reading.
 *
 * Appwrite has no cookie-based SSR helper. A session is created with the
 * API key, which hands back a *secret*; that secret goes in an httpOnly
 * cookie, and a later request rebuilds a client with `.setSession(secret)`
 * to act as that user. So the cookie holds a credential rather than a
 * pointer to one, which is why it is httpOnly, sameSite lax and secure
 * outside development.
 *
 * Membership in the `admins` team replaces `public.admins`. Being signed
 * in grants nothing on its own — the same rule as before, and the reason
 * it mattered there was that Supabase accepts public sign-ups by default.
 * Appwrite does too.
 */

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

export const SESSION_COOKIE = "bkas_session";

export const isAuthConfigured = Boolean(endpoint && projectId && apiKey);

function keyedClient(): Client | null {
  if (!endpoint || !projectId || !apiKey) return null;
  return new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
}

function sessionClient(secret: string): Client | null {
  if (!endpoint || !projectId) return null;
  return new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setSession(secret);
}

export type AdminGate =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "not-admin"; email: string }
  | { state: "admin"; userId: string; email: string; secret: string };

/**
 * Who is asking, and are they allowed.
 *
 * Four outcomes rather than a boolean, because each deserves a different
 * page. "Signed in but not an admin" in particular must not redirect back
 * to the login screen — the visitor already logged in, so bouncing them
 * there is a loop and a lie about what happened.
 */
export async function readAdminGate(): Promise<AdminGate> {
  if (!isAuthConfigured) return { state: "unconfigured" };

  const store = await cookies();
  const secret = store.get(SESSION_COOKIE)?.value;
  if (!secret) return { state: "signed-out" };

  const client = sessionClient(secret);
  if (!client) return { state: "unconfigured" };

  let user: { $id: string; email?: string };
  try {
    // Validates the session against the auth server rather than trusting
    // a cookie this process was handed. On an admin surface, catching a
    // revoked session on the next request is worth one round trip.
    user = (await new Account(client).get()) as { $id: string; email?: string };
  } catch {
    return { state: "signed-out" };
  }

  const keyed = keyedClient();
  if (!keyed) return { state: "unconfigured" };

  try {
    // Membership is read with the API key rather than the session,
    // because a member cannot list a team's memberships. The gate that
    // actually protects data is not this check — it is that hidden rows
    // carry read("team:admins") and Appwrite decides, per row, whether
    // this session sees them.
    const { total } = await new Teams(keyed).listMemberships({
      teamId: ADMIN_TEAM_ID,
      queries: [Query.equal("userId", user.$id), Query.limit(1)],
    });
    if ((total ?? 0) === 0) {
      return { state: "not-admin", email: user.email ?? "unknown" };
    }
  } catch (error) {
    // Fail closed. A directory that cannot answer "is this person an
    // admin" has answered no.
    console.error("[admin] membership lookup failed", error);
    return { state: "not-admin", email: user.email ?? "unknown" };
  }

  return {
    state: "admin",
    userId: user.$id,
    email: user.email ?? "unknown",
    secret,
  };
}

/** Sign in, returning the session secret to be put in a cookie. */
export async function createSession(
  email: string,
  password: string,
): Promise<{ ok: true; secret: string } | { ok: false }> {
  const keyed = keyedClient();
  if (!keyed) return { ok: false };

  try {
    const session = (await new Account(keyed).createEmailPasswordSession({
      email,
      password,
    })) as { secret?: string };
    if (!session.secret) return { ok: false };
    return { ok: true, secret: session.secret };
  } catch {
    // One outcome for every failure mode. Distinguishing "no such user"
    // from "wrong password" turns the login form into a way to test
    // whether an address has an account.
    return { ok: false };
  }
}

export async function destroySession(secret: string): Promise<void> {
  const client = sessionClient(secret);
  if (!client) return;
  try {
    await new Account(client).deleteSession({ sessionId: "current" });
  } catch {
    // Already gone, or the secret is stale. The cookie is cleared either
    // way, which is the part the visitor can observe.
  }
}

/** A client acting as the signed-in admin. Reads are governed by row
 *  permissions, so this sees hidden entries and a guest client does not. */
export function adminSessionClient(secret: string): Client | null {
  return sessionClient(secret);
}
