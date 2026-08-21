"use client";

import Link from "next/link";

import {
  AccessTag,
  CategoryTag,
  DifficultyMeter,
} from "@/components/ui/spot-tags";
import { formatDistance } from "@/lib/spots/distance";
import type { Spot } from "@/lib/types/spot";
import { cn } from "@/lib/utils/cn";

type SpotRowProps = {
  spot: Spot;
  selected: boolean;
  onSelect: (slug: string) => void;
  /** How far from the reader, when they have offered a position. */
  distanceKm?: number | null;
};

/**
 * One entry in the results rail.
 *
 * The whole row is a button that selects the spot on the map, with a
 * separate explicit link through to the detail page — nesting a link
 * inside a button would be invalid and would make keyboard use ambiguous.
 *
 * Selection lights the row rather than marking it: the row lifts onto its
 * own tint and an ember bar grows down the left edge from the centre.
 * Selecting from the map scrolls the matching row into view, and a mark
 * that animates is findable in peripheral vision in a way that a mark
 * which simply exists is not.
 */
export function SpotRow({
  spot,
  selected,
  onSelect,
  distanceKm = null,
}: SpotRowProps) {
  return (
    <li
      id={`spot-${spot.slug}`}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] transition-colors duration-[var(--dur-ui)] ease-[var(--ease-glass)]",
        selected ? "bg-ink/[0.07]" : "hover:bg-ink/[0.04]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-2 left-0 block w-[3px] origin-center rounded-full bg-accent transition-transform duration-[var(--dur-surface)] ease-[var(--ease-glass)] motion-reduce:transition-none",
          selected ? "scale-y-100" : "scale-y-0",
        )}
      />

      <div className="px-4 py-4">
        <button
          type="button"
          onClick={() => onSelect(spot.slug)}
          aria-pressed={selected}
          className="press block w-full text-left"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-h3 text-ink">{spot.name}</h3>
            <span className="shrink-0 text-tiny text-faint tabular-nums">
              {distanceKm !== null ? (
                <span data-distance="" className="font-semibold text-accent">
                  {formatDistance(distanceKm)}
                </span>
              ) : spot.walkInKm > 0 ? (
                `${spot.walkInKm} km walk`
              ) : (
                "Boat"
              )}
            </span>
          </div>

          <p className="mt-1 text-tiny text-faint">
            {spot.region}, {spot.country}
          </p>

          <p className="mt-3 max-w-[52ch] text-small text-muted">
            {spot.summary}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <CategoryTag value={spot.category} />
            <DifficultyMeter value={spot.difficulty} />
            <AccessTag value={spot.access} />
          </div>
        </button>

        <div className="mt-4">
          <Link
            href={`/spot/${spot.slug}`}
            className="group press touch-target inline-flex items-center gap-2 text-tiny font-semibold text-ink"
          >
            Open entry
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="transition-transform duration-300 ease-[var(--ease-glass)] group-hover:translate-x-1 motion-reduce:transition-none"
            >
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </li>
  );
}
