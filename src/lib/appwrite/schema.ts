/**
 * The Appwrite schema, declared once.
 *
 * Both the provisioning script and the verifier read this file, so they
 * cannot disagree about what the schema is supposed to be. That mattered
 * on Supabase too — `verify.sql` parsed the real catalogue rather than a
 * copy of the migration — and it matters more here, because Appwrite has
 * no `\d spots` to fall back on.
 *
 * ------------------------------------------------------------------
 * How authorisation works here, and how it differs from what it replaces
 * ------------------------------------------------------------------
 *
 * Supabase enforced visibility with a policy that read the row:
 *
 *     using (hidden_at is null and removed_at is null)
 *
 * Appwrite permissions are access-control lists, not predicates over the
 * row's data. There is no way to say "readable by anyone *while*
 * hidden_at is null". So visibility is carried in two places:
 *
 *   - `hiddenAt` / `removedAt` — the data, and the audit trail
 *   - the row's own `$permissions` — the enforcement
 *
 * Those two can drift, which the Postgres version made structurally
 * impossible. Three things keep them together:
 *
 *   1. Only one code path writes either of them, and it writes both.
 *   2. It does so inside a transaction, so a partial write rolls back.
 *   3. `scripts/appwrite-verify.mjs` asserts the invariant directly —
 *      every row's permissions must match its hiddenAt/removedAt state.
 *
 * Check 3 is the one that matters. Treat a failure there as a security
 * finding, not a cosmetic mismatch: a row whose data says hidden and
 * whose ACL says `any` is publicly readable.
 */

export const DATABASE_ID = "broknowsaspot";

export const TABLES = {
  spots: "spots",
  notes: "notes",
  reports: "reports",
  submissionLog: "submission_log",
  noteLog: "note_log",
  moderationLog: "moderation_log",
} as const;

/** The team whose members may moderate. Replaces `public.admins`. */
export const ADMIN_TEAM_ID = "admins";

/**
 * Report count at which a spot auto-hides.
 *
 * On Supabase this lived inside a trigger function and was unreachable
 * from the client by construction. Here it is a constant in server-only
 * code — `src/lib/appwrite/*` is imported exclusively by route handlers
 * and scripts, never by a client component. Publishing "10 reports takes
 * an entry down" is an instruction manual for brigading, so keep it that
 * way: if this ever needs to be read in the browser, the answer is no.
 */
export const REPORT_THRESHOLD = 10;

export const CATEGORIES = [
  "ruin",
  "water",
  "viewpoint",
  "underground",
  "shore",
  "transit",
  "structure",
] as const;

export const DIFFICULTIES = ["easy", "moderate", "hard", "serious"] as const;
export const ACCESS_TYPES = ["open", "permit", "grey", "private"] as const;
export const REPORT_REASONS = [
  "dangerous",
  "private",
  "wrong",
  "gone",
  "spam",
] as const;
export const MODERATION_ACTIONS = ["hide", "restore", "remove"] as const;

type Column =
  | {
      name: string;
      kind: "string";
      size: number;
      required: boolean;
      def?: string;
    }
  | { name: string; kind: "text"; size: number; required: boolean }
  | { name: string; kind: "enum"; values: readonly string[]; required: boolean }
  | {
      name: string;
      kind: "float";
      required: boolean;
      min?: number;
      max?: number;
      def?: number;
    }
  | {
      name: string;
      kind: "integer";
      required: boolean;
      min?: number;
      max?: number;
      def?: number;
    }
  | { name: string; kind: "boolean"; required: boolean; def?: boolean }
  | { name: string; kind: "datetime"; required: boolean }
  | { name: string; kind: "point"; required: boolean };

type Index = {
  key: string;
  type: "key" | "unique" | "fulltext" | "spatial";
  columns: string[];
  orders?: string[];
};

export type TableSpec = {
  id: string;
  name: string;
  /**
   * Table-level permissions. Empty means nobody reaches this table
   * without a server API key — which is what every write-path table
   * wants. Row-level permissions are set per row at write time.
   */
  permissions: string[];
  /** Whether per-row permissions are consulted at all. */
  rowSecurity: boolean;
  columns: Column[];
  indexes: Index[];
};

