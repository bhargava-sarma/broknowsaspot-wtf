import "server-only";

import { readAdminGate as readAppwriteGate } from "@/lib/appwrite/auth";

/**
 * Who is asking, and are they allowed.
 *
 * Four outcomes rather than a boolean, because each deserves a different
 * page. "Signed in but not an admin" in particular must not redirect back
 * to the login screen — the visitor already logged in, so bouncing them
 * there is a loop and a lie about what happened.
 *
 * `secret` is the session credential. Admin reads run *as the signed-in
 * user* rather than on the API key, so that hidden rows come back only
 * because they carry `read("team:admins")` and Appwrite agrees. Pass it
 * to the moderation reads and nowhere else; never into a component that
 * renders.
 */
export type AdminGate =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "not-admin"; email: string }
  | { state: "admin"; userId: string; email: string; secret: string };

export const readAdminGate = readAppwriteGate;
