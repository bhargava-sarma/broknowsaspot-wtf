import { NextResponse } from "next/server";

import { listSpots } from "@/lib/data/spots-repo";

/**
 * The index as JSON.
 *
 * Reads through the same repository the pages use, so it shows exactly
 * what the site shows — including the seed fallback while the database is
 * still being set up.
 *
 * There is deliberately no POST yet. It returns with the submission work,
 * where it will run on the server with the service role key so that
 * validation, rate limiting and bot checks happen somewhere a client
 * cannot skip. `validateDraft` in lib/spots/validate.ts is already the
 * shared contract, and `SpotDraft` is already the payload shape.
 */
export const revalidate = 300;

export async function GET() {
  const spots = await listSpots();
  return NextResponse.json({ spots, total: spots.length });
}
