import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createSpot } from "@/lib/appwrite/write";
import { isAppwriteWriteEnabled } from "@/lib/appwrite/server";
import { listSpots } from "@/lib/data/spots-repo";
import { checkSubmissionRate } from "@/lib/security/rate-limit";
import { requestKey } from "@/lib/security/request-key";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { validateDraft } from "@/lib/spots/validate";

/**
 * GET — the index as JSON, through the same repository the pages use, so
 * it shows exactly what the site shows.
 *
 * POST — accept a submission. Publishes immediately, per the product
 * decision; nothing waits in a queue.
 *
 * The order of the checks below is the whole security model, and it is
 * cheapest-first on purpose: reject a malformed payload before spending a
 * Cloudflare round trip on it, and reject a bot before spending a
 * database one.
 */

export const revalidate = 300;

export async function GET() {
  const spots = await listSpots();
  if (spots === null) {
    return NextResponse.json(
      { ok: false, message: "the index is unavailable right now." },
      { status: 503 },
    );
  }
  return NextResponse.json({ spots, total: spots.length });
}

export async function POST(request: Request) {
  if (!isAppwriteWriteEnabled) {
    return NextResponse.json(
      { ok: false, message: "submissions aren't available right now." },
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

  // 1. Shape. The same validator the form runs — the client copy is a
  //    convenience, this is the enforcement point.
  const result = validateDraft(payload);
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

  // 3. Identity for rate limiting. Without a key there is no way to meter
  //    this, so the write is refused rather than left unmetered.
  const submitterKey = requestKey(request);
  if (!submitterKey) {
    return NextResponse.json(
      { ok: false, message: "submissions aren't available right now." },
      { status: 503 },
    );
  }

  // 4. Rate limit.
  const rate = await checkSubmissionRate(submitterKey);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: `that's enough for now — try again in about ${rate.retryAfterMinutes} minutes.`,
      },
      {
        status: 429,
        headers: { "retry-after": String(rate.retryAfterMinutes * 60) },
      },
    );
  }

  try {
    const created = await createSpot(result.draft, submitterKey);
    if (!created.ok) {
      console.error("[spots] submission failed", created.reason);
      return NextResponse.json(
        { ok: false, message: "couldn't save that. try again in a moment." },
        { status: 500 },
      );
    }

    // The new spot would otherwise wait out the five-minute revalidate
    // window before appearing, which reads as the submission having
    // failed.
    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath(`/spot/${created.value.slug}`);

    return NextResponse.json(
      {
        ok: true,
        slug: created.value.slug,
        url: `/spot/${created.value.slug}`,
      },
      { status: 201 },
    );
  } catch (thrown) {
    console.error("[spots] submission threw", thrown);
    return NextResponse.json(
      { ok: false, message: "couldn't save that. try again in a moment." },
      { status: 500 },
    );
  }
}
