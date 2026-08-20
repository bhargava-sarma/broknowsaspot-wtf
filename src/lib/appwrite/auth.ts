import "server-only";

import { Account, Query, Teams } from "node-appwrite";
import { cookies } from "next/headers";

import { ADMIN_TEAM_ID } from "@/lib/appwrite/schema";
import {
  isAppwriteWriteEnabled,
  keyedClient,
  sessionClient,
} from "@/lib/appwrite/server";

/**
 * Admin sessions.
 *
 * Appwrite has no cookie-based SSR helper. A session is created with the
 * API key, which hands back a *secret*; that secret goes in an httpOnly
 * cookie, and a later request rebuilds a client with `.setSession(secret)`
 * to act as that user. So the cookie holds a credential rather than a
 * pointer to one, which is why it is httpOnly, sameSite lax and secure
 * outside development.
 *
 * Moderation rights are membership in the `admins` team, and being signed
 * in grants nothing on its own. That distinction is load-bearing rather
 * than pedantic: Appwrite accepts public sign-ups by default, so "has an
 * account" and "may moderate" have to be two different questions.
 */

export const SESSION_COOKIE = "bkas_session";

/**
 * Signing in needs the same three variables every other write needs: the
 * session is created with the API key, not by the browser.
 */
export const isAuthConfigured = isAppwriteWriteEnabled;

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
export type SignInFailure = "credentials" | "misconfigured";

/**
 * Sign in, returning the session secret to be put in a cookie.
 *
 * Two kinds of failure, and conflating them cost an afternoon. A wrong
 * password and an API key without `sessions.write` both come back as 401
 * — this used to answer "that didn't work" to either, so a deployment
 * that could never accept *any* password looked exactly like a typo.
 *
 * They are told apart by Appwrite's error `type`, not its status:
 *
 *   user_invalid_credentials  the password is wrong, or nobody has that
 *                             address. Stays deliberately
 *                             indistinguishable — separating them turns
 *                             the form into a way to test whether an
 *                             address has an account.
 *
 *   anything else             our problem, not the visitor's. Logged in
 *                             full, and the page says so rather than
 *                             blaming their typing.
 */
export async function createSession(
  email: string,
  password: string,
): Promise<{ ok: true; secret: string } | { ok: false; why: SignInFailure }> {
  const keyed = keyedClient();
  if (!keyed) return { ok: false, why: "misconfigured" };

  try {
    const session = (await new Account(keyed).createEmailPasswordSession({
      email,
      password,
    })) as { secret?: string };
    if (!session.secret) {
      console.error("[auth] appwrite returned a session with no secret");
      return { ok: false, why: "misconfigured" };
    }
    return { ok: true, secret: session.secret };
  } catch (error) {
    const type = (error as { type?: string }).type ?? "";

    if (type === "user_invalid_credentials") {
      return { ok: false, why: "credentials" };
    }

    console.error(
      "[auth] sign-in could not be attempted — this is a configuration " +
        "problem, not a bad password.",
      {
        type,
        code: (error as { code?: number }).code,
        message: (error as { message?: string }).message,
      },
    );
    return { ok: false, why: "misconfigured" };
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

/** A client acting as the signed-in admin. */
export const adminSessionClient = sessionClient;
