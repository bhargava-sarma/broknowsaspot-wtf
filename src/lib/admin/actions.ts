"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/admin/action-state";
import * as appwriteAuth from "@/lib/appwrite/auth";
import * as appwriteModerate from "@/lib/appwrite/moderate";
import { isAppwriteConfigured } from "@/lib/appwrite/server";
import { readAdminGate } from "@/lib/admin/session";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server-client";

/**
 * Server actions for the admin surface.
 *
 * A server action is a POST endpoint with a generated URL, not a private
 * function — anything that can reach the site can call one. So every
 * mutating action here re-checks membership, and the database checks it
 * again inside `moderate_spot()`. Neither check is decorative: the first
 * produces a readable message, the second is what actually stops it.
 */

// ------------------------------------------------------------- sign in --

export async function signInAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { status: "error", message: "email and password, both." };
  }

  if (isAppwriteConfigured) {
    const session = await appwriteAuth.createSession(email, password);
    if (!session.ok) {
      // One message for every failure mode. Distinguishing "no such user"
      // from "wrong password" turns the login form into a way to test
      // whether an address has an account.
      return { status: "error", message: "that didn't work." };
    }

    const store = await cookies();
    store.set(appwriteAuth.SESSION_COOKIE, session.secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // Appwrite sessions last a year by default; the cookie should not
      // outlive what it points at, and a shorter one just logs people out
      // for no security gain since the secret is what matters.
      maxAge: 60 * 60 * 24 * 365,
    });

    // Signing in is not the same as being an admin. Say so here rather
    // than letting the dashboard say it, so the account does not get a
    // session it can do nothing with and no explanation.
    const gate = await readAdminGate();
    if (gate.state !== "admin") {
      await appwriteAuth.destroySession(session.secret);
      store.delete(appwriteAuth.SESSION_COOKIE);
      return { status: "error", message: "that account isn't an admin." };
    }

    redirect("/admin");
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return { status: "error", message: "auth isn't configured here." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // One message for every failure mode. Distinguishing "no such user"
    // from "wrong password" turns the login form into a way to test
    // whether an address has an account.
    return { status: "error", message: "that didn't work." };
  }

  // Signing in successfully is not the same as being an admin. Say so here
  // rather than letting the dashboard say it, so the account doesn't get a
  // session it can do nothing with and no explanation.
  const gate = await readAdminGate();
  if (gate.state !== "admin") {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "that account isn't an admin.",
    };
  }

  // Outside the checks above: redirect() signals by throwing, so it must
  // not sit inside anything that catches.
  redirect("/admin");
}

// ------------------------------------------------------------ sign out --

export async function signOutAction(): Promise<void> {
  if (isAppwriteConfigured) {
    const store = await cookies();
    const secret = store.get(appwriteAuth.SESSION_COOKIE)?.value;
    if (secret) await appwriteAuth.destroySession(secret);
    store.delete(appwriteAuth.SESSION_COOKIE);
    redirect("/admin/login");
  }

  const supabase = await getServerSupabase();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

// ----------------------------------------------------------- moderate --

const ACTIONS = ["hide", "restore", "remove"] as const;
type ModerationAction = (typeof ACTIONS)[number];

function isModerationAction(value: unknown): value is ModerationAction {
  return ACTIONS.includes(value as ModerationAction);
}

const PAST_TENSE: Record<ModerationAction, string> = {
  hide: "hidden",
  restore: "restored",
  remove: "removed",
};

export async function moderateAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await readAdminGate();
  if (gate.state !== "admin") {
    return { status: "error", message: "not authorised." };
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const action = formData.get("action");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!slug) return { status: "error", message: "no spot given." };
  if (!isModerationAction(action)) {
    return { status: "error", message: "unknown action." };
  }

  if (isAppwriteConfigured) {
    const applied = await appwriteModerate.moderateSpot(
      slug,
      action,
      reason || null,
      { id: gate.userId, email: gate.email },
    );
    if (!applied.ok) {
      return { status: "error", message: applied.reason };
    }
    revalidatePath("/explore");
    revalidatePath(`/spot/${slug}`);
    revalidatePath("/admin");
    return { status: "ok", message: `${slug} — ${PAST_TENSE[action]}.` };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return { status: "error", message: "no database connection." };
  }

  try {
    const { error } = await supabase.rpc("moderate_spot", {
      target_slug: slug,
      action,
      // The function writes the log row itself, so an empty reason has to
      // reach it as null rather than as an empty string.
      reason: reason || null,
    });

    if (error) {
      console.error(`[admin] ${action} failed for "${slug}"`, error);
      return {
        status: "error",
        message:
          error.code === "42501"
            ? "the database refused that."
            : "couldn't apply that.",
      };
    }
  } catch (thrown) {
    console.error(`[admin] ${action} threw for "${slug}"`, thrown);
    return { status: "error", message: "couldn't reach the database." };
  }

  // The public pages cache for five minutes. A moderator watching a live
  // problem should not have to wait that out to see it gone.
  revalidatePath("/explore");
  revalidatePath(`/spot/${slug}`);
  revalidatePath("/admin");

  return { status: "ok", message: `${slug} — ${PAST_TENSE[action]}.` };
}

// ------------------------------------------------------ moderate note --

const NOTE_ACTIONS = ["hide", "restore"] as const;
type NoteAction = (typeof NOTE_ACTIONS)[number];

function isNoteAction(value: unknown): value is NoteAction {
  return NOTE_ACTIONS.includes(value as NoteAction);
}

/**
 * Notes have no permanent tier. `remove` exists for spots because a
 * takedown at a landowner's request is worth distinguishing from a
 * reversible hide; a note is two sentences, and there is nothing that
 * distinction would express.
 */
export async function moderateNoteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await readAdminGate();
  if (gate.state !== "admin") {
    return { status: "error", message: "not authorised." };
  }

  const noteId = String(formData.get("noteId") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const action = formData.get("action");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!noteId) return { status: "error", message: "no note given." };
  if (!isNoteAction(action)) {
    return { status: "error", message: "unknown action." };
  }

  if (isAppwriteConfigured) {
    const applied = await appwriteModerate.moderateNote(
      noteId,
      action,
      reason || null,
      { id: gate.userId, email: gate.email },
    );
    if (!applied.ok) {
      return { status: "error", message: applied.reason };
    }
    revalidatePath(`/spot/${applied.slug}`);
    revalidatePath("/admin");
    return {
      status: "ok",
      message: action === "hide" ? "note hidden." : "note restored.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return { status: "error", message: "no database connection." };
  }

  try {
    const { error } = await supabase.rpc("moderate_note", {
      target_note_id: noteId,
      action,
      reason: reason || null,
    });

    if (error) {
      console.error(`[admin] note ${action} failed for ${noteId}`, error);
      return {
        status: "error",
        message:
          error.code === "42501"
            ? "the database refused that."
            : "couldn't apply that.",
      };
    }
  } catch (thrown) {
    console.error(`[admin] note ${action} threw for ${noteId}`, thrown);
    return { status: "error", message: "couldn't reach the database." };
  }

  if (slug) revalidatePath(`/spot/${slug}`);
  revalidatePath("/admin");

  return {
    status: "ok",
    message: action === "hide" ? "note hidden." : "note restored.",
  };
}
