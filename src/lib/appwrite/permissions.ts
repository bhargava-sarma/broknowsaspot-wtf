import { Permission, Role } from "node-appwrite";

import { ADMIN_TEAM_ID } from "@/lib/appwrite/schema";

/**
 * Row permissions, computed in one place.
 *
 * Supabase expressed visibility as a predicate the database evaluated:
 *
 *     using (hidden_at is null and removed_at is null)
 *
 * Appwrite permissions are lists of roles, not predicates, so the same
 * rule has to be *written onto each row* whenever its state changes.
 * Every caller that touches `hiddenAt` or `removedAt` must call through
 * here in the same operation, or the data and its enforcement drift and
 * a hidden entry stays publicly readable.
 *
 * `scripts/appwrite-verify.mts` asserts the two agree for every row. That
 * check is the reason this design is acceptable rather than merely
 * convenient.
 */

/** A spot the public may read, or one only moderators may see. */
export function spotPermissions(visible: boolean): string[] {
  return visible
    ? [Permission.read(Role.any()), Permission.read(Role.team(ADMIN_TEAM_ID))]
    : [Permission.read(Role.team(ADMIN_TEAM_ID))];
}

/**
 * A note is public only when it is not hidden **and** its parent spot is
 * visible. Postgres could say that in the policy itself, by joining to
 * spots. An ACL cannot reference another row, so hiding a spot has to
 * rewrite its notes' permissions too — which is why moderation updates
 * both inside one transaction.
 */
export function notePermissions(
  noteVisible: boolean,
  parentVisible: boolean,
): string[] {
  return spotPermissions(noteVisible && parentVisible);
}

/**
 * No write permission is granted to anyone, anywhere, for any row.
 *
 * Submissions, reports, notes and moderation all run through route
 * handlers on the server API key. Granting `create` to `users` or `any`
 * would let a browser write straight to the database, skipping
 * Turnstile, the rate limiter and the validator in one step.
 */
export const NO_PUBLIC_WRITES: string[] = [];
