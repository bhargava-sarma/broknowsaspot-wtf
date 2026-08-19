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
const projectId = process.env.APPWRITE_PROJECT_ID;
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

async function createColumn(
  tableId: string,
  column: TableSpec["columns"][number],
): Promise<void> {
  const base = { databaseId: DATABASE_ID, tableId, key: column.name };

  switch (column.kind) {
    case "string":
      return void (await db.createStringColumn({
        ...base,
        size: column.size,
        required: column.required,
        xdefault: column.required ? undefined : column.def,
      }));
    case "text":
      return void (await db.createTextColumn({
        ...base,
        required: column.required,
      }));
    case "enum":
      return void (await db.createEnumColumn({
        ...base,
        elements: [...column.values],
        required: column.required,
      }));
    case "float":
      return void (await db.createFloatColumn({
        ...base,
        required: column.required,
        min: column.min,
        max: column.max,
        xdefault: column.required ? undefined : column.def,
      }));
    case "integer":
      return void (await db.createIntegerColumn({
        ...base,
        required: column.required,
        min: column.min,
        max: column.max,
        xdefault: column.required ? undefined : column.def,
      }));
    case "boolean":
      return void (await db.createBooleanColumn({
        ...base,
        required: column.required,
        xdefault: column.required ? undefined : column.def,
      }));
    case "datetime":
      return void (await db.createDatetimeColumn({
        ...base,
        required: column.required,
      }));
    case "point":
      return void (await db.createPointColumn({
        ...base,
        required: column.required,
      }));
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
    await step(`column ${column.name} (${column.kind})`, () =>
      createColumn(table.id, column),
    );
  }

  process.stdout.write("  … waiting for columns");
  await waitForColumns(table.id);
  console.log(" — available");

  for (const index of table.indexes) {
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
