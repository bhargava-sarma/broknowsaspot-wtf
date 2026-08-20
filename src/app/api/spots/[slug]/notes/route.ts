import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createNote } from "@/lib/appwrite/write";
import { isAppwriteWriteEnabled } from "@/lib/appwrite/server";
import { checkNoteRate } from "@/lib/security/rate-limit";
import { requestKey } from "@/lib/security/request-key";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { validateNote } from "@/lib/spots/validate-note";

/**
 * Add a community note to a spot.
 *
 * Same guard order as a submission, and cheapest-first for the same
 * reason. Notes have their own rate-limit budget: leaving one is a much
 * smaller act than adding a spot, and someone reporting back on four
 * places they walked this weekend is normal rather than abuse.
 *
 * Only a visible spot takes a note. An entry pulled down by reports
 * should not keep accumulating discussion while it is under review.
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!isAppwriteWriteEnabled) {
    return NextResponse.json(
      { ok: false, message: "notes aren't available right now." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, errors: { _: "request body was not valid json" } },
      { status: 400 },
    );
  }

  // 1. Shape. The same validator the form runs.
  const result = validateNote(payload);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, errors: result.errors },
      { status: 422 },
    );
  }

  // 2. Bot check.
  const token = (payload as { turnstileToken?: unknown }).turnstileToken;
  const turnstile = await verifyTurnstile(request, token);
  if (!turnstile.ok) {
    return NextResponse.json(
      { ok: false, message: turnstile.message },
      { status: turnstile.status },
    );
  }

  // 3. Identity for rate limiting.
  const submitterKey = requestKey(request);
  if (!submitterKey) {
    return NextResponse.json(
      { ok: false, message: "notes aren't available right now." },
      { status: 503 },
    );
  }

  // 4. Rate limit, counted in note_log — its own budget.
  const rate = await checkNoteRate(submitterKey);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: `that's a lot of notes — try again in about ${rate.retryAfterMinutes} minutes.`,
      },
      {
        status: 429,
        headers: { "retry-after": String(rate.retryAfterMinutes * 60) },
      },
    );
  }

  try {
    // createNote checks the spot is visible and reports a miss the same
    // way a genuine 404 would.
    const created = await createNote(slug, result.draft, submitterKey);
    if (!created.ok) {
      return NextResponse.json(
        { ok: false, message: "no such spot." },
        { status: 404 },
      );
    }

    revalidatePath(`/spot/${slug}`);
    return NextResponse.json(
      { ok: true, note: created.value },
      { status: 201 },
    );
  } catch (thrown) {
    console.error(`[notes] could not add a note to "${slug}"`, thrown);
    return NextResponse.json(
      { ok: false, message: "couldn't save that. try again in a moment." },
      { status: 500 },
    );
  }
}
