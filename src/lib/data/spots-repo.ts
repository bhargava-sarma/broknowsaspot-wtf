import "server-only";

import * as appwrite from "@/lib/appwrite/spots";
import { isAppwriteConfigured } from "@/lib/appwrite/server";
import type { Spot } from "@/lib/types/spot";

/**
 * The only way pages read spots.
 *
 * Every read goes to Appwrite as a **guest** — no API key — so what comes
 * back is exactly what a browser could fetch. Hidden and removed entries
 * are not filtered out by a clause here that could be wrong; Appwrite
 * never hands them over.
 *
 * ------------------------------------------------------------------
 * On failure, this reports failure
 * ------------------------------------------------------------------
 *
 * These functions used to fall back to the in-repo seed set whenever a
 * query failed, so the site could never go down. That was the right
 * trade during the migration, when credentials existed before the schema
 * did and the alternative was a 500 on every page.
 *
 * It is the wrong trade now, for a reason worth remembering: fourteen of
 * those seed entries have been *removed by a moderator*. A fallback that
 * serves them during an outage silently resurrects content someone
 * deliberately took down — and an index whose whole value is that its
 * information is current cannot answer an outage by inventing content.
 *
 * So there are three distinct outcomes and the pages render all three:
 *
 *   Spot[] (non-empty)  real data
 *   Spot[] (empty)      the index is genuinely empty
 *   null                the index could not be reached
 *
 * The middle one is not a failure and the last one is not emptiness.
 * Conflating them is what let a moderator remove everything and see no
 * change at all.
 */

function unavailable(reason: string, error?: unknown): null {
  if (error === undefined) console.error(`[spots] ${reason}`);
  else console.error(`[spots] ${reason}`, error);
  return null;
}

/** The index, or null if it could not be reached. */
export async function listSpots(): Promise<Spot[] | null> {
  if (!isAppwriteConfigured) {
    return unavailable("no appwrite credentials in this environment");
  }
  try {
    return await appwrite.listSpots();
  } catch (thrown) {
    return unavailable("could not list spots", thrown);
  }
}

/**
 * One spot.
 *
 * `null` covers both "no such spot" and "could not reach the index",
 * which collapse to the same page: a 404 is the honest answer to a URL
 * we cannot confirm, and inventing a page from the seed set would be
 * worse than either.
 */
export async function getSpotBySlug(slug: string): Promise<Spot | null> {
  if (!isAppwriteConfigured) return null;
  try {
    return await appwrite.getSpotBySlug(slug);
  } catch (thrown) {
    return unavailable(`could not load "${slug}"`, thrown);
  }
}

/**
 * Slugs to prerender.
 *
 * An empty list is fine: `dynamicParams` is on, so a spot created after
 * the last build renders on demand rather than 404ing. Failing the build
 * because the database was briefly unreachable would be worse than
 * prerendering nothing.
 */
export async function listSpotSlugs(): Promise<string[]> {
  if (!isAppwriteConfigured) return [];
  try {
    return (await appwrite.listSpotSlugs()) ?? [];
  } catch (thrown) {
    console.warn("[spots] could not list slugs for prerendering", thrown);
    return [];
  }
}
