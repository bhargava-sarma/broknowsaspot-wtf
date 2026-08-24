"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { BallScore } from "@/components/ball/ball-meter";
import { FeedPost } from "@/components/feed/feed-post";
import { ArrowRight, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ballRating, ballSortKey } from "@/lib/spots/ball";
import type { Spot } from "@/lib/types/spot";

/**
 * The feed, and the one control it has.
 *
 * Three orderings, all computed here rather than server-side: the whole
 * index is already in the payload for the map, sorting a few dozen rows
 * in the browser is free, and a round trip per sort would be a round trip
 * to reorder data the page is holding.
 *
 * "Newest" is the default because the feed's job is to show what was just
 * logged. "Top" ranks by the ball meter, and "Busiest" by comment count —
 * a spot with nine field notes is where the conversation is, which is not
 * always where the score is.
 */

const SORTS = [
  { id: "new", label: "Newest" },
  { id: "top", label: "Top rated" },
  { id: "busy", label: "Most discussed" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

export function FeedView({ spots }: { spots: Spot[] }) {
  const [sort, setSort] = useState<SortId>("new");

  const ordered = useMemo(() => {
    const list = [...spots];
    if (sort === "top") {
      return list.sort(
        (a, b) =>
          ballSortKey(ballRating(b.ratingSum, b.ratingCount)) -
            ballSortKey(ballRating(a.ratingSum, a.ratingCount)) ||
          b.addedAt.localeCompare(a.addedAt),
      );
    }
    if (sort === "busy") {
      return list.sort(
        (a, b) =>
          b.notes.length - a.notes.length || b.addedAt.localeCompare(a.addedAt),
      );
    }
    return list.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }, [spots, sort]);

  // The five best-scored, for the rail. Computed from the same array the
  // feed is already holding rather than a second query.
  const top = useMemo(
    () =>
      [...spots]
        .map((spot) => ({
          spot,
          rating: ballRating(spot.ratingSum, spot.ratingCount),
        }))
        .filter((entry) => entry.rating !== null)
        .sort((a, b) => ballSortKey(b.rating) - ballSortKey(a.rating))
        .slice(0, 5),
    [spots],
  );

  return (
    // Feed plus rail, which is what the width is for: a single centred
    // column on a wide monitor leaves a corridor down both sides, and
    // that corridor is the thing the shell was widened to remove.
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
      <div className="min-w-0">
        <div className="glass sticky top-[calc(var(--bar-h)+1.25rem)] z-30 flex items-center gap-1 rounded-[var(--radius-lg)] p-1.5">
          {SORTS.map((option) => {
            const active = option.id === sort;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSort(option.id)}
                className={cn(
                  "press touch-target flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-tiny whitespace-nowrap transition-colors duration-[var(--dur-ui)]",
                  active
                    ? "bg-ink font-semibold text-paper shadow-[inset_0_1px_0_var(--glass-specular)]"
                    : "font-medium text-muted hover:bg-ink/[0.06] hover:text-ink",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4">
          {ordered.map((spot, index) => (
            <FeedPost key={spot.slug} spot={spot} index={index} />
          ))}
        </div>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-[calc(var(--bar-h)+1.25rem)]">
        <div className="glass rounded-[var(--radius-xl)] p-6">
          <p className="eyebrow">Does bro know ball?</p>
          <p className="mt-3.5 text-small text-muted">
            Every spot carries a score out of ten. Zero is bro needs to touch
            grass. Ten is bro knows ball. Open an entry to add yours.
          </p>
          <div className="mt-6">
            <ButtonLink href="/submit" tone="ember" size="sm">
              Log a spot
              <ArrowRight />
            </ButtonLink>
          </div>
        </div>

        {top.length > 0 ? (
          <div className="glass rounded-[var(--radius-xl)] p-6">
            <p className="eyebrow">Bro knows ball</p>
            <ol className="mt-4 space-y-3.5">
              {top.map((entry, i) => (
                <li key={entry.spot.slug} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-tiny text-faint tabular-nums">
                    {i + 1}
                  </span>
                  <BallScore rating={entry.rating} />
                  <Link
                    href={`/spot/${entry.spot.slug}`}
                    className="press min-w-0 flex-1 truncate text-small font-medium text-ink"
                  >
                    {entry.spot.name}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
