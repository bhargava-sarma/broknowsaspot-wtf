import "server-only";

import { Client, TablesDB, Teams } from "node-appwrite";

/**
 * Server-side Appwrite clients.
 *
 * `import "server-only"` is the build-time guard: if any client component
 * ever pulls this in, the build fails rather than shipping an API key to
 * the browser. The Supabase service-role module carried the same line for
 * the same reason, and it is the cheapest insurance in the codebase.
 *
 * Two clients, deliberately:
 *
 *   adminClient() — full access via the API key. Every write in the app
 *   goes through it, because no row grants create/update/delete to
 *   anyone. It bypasses row permissions entirely, which is exactly the
 *   role Supabase's service key played.
 *
 *   guestClient() — endpoint and project only. Sees precisely what a
 *   browser would. Public reads use it *on purpose*: if the server-side
 *   filter is ever wrong, Appwrite still refuses, and "the database
 *   independently refuses" stays true rather than becoming "our code
 *   remembers to filter".
 */

const endpoint = process.env.APPWRITE_ENDPOINT;
/**
 * The project id, under either name.
 *
 * The scripts take APPWRITE_PROJECT_ID and the app needs the value inside
 * the proxy, which only sees NEXT_PUBLIC_ variables reliably. Two names
 * for one value is a footgun — set one, get a working app and broken
 * scripts, with no error that says so — so both are accepted everywhere
 * and setting either is enough.
 *
 * It is not a secret. It identifies the project the way a Supabase URL
 * did, and a browser would hold it in any app that talked to Appwrite
 * directly. This one does not, but the NEXT_PUBLIC_ prefix is still
 * correct rather than merely tolerated.
 */
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ??
  process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

export const isAppwriteConfigured = Boolean(endpoint && projectId);
export const isAppwriteWriteEnabled = Boolean(endpoint && projectId && apiKey);

function base(): Client | null {
  if (!endpoint || !projectId) return null;
  return new Client().setEndpoint(endpoint).setProject(projectId);
}

/** Reads only what the public may read. Enforced by Appwrite, not by us. */
export function guestTables(): TablesDB | null {
  const client = base();
  return client ? new TablesDB(client) : null;
}

/** Full access. Never reachable from a client component. */
export function adminTables(): TablesDB | null {
  const client = base();
  if (!client || !apiKey) return null;
  return new TablesDB(client.setKey(apiKey));
}

export function adminTeams(): Teams | null {
  const client = base();
  if (!client || !apiKey) return null;
  return new Teams(client.setKey(apiKey));
}
