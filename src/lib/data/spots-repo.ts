import * as appwrite from "@/lib/appwrite/spots";
import { isAppwriteConfigured } from "@/lib/appwrite/server";
import { SPOTS } from "@/lib/data/spots";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { SPOT_SELECT, type SpotRow } from "@/lib/supabase/types";
import type { Spot } from "@/lib/types/spot";

/**
 * Which backend serves reads.
 *
 * Appwrite wins whenever it is configured, so the cutover is an
 * environment change rather than a deploy: set the Appwrite variables and
 * the next request reads from it; unset them and it falls back. Both
 * paths end at the same seed fallback, so neither can take the site down
 * while the other is being stood up.
 *
 * This branch is temporary. It goes away with the Supabase modules once
 * production has been reading from Appwrite long enough to trust it.
 */
const backend = isAppwriteConfigured ? "appwrite" : "supabase";

/**
 * The only way pages read spots.
 *
 * Every function falls back to the in-repo seed set when the database is
 * unreachable — and that is load-bearing, not defensive decoration.
 * Credentials get synced the moment two services are linked, which is
 * *before* anyone runs the migrations. Without a fallback, the live site
 * would 500 on every page during that window.
 *
 * So the ladder is: no credentials -> seed; credentials but the query
 * fails or throws -> log and seed; query succeeds -> real data.
 *
 * **An empty result is not a failure.** This used to treat zero rows as
 * "the seed hasn't run yet" and substitute the seed set, which was a fair
 * reading when nothing could empty the table. It stopped being one the
 * moment there was an admin screen: fourteen entries were removed on
 * purpose, with a reason typed into each, and the site went on serving
 * them from the repo as though nothing had happened. A moderator who
 * removes everything must see everything gone — otherwise the removal
 * silently does not take, and the only place that is visible is the
 * database.
 */

function toSpot(row: SpotRow): Spot {
  const notes = (row.spot_notes ?? []).map((note) => ({
    id: note.id,
    author: note.author,
    date: note.noted_on,
    body: note.body,
  }));

  return {
    slug: row.slug,
    name: row.name,
    region: row.region,
    country: row.country,
    lat: row.lat,
    lng: row.lng,
    category: row.category,
    difficulty: row.difficulty,
    access: row.access,
    summary: row.summary,
    description: row.description,
    watchOut: row.watch_out,
    bestWindow: row.best_window,
    // Postgres `numeric` can arrive as a string depending on the driver.
    walkInKm: Number(row.walk_in_km),
    photos: row.photos ?? [],
    notes,
    // The seed carries a date; the column carries a timestamp. Both render
    // through the same formatter, which only needs the date part.
    addedAt: row.created_at.slice(0, 10),
  };
}

/** One place to decide that a failure means "use the seed". */
function fallback<T>(reason: string, error: unknown, value: T): T {
  console.warn(`[spots] ${reason} — falling back to seed data`, error);
  return value;
}

export async function listSpots(): Promise<Spot[]> {
  if (backend === "appwrite") {
    try {
      const spots = await appwrite.listSpots();
      if (!spots) return fallback("appwrite not configured", null, SPOTS);
      // Zero rows from a database that answered is the truth, not a
      // symptom. Render the empty state.
      return spots;
    } catch (thrown) {
      return fallback("appwrite list threw", thrown, SPOTS);
    }
  }

  const supabase = getSupabase();
  if (!supabase) return SPOTS;

  try {
    const { data, error } = await supabase
      .from("spots")
      .select(SPOT_SELECT)
      .order("created_at", { ascending: false });

    if (error) return fallback("could not list spots", error, SPOTS);
    if (!data) return fallback("spots query returned nothing", null, SPOTS);

    return (data as unknown as SpotRow[]).map(toSpot);
  } catch (thrown) {
    // supabase-js surfaces most failures in `error`, but a DNS failure or
    // an unreachable host throws. A page must not 500 because the database
    // is briefly unreachable.
    return fallback("spots query threw", thrown, SPOTS);
  }
}

export async function getSpotBySlug(slug: string): Promise<Spot | null> {
  const seeded = SPOTS.find((spot) => spot.slug === slug) ?? null;

  if (backend === "appwrite") {
    try {
      // A miss here is a genuine 404 once the database is populated, but
      // during the cutover window it just means the row has not been
      // migrated yet — so check the seed before declaring it missing.
      return (await appwrite.getSpotBySlug(slug)) ?? seeded;
    } catch (thrown) {
      return fallback(
        `appwrite spot query threw for "${slug}"`,
        thrown,
        seeded,
      );
    }
  }

  const supabase = getSupabase();
  if (!supabase) return seeded;

  try {
    const { data, error } = await supabase
      .from("spots")
      .select(SPOT_SELECT)
      .eq("slug", slug)
      .maybeSingle();

    if (error) return fallback(`could not load spot "${slug}"`, error, seeded);

    // A genuine 404 once the database is populated, but during the pre-seed
    // window it just means the row isn't there yet — so check the seed
    // before declaring the page missing.
    if (!data) return seeded;

    return toSpot(data as unknown as SpotRow);
  } catch (thrown) {
    return fallback(`spot query threw for "${slug}"`, thrown, seeded);
  }
}

/** Slugs to prerender. Seed slugs are always included so the build is
 *  never emptier than the site was before the database existed. */
export async function listSpotSlugs(): Promise<string[]> {
  const seedSlugs = SPOTS.map((spot) => spot.slug);

  if (backend === "appwrite") {
    try {
      const slugs = await appwrite.listSpotSlugs();
      if (!slugs) return seedSlugs;
      return [...new Set([...seedSlugs, ...slugs])];
    } catch (thrown) {
      return fallback("appwrite slug query threw", thrown, seedSlugs);
    }
  }

  const supabase = getSupabase();
  if (!supabase) return seedSlugs;

  try {
    const { data, error } = await supabase.from("spots").select("slug");
    if (error || !data) {
      return fallback("could not list slugs", error, seedSlugs);
    }
    return [...new Set([...seedSlugs, ...data.map((row) => row.slug)])];
  } catch (thrown) {
    return fallback("slug query threw", thrown, seedSlugs);
  }
}

export { isSupabaseConfigured };
export { backend as readBackend };
