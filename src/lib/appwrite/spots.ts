import "server-only";

import { Query } from "node-appwrite";

import { photoUrl } from "@/lib/appwrite/photos";
import { DATABASE_ID, TABLES } from "@/lib/appwrite/schema";
import { guestTables } from "@/lib/appwrite/server";
import type { CommunityNote, Spot } from "@/lib/types/spot";

/**
 * Reading spots out of Appwrite.
 *
 * Every read here uses the **guest** client — no API key — so the rows
 * that come back are exactly the rows a browser could fetch. Hidden and
 * removed entries are not filtered out by a `where` clause we could get
 * wrong; Appwrite never hands them over in the first place.
 *
 * The property worth naming: a bug in a query here leaks nothing, because
 * the query is not what enforces visibility. It also means
 * `spotPermissions()` has to be right — the permissions written onto each
 * row are the whole of the enforcement.
 */

type SpotRow = Record<string, unknown> & {
  $id: string;
  $createdAt: string;
  slug: string;
};

type NoteRow = Record<string, unknown> & { $id: string; spotId: string };

function toNote(row: NoteRow): CommunityNote {
  // Stored as ids rather than URLs, so an endpoint or project move is a
  // config change rather than a migration. Resolved on read.
  let photos: string[] = [];
  try {
    const ids = row.photos ? JSON.parse(String(row.photos)) : [];
    if (Array.isArray(ids)) {
      photos = ids
        .filter((id): id is string => typeof id === "string")
        .map(photoUrl);
    }
  } catch {
    // A malformed blob should cost the pictures, not the note.
    photos = [];
  }

  return {
    id: row.$id,
    author: String(row.author ?? "anonymous"),
    // The column is a datetime; the UI only ever renders the date part.
    date: String(row.notedOn ?? "").slice(0, 10),
    body: String(row.body ?? ""),
    photos,
  };
}

function toSpot(row: SpotRow, notes: CommunityNote[]): Spot {
  let photos: Spot["photos"] = [];
  try {
    photos = row.photos ? JSON.parse(String(row.photos)) : [];
  } catch {
    // A malformed photos blob should cost the gallery, not the page.
    photos = [];
  }

  return {
    slug: row.slug,
    name: String(row.name),
    ...(row.region ? { region: String(row.region) } : {}),
    ...(row.country ? { country: String(row.country) } : {}),
    lat: Number(row.lat),
    lng: Number(row.lng),
    category: row.category as Spot["category"],
    difficulty: row.difficulty as Spot["difficulty"],
    access: row.access as Spot["access"],
    summary: String(row.summary),
    description: String(row.description),
    watchOut: String(row.watchOut),
    bestWindow: String(row.bestWindow ?? ""),
    walkInKm: Number(row.walkInKm ?? 0),
    photos,
    notes,
    addedAt: row.$createdAt.slice(0, 10),
    ratingSum: Number(row.ratingSum ?? 0),
    ratingCount: Number(row.ratingCount ?? 0),
  };
}

/** Notes for a set of spot ids, in one round trip rather than N. */
async function notesFor(
  spotIds: string[],
): Promise<Map<string, CommunityNote[]>> {
  const grouped = new Map<string, CommunityNote[]>();
  if (spotIds.length === 0) return grouped;

  const tables = guestTables();
  if (!tables) return grouped;

  const { rows } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.notes,
    queries: [
      Query.equal("spotId", spotIds),
      Query.orderDesc("notedOn"),
      Query.limit(500),
    ],
  });

  for (const row of rows as unknown as NoteRow[]) {
    const list = grouped.get(row.spotId) ?? [];
    list.push(toNote(row));
    grouped.set(row.spotId, list);
  }
  return grouped;
}

export async function listSpots(): Promise<Spot[] | null> {
  const tables = guestTables();
  if (!tables) return null;

  const { rows } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
    queries: [Query.orderDesc("$createdAt"), Query.limit(500)],
  });

  const spots = rows as unknown as SpotRow[];
  const notes = await notesFor(spots.map((row) => row.$id));

  return spots.map((row) => toSpot(row, notes.get(row.$id) ?? []));
}

export async function getSpotBySlug(slug: string): Promise<Spot | null> {
  const tables = guestTables();
  if (!tables) return null;

  const { rows } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
    queries: [Query.equal("slug", slug), Query.limit(1)],
  });

  const row = (rows as unknown as SpotRow[])[0];
  if (!row) return null;

  const notes = await notesFor([row.$id]);
  return toSpot(row, notes.get(row.$id) ?? []);
}

export async function listSpotSlugs(): Promise<string[] | null> {
  const tables = guestTables();
  if (!tables) return null;

  const { rows } = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
    queries: [Query.select(["slug"]), Query.limit(500)],
  });

  return (rows as unknown as Array<{ slug: string }>).map((row) => row.slug);
}
