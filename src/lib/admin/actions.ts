"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/admin/action-state";
import { readAdminGate } from "@/lib/admin/session";
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
