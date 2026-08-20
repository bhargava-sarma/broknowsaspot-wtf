import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A short-lived proof that a Turnstile challenge was passed recently.
 *
 * ---------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------
 *
 * **Turnstile tokens are single-use.** Cloudflare rejects a token that
 * has already been redeemed, and the widget issues one at a time. That is
 * fine for a form with one submit button and wrong for this one: adding
 * three photos and then submitting is four writes, and the first upload
 * would spend the token that the other three — including the submission
 * itself — still needed. The visible result was two photos refused with
 * "the anti-bot check didn't pass", and a submission that would have been
 * refused the same way.
 *
 * The fix is to stop treating the token as the credential for a single
 * request. What Turnstile actually establishes is "a human is at this
 * browser", which stays true for the next few minutes and across the
 * handful of requests one contribution is made of. So the first request
 * to present a token redeems it and receives a ticket; the rest of the
 * batch present the ticket.
 *
 * What the ticket is not:
 *
 * - **Not a session, and not an identity.** It carries no user, because
 *   there are no users here. It says only that this request key passed a
 *   challenge before a given time.
 * - **Not transferable.** It is bound to the same pseudonymous request
 *   key the rate limiter uses, so lifting the cookie onto another
 *   connection produces a signature that does not verify.
 * - **Not long-lived.** Twenty minutes — long enough to write a
 *   submission with photos, short enough that a leaked ticket is close to
 *   worthless.
 *
 * It never widens what a caller may do. The rate limits still apply, and
 * a ticket only ever replaces a challenge the holder already passed.
 */

export const UPLOAD_TICKET_COOKIE = "bkas_pass";

const TTL_MS = 20 * 60 * 1000;

/**
 * Signed with the same secret as the request key.
 *
 * Reusing it is deliberate: both are HMACs that only this server needs to
 * verify, and a second secret would be a second thing to configure, a
 * second thing to forget, and a second thing to rotate out of step.
 */
function secret(): string | null {
  return process.env.REPORTER_KEY_SALT ?? null;
}

function sign(payload: string, key: string): string | null {
  const salt = secret();
  if (!salt) return null;
  return createHmac("sha256", salt).update(`${payload}.${key}`).digest("hex");
}

/** `<expiry>.<signature>`, for an httpOnly cookie. */
export function mintUploadTicket(requestKey: string): string | null {
  const expiry = String(Date.now() + TTL_MS);
  const signature = sign(expiry, requestKey);
  return signature ? `${expiry}.${signature}` : null;
}

export function verifyUploadTicket(
  ticket: string | undefined,
  requestKey: string,
): boolean {
  if (!ticket) return false;

  const separator = ticket.lastIndexOf(".");
  if (separator <= 0) return false;

  const expiry = ticket.slice(0, separator);
  const provided = ticket.slice(separator + 1);

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(expiry, requestKey);
  if (!expected) return false;

  // Constant-time, and length-checked first because timingSafeEqual
  // throws on a length mismatch rather than returning false.
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** The Set-Cookie value for a freshly minted ticket. */
export function uploadTicketCookie(ticket: string): {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: string;
    maxAge: number;
  };
} {
  return {
    name: UPLOAD_TICKET_COOKIE,
    value: ticket,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(TTL_MS / 1000),
    },
  };
}
