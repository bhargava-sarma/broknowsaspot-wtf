/**
 * Assert the security model against a live Appwrite project.
 *
 * The rules being checked are partly ACLs written onto each row as it is
 * created, rather than a policy declared once that the database applies
 * everywhere. Nothing can be read off a catalogue to confirm them, so
 * the only way to know they hold is to look at every row and to try
 * things as an actual guest.
 *
 *   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... \
 *   npm run appwrite:verify
 *
 * Every row must read `ok`. A FAIL under "public exposure" is a live
 * data leak, not a failing test.
 */

import {
  Client,
  ID,
  Storage,
  TablesDB,
  Teams,
  Query,
  Permission,
  Role,
} from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import {
  ADMIN_READ,
  ADMIN_TEAM_ID,
  DATABASE_ID,
  PHOTO_BUCKET_ID,
  PHOTO_EXTENSIONS,
  PHOTO_MAX_BYTES,
  SCHEMA,
  TABLES,
} from "@/lib/appwrite/schema";

/** A valid 1x1 JPEG, so the probe upload passes the bucket's own rules. */
const PROBE_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
  "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA" +
  "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId =
  process.env.APPWRITE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
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
const storage = new Storage(
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

/**
 * Did a guest get *nothing* out of this table?
 *
 * Appwrite has two ways of saying no and both are correct. A table that
 * grants guests nothing refuses the request outright with 401 — it does
 * not even let you ask. A table that permits listing but holds no rows a
 * guest may see returns an empty list.
 *
 * Asserting one exact shape couples the check to an implementation
 * detail, which is what went wrong here: this expected rows:0 and
 * production answered 401 — a *stricter* refusal than the one being
 * tested for, reported as a failure.
 *
 * So the check is the property: no rows reached the caller. The raw
 * outcome is still printed on failure, because "leaked 3 rows" and
 * "leaked 300" want different reactions.
 */
async function guestGetsNothing(
  run: () => Promise<{ total?: number; rows?: unknown[] }>,
): Promise<string> {
  const outcome = await asGuest(run);
  if (outcome === "rows:0") return "nothing";
  if (/^\d+$/.test(outcome)) return "nothing"; // refused with an http code
  return `LEAKED ${outcome}`;
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

    // The invariant is not "no table grants anything" — moderators read
    // reports and the logs as themselves, so those tables grant read to
    // the admins team. It is that **nothing is granted to the public**:
    // no `any`, no `users`, no `guests`, on any table, for any verb. A
    // grant to a role a stranger can hold is the whole failure mode.
    const grants = (table.$permissions ?? []) as string[];
    const publicGrants = grants.filter((g) =>
      /\("(any|users|guests)"\)/.test(g),
    );
    add(
      `${spec.id} public grants`,
      "none",
      publicGrants.length ? publicGrants.join(",") : "none",
    );
    add(
      `${spec.id} table grants`,
      spec.permissions.join(",") || "none",
      grants.join(",") || "none",
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

    // An enum whose element set drifted accepts some values and rejects
    // the rest, which reads as an intermittent 500 rather than as a
    // schema problem. `reports.reason` sat wrong for the whole life of
    // the feature this way: two of five reasons happened to match, so
    // reporting "worked" often enough that nothing looked broken.
    const wrongElements = spec.columns
      .filter((c) => c.kind === "enum")
      .filter((c) => {
        const live = byKey.get(c.name) as { elements?: string[] } | undefined;
        if (!live?.elements) return false;
        const want = [...(c as { values: readonly string[] }).values]
          .sort()
          .join(",");
        return [...live.elements].sort().join(",") !== want;
      })
      .map((c) => c.name);
    add(
      `${spec.id} enum values`,
      "match schema",
      wrongElements.length ? wrongElements.join(",") : "match schema",
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

    // location is derived from lat/lng, but nothing in Appwrite derives
    // it — the writer sets all three, so confirm they still agree.
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
  // A caveat that belongs in the output, not just in a comment: these
  // checks pass vacuously when the table is empty. A misconfigured but
  // empty `reports` table leaks nothing today and everything tomorrow.
  // The "table-level grants" rows above are what actually cover that
  // window, which is why they are asserted separately rather than being
  // treated as an implementation detail of this section.
  const privateTables = [
    TABLES.reports,
    TABLES.submissionLog,
    TABLES.noteLog,
    TABLES.moderationLog,
  ];
  const emptyPrivate: string[] = [];
  for (const tableId of privateTables) {
    const { total } = await admin.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries: [Query.limit(1)],
    });
    if ((total ?? 0) === 0) emptyPrivate.push(tableId);
  }

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
    "nothing",
    await guestGetsNothing(() =>
      guest.listRows({ databaseId: DATABASE_ID, tableId: TABLES.reports }),
    ),
  );
  add(
    "guest reads the submission log",
    "nothing",
    await guestGetsNothing(() =>
      guest.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLES.submissionLog,
      }),
    ),
  );
  add(
    "guest reads the note log",
    "nothing",
    await guestGetsNothing(() =>
      guest.listRows({ databaseId: DATABASE_ID, tableId: TABLES.noteLog }),
    ),
  );
  add(
    "guest reads the moderation log",
    "nothing",
    await guestGetsNothing(() =>
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
  // The permission string in schema.ts is written by hand. If the SDK
  // ever emits a different shape for the same thing, everything still
  // "works" while granting nothing — so compare them.
  add(
    "admin permission string",
    Permission.read(Role.team(ADMIN_TEAM_ID)),
    ADMIN_READ,
  );

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

  // ---------------------------------------------------------- storage --
  //
  // The bucket is public-read on purpose: a published photo is public.
  // What must never be true is public *write* — a bucket anyone can put
  // files into is a free, anonymous file host attached to this project,
  // and it would not look any different from the outside until it was
  // being used as one.
  try {
    const bucket = (await storage.getBucket({
      bucketId: PHOTO_BUCKET_ID,
    })) as {
      $permissions?: string[];
      maximumFileSize?: number;
      allowedFileExtensions?: string[];
    };
    const grants = bucket.$permissions ?? [];

    add("photo bucket exists", "true", "true");
    add(
      "photo bucket public read",
      'read("any")',
      grants.some((g) => g === 'read("any")') ? 'read("any")' : "missing",
    );

    const writeGrants = grants.filter((g) =>
      /^(create|update|delete)\(/.test(g),
    );
    add(
      "photo bucket write grants",
      "none",
      writeGrants.length === 0 ? "none" : writeGrants.join(", "),
    );

    add(
      "photo bucket size cap",
      String(PHOTO_MAX_BYTES),
      String(bucket.maximumFileSize ?? 0),
    );
    const extensions = (bucket.allowedFileExtensions ?? []).join(",");
    add(
      "photo bucket accepts jpeg only",
      [...PHOTO_EXTENSIONS].join(","),
      extensions || "anything",
    );
  } catch {
    add("photo bucket exists", "true", "false");
  }

  // Configuration is not capability. Everything above reads the bucket,
  // which needs `buckets.read`; uploading needs `files.write`, which is a
  // separate scope on the same key. A project can pass every check above
  // and still refuse every upload — and it did, which is why this now
  // performs a real write instead of inferring one.
  let uploadable = "no";
  try {
    const probe = (await storage.createFile({
      bucketId: PHOTO_BUCKET_ID,
      fileId: ID.unique(),
      // A 1x1 jpeg: the smallest thing the bucket's own rules accept.
      file: InputFile.fromBuffer(
        Buffer.from(PROBE_JPEG_B64, "base64"),
        "probe.jpg",
      ),
      permissions: [Permission.read(Role.any())],
    })) as { $id: string };

    uploadable = "yes";
    // Cleaning up also proves `files.write` covers deletion, which the
    // moderation path needs when a photo is taken down.
    try {
      await storage.deleteFile({
        bucketId: PHOTO_BUCKET_ID,
        fileId: probe.$id,
      });
    } catch {
      uploadable = "yes (but could not delete)";
    }
  } catch (error) {
    const code = (error as { code?: number }).code ?? 0;
    const type = (error as { type?: string }).type ?? "";
    uploadable =
      code === 401 || code === 403 || /scope|unauthorized/i.test(type)
        ? "no — key lacks files.write"
        : `no — ${type || code || "unknown"}`;
    if (process.env.VERIFY_DEBUG) console.error("[probe]", error);
  }
  add("api key can upload a photo", "yes", uploadable);

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
  const failedNames: string[] = [];
  for (const check of checks) {
    const ok = check.expected === check.actual;
    if (!ok) {
      failed += 1;
      failedNames.push(check.name);
    }
    console.log(
      ` ${check.name.padEnd(width)} | ${check.expected.padEnd(ew)} | ${check.actual.padEnd(aw)} | ${ok ? "ok" : "FAIL"}`,
    );
  }

  console.log(`\n${checks.length - failed} ok, ${failed} failed`);

  if (emptyPrivate.length > 0) {
    console.log(
      `\nnote: ${emptyPrivate.join(", ")} ${emptyPrivate.length === 1 ? "is" : "are"} empty, so the\n` +
        "guest-read checks over them passed with nothing to leak. the\n" +
        "table-level grant rows are what cover them until data arrives.",
    );
  }

  if (noAdminsYet && failed === 1) {
    console.log(
      "\nthe only failure is that no one has been invited to the admins\n" +
        "team yet. invite yourself in the appwrite console, under Auth →\n" +
        "Teams → admins, and this goes green. everything else is clean.",
    );
  } else if (failed > 0) {
    // Say which kind of failure this is. Printing "this is a live
    // exposure" under a stale-schema failure teaches people to skim the
    // warning, which is the opposite of what it is for.
    const exposures = failedNames.filter(
      (name) =>
        name.includes("public grants") ||
        name.startsWith("guest ") ||
        name === "permissions match hidden state",
    );
    const schemaDrift = failedNames.filter(
      (name) =>
        name.includes("table grants") ||
        name.includes("columns") ||
        name.includes("indexes") ||
        name.includes("nullability") ||
        name.includes("row security"),
    );

    if (exposures.length > 0) {
      console.log(
        `\nEXPOSURE — ${exposures.join(", ")}.\n` +
          "this is not a flaky check: the public can reach something the\n" +
          "data says is hidden. fix before doing anything else.",
      );
    }
    if (schemaDrift.length > 0) {
      console.log(
        `\nthe schema has drifted from src/lib/appwrite/schema.ts:\n  ` +
          schemaDrift.join("\n  ") +
          "\n\nthis usually means the project was provisioned before a schema\n" +
          "change. `npm run appwrite:provision` re-asserts tables, columns\n" +
          "and permissions, and is safe to re-run.",
      );
    }
    if (exposures.length === 0 && schemaDrift.length === 0) {
      console.log(`\nfailed: ${failedNames.join(", ")}`);
    }
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("\nverification could not run:");
  console.error(error);
  process.exit(2);
});
