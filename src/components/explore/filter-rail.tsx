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
 * **Desktop** gets the full rail on a glass pane floating over the map.
 *
 * **Phones** get a one-line summary bar, with the facets themselves
 * living in a sheet behind a single control. The rail as-is costs about a
 * third of a phone screen, which on a page whose entire job is a map is
 * the wrong third to spend. Collapsing it also removes the horizontal
 * scroll-inside-vertical-scroll that the wrapped version needed.
 *
 * A chosen option is a lit key — the same figure as the active tab in the
 * mobile bar and the chosen segment in a form, so there is nothing new to
 * learn anywhere in the app.
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
        "press touch-target rounded-[var(--radius-xs)] px-3 py-1.5 text-tiny whitespace-nowrap transition-colors duration-[var(--dur-ui)] ease-[var(--ease-glass)]",
        active
          ? "bg-ink font-semibold text-paper shadow-[inset_0_1px_0_var(--glass-specular)]"
          : "font-medium text-muted hover:bg-ink/[0.06] hover:text-ink",
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
      <legend className="eyebrow mb-2.5">{legend}</legend>
      <div
        className={cn(
          "flex gap-1",
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
    <Group legend="Category" wrap={wrap}>
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
    <Group legend="Difficulty" wrap={wrap}>
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
    <Group legend="Access" wrap={wrap}>
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
      label="Sort by what's near me"
      caption="Ranks the list by distance from you. Worked out in your browser — your position is never sent to this site or anywhere else."
    />
  );

  const count = (
    <p className="text-tiny text-faint tabular-nums">
      <span className="font-semibold text-ink">{resultCount}</span> /{" "}
      {totalCount} spots
    </p>
  );

  return (
    <>
      {/* ------------------------------------------------- phones */}
      <div className="flex items-center justify-between gap-4 px-3 py-2.5 sm:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          className="press-pane touch-target inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-ink/[0.06] px-3.5 py-2 text-tiny font-medium text-ink"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters
          {active > 0 ? (
            <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-semibold text-accent-ink tabular-nums">
              {active}
            </span>
          ) : null}
        </button>

        {count}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={
          <div className="flex items-center justify-between gap-4">
            {count}
            <button
              type="button"
              disabled={active === 0}
              onClick={() => onChange(EMPTY_FILTERS)}
              className="press touch-target text-small font-semibold text-accent disabled:opacity-35"
            >
              Clear all
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
      <div className="hidden p-[clamp(1rem,0.8rem+0.8vw,1.5rem)] sm:block">
        <div className="flex flex-wrap items-start gap-x-[clamp(1.25rem,1rem+1.4vw,2.5rem)] gap-y-5">
          <div className="min-w-0">{categoryGroup(true)}</div>
          <div className="min-w-0">{difficultyGroup(true)}</div>
          <div className="min-w-0">{accessGroup(true)}</div>

          <div className="ml-auto flex items-center gap-4 self-center">
            {count}
            {active > 0 ? (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="press touch-target text-tiny font-semibold text-accent"
              >
                Clear ({active})
              </button>
            ) : null}
          </div>
        </div>

        {/* Its own row: the facets narrow the list, this reorders it,
            and they are different enough to keep visually separate. */}
        <div className="mt-5 min-w-0 border-t border-[var(--glass-rim)] pt-4">
          {nearMe}
        </div>
      </div>
    </>
  );
}