export const SCHEMA: TableSpec[] = [
  {
    id: TABLES.spots,
    name: "spots",
    // No table-level grant. Visibility is decided per row: a live spot
    // carries read(any), a hidden or removed one carries only
    // read(team:admins). Writes never come from a client at all.
    permissions: [],
    rowSecurity: true,
    columns: [
      { name: "slug", kind: "string", size: 120, required: true },
      { name: "name", kind: "string", size: 80, required: true },
      { name: "region", kind: "string", size: 60, required: true },
      { name: "country", kind: "string", size: 60, required: true },

      // lat/lng stay the source of truth and mirror the TypeScript Spot
      // type exactly, so nothing converts on the way out.
      { name: "lat", kind: "float", required: true, min: -90, max: 90 },
      { name: "lng", kind: "float", required: true, min: -180, max: 180 },

      // Derived from lat/lng and written by the same code that writes
      // them. Postgres generated this column and rejected any attempt to
      // set it directly; Appwrite has no generated columns, so the
      // verifier checks the two agree instead.
      //
      // Required, and not merely as a nicety: Appwrite refuses a spatial
      // index on a nullable column, and without the index every geo query
      // degrades to a full scan. It also matches what Postgres did — the
      // generated column sat over two NOT NULL fields, so it was never
      // null there either.
      { name: "location", kind: "point", required: true },

      { name: "category", kind: "enum", values: CATEGORIES, required: true },
      {
        name: "difficulty",
        kind: "enum",
        values: DIFFICULTIES,
        required: true,
      },
      { name: "access", kind: "enum", values: ACCESS_TYPES, required: true },

      { name: "summary", kind: "string", size: 140, required: true },
      { name: "description", kind: "text", size: 4000, required: true },
      { name: "watchOut", kind: "string", size: 500, required: true },
      { name: "bestWindow", kind: "string", size: 120, required: false },
      { name: "walkInKm", kind: "float", required: false, min: 0, def: 0 },

      // [{ src, alt }] — matches SpotPhoto[]. JSON in a text column
      // rather than a relationship: photos have no independent lifecycle
      // yet and a related table would be four extra round trips per page.
      { name: "photos", kind: "text", size: 8000, required: false },

      // Denormalised so the moderation queue can sort by it without
      // reading the reports table, which should travel as little as
      // possible. Recomputed on every report, never trusted as a source
      // of truth — the verifier checks it against the real count.
      { name: "reportCount", kind: "integer", required: false, min: 0, def: 0 },

      { name: "hiddenAt", kind: "datetime", required: false },
      { name: "hiddenReason", kind: "string", size: 300, required: false },
      { name: "removedAt", kind: "datetime", required: false },
    ],
    indexes: [
      { key: "slug_unique", type: "unique", columns: ["slug"] },
      { key: "location_spatial", type: "spatial", columns: ["location"] },
      { key: "category_idx", type: "key", columns: ["category"] },
      { key: "difficulty_idx", type: "key", columns: ["difficulty"] },
      { key: "access_idx", type: "key", columns: ["access"] },
      { key: "hidden_idx", type: "key", columns: ["hiddenAt"] },
    ],
  },

  {
    id: TABLES.notes,
    name: "spot notes",
    permissions: [],
    rowSecurity: true,
    columns: [
      { name: "spotId", kind: "string", size: 64, required: true },
      { name: "author", kind: "string", size: 40, required: true },
      { name: "body", kind: "text", size: 2000, required: true },
      // When the visit happened, which is the part that decides whether
      // the information is still worth anything. Distinct from $createdAt.
      { name: "notedOn", kind: "datetime", required: true },
      { name: "hiddenAt", kind: "datetime", required: false },
    ],
    indexes: [
      { key: "spot_idx", type: "key", columns: ["spotId"] },
      { key: "noted_idx", type: "key", columns: ["notedOn"], orders: ["DESC"] },
    ],
  },

  {
    id: TABLES.reports,
    name: "reports",
    // Nothing public, ever. Not readable with the publishable key even
    // for a row you wrote yourself.
    permissions: [],
    rowSecurity: false,
    columns: [
      { name: "spotId", kind: "string", size: 64, required: true },
      { name: "reason", kind: "enum", values: REPORT_REASONS, required: true },
      { name: "detail", kind: "string", size: 500, required: false },
      // HMAC of the client address, never the address. Weak identity by
      // design — shared behind NAT, rotated with a VPN — so it raises the
      // cost of gaming the threshold rather than making it impossible.
      { name: "reporterKey", kind: "string", size: 64, required: true },
    ],
    indexes: [
      // One report per person per spot, enforced by the database rather
      // than by the route remembering to check. Someone clicking ten
      // times moves the count to 1.
      {
        key: "one_per_reporter",
        type: "unique",
        columns: ["spotId", "reporterKey"],
      },
      { key: "spot_idx", type: "key", columns: ["spotId"] },
    ],
  },

  {
    id: TABLES.submissionLog,
    name: "submission log",
    permissions: [],
    rowSecurity: false,
    columns: [
      { name: "spotId", kind: "string", size: 64, required: false },
      { name: "submitterKey", kind: "string", size: 64, required: true },
    ],
    indexes: [{ key: "key_idx", type: "key", columns: ["submitterKey"] }],
  },

  {
    id: TABLES.noteLog,
    name: "note log",
    permissions: [],
    rowSecurity: false,
    columns: [
      { name: "noteId", kind: "string", size: 64, required: false },
      { name: "submitterKey", kind: "string", size: 64, required: true },
    ],
    indexes: [{ key: "key_idx", type: "key", columns: ["submitterKey"] }],
  },

  {
    id: TABLES.moderationLog,
    name: "moderation log",
    permissions: [],
    rowSecurity: false,
    columns: [
      { name: "spotId", kind: "string", size: 64, required: true },
      // Set when the decision was about one note rather than the entry.
      { name: "noteId", kind: "string", size: 64, required: false },
      {
        name: "action",
        kind: "enum",
        values: MODERATION_ACTIONS,
        required: true,
      },
      { name: "reason", kind: "string", size: 500, required: false },
      // Null for anything not attributable to a person. The auto-hide
      // path writes one of these, which the Postgres version could not
      // do — its trigger ran as an anonymous reporter with no way to
      // reach the audit table.
      { name: "actorId", kind: "string", size: 64, required: false },
      { name: "actorEmail", kind: "string", size: 320, required: false },
    ],
    indexes: [{ key: "spot_idx", type: "key", columns: ["spotId"] }],
  },
];
