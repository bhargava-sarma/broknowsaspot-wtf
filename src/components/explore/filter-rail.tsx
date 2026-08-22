"use client";

import { useState } from "react";

import { LocateButton } from "@/components/ui/locate-button";
import { Sheet } from "@/components/ui/sheet";
import type { useGeolocation } from "@/lib/hooks/use-geolocation";
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
 * Faceted filters, in two shapes.
 *
 * **Desktop** gets the full rail, sticky under the header on the same
 * glass as the rest of the floating plane — the map scrolls under it and
 * the controls stay put.
 *
 * **Phones** get a one-line summary bar, with the facets themselves
 * living in a sheet behind a single control. The rail as-is costs about a
 * third of a phone screen, which on a page whose entire job is a map is
 * the wrong third to spend. Collapsing it also removes the horizontal
 * scroll-inside-vertical-scroll that the wrapped version needed.
 *
 * An option is a word in both shapes, its state carried by ink weight
 * plus a one-pixel accent rule — the same idiom as the nav, so there is
 * nothing new to learn.
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
        "tap touch-target relative rounded-full px-3 py-1 font-mono text-micro whitespace-nowrap lowercase transition-colors",
        active
          ? "bg-accent text-accent-ink"
          : "text-faint hover:text-ink hover:bg-paper-raised",
      )}
    >
      {label}
    </button>
  );
}

function Group({
  legend,
  children,
  wrap = false,
}: {
  legend: string;
  children: React.ReactNode;
  wrap?: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="label mb-2">{legend}</legend>
      <div
        className={cn(
          "flex gap-x-4 gap-y-1",
          wrap
            ? "flex-wrap"
            : "overflow-x-auto pb-0.5 lg:flex-wrap lg:overflow-visible",
        )}
      >
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
  geo: ReturnType<typeof useGeolocation>;
};

export function FilterRail({
  filters,
  onChange,
  resultCount,
  totalCount,
  geo,
}: FilterRailProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = activeFilterCount(filters);

  const categoryGroup = (wrap: boolean) => (
    <Group legend="category" wrap={wrap}>
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
  );

  const difficultyGroup = (wrap: boolean) => (
    <Group legend="difficulty" wrap={wrap}>
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
  );

  const accessGroup = (wrap: boolean) => (
    <Group legend="access" wrap={wrap}>
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
  );

  const nearMe = (
    <LocateButton
      status={geo.status}
      onRequest={geo.request}
      onClear={geo.clear}
      label="sort by what's near me"
      caption="ranks the list by distance from you. worked out in your browser — your position is never sent to this site or anywhere else."
    />
  );

  const count = (
    <p className="font-mono text-micro text-faint lowercase tabular-nums">
      <span className="text-ink">{resultCount}</span> / {totalCount} spots
    </p>
  );

  return (
    <>
      {/* ------------------------------------------------- phones */}
      <div className="shell flex items-center justify-between gap-4 py-3 sm:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          className="press-pane glass-chip glass-rim glass-r-sm touch-target inline-flex items-center gap-2 px-3 py-2 font-mono text-micro text-ink lowercase"
        >
          filters
          {active > 0 ? (
            <span className="inline-flex min-w-4 items-center justify-center bg-accent px-1 py-px font-mono text-[0.5625rem] text-accent-ink tabular-nums">
              {active}
            </span>
          ) : (
            <span aria-hidden="true" className="text-faint">
              +
            </span>
          )}
        </button>

        {count}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="filters"
        footer={
          <div className="flex items-center justify-between gap-4">
            {count}
            <button
              type="button"
              disabled={active === 0}
              onClick={() => onChange(EMPTY_FILTERS)}
              className="press touch-target font-mono text-micro text-accent lowercase disabled:opacity-35"
            >
              clear all
            </button>
          </div>
        }
      >
        <div className="grid gap-6">
          {nearMe}
          {categoryGroup(true)}
          {difficultyGroup(true)}
          {accessGroup(true)}
        </div>
      </Sheet>

      {/* ------------------------------------------------ desktop */}
      <div className="shell hidden py-[clamp(1.25rem,1rem+1.2vw,2rem)] sm:block">
        <div className="grid gap-[clamp(1.25rem,1rem+1.4vw,2rem)] sm:grid-cols-2 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-4">{categoryGroup(false)}</div>
          <div className="min-w-0 lg:col-span-3">{difficultyGroup(false)}</div>
          <div className="min-w-0 lg:col-span-3">{accessGroup(false)}</div>

          <div className="flex items-end justify-between gap-4 lg:col-span-2 lg:flex-col lg:items-end lg:justify-end">
            {count}
            {active > 0 ? (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="press touch-target font-mono text-micro text-accent lowercase"
              >
                clear ({active})
              </button>
            ) : null}
          </div>

          {/* Its own row: the facets narrow the list, this reorders it,
              and they are different enough to keep visually separate. */}
          <div className="min-w-0 border-t border-rule pt-4 lg:col-span-12">
            {nearMe}
          </div>
        </div>
      </div>
    </>
  );
}
