/**
 * Load the 14 seed spots and their notes into Appwrite. Idempotent —
 * re-running upserts rather than duplicating.
 *
 *   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... \
 *   npm run appwrite:seed
 *
 * Row IDs are generated, not derived from the slug: Appwrite caps a row
 * ID at 36 characters and a submitted spot can easily produce a longer
 * one. `slug` stays a column with a unique index, which is also what
 * makes the uniqueness check on submission a database concern rather
 * than a read-then-write race in the route.
 *
 * Run through tsx, which resolves the `@/` alias and does not care which
 * TypeScript features the local node build happens to ship with. The
 * previous version leaned on node's own type stripping and died with
 * ERR_UNKNOWN_FILE_EXTENSION on a node one patch release older than the
 * one it was written on.
 */

import { Client, TablesDB, ID, Query } from "node-appwrite";

import { DATABASE_ID, TABLES } from "@/lib/appwrite/schema";
import { SPOTS } from "@/lib/data/spots";

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !projectId || !apiKey) {
  console.error(
    "set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY",
  );
  process.exit(1);
}

const db = new TablesDB(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey),
);

// Seed spots are all live, so they all carry read(any). Written out
// literally rather than imported from src/ because that module resolves
// `@/` aliases; the two must agree, and appwrite-verify.mts is what says
// they do.
const VISIBLE = ['read("any")', 'read("team:admins")'];

type SeedNote = { author: string; date: string; body: string };
type SeedSpot = {
  slug: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  category: string;
  difficulty: string;
  access: string;
  summary: string;
  description: string;
  watchOut: string;
  bestWindow: string;
  walkInKm: number;
  photos: unknown[];
  notes: SeedNote[];
};

async function main() {
  const spots = SPOTS as unknown as SeedSpot[];
  console.log(`seeding ${spots.length} spots\n`);

  let created = 0;
  let updated = 0;
  let notesWritten = 0;

  for (const spot of spots) {
    const existing = await db.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.spots,
      queries: [Query.equal("slug", spot.slug), Query.limit(1)],
    });

    const data = {
      slug: spot.slug,
      name: spot.name,
      region: spot.region,
      country: spot.country,
      lat: spot.lat,
      lng: spot.lng,
      // Appwrite points are [longitude, latitude] — the same order
      // PostGIS uses for ST_MakePoint, and the reverse of how people say
      // it out loud. Getting this backwards puts everything in the wrong
      // hemisphere silently, so appwrite-verify.mts checks it.
      location: [spot.lng, spot.lat],
      category: spot.category,
      difficulty: spot.difficulty,
      access: spot.access,
      summary: spot.summary,
      description: spot.description,
      watchOut: spot.watchOut,
      bestWindow: spot.bestWindow ?? "",
      walkInKm: spot.walkInKm ?? 0,
      photos: JSON.stringify(spot.photos ?? []),
      reportCount: 0,
    };

    let spotId: string;
    if (existing.rows.length > 0) {
      spotId = (existing.rows[0] as { $id: string }).$id;
      await db.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.spots,
        rowId: spotId,
        data,
        permissions: VISIBLE,
      });
      updated += 1;
    } else {
      const row = await db.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.spots,
        rowId: ID.unique(),
        data,
        permissions: VISIBLE,
      });
      spotId = (row as { $id: string }).$id;
      created += 1;
    }

    // Replace this spot's notes rather than stacking duplicates on every
    // run — the same thing the SQL seed did.
    const priorNotes = await db.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.notes,
      queries: [Query.equal("spotId", spotId), Query.limit(200)],
    });
    for (const note of priorNotes.rows as Array<{ $id: string }>) {
      await db.deleteRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.notes,
        rowId: note.$id,
      });
    }

    for (const note of spot.notes ?? []) {
      await db.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.notes,
        rowId: ID.unique(),
        data: {
          spotId,
          author: note.author,
          body: note.body,
          // The column is a datetime; the seed carries a date.
          notedOn: new Date(`${note.date}T12:00:00Z`).toISOString(),
        },
        permissions: VISIBLE,
      });
      notesWritten += 1;
    }

    console.log(`  ${spot.slug} (${spot.notes?.length ?? 0} notes)`);
  }

  console.log(
    `\n${created} created, ${updated} updated, ${notesWritten} notes written.` +
      `\nnext: npm run appwrite:verify`,
  );
}

main().catch((error) => {
  console.error("\nseeding failed:");
  console.error(error);
  process.exit(1);
});
