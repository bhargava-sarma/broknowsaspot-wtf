/**
 * Assert the security model against a live Appwrite project.
 *
 * This is `supabase/verify.sql`'s replacement, and it carries more weight
 * than that file did. On Postgres the rules were declarative — a policy
 * either existed or it did not, and the catalogue could be read. Here the
 * rules are partly ACLs written at row-creation time, so the only way to
 * know they are right is to look at every row and to try things as a
 * guest.
 *
 *   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... \
 *   npm run appwrite:verify
 *
 * Every row must read `ok`. A FAIL under "public exposure" is a live
 * data leak, not a failing test.
 */

import { Client, TablesDB, Teams, Query } from "node-appwrite";
import {
  ADMIN_TEAM_ID,
  DATABASE_ID,
  SCHEMA,
  TABLES,
} from "@/lib/appwrite/schema";

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !projectId || !apiKey) {
  console.error(
    "set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY",
  );
  process.exit(1);
}

/** Full access, for reading what is actually there. */
const admin = new TablesDB(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey),
);
const teams = new Teams(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey),
);

/**
 * No API key — this is what a browser holding the publishable project id
 * can do, and it is the client whose failures matter. The equivalent of
 * probing as `anon` in the SQL harness.
 */
const guest = new TablesDB(
  new Client().setEndpoint(endpoint).setProject(projectId),
);

type Check = { name: string; expected: string; actual: string };
const checks: Check[] = [];
const add = (name: string, expected: unknown, actual: unknown) =>
  checks.push({
    name,
    expected: String(expected),
    actual: String(actual),
  });

/** Run something as a guest and report the HTTP code it was refused with,
 *  or how many rows it managed to read. */
async function asGuest(
  run: () => Promise<{ total?: number; rows?: unknown[] }>,
) {
  try {
    const result = await run();
    return `rows:${result.total ?? result.rows?.length ?? 0}`;
  } catch (error) {
    return String((error as { code?: number }).code ?? "error");
  }
}

