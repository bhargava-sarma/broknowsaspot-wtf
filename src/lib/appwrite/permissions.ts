import { Permission, Role } from "node-appwrite";

import { ADMIN_TEAM_ID } from "@/lib/appwrite/schema";

/**
 * Row permissions, computed in one place.
 *
 * Appwrite permissions are lists of roles, not predicates. A database
 * that took a predicate could be told "readable while hidden_at is null"
 * once and would re-evaluate it on every query; here the equivalent rule
 * has to be *written onto each row* whenever that row's state changes.
 *
 * The consequence is that `hiddenAt`/`removedAt` and `$permissions` are
 * two copies of one fact, and nothing but discipline keeps them equal.
 * So every caller that touches either timestamp must set permissions
 * from these helpers in the same operation — otherwise the two drift and
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
 * visible. An ACL cannot reference another row, so that second condition
 * cannot be expressed as a rule — hiding a spot has to go and rewrite
 * every one of its notes' permissions, which is why moderation updates
 * both inside a single transaction.
 */
export function notePermissions(
  noteVisible: boolean,
  parentVisible: boolean,
): string[] {
  return spotPermissions(noteVisible && parentVisible);
}
