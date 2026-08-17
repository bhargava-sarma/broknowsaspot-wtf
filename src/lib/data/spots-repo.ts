import { SPOTS } from "@/lib/data/spots";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { SPOT_SELECT, type SpotRow } from "@/lib/supabase/types";
import type { Spot } from "@/lib/types/spot";

/**
 * The only way pages read spots.
 *
 * Every function falls back to the in-repo seed set when the database is
 * unreachable — and that is load-bearing, not defensive decoration.
 * Supabase's Vercel integration syncs credentials the moment the projects
 * are linked, which is *before* anyone runs the migrations. Without a
 * fallback, the live site would 500 on every page during that window.
 *
 * So the ladder is: no credentials -> seed; credentials but the query
 * fails -> log and seed; query succeeds -> real data. The site is never
 * down because of a half-finished migration.
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
  const supabase = getSupabase();
  if (!supabase) return SPOTS;

  try {
    const { data, error } = await supabase
      .from("spots")
      .select(SPOT_SELECT)
      .order("created_at", { ascending: false });

    if (error) return fallback("could not list spots", error, SPOTS);
    if (!data || data.length === 0) {
      // An empty table means the schema exists but the seed hasn't run.
      // Showing an empty map would look like a bug rather than a state.
      return fallback("spots table is empty", null, SPOTS);
    }

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
