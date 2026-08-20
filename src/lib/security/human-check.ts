import "server-only";

import { cookies } from "next/headers";

import { verifyTurnstile } from "@/lib/security/turnstile";
import {
  mintUploadTicket,
  uploadTicketCookie,
  UPLOAD_TICKET_COOKIE,
  verifyUploadTicket,
} from "@/lib/security/upload-ticket";

/**
 * "Is a human doing this?", answered once per batch rather than once per
 * request.
 *
 * Every write route calls this instead of `verifyTurnstile` directly. It
 * accepts either a fresh Turnstile token or a ticket issued the last time
 * one was redeemed, and when it redeems a token it issues a ticket for
 * whatever comes next.
 *
 * That ordering is what makes adding photos work at all: uploads and the
 * submission they belong to are separate requests, a Turnstile token is
 * single-use, and without this the first upload would spend the token the
 * rest of the batch still needed.
 */

export type HumanCheck =
  { ok: true } | { ok: false; status: number; message: string };

export async function checkHuman(
  request: Request,
  token: unknown,
  requestKey: string,
): Promise<HumanCheck> {
  const jar = await cookies();

  // A ticket already proves it, so a spent token is not a problem.
  const existing = jar.get(UPLOAD_TICKET_COOKIE)?.value;
  if (verifyUploadTicket(existing, requestKey)) return { ok: true };

  const turnstile = await verifyTurnstile(request, token);
  if (!turnstile.ok) {
    return { ok: false, status: turnstile.status, message: turnstile.message };
  }

  // Redeemed. Hand out the ticket the rest of the batch will present.
  const ticket = mintUploadTicket(requestKey);
  if (ticket) {
    const { name, value, options } = uploadTicketCookie(ticket);
    jar.set(name, value, options);
  }

  return { ok: true };
}
