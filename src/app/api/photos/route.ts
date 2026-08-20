import { NextResponse } from "next/server";

import { storePhoto } from "@/lib/appwrite/photos";
import { logPhoto } from "@/lib/appwrite/write";
import { isAppwriteWriteEnabled } from "@/lib/appwrite/server";
import { withinPhotoLimit } from "@/lib/security/rate-limit";
import { requestKey } from "@/lib/security/request-key";
import { verifyTurnstile } from "@/lib/security/turnstile";

/**
 * Accepts one prepared photo and returns where it landed.
 *
 * Photos upload here *before* the form they belong to is submitted, so a
 * contributor sees the picture appear rather than waiting to find out at
 * the end whether a 4MB upload worked. The form then submits ids.
 *
 * That does mean a file can be stored and then abandoned — the tab
 * closes, the form is never sent — so the bucket accumulates orphans. The
 * alternative is worse: holding the bytes in the page until submit and
 * uploading everything at once turns one slow request into the thing
 * standing between a contributor and a successful submission. Orphans are
 * cheap and sweepable; a failed submission is a lost spot.
 *
 * Same gate as every other write on the site: Turnstile, then a rate
 * limit keyed to the same pseudonymous request key, then the work.
 */

export const runtime = "nodejs";

/** Generous enough for a re-encoded 2000px JPEG, mean enough to bound abuse. */
const MAX_BYTES = 6 * 1024 * 1024;

const FAILURE_MESSAGES = {
  unconfigured: "photo uploads aren't available right now.",
  "too-large": "that image is too large once processed.",
  "not-a-jpeg": "that file isn't a jpeg.",
} as const;

export async function POST(request: Request) {
  if (!isAppwriteWriteEnabled) {
    return NextResponse.json(
      { ok: false, message: "photo uploads aren't available right now." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "couldn't read that upload." },
      { status: 400 },
    );
  }

  const turnstile = await verifyTurnstile(request, form.get("turnstileToken"));
  if (!turnstile.ok) {
    return NextResponse.json(
      { ok: false, message: turnstile.message },
      { status: turnstile.status },
    );
  }

  const key = requestKey(request);
  if (!key) {
    return NextResponse.json(
      { ok: false, message: "photo uploads aren't available right now." },
      { status: 503 },
    );
  }

  const limit = await withinPhotoLimit(key);
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: `that's enough for now — try again in about ${limit.retryInMinutes} minutes.`,
      },
      { status: 429 },
    );
  }

  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "no image was attached." },
      { status: 400 },
    );
  }
  // Checked before reading the body into memory, so an oversized upload
  // costs a length check rather than six megabytes of allocation.
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: "that image is too large." },
      { status: 413 },
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const stored = await storePhoto(bytes, "spot.jpg");
    if (!stored.ok) {
      return NextResponse.json(
        { ok: false, message: FAILURE_MESSAGES[stored.reason] },
        { status: stored.reason === "unconfigured" ? 503 : 400 },
      );
    }
    // Logged after the fact: the upload is what the reader is waiting
    // on, and a logging failure should not lose them a photo that is
    // already stored. It only feeds the rate limit and moderation.
    await logPhoto(stored.photo.id, key).catch((error) =>
      console.warn("[photos] could not log the upload", error),
    );

    return NextResponse.json({ ok: true, ...stored.photo });
  } catch (thrown) {
    console.error("[photos] upload failed", thrown);
    return NextResponse.json(
      { ok: false, message: "couldn't store that image. try again." },
      { status: 500 },
    );
  }
}
