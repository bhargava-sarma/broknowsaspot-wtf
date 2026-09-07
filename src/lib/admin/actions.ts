"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/admin/action-state";
import { readAdminGate } from "@/lib/admin/session";
import * as auth from "@/lib/appwrite/auth";
import * as moderate from "@/lib/appwrite/moderate";

/**
 * Server actions for the admin surface.
 *
 * A server action is a POST endpoint with a generated URL, not a private
 * function — anything that can reach the site can call one. So every
 * mutating action here re-checks membership, and Appwrite checks it again
 * underneath. Neither check is decorative: the first produces a readable
 * message, the second is what actually stops it.
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

  const session = await auth.createSession(email, password);
  if (!session.ok) {
    // "that didn't work" for a wrong password — saying whether the
    // address exists would turn this form into a way to find out.
    //
    // A misconfiguration is ours, though, and telling someone their
    // password is wrong when the server never got to check it sends them
    // to retype it forever. The detail is in the server logs.
    return {
      status: "error",
      message:
        session.why === "credentials"
          ? "that didn't work."
          : "sign-in isn't working right now. this is a problem with the site, not your password. the details are in the server logs.",
    };
  }

  const store = await cookies();
  store.set(auth.SESSION_COOKIE, session.secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Signing in is not the same as being an admin. Say so here rather than
  // letting the dashboard say it, so the account does not get a session
  // it can do nothing with and no explanation.
  const gate = await readAdminGate();
  if (gate.state !== "admin") {
    await auth.destroySession(session.secret);
    store.delete(auth.SESSION_COOKIE);
    return { status: "error", message: "that account isn't an admin." };
  }

  // Outside every check above: redirect() signals by throwing, so it must
  // not sit inside anything that catches.
  redirect("/admin");
}

// ------------------------------------------------------------ sign out --

export async function signOutAction(): Promise<void> {
  const store = await cookies();
  const secret = store.get(auth.SESSION_COOKIE)?.value;
  if (secret) await auth.destroySession(secret);
  store.delete(auth.SESSION_COOKIE);
  redirect("/admin/login");
}

// ------------------------------------------------------------ moderate --

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

  const applied = await moderate.moderateSpot(slug, action, reason || null, {
    id: gate.userId,
    email: gate.email,
  });
  if (!applied.ok) return { status: "error", message: applied.reason };

  // The public pages cache for five minutes. A moderator watching a live
  // problem should not have to wait that out to see it gone.
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath(`/spot/${slug}`);
  revalidatePath("/admin");

  return { status: "ok", message: `${slug}: ${PAST_TENSE[action]}.` };
}

// ------------------------------------------------------- moderate note --

const NOTE_ACTIONS = ["hide", "restore"] as const;
type NoteAction = (typeof NOTE_ACTIONS)[number];

function isNoteAction(value: unknown): value is NoteAction {
  return NOTE_ACTIONS.includes(value as NoteAction);
}

/**
 * Notes have no permanent tier. `remove` exists for spots because a
 * takedown at a landowner's request is worth distinguishing from a
 * reversible hide; a note is two sentences.
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
  const action = formData.get("action");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!noteId) return { status: "error", message: "no note given." };
  if (!isNoteAction(action)) {
    return { status: "error", message: "unknown action." };
  }

  const applied = await moderate.moderateNote(noteId, action, reason || null, {
    id: gate.userId,
    email: gate.email,
  });
  if (!applied.ok) return { status: "error", message: applied.reason };

  revalidatePath(`/spot/${applied.slug}`);
  revalidatePath("/admin");

  return {
    status: "ok",
    message: action === "hide" ? "note hidden." : "note restored.",
  };
}
