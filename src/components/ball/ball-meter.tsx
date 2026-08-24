import { BALL_MAX, type BallRating } from "@/lib/spots/ball";
import { cn } from "@/lib/utils/cn";

/**
 * The ball meter, in three sizes.
 *
 * The number is the thing people compare, so it is set in the display
 * serif at every size and the band label rides under it. The arc behind
 * it is the same figure at every size too — a 10-segment ring that fills
 * clockwise — so a 7 looks like a 7 whether it is on a feed post or a
 * detail page.
 *
 * `rating` being null is a real state and not a zero: an unrated spot
 * shows an empty ring and "Not rated yet", where a spot everyone scored 0
 * shows a full-scale ring at 0 and a considerably ruder label.
 */

type Size = "sm" | "md" | "lg";

const GEOMETRY: Record<Size, { box: number; stroke: number; gap: number }> = {
  sm: { box: 44, stroke: 4, gap: 4 },
  md: { box: 64, stroke: 5, gap: 4 },
  lg: { box: 96, stroke: 7, gap: 3.5 },
};

const NUMBER: Record<Size, string> = {
  sm: "text-[0.9375rem]",
  md: "text-[1.375rem]",
  lg: "text-[2.125rem]",
};

/**
 * How full the ring is, as a stroke-dasharray on one circle.
 *
 * A circle rather than ten separate arcs: at 44px the segment gaps are
 * sub-pixel and ten paths is nine more than the shape needs.
 */
function arc(fraction: number, radius: number) {
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * Math.max(0, Math.min(1, fraction));
  return { circumference, filled };
}

export function BallMeter({
  rating,
  size = "md",
  className,
}: {
  rating: BallRating | null;
  size?: Size;
  className?: string;
}) {
  const { box, stroke } = GEOMETRY[size];
  const radius = (box - stroke) / 2;
  const { circumference, filled } = arc(
    rating ? rating.average / BALL_MAX : 0,
    radius,
  );

  return (
    <div
      className={cn("inline-flex shrink-0 items-center gap-3", className)}
      title={
        rating
          ? `${rating.average} / ${BALL_MAX} — ${rating.label} (${rating.count} ${rating.count === 1 ? "rating" : "ratings"})`
          : "Not rated yet"
      }
    >
      <span
        className="relative inline-grid shrink-0 place-items-center"
        style={{ width: box, height: box }}
      >
        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          aria-hidden="true"
          // Start the fill at twelve o'clock rather than three.
          className="-rotate-90"
        >
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-ink/12"
          />
          {rating ? (
            <circle
              cx={box / 2}
              cy={box / 2}
              r={radius}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference - filled}`}
              // Composited, and only on mount — the value is server-rendered.
              style={{
                transition:
                  "stroke-dasharray var(--dur-surface) var(--ease-glass)",
              }}
            />
          ) : null}
        </svg>

        <span
          className={cn(
            "absolute font-[family-name:var(--font-display)] tabular-nums",
            NUMBER[size],
            rating ? "text-ink" : "text-faint",
          )}
        >
          {rating ? rating.average : "—"}
        </span>
      </span>

      <span className="min-w-0">
        <span
          className={cn(
            "block font-semibold",
            size === "lg" ? "text-body" : "text-tiny",
            rating ? "text-ink" : "text-faint",
          )}
        >
          {rating ? rating.label : "Not rated yet"}
        </span>
        {rating ? (
          <span className="mt-0.5 block text-tiny text-faint tabular-nums">
            {rating.count} {rating.count === 1 ? "rating" : "ratings"}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** Just the number and its ring, for a dense row or a feed post's rail. */
export function BallScore({
  rating,
  size = "sm",
  className,
}: {
  rating: BallRating | null;
  size?: Size;
  className?: string;
}) {
  const { box, stroke } = GEOMETRY[size];
  const radius = (box - stroke) / 2;
  const { circumference, filled } = arc(
    rating ? rating.average / BALL_MAX : 0,
    radius,
  );

  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        className,
      )}
      style={{ width: box, height: box }}
      title={
        rating
          ? `${rating.average} / ${BALL_MAX} — ${rating.label}`
          : "Not rated yet"
      }
    >
      <svg
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        aria-hidden="true"
        className="-rotate-90"
      >
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-ink/12"
        />
        {rating ? (
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference - filled}`}
          />
        ) : null}
      </svg>
      <span
        className={cn(
          "absolute font-[family-name:var(--font-display)] tabular-nums",
          NUMBER[size],
          rating ? "text-ink" : "text-faint",
        )}
      >
        {rating ? rating.average : "—"}
      </span>
      <span className="sr-only">
        {rating
          ? `Ball meter ${rating.average} out of ${BALL_MAX}. ${rating.label}.`
          : "Not rated yet."}
      </span>
    </span>
  );
}