async function main() {
  // ---------------------------------------------------------- schema --
  const { tables } = await admin.listTables({ databaseId: DATABASE_ID });
  const byId = new Map(tables.map((t: { $id: string }) => [t.$id, t]));

  add("tables present", SCHEMA.length, byId.size);

  for (const spec of SCHEMA) {
    const table = byId.get(spec.id) as
      { $permissions?: string[]; rowSecurity?: boolean } | undefined;

    add(`${spec.id} exists`, "true", String(Boolean(table)));
    if (!table) continue;

    // Nothing is granted at table level anywhere. Every read a browser
    // makes has to be justified by a row's own permissions, and every
    // write goes through a route handler on the API key.
    add(
      `${spec.id} table-level grants`,
      "0",
      (table.$permissions ?? []).length,
    );
    add(`${spec.id} row security`, spec.rowSecurity, table.rowSecurity);

    const { columns } = await admin.listColumns({
      databaseId: DATABASE_ID,
      tableId: spec.id,
    });
    const columnKeys = new Set(columns.map((c: { key: string }) => c.key));
    const missing = spec.columns
      .map((c) => c.name)
      .filter((name) => !columnKeys.has(name));
    add(
      `${spec.id} columns`,
      "none missing",
      missing.join(",") || "none missing",
    );

    const unavailable = columns
      .filter((c: { status?: string }) => c.status !== "available")
      .map((c: { key: string }) => c.key);
    add(
      `${spec.id} columns available`,
      "all",
      unavailable.length ? unavailable.join(",") : "all",
    );

    // Presence is not the same as correctness. `location` shipped as
    // nullable once, which Appwrite accepted happily and then refused to
    // build a spatial index over — the failure surfaced two steps away
    // from its cause. Compare the definitions, not just the names.
    const byKey = new Map(
      columns.map((c: { key: string }) => [c.key, c as { required?: boolean }]),
    );
    const wrongRequired = spec.columns
      .filter((c) => {
        const live = byKey.get(c.name);
        return live && Boolean(live.required) !== c.required;
      })
      .map((c) => `${c.name}(want required=${c.required})`);
    add(
      `${spec.id} column nullability`,
      "matches schema",
      wrongRequired.length ? wrongRequired.join(",") : "matches schema",
    );

    const { indexes } = await admin.listIndexes({
      databaseId: DATABASE_ID,
      tableId: spec.id,
    });
    const indexKeys = new Set(indexes.map((i: { key: string }) => i.key));
    const missingIndexes = spec.indexes
      .map((i) => i.key)
      .filter((key) => !indexKeys.has(key));
    add(
      `${spec.id} indexes`,
      "none missing",
      missingIndexes.join(",") || "none missing",
    );
  }

  // The two that carry real weight rather than being schema bookkeeping.
  const { indexes: spotIndexes } = await admin.listIndexes({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
  });
  add(
    "spatial index on location",
    "spatial",
    spotIndexes.find((i: { key: string }) => i.key === "location_spatial")
      ?.type ?? "MISSING",
  );

  const { indexes: reportIndexes } = await admin.listIndexes({
    databaseId: DATABASE_ID,
    tableId: TABLES.reports,
  });
  const onePer = reportIndexes.find(
    (i: { key: string }) => i.key === "one_per_reporter",
  ) as { type?: string; columns?: string[] } | undefined;
  // One report per person per spot, enforced by the database. Without
  // this the threshold means nothing — one person could reach it alone.
  add("one report per person", "unique", onePer?.type ?? "MISSING");
  add(
    "…on (spotId, reporterKey)",
    "spotId,reporterKey",
    (onePer?.columns ?? []).join(","),
  );

  // ------------------------------------------------ the ACL invariant --
  //
  // The single most important section. Appwrite cannot express
  // "readable while hiddenAt is null", so visibility lives in the data
  // *and* in each row's permissions. A row whose data says hidden and
  // whose ACL says `any` is publicly readable — silently.
  const allSpots = await admin.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.spots,
    queries: [Query.limit(500)],
  });

  const drifted: string[] = [];
  const badLocation: string[] = [];
  for (const row of allSpots.rows as Array<Record<string, unknown>>) {
    const visible = !row.hiddenAt && !row.removedAt;
    const perms = (row.$permissions ?? []) as string[];
    const publiclyReadable = perms.some((p) => p === 'read("any")');
    if (visible !== publiclyReadable) drifted.push(String(row.slug));

    // location is derived from lat/lng. Postgres generated it and
    // rejected direct writes; here the writer sets both, so check them.
    const point = row.location as [number, number] | null | undefined;
    if (point) {
      const [lng, lat] = point;
      if (
        Math.abs(lng - Number(row.lng)) > 1e-6 ||
        Math.abs(lat - Number(row.lat)) > 1e-6
      ) {
        badLocation.push(String(row.slug));
      }
    } else {
      badLocation.push(String(row.slug));
    }
  }
  add(
    "permissions match hidden state",
    "none drifted",
    drifted.length ? drifted.join(",") : "none drifted",
  );
  add(
    "location matches lat/lng",
    "all",
    badLocation.length ? badLocation.join(",") : "all",
  );

  // reportCount is denormalised for the moderation queue's ordering. It
  // is never the source of truth; this is what says so.
  const reports = await admin.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.reports,
    queries: [Query.limit(5000)],
  });
  const tally = new Map<string, number>();
  for (const r of reports.rows as unknown as Array<{ spotId: string }>) {
    tally.set(r.spotId, (tally.get(r.spotId) ?? 0) + 1);
  }
  const wrongCount = (allSpots.rows as Array<Record<string, unknown>>)
    .filter(
      (row) =>
        Number(row.reportCount ?? 0) !== (tally.get(String(row.$id)) ?? 0),
    )
    .map((row) => String(row.slug));
  add(
    "reportCount matches reports",
    "all",
    wrongCount.length ? wrongCount.join(",") : "all",
  );

  const visibleCount = (allSpots.rows as Array<Record<string, unknown>>).filter(
    (r) => !r.hiddenAt && !r.removedAt,
  ).length;

  // --------------------------------------------------- public exposure --
  //
  // Everything below is attempted with no API key — exactly what anyone
  // holding the project id can do from a browser. A FAIL here is a live
  // leak, not a failing test.
  add(
    "guest reads visible spots",
    `rows:${visibleCount}`,
    await asGuest(() =>
      guest.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLES.spots,
        queries: [Query.limit(500)],
      }),
    ),
  );
  add(
    "guest reads reports",
    "rows:0",
    await asGuest(() =>
      guest.listRows({ databaseId: DATABASE_ID, tableId: TABLES.reports }),
    ),
  );
  add(
    "guest reads the submission log",
    "rows:0",
    await asGuest(() =>
      guest.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLES.submissionLog,
      }),
    ),
  );
  add(
    "guest reads the note log",
    "rows:0",
    await asGuest(() =>
      guest.listRows({ databaseId: DATABASE_ID, tableId: TABLES.noteLog }),
    ),
  );
  add(
    "guest reads the moderation log",
    "rows:0",
    await asGuest(() =>
      guest.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLES.moderationLog,
      }),
    ),
  );

  // Writes. 401 is the refusal we want; a row id means anyone can write.
  const guestWrite = async (tableId: string, data: Record<string, unknown>) => {
    try {
      await guest.createRow({
        databaseId: DATABASE_ID,
        tableId,
        rowId: "unique()",
        data,
      });
      return "WROTE A ROW";
    } catch (error) {
      return String((error as { code?: number }).code ?? "error");
    }
  };

  add(
    "guest writes a spot",
    "401",
    await guestWrite(TABLES.spots, {
      slug: "guest-probe",
      name: "guest probe",
      region: "x",
      country: "x",
      lat: 1,
      lng: 1,
      category: "ruin",
      difficulty: "easy",
      access: "open",
      summary: "should never be written",
      description: "should never be written",
      watchOut: "should never be written",
    }),
  );
  add(
    "guest writes a report",
    "401",
    await guestWrite(TABLES.reports, {
      spotId: "x",
      reason: "spam",
      reporterKey: "guest-probe",
    }),
  );
  add(
    "guest writes a moderation log row",
    "401",
    await guestWrite(TABLES.moderationLog, {
      spotId: "x",
      action: "restore",
    }),
  );

  // ------------------------------------------------------------ teams --
  let noAdminsYet = false;
  try {
    const team = (await teams.get({ teamId: ADMIN_TEAM_ID })) as {
      total?: number;
    };
    add("admin team exists", "true", "true");
    // Expected to fail until someone is invited. Nobody can reach /admin
    // before that, which is the safe direction to be wrong in — unlike
    // every other check here, where failing means too much access.
    noAdminsYet = (team.total ?? 0) === 0;
    add("admin team has a member", "true", String(!noAdminsYet));
  } catch {
    add("admin team exists", "true", "false");
    add("admin team has a member", "true", "unknown");
  }

  // ----------------------------------------------------------- report --
  const width = Math.max(...checks.map((c) => c.name.length), 4);
  const ew = Math.max(...checks.map((c) => c.expected.length), 8);
  const aw = Math.max(...checks.map((c) => c.actual.length), 6);

  console.log(
    `\n ${"check".padEnd(width)} | ${"expected".padEnd(ew)} | ${"actual".padEnd(aw)} | status`,
  );
  console.log(
    `-${"-".repeat(width)}-+-${"-".repeat(ew)}-+-${"-".repeat(aw)}-+-------`,
  );

  let failed = 0;
  for (const check of checks) {
    const ok = check.expected === check.actual;
    if (!ok) failed += 1;
    console.log(
      ` ${check.name.padEnd(width)} | ${check.expected.padEnd(ew)} | ${check.actual.padEnd(aw)} | ${ok ? "ok" : "FAIL"}`,
    );
  }

  console.log(`\n${checks.length - failed} ok, ${failed} failed`);

  if (noAdminsYet && failed === 1) {
    console.log(
      "\nthe only failure is that no one has been invited to the admins\n" +
        "team yet. invite yourself in the appwrite console, under Auth →\n" +
        "Teams → admins, and this goes green. everything else is clean.",
    );
  } else if (failed > 0) {
    console.log(
      "\na FAIL under 'permissions match hidden state' or any 'guest' row\n" +
        "is a live exposure rather than a flaky check: it means the public\n" +
        "can reach something the data says is hidden.",
    );
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("\nverification could not run:");
  console.error(error);
  process.exit(2);
});
