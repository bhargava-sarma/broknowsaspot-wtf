"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";

import { FilterRail } from "@/components/explore/filter-rail";
import { SpotRow } from "@/components/explore/spot-row";
import { MapPlaceholder } from "@/components/map/map-placeholder";
import { ArrowRight, ButtonLink } from "@/components/ui/button";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { useMounted } from "@/lib/hooks/use-mounted";
import { distanceKm } from "@/lib/spots/distance";
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

  /**
   * "Near me", done entirely on the device.
   *
   * The position is never sent anywhere — not to this app's server, not
   * to Appwrite, not in a query string. Every spot's coordinates are
   * already in the page, so the browser can rank them itself, and the
   * one thing that would have to leave the device to do it on a server
   * is precisely the thing worth keeping off the wire.
   */
  // The nonce is set when a fix arrives, so the map flies there once —
  // and again on a repeat press, even though the coordinates are the same.
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    at: number;
  } | null>(null);

  const geo = useGeolocation({
    onFound: (lat, lng) => setFocus({ lat, lng, at: Date.now() }),
  });
  const here = geo.status.state === "found" ? geo.status : null;

  const visible = useMemo(() => {
    const matched = filterSpots(spots, filters);
    if (!here) return matched;

    return matched
      .map((spot) => ({
        spot,
        km: distanceKm(here.lat, here.lng, spot.lat, spot.lng),
      }))
      .sort((a, b) => a.km - b.km)
      .map(({ spot }) => spot);
  }, [spots, filters, here]);

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

  // Forgetting the location drops the marker and the fly-to as well as
  // the sort, so nothing lingers pointing at where the reader was.
  const geoWithClear = {
    ...geo,
    clear: () => {
      setFocus(null);
      geo.clear();
    },
  };

  /**
   * The results rail, rendered EXACTLY ONCE.
   *
   * Rendering a desktop copy and a phone copy and hiding one with CSS
   * would put two elements with `id="spot-<slug>"` in the document, and
   * `handleSelect` scrolls by id — so on a phone the tap would scroll the
   * hidden desktop copy and nothing would appear to happen. One instance
   * that changes position at the breakpoint has no such failure mode.
   */
  const rail =
    visible.length === 0 ? (
      <div className="p-[clamp(1.5rem,1.2rem+1.6vw,2.5rem)]">
        {/* An empty index and an over-tight filter look identical from
            here and are not the same problem. Telling someone to loosen a
            filter when there is nothing to filter reads as a broken page,
            and the honest version of an empty index is an invitation. */}
        <p className="text-h3 text-ink">
          {spots.length === 0 ? "Nothing here yet." : "Nothing matches that."}
        </p>
        <p className="mt-3 max-w-[38ch] text-small text-muted">
          {spots.length === 0
            ? "The index is empty. It fills up one spot at a time, and nobody has gone first."
            : "The index is still small. Loosen a filter, or add the place you were looking for."}
        </p>
        <div className="mt-7">
          <ButtonLink href="/submit" tone="ember">
            {spots.length === 0 ? "Add the first spot" : "Add a spot"}
            <ArrowRight />
          </ButtonLink>
        </div>
      </div>
    ) : (
      <ul
        ref={listRef}
        // Block flow, not a flex column: as a flex column the rows are
        // flex items and shrink to fit the rail's height, which clipped
        // every row down to a cut-off title.
        className="space-y-1 overflow-y-auto overscroll-contain p-2 lg:min-h-0 lg:flex-1"
      >
        {visible.map((spot) => (
          <SpotRow
            key={spot.slug}
            spot={spot}
            selected={spot.slug === selected}
            onSelect={handleSelect}
            distanceKm={
              here ? distanceKm(here.lat, here.lng, spot.lat, spot.lng) : null
            }
          />
        ))}
      </ul>
    );

  const filterPane = (
    <FilterRail
      filters={filters}
      onChange={handleFilters}
      resultCount={visible.length}
      totalCount={spots.length}
      geo={geoWithClear}
    />
  );

  return (
    <div className="shell mt-2">
      {/*
        The map is the page, and the controls float on it.

        On a laptop the rail and the filter pane are panes ABOVE the map
        rather than columns beside it — which is the point of the
        material, and also gives the map the whole width instead of five
        twelfths of it. Below `lg` the same two panes fall back into the
        flow, because a rail overlaying a phone-sized map would cover the
        thing it describes.

        `glass-isolate` on the frame is load-bearing: Leaflet stacks its
        panes at z-index 400–1000 in whatever stacking context it lands
        in, and without an isolate here those numbers compete with the
        page chrome and paint tiles over the header.
      */}
      <div className="glass glass-isolate relative rounded-[var(--radius-2xl)] p-2">
        <div className="relative h-[62vh] min-h-[380px] overflow-hidden rounded-[var(--radius-xl)] lg:h-[calc(100dvh-11rem)] lg:min-h-[560px]">
          {mounted ? (
            <SpotMap
              spots={visible}
              selectedSlug={selected}
              onSelect={handleSelect}
              here={here ? focus : null}
            />
          ) : (
            <MapPlaceholder />
          )}
        </div>

        {/* Filters. Floating top-right of the map on a laptop, in the
            flow below it on a phone. */}
        <div className="glass-3 mt-2 rounded-[var(--radius-lg)] lg:absolute lg:top-4 lg:right-4 lg:left-[calc(23rem+1.5rem)] lg:z-30 lg:mt-0">
          {filterPane}
        </div>

        {/* Results. Same trick, down the left. */}
        <div className="glass-3 mt-2 rounded-[var(--radius-lg)] lg:absolute lg:inset-y-4 lg:left-4 lg:z-30 lg:mt-0 lg:flex lg:w-[23rem] lg:flex-col">
          {rail}
        </div>
      </div>
    </div>
  );
}
