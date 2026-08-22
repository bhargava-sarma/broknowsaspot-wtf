"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
 * One entry in the results list.
 *
 * The whole row is a button that selects the spot on the map, with a
 * separate explicit link through to the detail page — nesting a link
 * inside a button would be invalid and would make keyboard use ambiguous.
 *
 * Selection is marked by an accent rule down the left edge that *grows*
 * from the centre rather than appearing. Selecting from the map scrolls
 * the matching row into view, and a mark that animates is findable in
 * peripheral vision in a way that a mark which simply exists is not.
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
        "relative",
        selected && "bg-paper-raised",
      )}
    >
      {selected ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 block w-0.5 rounded-r bg-accent"
        />
      ) : null}

      <div className="px-[var(--gutter)] py-4">
        <button
          type="button"
          onClick={() => onSelect(spot.slug)}
          aria-pressed={selected}
          className="tap block w-full text-left"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-h3 font-bold text-ink lowercase">
              {spot.name}
            </h3>
            <span className="shrink-0 font-mono text-micro text-faint lowercase tabular-nums">
              {distanceKm !== null ? (
                <>
                  <span data-distance="" className="text-accent">
                    {formatDistance(distanceKm)} away
                  </span>
                  <span aria-hidden="true"> · </span>
                </>
              ) : null}
              {spot.walkInKm > 0 ? `${spot.walkInKm}km walk` : "boat"}
            </span>
          </div>

          <p className="mt-1 font-mono text-micro text-faint lowercase">
            {spot.region} / {spot.country}
          </p>

          <p className="mt-3 max-w-[52ch] text-small text-muted">
            {spot.summary}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <CategoryTag value={spot.category} />
            <DifficultyMeter value={spot.difficulty} />
            <AccessTag value={spot.access} />
          </div>
        </button>

        <div className="mt-4">
          <Link
            href={`/spot/${spot.slug}`}
            className="btn-pill bg-paper-raised text-ink border border-rule inline-flex items-center gap-2"
          >
            open entry
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </li>
  );
}

