import "server-only";

import { photoUrl } from "@/lib/appwrite/photos";

/**
 * Turns submitted photo ids into stored photo records.
 *
 * The ids come from the browser, so they are treated as a claim rather
 * than a fact: anything that is not a plausible Appwrite id is dropped
 * before it reaches a query, and the list is capped. A caller cannot
 * enumerate the bucket this way either — an id that does not exist simply
 * produces a URL that 404s, which is the same outcome as a deleted photo
 * and reveals nothing extra.
 */

/** Appwrite ids are up to 36 chars of [a-zA-Z0-9_]. */
const ID_PATTERN = /^[a-zA-Z0-9_]{1,36}$/;

export function toStoredPhotos(
  ids: unknown,
  max: number,
): { src: string; alt: string }[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .filter((id): id is string => typeof id === "string" && ID_PATTERN.test(id))
    .slice(0, max)
    .map((id) => ({ src: photoUrl(id), alt: "" }));
}

/** The raw ids, for tables that store ids rather than URLs. */
export function toPhotoIds(ids: unknown, max: number): string[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .filter((id): id is string => typeof id === "string" && ID_PATTERN.test(id))
    .slice(0, max);
}
