import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { reportSpot } from "@/lib/appwrite/write";
import { isAppwriteWriteEnabled } from "@/lib/appwrite/server";
import { requestKey } from "@/lib/security/request-key";
import { checkHuman } from "@/lib/security/human-check";
import { isReportReason } from "@/lib/spots/reports";

/**
 * Report a spot.
 *
 * A spot auto-hides once enough distinct people report it. The threshold
 * lives in server-only code and is never sent to the client: publishing
 * "N reports removes a spot" is an instruction manual for brigading.
 *
 * The response never reveals the running total or how close a spot is.
 * Saying so turns the count into a progress bar for taking an entry down.
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!isAppwriteWriteEnabled) {
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

  const reporterKey = requestKey(request);
  if (!reporterKey) {
    return NextResponse.json(
      { ok: false, message: "reporting isn't available right now." },
      { status: 503 },
    );
  }

  // A fresh Turnstile token, or the ticket from one already redeemed.
  // Reporting two things in a row is one visit and one human, and the
  // widget only issues a token once.
  const human = await checkHuman(request, body.turnstileToken, reporterKey);
  if (!human.ok) {
    return NextResponse.json(
      { ok: false, message: human.message },
      { status: human.status },
    );
  }

  try {
    const logged = await reportSpot(slug, body.reason, detail, reporterKey);
    if (!logged.ok) {
      return NextResponse.json(
        { ok: false, message: "no such spot." },
        { status: 404 },
      );
    }

    // The threshold may have just hidden it, in which case the cached
    // pages have to go.
    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath(`/spot/${slug}`);

    return NextResponse.json({ ok: true, message: "logged. thanks." });
  } catch (thrown) {
    console.error(`[reports] could not record a report for "${slug}"`, thrown);
    return NextResponse.json(
      { ok: false, message: "couldn't log that. try again in a moment." },
      { status: 500 },
    );
  }
}
