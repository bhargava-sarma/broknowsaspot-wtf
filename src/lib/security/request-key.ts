import "server-only";

import { createHmac } from "node:crypto";

/**
 * Turns a request into a stable pseudonymous key, used both to rate-limit
 * submissions and to count *distinct people* against the report threshold.
 *
 * Two things this is not:
 *
 * - It is not an identity. Everyone behind one CGNAT or office NAT shares
 *   an address, and anyone with a VPN has as many as they like. It raises
 *   the cost of gaming the threshold; it does not make it impossible.
 * - It is not a stored IP address. Only the HMAC is persisted, so the
 *   database never holds anything that resolves back to a person.
 *
 * `REPORTER_KEY_SALT` is the only source of the salt, and there is
 * deliberately no fallback: a default would be predictable, and deriving
 * it from some other secret would tie key stability to that secret's
 * rotation schedule. When it is missing every write route answers 503
 * rather than accepting writes it cannot attribute.
 *
 * The value must also stay pinned for the life of the deployment. Rotating
 * it renumbers everyone, so reports filed before the change stop counting
 * against reports filed after it, and one person can cross the threshold
 * twice.
 */

function secret(): string | null {
  return process.env.REPORTER_KEY_SALT ?? null;
}

/**
 * Vercel puts the client address at the head of `x-forwarded-for`. Later
 * entries are proxies and are attacker-controllable, so only the first is
 * ever considered.
 */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function requestKey(request: Request): string | null {
  const salt = secret();
  if (!salt) return null;
  return createHmac("sha256", salt)
    .update(clientAddress(request))
    .digest("hex");
}
