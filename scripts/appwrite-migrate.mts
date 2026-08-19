/**
 * Copy live data out of Supabase and into Appwrite.
 *
 * The seed script writes the fourteen entries that ship in the repo. This
 * writes whatever the running site has accumulated since — submissions,
 * notes, reports, the moderation record — so nothing a contributor added
 * is lost in the move.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... \
 *   npm run appwrite:migrate
 *
 * Idempotent by slug: re-running updates rather than duplicating, so it
 * can be run once to rehearse and again at cutover to catch whatever
 * arrived in between.
 *
 * Reports carry `reporterKey`, an HMAC of a client address salted with
 * REPORTER_KEY_SALT (falling back to the Supabase service key). If that
 * salt changes during the move, old and new reports stop being comparable
 * and one person can pass the threshold alone. Set REPORTER_KEY_SALT
 * explicitly in both environments before running this — the script checks
 * and refuses if it is unset while reports exist.
 */

import { createClient } from "@supabase/supabase-js";
import { Client, ID, Query, TablesDB } from "node-appwrite";

import { spotPermissions } from "@/lib/appwrite/permissions";
import { DATABASE_ID, TABLES } from "@/lib/appwrite/schema";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId =
  process.env.APPWRITE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!supabaseUrl || !serviceKey || !endpoint || !projectId || !apiKey) {
  console.error(
    "missing config. needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,\n" +
      "APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});
const tables = new TablesDB(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey),
);

type Row = Record<string, unknown>;

async function upsertSpot(spot: Row): Promise<string> {
  const slug = String(spot.slug);
  const visible = !spot.hidden_at && !spot.removed_at;

  const data = {
    slug,
    name: String(spot.name),
    region: String(spot.region),
    country: String(spot.country),
    lat: Number(spot.lat),
    lng: Number(spot.lng),
    // [longitude, latitude] — PostGIS order, reverse of how people say it
    location: [Number(spot.lng), Number(spot.lat)],
    category: String(spot.category),
    difficulty: String(spot.difficulty),
    access: String(spot.access),
    summary: String(spot.summary),
    description: String(spot.description),
    watchOut: String(spot.watch_out),
    bestWindow: String(spot.best_window ?? ""),
    walkInKm: Number(spot.walk_in_km ?? 0),
    photos: JSON.stringify(spot.photos ?? []),
    reportCount: 0,
    hiddenAt: (spot.hidden_at as string | null) ?? null,
    hiddenReason: (spot.hidden_reason as string | null) ?? null,
    removedAt: (spot.removed_at as string | null) ?? null,
  };

  const existing = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
    queries: [Query.equal("slug", slug), Query.limit(1)],
  });

  if (existing.rows.length > 0) {
    const id = (existing.rows[0] as { $id: string }).$id;
    await tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.spots,
      rowId: id,
      data,
      permissions: spotPermissions(visible),
    });
    return id;
  }

  const created = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
    rowId: ID.unique(),
    data,
    permissions: spotPermissions(visible),
  });
  return (created as { $id: string }).$id;
}

