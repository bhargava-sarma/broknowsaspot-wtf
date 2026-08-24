/**
 * The ball meter — how much a spot is worth knowing about, 0 to 10.
 *
 * Distinct from `difficulty`, which says what getting there costs you.
 * This says whether it was worth it. A brutal walk-in to a mediocre
 * viewpoint is `serious` and a 3; a layby you can park at with a view
 * that ruins other views is `easy` and a 9.
 *
 * Deliberately **not** a report: a low score is an opinion and hides
 * nothing. Reports take entries down; ratings only sort them.
 */

export const BALL_MIN = 0;
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
 * Ranges are inclusive and cover 0–10 with no gaps; `ballBand` falls back
 * to the first band rather than returning undefined, so a score that
 * somehow lands outside the scale still renders.
 */
export const BALL_BANDS = [
  { upTo: 0, label: "Bro needs to touch grass" },
  { upTo: 2, label: "Bro read about it online" },
  { upTo: 4, label: "Bro drove past once" },
  { upTo: 6, label: "Bro knows a spot" },
  { upTo: 8, label: "Bro knows the spot" },
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

/** Sort key: unrated spots sort below rated ones rather than as zeroes. */
export function ballSortKey(rating: BallRating | null): number {
  return rating ? rating.average : -1;
}
