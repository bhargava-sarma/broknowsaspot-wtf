"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";

import { FilterRail } from "@/components/explore/filter-rail";
import { SpotRow } from "@/components/explore/spot-row";
import { MapPlaceholder } from "@/components/map/map-placeholder";
import { ActionLink } from "@/components/ui/action-link";
import { useMounted } from "@/lib/hooks/use-mounted";
import {
  EMPTY_FILTERS,
  filterSpots,
  type SpotFilters,
} from "@/lib/spots/filters";
import type { Spot } from "@/lib/types/spot";

/**
 * Leaflet reaches for `window` at module scope, so the map can only ever be
 * client-side. The dynamic import also keeps Leaflet out of the shared
 * bundle, so the homepage never pays for it.
 */
const SpotMap = dynamic(() => import("@/components/map/spot-map"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

export function ExploreView({ spots }: { spots: Spot[] }) {
  const [filters, setFilters] = useState<SpotFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Keeps the hydration render identical to the prerendered HTML; see
  // useMounted for why the static export needs this.
  const mounted = useMounted();

  const visible = useMemo(() => filterSpots(spots, filters), [spots, filters]);

  // Selecting from the map should bring the matching row into view; doing
  // it here rather than in an effect keeps it tied to the interaction
  // instead of firing on every incidental selection change.
  const handleSelect = useCallback((slug: string) => {
    setSelected((current) => (current === slug ? null : slug));
    const row = document.getElementById(`spot-${slug}`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  const handleFilters = useCallback((next: SpotFilters) => {
    setFilters(next);
    // A selection that no longer matches the filters would leave an
    // orphaned highlight on a row nobody can see.
    setSelected(null);
  }, []);

  return (
    <>
      {/* Sticky under the header, on the same glass. The list and the
          map both scroll under it, so the controls that govern them stay
          reachable without a trip back to the top. */}
      <div className="glass glass-dense sticky top-[var(--bar-h)] z-30 border-b border-rule">
        <FilterRail
          filters={filters}
          onChange={handleFilters}
          resultCount={visible.length}
          totalCount={spots.length}
        />
      </div>

      <div className="grid lg:grid-cols-12">
        {/* Map first in the DOM on small screens so it isn't buried under
            the whole list; the grid reorders it on desktop. */}
        <div className="order-1 lg:order-2 lg:col-span-7">
          <div className="rule-b h-[58vh] min-h-[320px] lg:sticky lg:top-[var(--bar-h)] lg:h-[calc(100dvh-var(--bar-h))] lg:border-b-0 lg:border-l lg:border-rule">
            {mounted ? (
              <SpotMap
                spots={visible}
                selectedSlug={selected}
                onSelect={handleSelect}
              />
            ) : (
              <MapPlaceholder />
            )}
          </div>
        </div>

        <div className="order-2 lg:order-1 lg:col-span-5">
          {visible.length === 0 ? (
            <div className="shell py-[clamp(3rem,2rem+4vw,6rem)]">
              {/* An empty index and an over-tight filter look identical
                  from here and are not the same problem. Telling someone
                  to loosen a filter when there is nothing to filter reads
                  as a broken page, and the honest version of an empty
                  index is an invitation. */}
              <p className="text-lead font-light text-ink lowercase">
                {spots.length === 0
                  ? "nothing here yet."
                  : "nothing matches that."}
              </p>
              <p className="mt-3 max-w-[38ch] text-small text-muted">
                {spots.length === 0
                  ? "the index is empty. it fills up one spot at a time, and nobody has gone first."
                  : "the index is still small. loosen a filter, or add the place you were looking for."}
              </p>
              <div className="mt-8">
                <ActionLink href="/submit" tone="accent">
                  {spots.length === 0 ? "add the first spot" : "add a spot"}
                </ActionLink>
              </div>
            </div>
          ) : (
            <ul ref={listRef} className="border-t border-rule lg:border-t-0">
              {visible.map((spot) => (
                <SpotRow
                  key={spot.slug}
                  spot={spot}
                  selected={spot.slug === selected}
                  onSelect={handleSelect}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
