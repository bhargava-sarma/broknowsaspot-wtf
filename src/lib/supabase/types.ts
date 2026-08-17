import type { Access, Category, Difficulty, SpotPhoto } from "@/lib/types/spot";

/**
 * Row shapes as Postgres returns them — snake_case, and with the columns
 * the app actually selects rather than every column that exists.
 *
 * Hand-written rather than generated from the database: the schema is
 * small, and a generated file would need regenerating in CI to stay
 * honest. Swap for `supabase gen types` output if the schema grows.
 */

export type SpotNoteRow = {
  id: string;
  author: string;
  body: string;
  noted_on: string;
};

export type SpotRow = {
  slug: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  category: Category;
  difficulty: Difficulty;
  access: Access;
  summary: string;
  description: string;
  watch_out: string;
  best_window: string;
  walk_in_km: number | string;
  photos: SpotPhoto[] | null;
  created_at: string;
  spot_notes?: SpotNoteRow[] | null;
};

/** Columns the site reads, including notes via the foreign key. */
export const SPOT_SELECT = `
  slug, name, region, country, lat, lng,
  category, difficulty, access,
  summary, description, watch_out, best_window, walk_in_km,
  photos, created_at,
  spot_notes ( id, author, body, noted_on )
` as const;
