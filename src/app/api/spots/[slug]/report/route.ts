import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { requestKey } from "@/lib/security/request-key";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { isReportReason } from "@/lib/spots/reports";
import { getAdminSupabase, isWriteEnabled } from "@/lib/supabase/admin";
import * as writes from "@/lib/data/writes";

/**
 * Report a spot.
 *
 * A spot auto-hides once 10 distinct people report it, and every reason
 * counts the same — that rule lives in a database trigger, not here, so it
 * cannot be bypassed by writing to the table another way.
 *
 * The response never reveals the running total or how close a spot is to
 * the threshold. Publishing that turns the count into a progress bar for
 * anyone trying to take an entry down.
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (
    !(writes.useAppwriteWrites ? writes.isAppwriteWritable : isWriteEnabled)
  ) {
    return NextResponse.json(
      { ok: false, message: "reporting isn't available right now." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "request body was not valid json" },
      { status: 400 },
    );
  }

  const body = payload as {
    reason?: unknown;
    detail?: unknown;
    turnstileToken?: unknown;
  };

  if (!isReportReason(body.reason)) {
    return NextResponse.json(
      { ok: false, message: "pick a reason for the report." },
      { status: 422 },
    );
  }

  const detail =
    typeof body.detail === "string" ? body.detail.trim().slice(0, 500) : null;

  const turnstile = await verifyTurnstile(request, body.turnstileToken);
  if (!turnstile.ok) {
    return NextResponse.json(
      { ok: false, message: turnstile.message },
      { status: turnstile.status },
    );
  }

  const reporterKey = requestKey(request);

  if (writes.useAppwriteWrites) {
    if (!reporterKey) {
      return NextResponse.json(
        { ok: false, message: "reporting isn't available right now." },
        { status: 503 },
      );
    }
    try {
      const logged = await writes.reportSpot(
        slug,
        body.reason,
        detail,
        reporterKey,
      );
      if (!logged.ok) {
        return NextResponse.json(
          { ok: false, message: "no such spot." },
          { status: 404 },
        );
      }
      // The threshold may have just hidden it, in which case the cached
      // page has to go.
      revalidatePath("/explore");
      revalidatePath(`/spot/${slug}`);
      // Never says whether it hid, or how close it is. Publishing that
      // turns the count into a progress bar for taking an entry down.
      return NextResponse.json({ ok: true, message: "logged. thanks." });
    } catch (thrown) {
      console.error(`[reports] could not record report for "${slug}"`, thrown);
      return NextResponse.json(
        { ok: false, message: "couldn't log that. try again in a moment." },
        { status: 500 },
      );
    }
  }

  const supabase = getAdminSupabase();
  if (!reporterKey || !supabase) {
    return NextResponse.json(
      { ok: false, message: "reporting isn't available right now." },
      { status: 503 },
    );
  }

  try {
    const { data: spot, error: lookupError } = await supabase
      .from("spots")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!spot) {
      return NextResponse.json(
        { ok: false, message: "no such spot." },
        { status: 404 },
      );
    }

    const { error } = await supabase.from("spot_reports").insert({
      spot_id: spot.id,
      reason: body.reason,
      detail: detail || null,
      reporter_key: reporterKey,
    });

    // 23505 is the unique (spot_id, reporter_key) constraint — this person
    // has already reported this spot. Answered as success on purpose: the
    // outcome they wanted is already true, and saying "you already reported
    // this" would confirm the key is stable and invite probing.
    if (error && error.code !== "23505") throw error;

    // The trigger may have just hidden it, in which case the cached page
    // has to go.
    revalidatePath("/explore");
    revalidatePath(`/spot/${slug}`);

    return NextResponse.json({ ok: true, message: "logged. thanks." });
  } catch (thrown) {
    console.error(`[reports] could not record report for "${slug}"`, thrown);
    return NextResponse.json(
      { ok: false, message: "couldn't log that. try again in a moment." },
      { status: 500 },
    );
  }
}
