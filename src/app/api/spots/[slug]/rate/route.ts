import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAppwriteWriteEnabled } from "@/lib/appwrite/server";
import { rateSpot } from "@/lib/appwrite/write";
import { checkHuman } from "@/lib/security/human-check";
import { requestKey } from "@/lib/security/request-key";
import { ballRating, isBallScore } from "@/lib/spots/ball";

/**
 * Rate a spot on the ball meter, 1–10.
 *
 * Unlike a report, this is not moderation and nothing is hidden by it:
 * a low score sorts an entry down and says nothing else. So the response
 * *does* return the new aggregate — there is no threshold to brigade
 * toward, and the number is already on every card.
 *
 * One rating per pseudonymous key per spot, enforced by a unique index
 * rather than by this route remembering. Rating again changes your own
 * score instead of stacking a second vote.
 *
 * No rate-limit budget, deliberately, and for the same reason reports
 * have none: the unique index already caps one key at one row per spot,
 * so the most anyone can write is one rating per entry in the index.
 * Submissions, notes and photos are metered because they are unbounded;
 * this is not.
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!isAppwriteWriteEnabled) {
    return NextResponse.json(
      { ok: false, message: "rating isn't available right now." },
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

  const body = payload as { score?: unknown; turnstileToken?: unknown };

  if (!isBallScore(body.score)) {
    return NextResponse.json(
      { ok: false, message: "pick a score from 1 to 10." },
      { status: 422 },
    );
  }

  const raterKey = requestKey(request);
  if (!raterKey) {
    return NextResponse.json(
      { ok: false, message: "rating isn't available right now." },
      { status: 503 },
    );
  }

  // A fresh Turnstile token, or the ticket from one already redeemed —
  // rating a few spots in a sitting is one visit and one human, and the
  // widget only issues a token once.
  const human = await checkHuman(request, body.turnstileToken, raterKey);
  if (!human.ok) {
    return NextResponse.json(
      { ok: false, message: human.message },
      { status: human.status },
    );
  }

  try {
    const rated = await rateSpot(slug, body.score, raterKey);
    if (!rated.ok) {
      return NextResponse.json(
        { ok: false, message: "no such spot." },
        { status: 404 },
      );
    }

    // The score is on every card and in the feed's ordering.
    revalidatePath("/");
    revalidatePath("/feed");
    revalidatePath("/explore");
    revalidatePath(`/spot/${slug}`);

    return NextResponse.json({
      ok: true,
      rating: ballRating(rated.value.sum, rated.value.count),
    });
  } catch (thrown) {
    console.error(`[ratings] could not record a rating for "${slug}"`, thrown);
    return NextResponse.json(
      { ok: false, message: "couldn't save that. try again in a moment." },
      { status: 500 },
    );
  }
}
