"use client";

import {
  activeFilterCount,
  EMPTY_FILTERS,
  toggleValue,
  type SpotFilters,
} from "@/lib/spots/filters";
import {
  ACCESS_LABELS,
  ACCESS_TYPES,
  CATEGORIES,
  CATEGORY_LABELS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
} from "@/lib/types/spot";
import { cn } from "@/lib/utils/cn";

/**
 * Faceted filters. Borderless throughout: an option is a word, and its
 * state is carried by ink weight plus a one-pixel accent rule — the same
 * idiom as the nav, so there is nothing new to learn.
 */

type ToggleProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function FilterToggle({ label, active, onClick }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "tap touch-target relative py-1.5 font-mono text-micro whitespace-nowrap lowercase",
        active ? "text-ink" : "text-faint",
      )}
    >
      {label}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0.5 block h-px bg-accent"
        />
      ) : null}
    </button>
  );
}

function Group({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="label mb-2">{legend}</legend>
      {/* Scrolls horizontally on narrow screens rather than wrapping into
          a tall stack that pushes the map off the fold. */}
      <div className="flex gap-x-4 gap-y-1 overflow-x-auto pb-0.5 lg:flex-wrap lg:overflow-visible">
        {children}
      </div>
    </fieldset>
  );
}

type FilterRailProps = {
  filters: SpotFilters;
  onChange: (next: SpotFilters) => void;
  resultCount: number;
  totalCount: number;
};

export function FilterRail({
  filters,
  onChange,
  resultCount,
  totalCount,
}: FilterRailProps) {
  const active = activeFilterCount(filters);

  return (
    <div className="shell py-[clamp(1.25rem,1rem+1.2vw,2rem)]">
      <div className="grid gap-[clamp(1.25rem,1rem+1.4vw,2rem)] lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-4">
          <Group legend="category">
            {CATEGORIES.map((value) => (
              <FilterToggle
                key={value}
                label={CATEGORY_LABELS[value]}
                active={filters.category.includes(value)}
                onClick={() =>
                  onChange({
                    ...filters,
                    category: toggleValue(filters.category, value),
                  })
                }
              />
            ))}
          </Group>
        </div>

        <div className="min-w-0 lg:col-span-3">
          <Group legend="difficulty">
            {DIFFICULTIES.map((value) => (
              <FilterToggle
                key={value}
                label={DIFFICULTY_LABELS[value]}
                active={filters.difficulty.includes(value)}
                onClick={() =>
                  onChange({
                    ...filters,
                    difficulty: toggleValue(filters.difficulty, value),
                  })
                }
              />
            ))}
          </Group>
        </div>

        <div className="min-w-0 lg:col-span-3">
          <Group legend="access">
            {ACCESS_TYPES.map((value) => (
              <FilterToggle
                key={value}
                label={ACCESS_LABELS[value]}
                active={filters.access.includes(value)}
                onClick={() =>
                  onChange({
                    ...filters,
                    access: toggleValue(filters.access, value),
                  })
                }
              />
            ))}
          </Group>
        </div>

        <div className="flex items-end justify-between gap-4 lg:col-span-2 lg:flex-col lg:items-end lg:justify-end">
          <p className="font-mono text-micro text-faint lowercase tabular-nums">
            <span className="text-ink">{resultCount}</span> / {totalCount} spots
          </p>
          {active > 0 ? (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="tap touch-target font-mono text-micro text-accent lowercase"
            >
              clear ({active})
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
