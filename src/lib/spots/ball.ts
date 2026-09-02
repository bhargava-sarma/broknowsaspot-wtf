/**
 * The ball meter — how much a spot is worth knowing about, 0 to 10.
 *
 * Scored 1 to 10 — there is no zero, because a place someone bothered to
 * log is at minimum worth a one. Distinct from `difficulty`, which says
 * what getting there costs you.
 * This says whether it was worth it. A brutal walk-in to a mediocre
 * viewpoint is `serious` and a 3; a layby you can park at with a view
 * that ruins other views is `easy` and a 9.
 *
 * Deliberately **not** a report: a low score is an opinion and hides
 * nothing. Reports take entries down; ratings only sort them.
 */

export const BALL_MIN = 1;
export const BALL_MAX = 10;

export function isBallScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= BALL_MIN &&
    value <= BALL_MAX
  );
}

/**
 * The ladder, in the site's voice.
 *
 * Ranges are inclusive and cover 1–10 with no gaps; `ballBand` falls back
 * to the first band rather than returning undefined, so a score that
 * somehow lands outside the scale still renders.
 */
export const BALL_BANDS = [
  { upTo: 1, label: "Bro needs to touch grass" },
  { upTo: 3, label: "Bro read about it online" },
  { upTo: 5, label: "Bro drove past once" },
  { upTo: 7, label: "Bro knows a spot" },
  { upTo: 9, label: "Bro knows the spot" },
  { upTo: 10, label: "Bro knows ball" },
] as const;

export function ballBand(score: number): string {
  const clamped = Math.min(BALL_MAX, Math.max(BALL_MIN, score));
  const band = BALL_BANDS.find((entry) => clamped <= entry.upTo);
  return (band ?? BALL_BANDS[0]).label;
}

export type BallRating = {
  /** Mean score, to one decimal. */
  average: number;
  /** How many people have rated it. */
  count: number;
  label: string;
};

/**
 * Fold the denormalised sum and count into something renderable.
 *
 * `null` for an unrated spot, which is not the same as a spot everyone
 * scored 0 — the UI says "not rated yet" for the first and prints a very
 * rude label for the second.
 */
export function ballRating(
  sum: number | null | undefined,
  count: number | null | undefined,
): BallRating | null {
  const total = typeof count === "number" ? count : 0;
  if (total <= 0) return null;

  const raw = (typeof sum === "number" ? sum : 0) / total;
  const average = Math.round(raw * 10) / 10;
  return { average, count: total, label: ballBand(average) };
}

/** Sort key: unrated spots sort below rated ones rather than as ones. */
export function ballSortKey(rating: BallRating | null): number {
  return rating ? rating.average : 0;
}

/**
 * How full the meter's ring should be, 0 to 1.
 *
 * Not `average / BALL_MAX`: with a floor of 1 that would draw a tenth of
 * a ring for the lowest possible score, which reads as "barely rated"
 * rather than as "rated, and badly". The scale is mapped across the whole
 * arc so a 1 is empty and a 10 is full.
 */
export function ballFraction(average: number): number {
  const span = BALL_MAX - BALL_MIN;
  const clamped = Math.min(BALL_MAX, Math.max(BALL_MIN, average));
  return span === 0 ? 1 : (clamped - BALL_MIN) / span;
}
