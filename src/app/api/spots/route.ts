import { NextResponse } from "next/server";

import { SPOTS } from "@/lib/data/spots";
import { validateDraft } from "@/lib/spots/validate";

/**
 * Mock API over the seed set.
 *
 * Deliberately shaped like the real thing — same payloads, same validation,
 * same status codes — so swapping the body of these handlers for Supabase
 * queries is the only change needed later. Submissions are accepted,
 * validated and echoed back, but nothing is persisted: the process is
 * stateless and any in-memory store would be a lie the moment there are two
 * server instances.
 */

export async function GET() {
  return NextResponse.json({ spots: SPOTS, total: SPOTS.length });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, errors: { _: "request body was not valid json" } },
      { status: 400 },
    );
  }

  const result = validateDraft(payload);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, errors: result.errors },
      { status: 422 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      // The id a database would have assigned.
      received: { ...result.draft, submittedAt: new Date().toISOString() },
      message: "submission accepted — not persisted until the database lands",
    },
    { status: 201 },
  );
}
