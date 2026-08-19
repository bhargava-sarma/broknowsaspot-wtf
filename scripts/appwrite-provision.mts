/**
 * Stand up the Appwrite schema. Idempotent — safe to re-run.
 *
 * This is the equivalent of supabase/migrations, and it exists as a
 * script rather than a pile of dashboard clicks for the same reason the
 * SQL did: a schema you cannot recreate from the repository is a schema
 * that drifts, and there is no `pg_dump` to fall back on here.
 *
 *   APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1 \
 *   APPWRITE_PROJECT_ID=... \
 *   APPWRITE_API_KEY=... \
 *   npm run appwrite:provision
 *
 * Appwrite creates columns and indexes asynchronously — the call returns
 * before the column exists. Creating an index over a column that is still
 * `processing` fails, so this waits for `available` between phases rather
 * than sleeping and hoping.
 */

import { Client, TablesDB, Teams } from "node-appwrite";
import {
  ADMIN_TEAM_ID,
  DATABASE_ID,
  SCHEMA,
  type TableSpec,
} from "@/lib/appwrite/schema";

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId =
  process.env.APPWRITE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !projectId || !apiKey) {
  console.error(
    "missing config. set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and " +
      "APPWRITE_API_KEY.\n\n" +
      "the api key needs these scopes: databases.read, databases.write,\n" +
      "tables.read, tables.write, collections.read, collections.write,\n" +
      "documents.read, documents.write, teams.read, teams.write",
  );
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const db = new TablesDB(client);
const teams = new Teams(client);

/** Appwrite answers 409 for "already exists", which is success here. */
function isConflict(error: unknown): boolean {
  return (error as { code?: number })?.code === 409;
}

function isMissing(error: unknown): boolean {
  return (error as { code?: number })?.code === 404;
}

async function step<T>(label: string, run: () => Promise<T>): Promise<void> {
  try {
    await run();
    console.log(`  + ${label}`);
  } catch (error) {
    if (isConflict(error)) {
      console.log(`  · ${label} (exists)`);
      return;
    }
    console.error(`  ! ${label}`);
    throw error;
  }
}

/**
 * Block until every column on a table is `available`.
 *
 * Without this, index creation races column creation and fails with a
 * message that does not mention timing at all.
 */
async function waitForColumns(tableId: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const { columns } = await db.listColumns({
      databaseId: DATABASE_ID,
      tableId,
    });
    const pending = columns.filter(
      (column: { status?: string }) => column.status !== "available",
    );
    const failed = pending.filter(
      (column: { status?: string }) => column.status === "failed",
    );
    if (failed.length > 0) {
      throw new Error(
        `columns failed to create on ${tableId}: ` +
          failed.map((c: { key?: string }) => c.key).join(", "),
      );
    }
    if (pending.length === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`columns on ${tableId} never became available`);
}

/**
 * `xdefault` on an update call.
 *
 * The SDK's types mark it optional on every `update*Column` method. The
 * runtime disagrees and throws `Missing required parameter: "xdefault"`
 * when it is undefined — a client-side check, before any request goes
 * out, which is why the error carries `code: 0` and an empty response.
 *
 * `null` passes the check and means "no default", which is also the only
 * legal value for a required column. So the lie is localised here rather
 * than cast at fourteen call sites.
 */
function updateDefault<T>(value: T | undefined): T | undefined {
  return (value ?? null) as T | undefined;
}

/**
 * Create or assert one column.
 *
 * `mode: "assert"` re-applies the column's definition to a table that
 * already has it. That is what makes re-running fix drift rather than
 * skip past it — a column created with the wrong `required` stays wrong
 * forever otherwise, and the failure surfaces somewhere unrelated. It is
 * also how a half-provisioned table recovers without being dropped.
 *
 * Tightening a column to required fails if existing rows hold nulls,
 * which is the correct outcome: that is data loss waiting to happen and
 * it should be looked at rather than forced through.
 */
async function columnCall(
  tableId: string,
  column: TableSpec["columns"][number],
  mode: "create" | "assert",
): Promise<void> {
  const base = { databaseId: DATABASE_ID, tableId, key: column.name };
  const create = mode === "create";

  switch (column.kind) {
    case "string": {
      const xdefault = column.required ? undefined : column.def;
      return void (create
        ? await db.createStringColumn({
            ...base,
            size: column.size,
            required: column.required,
            xdefault,
          })
        : await db.updateStringColumn({
            ...base,
            size: column.size,
            required: column.required,
            xdefault: updateDefault(xdefault),
          }));
    }
    case "text": {
      return void (create
        ? await db.createTextColumn({ ...base, required: column.required })
        : await db.updateTextColumn({
            ...base,
            required: column.required,
            xdefault: updateDefault<string>(undefined),
          }));
    }
    case "enum": {
      const elements = [...column.values];
      return void (create
        ? await db.createEnumColumn({
            ...base,
            elements,
            required: column.required,
          })
        : await db.updateEnumColumn({
            ...base,
            elements,
            required: column.required,
            xdefault: updateDefault<string>(undefined),
          }));
    }
    case "float": {
      const xdefault = column.required ? undefined : column.def;
      return void (create
        ? await db.createFloatColumn({
            ...base,
            required: column.required,
            min: column.min,
            max: column.max,
            xdefault,
          })
        : await db.updateFloatColumn({
            ...base,
            required: column.required,
            min: column.min,
            max: column.max,
            xdefault: updateDefault(xdefault),
          }));
    }
    case "integer": {
      const xdefault = column.required ? undefined : column.def;
      return void (create
        ? await db.createIntegerColumn({
            ...base,
            required: column.required,
            min: column.min,
            max: column.max,
            xdefault,
          })
        : await db.updateIntegerColumn({
            ...base,
            required: column.required,
            min: column.min,
            max: column.max,
            xdefault: updateDefault(xdefault),
          }));
    }
    case "boolean": {
      const xdefault = column.required ? undefined : column.def;
      return void (create
        ? await db.createBooleanColumn({
            ...base,
            required: column.required,
            xdefault,
          })
        : await db.updateBooleanColumn({
            ...base,
            required: column.required,
            xdefault: updateDefault(xdefault),
          }));
    }
    case "datetime": {
      return void (create
        ? await db.createDatetimeColumn({ ...base, required: column.required })
        : await db.updateDatetimeColumn({
            ...base,
            required: column.required,
            xdefault: updateDefault<string>(undefined),
          }));
    }
    case "point": {
      // Geometric columns are the exception: their update methods do
      // not demand xdefault, so this one stays plain.
      return void (create
        ? await db.createPointColumn({ ...base, required: column.required })
        : await db.updatePointColumn({ ...base, required: column.required }));
    }
  }
}

async function provisionTable(table: TableSpec): Promise<void> {
  console.log(`\n${table.id}`);

  await step(`table "${table.name}"`, () =>
    db.createTable({
      databaseId: DATABASE_ID,
      tableId: table.id,
      name: table.name,
      permissions: table.permissions,
      rowSecurity: table.rowSecurity,
    }),
  );

  // Permissions and rowSecurity are only applied by createTable, so a
  // table that already existed keeps whatever it had. Re-assert them —
  // this is the setting that decides whether row permissions are
  // consulted at all, and a silently-wrong value here is a data leak.
  await step("permissions", () =>
    db.updateTable({
      databaseId: DATABASE_ID,
      tableId: table.id,
      name: table.name,
      permissions: table.permissions,
      rowSecurity: table.rowSecurity,
    }),
  );

  for (const column of table.columns) {
    try {
      await columnCall(table.id, column, "create");
      console.log(`  + column ${column.name} (${column.kind})`);
    } catch (error) {
      if (!isConflict(error)) {
        console.error(`  ! column ${column.name}`);
        throw error;
      }
      // Already there — re-apply the definition so a column created by an
      // earlier run with different settings converges instead of quietly
      // staying wrong.
      await columnCall(table.id, column, "assert");
      console.log(`  · column ${column.name} (asserted)`);
    }
  }

  process.stdout.write("  … waiting for columns");
  await waitForColumns(table.id);
  console.log(" — available");

  for (const index of table.indexes) {
    // A spatial index refuses a nullable column, which is why `location`
    // is required. If this fails with column_index_invalid, the column's
    // `required` is the thing to look at, not the index.
    await step(`index ${index.key} (${index.type})`, () =>
      db.createIndex({
        databaseId: DATABASE_ID,
        tableId: table.id,
        key: index.key,
        // The SDK types this as an enum; the wire format is the string.
        type: index.type as never,
        columns: index.columns,
        orders: index.orders as never,
      }),
    );
  }
}

async function main(): Promise<void> {
  console.log(`provisioning ${DATABASE_ID} on ${endpoint}\n`);

  await step(`database "${DATABASE_ID}"`, () =>
    db.create({ databaseId: DATABASE_ID, name: "broknowsaspot" }),
  );

  for (const table of SCHEMA) {
    await provisionTable(table);
  }

  console.log("\nteams");
  // Replaces `public.admins`. Membership is the moderation gate, and it
  // is granted by invitation from the console — there is no self-serve
  // path to joining it, which is the whole point.
  await step(`team "${ADMIN_TEAM_ID}"`, () =>
    teams.create({ teamId: ADMIN_TEAM_ID, name: "admins" }),
  );

  console.log(
    "\ndone. next: npm run appwrite:verify\n" +
      "\nnothing is readable by the public yet — rows carry their own\n" +
      "permissions, and none exist. seed with npm run appwrite:seed.",
  );
}

main().catch((error) => {
  console.error("\nprovisioning failed:");
  console.error(
    isMissing(error) ? "  not found — check the project id" : error,
  );
  process.exit(1);
});
