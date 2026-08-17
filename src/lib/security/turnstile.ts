import "server-only";

import { clientAddress } from "@/lib/security/request-key";

/**
 * Cloudflare Turnstile verification.
 *
 * Fails **closed in production**: if the secret isn't configured, writes
 * are refused rather than quietly accepted. An unauthenticated write
 * endpoint on the open internet without bot protection does not stay clean,
 * and "we'll add the captcha later" is how it never gets added.
 *
 * Development is allowed through so the form is testable without a
 * Cloudflare account, and says so in the log.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const isTurnstileConfigured = Boolean(process.env.TURNSTILE_SECRET_KEY);

export type TurnstileResult =
  { ok: true } | { ok: false; status: number; message: string };

export async function verifyTurnstile(
  request: Request,
  token: unknown,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[turnstile] TURNSTILE_SECRET_KEY is not set — refusing the write. " +
          "Set it in the Vercel dashboard to enable submissions.",
      );
      return {
        ok: false,
        status: 503,
        message: "submissions are temporarily closed. try again shortly.",
      };
    }
    console.warn(
      "[turnstile] no secret configured — skipping check (dev only)",
    );
    return { ok: true };
  }

  if (typeof token !== "string" || token.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "the anti-bot check didn't complete. reload and try again.",
    };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      remoteip: clientAddress(request),
    });

    const response = await fetch(VERIFY_URL, { method: "POST", body });
    const payload: unknown = await response.json();
    const success =
      typeof payload === "object" &&
      payload !== null &&
      (payload as { success?: unknown }).success === true;

    if (!success) {
      return {
        ok: false,
        status: 400,
        message: "the anti-bot check didn't pass. reload and try again.",
      };
    }

    return { ok: true };
  } catch (thrown) {
    // Cloudflare being unreachable must not become an open door.
    console.error("[turnstile] verification request failed", thrown);
    return {
      ok: false,
      status: 503,
      message: "couldn't run the anti-bot check. try again in a moment.",
    };
  }
}
