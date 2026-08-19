/**
 * Create a moderator on this project, or promote an existing account.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm run appwrite:admin
 *
 * Appwrite accounts are per-project. The account that moderates staging
 * does not exist in production — a separate project is a separate user
 * directory — so this has to be run once per project.
 *
 * It runs on the server API key deliberately. Adding a member through the
 * console sends an invitation the recipient has to accept from an email;
 * the docs are explicit that a membership created from a Server SDK is
 * added directly instead. For the first moderator that matters, because
 * the invitation flow depends on email delivery working, and the person
 * being invited is the person holding the API key anyway.
 *
 * There is deliberately no self-service path to becoming an admin. This
 * script needs the API key, which means it needs someone who already
 * controls the project.
 */

import { Client, Query, Teams, Users, ID } from "node-appwrite";

import { ADMIN_TEAM_ID } from "@/lib/appwrite/schema";

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId =
  process.env.APPWRITE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!endpoint || !projectId || !apiKey) {
  console.error(
    "set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY\n\n" +
      "this script needs users.read and users.write on top of the scopes\n" +
      "the other scripts use — it is the only one that touches accounts.",
  );
  process.exit(1);
}
if (!email) {
  console.error(
    "set ADMIN_EMAIL to the address that will moderate, and\n" +
      "ADMIN_PASSWORD if the account does not exist yet.\n\n" +
      "  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm run appwrite:admin",
  );
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);
const users = new Users(client);
const teams = new Teams(client);

async function main() {
  console.log(`project ${projectId}\n`);

  // Find the account, or make one.
  const found = await users.list({ queries: [Query.equal("email", email!)] });
  let userId: string;

  if (found.users.length > 0) {
    userId = (found.users[0] as { $id: string }).$id;
    console.log(`  · account exists (${email})`);
  } else {
    if (!password) {
      console.error(
        `\nno account for ${email} on this project, and no ADMIN_PASSWORD\n` +
          "to create one with. appwrite accounts are per-project — the one\n" +
          "that moderates another project does not exist here.",
      );
      process.exit(1);
    }
    if (password.length < 8) {
      console.error("\nappwrite requires a password of at least 8 characters.");
      process.exit(1);
    }
    const created = await users.create({
      userId: ID.unique(),
      email,
      password,
    });
    userId = (created as { $id: string }).$id;
    console.log(`  + account created (${email})`);
  }

  // Already a moderator?
  const members = await teams.listMemberships({
    teamId: ADMIN_TEAM_ID,
    queries: [Query.equal("userId", userId), Query.limit(1)],
  });
  if ((members.total ?? 0) > 0) {
    console.log(`  · already in the "${ADMIN_TEAM_ID}" team`);
  } else {
    await teams.createMembership({
      teamId: ADMIN_TEAM_ID,
      userId,
      roles: ["owner"],
    });
    console.log(`  + added to the "${ADMIN_TEAM_ID}" team`);
  }

  console.log(
    "\ndone. `npm run appwrite:verify` should now read 'admin team has a\n" +
      "member: true', and /admin/login will accept this account.",
  );
}

main().catch((error) => {
  const message = String((error as { message?: string }).message ?? error);

  // Appwrite names the missing scope but not where to add it, and this is
  // the only script that needs users.* — an API key made for the other
  // scripts will not have it.
  const missing = message.match(/missing scopes \(\[(.+?)\]\)/);
  if (missing) {
    console.error(
      `\nthe api key is missing ${missing[1]}.\n\n` +
        "appwrite console -> your project -> settings -> api keys -> the key\n" +
        "you are using -> add the scope, update, and run this again.\n\n" +
        "this script needs users.read and users.write, which the provisioning\n" +
        "scripts do not — those never touch accounts.",
    );
    process.exit(1);
  }

  console.error("\nfailed:");
  console.error(message);
  process.exit(1);
});
