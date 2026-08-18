import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { checkNoteRate } from "@/lib/security/rate-limit";
import { requestKey } from "@/lib/security/request-key";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { validateNote } from "@/lib/spots/validate-note";
import { getAdminSupabase, isWriteEnabled } from "@/lib/supabase/admin";

/**
 * Add a community note to a spot.
 *
 * Same guard order as the spot submission, and cheapest-first for the
 * same reason: reject a malformed payload before spending a Cloudflare
 * round trip on it, and reject a bot before spending a database one.
 *
 * Publishes immediately, like everything else here. A note that waits in
 * a queue is a note about conditions that have already changed again.
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!isWriteEnabled) {
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

  // 1. Shape. Same validator the form runs; this copy is the enforcement
  //    point, and it also catches the future dates the schema cannot —
  //    a CHECK constraint may not call current_date.
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

  // 3. Identity for rate limiting. Without a key there is no way to meter
  //    this, so the write is refused rather than left unmetered.
  const submitterKey = requestKey(request);
  const supabase = getAdminSupabase();
  if (!submitterKey || !supabase) {
    return NextResponse.json(
      { ok: false, message: "notes aren't available right now." },
      { status: 503 },
    );
  }

  // 4. Rate limit, counted in note_log — its own budget, separate from
  //    spot submissions.
  const rate = await checkNoteRate(supabase, submitterKey);
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
    // Only a visible spot can take a note. Hidden and removed entries are
    // excluded deliberately: an entry pulled down by reports should not
    // keep accumulating discussion while it is under review.
    const { data: spot, error: lookupError } = await supabase
      .from("spots")
      .select("id, slug")
      .eq("slug", slug)
      .is("hidden_at", null)
      .is("removed_at", null)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!spot) {
      return NextResponse.json(
        { ok: false, message: "no such spot." },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("spot_notes")
      .insert({
        spot_id: spot.id,
        author: result.draft.author,
        body: result.draft.body,
        noted_on: result.draft.notedOn,
      })
      .select("id, author, body, noted_on")
      .single();

    if (error) throw error;

    // The rate limiter's source of truth, and the trail that links one
    // key to everything it wrote. Kept off spot_notes on purpose: RLS
    // filters rows, not columns, so a key stored there would be readable
    // by anyone who asked for the column.
    await supabase
      .from("note_log")
      .insert({ submitter_key: submitterKey, note_id: data.id });

    // Otherwise the note waits out the five-minute ISR window, which
    // reads as the submission having silently failed.
    revalidatePath(`/spot/${slug}`);

    return NextResponse.json(
      {
        ok: true,
        note: {
          id: data.id,
          author: data.author,
          body: data.body,
          date: data.noted_on,
        },
      },
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
