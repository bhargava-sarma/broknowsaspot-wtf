import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { listSpots } from "@/lib/data/spots-repo";
import { checkSubmissionRate } from "@/lib/security/rate-limit";
import { requestKey } from "@/lib/security/request-key";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { validateDraft } from "@/lib/spots/validate";
import { getAdminSupabase, isWriteEnabled } from "@/lib/supabase/admin";

/**
 * GET — the index as JSON, through the same repository the pages use, so
 * it shows exactly what the site shows.
 *
 * POST — accept a submission. Publishes immediately, per the product
 * decision; nothing waits in a queue.
 *
 * The order of the checks below is the whole security model, and it is
 * cheapest-first on purpose: reject bots before spending a database round
 * trip on them, and reject malformed payloads before spending a Cloudflare
 * round trip.
 */

export const revalidate = 300;

export async function GET() {
  const spots = await listSpots();
  return NextResponse.json({ spots, total: spots.length });
}

export async function POST(request: Request) {
  if (!isWriteEnabled) {
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

  // 3. Identity for rate limiting. Without a key we cannot rate limit at
  //    all, so the write is refused rather than left unmetered.
  const submitterKey = requestKey(request);
  const supabase = getAdminSupabase();
  if (!submitterKey || !supabase) {
    return NextResponse.json(
      { ok: false, message: "submissions aren't available right now." },
      { status: 503 },
    );
  }

  // 4. Rate limit.
  const rate = await checkSubmissionRate(supabase, submitterKey);
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
    // Slug is generated in the database so the uniqueness check and the
    // insert are one step; a read-then-write here would race.
    const { data: slugData, error: slugError } = await supabase.rpc(
      "unique_slug",
      { input: result.draft.name },
    );
    if (slugError) throw slugError;

    const slug = String(slugData);
    const draft = result.draft;

    const { data, error } = await supabase
      .from("spots")
      .insert({
        slug,
        name: draft.name,
        region: draft.region,
        country: draft.country,
        lat: draft.lat,
        lng: draft.lng,
        category: draft.category,
        difficulty: draft.difficulty,
        access: draft.access,
        summary: draft.summary,
        description: draft.description,
        watch_out: draft.watchOut,
      })
      .select("id, slug")
      .single();

    if (error) throw error;

    // Audit trail and the rate limiter's source of truth. Linked to the
    // spot so that if one key turns out to be a spammer, everything it
    // submitted can be found in one query.
    await supabase
      .from("submission_log")
      .insert({ submitter_key: submitterKey, spot_id: data.id });

    // The new spot would otherwise wait out the five-minute ISR window
    // before appearing, which reads as the submission having failed.
    revalidatePath("/explore");
    revalidatePath(`/spot/${data.slug}`);

    return NextResponse.json(
      { ok: true, slug: data.slug, url: `/spot/${data.slug}` },
      { status: 201 },
    );
  } catch (thrown) {
    console.error("[spots] submission failed", thrown);
    return NextResponse.json(
      { ok: false, message: "couldn't save that. try again in a moment." },
      { status: 500 },
    );
  }
}