async function main() {
  console.log(`migrating ${supabaseUrl} -> ${endpoint}\n`);

  const { data: spots, error } = await supabase
    .from("spots")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;

  // postgres id -> appwrite row id, so children can be re-pointed
  const idMap = new Map<string, string>();
  let visible = 0;
  let hidden = 0;

  for (const spot of (spots ?? []) as Row[]) {
    const appwriteId = await upsertSpot(spot);
    idMap.set(String(spot.id), appwriteId);
    if (spot.hidden_at || spot.removed_at) hidden += 1;
    else visible += 1;
  }
  console.log(
    `spots         ${idMap.size} (${visible} live, ${hidden} hidden)`,
  );

  // ---- notes
  const { data: notes } = await supabase.from("spot_notes").select("*");
  let noteCount = 0;
  for (const note of (notes ?? []) as Row[]) {
    const spotId = idMap.get(String(note.spot_id));
    if (!spotId) continue;

    const parent = (spots ?? []).find(
      (s) => String((s as Row).id) === String(note.spot_id),
    ) as Row | undefined;
    const parentVisible = Boolean(
      parent && !parent.hidden_at && !parent.removed_at,
    );

    // Replace rather than stack, so re-running is safe.
    const prior = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.notes,
      queries: [
        Query.equal("spotId", spotId),
        Query.equal("body", String(note.body)),
        Query.limit(1),
      ],
    });
    if (prior.rows.length > 0) continue;

    await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.notes,
      rowId: ID.unique(),
      data: {
        spotId,
        author: String(note.author),
        body: String(note.body),
        notedOn: new Date(`${String(note.noted_on)}T12:00:00Z`).toISOString(),
        hiddenAt: (note.hidden_at as string | null) ?? null,
      },
      permissions: spotPermissions(parentVisible && !note.hidden_at),
    });
    noteCount += 1;
  }
  console.log(`notes         ${noteCount}`);

  // ---- reports, and the counts they imply
  const { data: reports } = await supabase.from("spot_reports").select("*");
  if ((reports ?? []).length > 0 && !process.env.REPORTER_KEY_SALT) {
    console.error(
      "\nrefusing to migrate reports without REPORTER_KEY_SALT.\n\n" +
        "reporterKey is an HMAC salted with that value, falling back to the\n" +
        "supabase service key. move without pinning it and the salt changes,\n" +
        "old and new reports stop being comparable, and the same person can\n" +
        "reach the threshold twice. set it in both environments first.",
    );
    process.exit(1);
  }

  const tally = new Map<string, number>();
  let reportCount = 0;
  for (const report of (reports ?? []) as Row[]) {
    const spotId = idMap.get(String(report.spot_id));
    if (!spotId) continue;
    try {
      await tables.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.reports,
        rowId: ID.unique(),
        data: {
          spotId,
          reason: String(report.reason),
          detail: (report.detail as string | null) ?? null,
          reporterKey: String(report.reporter_key),
        },
      });
      reportCount += 1;
    } catch (error) {
      // The unique index says this pair is already here — a re-run.
      if ((error as { code?: number }).code !== 409) throw error;
    }
    tally.set(spotId, (tally.get(spotId) ?? 0) + 1);
  }
  for (const [spotId, count] of tally) {
    await tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.spots,
      rowId: spotId,
      data: { reportCount: count },
    });
  }
  console.log(`reports       ${reportCount}`);

  // ---- the moderation record. Worth carrying: it is the history of
  // every decision anyone made, and it does not regenerate.
  // Who did what. `moderation_log` stores actor_id referencing
  // public.admins; the email lives on that table. Reading row.actor_email
  // — which does not exist — silently yielded undefined for every row,
  // so the migrated log attributed fifteen deliberate human decisions to
  // nobody, and the admin screen rendered them as automatic hides. An
  // audit trail that misreports who decided something is worse than one
  // that is missing.
  const { data: admins } = await supabase
    .from("admins")
    .select("user_id, email");
  const adminEmails = new Map(
    ((admins ?? []) as Row[]).map((a) => [String(a.user_id), String(a.email)]),
  );

  const { data: log } = await supabase.from("moderation_log").select("*");
  let logCount = 0;
  for (const row of (log ?? []) as Row[]) {
    const spotId = idMap.get(String(row.spot_id));
    if (!spotId) continue;
    // The log is append-only and has no natural key, so a re-run would
    // double every entry. Match on what identifies a decision: the spot,
    // the verb and when it happened.
    const seen = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.moderationLog,
      queries: [
        Query.equal("spotId", spotId),
        Query.equal("action", String(row.action)),
        Query.limit(100),
      ],
    });
    const already = (seen.rows as unknown as Row[]).some(
      (r) =>
        String(r.$createdAt).slice(0, 19) ===
        String(row.created_at).slice(0, 19),
    );
    if (already) continue;

    await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.moderationLog,
      rowId: ID.unique(),
      data: {
        spotId,
        action: String(row.action),
        reason: (row.reason as string | null) ?? null,
        // Actor ids do not survive: they referenced supabase auth users,
        // and the appwrite accounts are different rows entirely. The
        // email is the part a person reads, so it is what is kept —
        // resolved through public.admins, because the log holds only the
        // id. A null here means the row genuinely had no actor, which is
        // what the automatic hides look like.
        actorId: null,
        actorEmail: adminEmails.get(String(row.actor_id)) ?? null,
      },
    });
    logCount += 1;
  }
  console.log(`moderation    ${logCount}`);

  console.log(
    "\ndone. run npm run appwrite:verify — 'permissions match hidden state'\n" +
      "is the row that says the hidden entries came across still hidden.",
  );
}

main().catch((error) => {
  console.error("\nmigration failed:");
  console.error(error);
  process.exit(1);
});
