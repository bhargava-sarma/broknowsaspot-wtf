"use client";

import Link from "next/link";

import {
  AccessTag,
  CategoryTag,
  DifficultyMeter,
} from "@/components/ui/spot-tags";
import type { Spot } from "@/lib/types/spot";
import { cn } from "@/lib/utils/cn";

type SpotRowProps = {
  spot: Spot;
  selected: boolean;
  onSelect: (slug: string) => void;
};

/**
 * One entry in the results list.
 *
 * The whole row is a button that selects the spot on the map, with a
 * separate explicit link through to the detail page — nesting a link
 * inside a button would be invalid and would make keyboard use ambiguous.
 */
export function SpotRow({ spot, selected, onSelect }: SpotRowProps) {
  return (
    <li
      id={`spot-${spot.slug}`}
      className={cn(
        "relative border-b border-rule",
        selected && "bg-paper-raised",
      )}
    >
      {selected ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 block w-px bg-accent"
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
            <h3 className="text-h3 font-light text-ink lowercase">
              {spot.name}
            </h3>
            <span className="shrink-0 font-mono text-micro text-faint lowercase tabular-nums">
              {spot.walkInKm > 0 ? `${spot.walkInKm}km` : "boat"}
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
            className="group tap touch-target inline-flex items-center gap-2 font-mono text-micro text-ink lowercase"
          >
            open entry
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 ease-[var(--ease-damped)] group-hover:translate-x-1 motion-reduce:transition-none"
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </li>
  );
}
