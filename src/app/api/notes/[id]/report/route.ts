import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAppwriteWriteEnabled } from "@/lib/appwrite/server";
import { reportNote } from "@/lib/appwrite/write";
import { checkHuman } from "@/lib/security/human-check";
import { requestKey } from "@/lib/security/request-key";
import { isReportReason } from "@/lib/spots/reports";

/**
 * Report a note.
 *
 * The same shape as reporting a spot, and the same silences. The
 * threshold is never sent to the client, and the response never says how
 * many reports a note has or whether this one hid it — a reply that
 * changed once the count moved would turn the endpoint into the progress
 * bar the threshold exists to avoid.
 *
 * A duplicate is answered as success by `reportNote`, for the same
 * reason: the reporter's desired outcome is already true, and telling
 * them "you already reported this" confirms their pseudonymous key is
 * stable enough to probe.
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  const human = await checkHuman(request, body.turnstileToken, reporterKey);
  if (!human.ok) {
    return NextResponse.json(
      { ok: false, message: human.message },
      { status: human.status },
    );
  }

  try {
    const logged = await reportNote(id, body.reason, detail, reporterKey);
    if (!logged.ok) {
      return NextResponse.json(
        { ok: false, message: "no such note." },
        { status: 404 },
      );
    }

    // The threshold may have just hidden it, so the spot page's cached
    // copy is stale. The note id alone does not name a route, so the
    // whole index is refreshed rather than one page.
    revalidatePath("/explore");
    revalidatePath("/spot/[slug]", "page");

    return NextResponse.json({ ok: true, message: "logged. thanks." });
  } catch (thrown) {
    console.error(
      `[reports] could not record a report for note "${id}"`,
      thrown,
    );
    return NextResponse.json(
      { ok: false, message: "couldn't log that. try again in a moment." },
      { status: 500 },
    );
  }
}
