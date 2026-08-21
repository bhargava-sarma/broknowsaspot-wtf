"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, useMap } from "react-leaflet";

import { BasemapLayer } from "@/components/map/basemap-layer";
import { INDIA_BOUNDS, LOCATED_ZOOM } from "@/lib/map/tiles";
import { useTheme } from "@/lib/theme/theme-provider";
import type { Spot } from "@/lib/types/spot";

/**
 * Leaflet canvas. Always reached through a dynamic import with `ssr: false`
 * — Leaflet touches `window` at module scope and cannot be server-rendered.
 *
 * The opening view comes from `lib/map/tiles.ts` and the basemap from
 * `<BasemapLayer>`, both shared with the submission picker — a pin looks
 * the same wherever it is drawn, and the borders are decided in one
 * place. Read `lib/map/india-worldview.ts` before touching the basemap.
 */

/**
 * Markers are 44x44 so the tap target clears the minimum on touch, while
 * the visible mark stays small. The dot itself is styled from globals.css
 * so it themes with everything else.
 */
function markerIcon(selected: boolean): L.DivIcon {
  return L.divIcon({
    className: "bkas-marker",
    html: `<span class="bkas-marker-dot${selected ? " is-selected" : ""}"></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/**
 * Keeps the viewport framed on whatever survived the filters.
 *
 * Deliberately skips the very first run. The map opens on India because
 * that is who it is for, and an auto-fit on mount would immediately pull
 * it back out to whatever the unfiltered index happens to span. Framing
 * the results is the right response to *filtering*, not to arriving.
 */
function FitToSpots({ spots, held }: { spots: Spot[]; held: boolean }) {
  const map = useMap();
  const firstRun = useRef(true);

  // Keyed on *which* spots, not on the array. Sorting by distance
  // produces a new array of the same spots, and refitting on that would
  // undo the fly-to that the sort accompanies — which is exactly what it
  // did: the map jumped back out to frame the whole index the instant a
  // position arrived.
  const identity = spots
    .map((spot) => spot.slug)
    .sort()
    .join(",");

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    // While the reader has shared a position, the frame they asked for is
    // their own neighbourhood. Filtering does not drag them away from it.
    if (held) return;
    if (spots.length === 0) return;

    if (spots.length === 1) {
      const only = spots[0];
      if (only) map.setView([only.lat, only.lng], 9, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(
      spots.map((spot) => [spot.lat, spot.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 7, animate: true });
    // `identity` is the real trigger; `spots` is read inside and is a new
    // array on every sort, which is the whole reason it is not the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, held, map]);

  return null;
}

/**
 * Flies to the reader's own position when they offer it.
 *
 * Takes precedence over FitToSpots for the same reason it exists:
 * pressing "near me" is a request to be taken somewhere, and framing the
 * whole result set instead would answer a question nobody asked. The
 * nonce means pressing it again after panning away brings you back.
 *
 * `LOCATED_ZOOM.browse` rather than something tighter because the nearest
 * spot may be kilometres away — at rooftop zoom the map would be an empty
 * square with a dot in the middle.
 */
function FocusHere({
  focus,
}: {
  focus: { lat: number; lng: number; at: number } | null;
}) {
  const map = useMap();
  const last = useRef(0);

  useEffect(() => {
    if (!focus || focus.at === last.current) return;
    last.current = focus.at;
    map.flyTo([focus.lat, focus.lng], LOCATED_ZOOM.browse, { duration: 0.9 });
  }, [focus, map]);

  return null;
}

/** A ring, not a pin — this is where the reader is, not a logged spot. */
function hereIcon(): L.DivIcon {
  return L.divIcon({
    className: "bkas-marker",
    html: `<span class="bkas-here"></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/**
 * Zoom buttons in the site's own language. Leaflet's built-in control is
 * disabled because its bordered, rounded, shadowed chrome is the exact
 * opposite of the flat system, and restyling it is more work than this.
 */
function ZoomControls() {
  const map = useMap();
  return (
    <div className="leaflet-bottom leaflet-right">
      {/* Floating over the map, so: glass — tier 1, because a control
          sitting on top of tiles should disturb them as little as it can
          while still catching the light differently.

          Bottom right, because the filters float across the top of the
          map on wide screens and the two were overlapping there. */}
      <div className="leaflet-control glass-1 pointer-events-auto mr-3! mb-8! flex flex-col overflow-hidden rounded-[var(--radius-sm)]!">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          aria-label="Zoom in"
          className="press touch-target flex h-11 w-11 items-center justify-center border-b border-[var(--glass-rim)] text-ink"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          aria-label="Zoom out"
          className="press touch-target flex h-11 w-11 items-center justify-center text-ink"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Leaflet needs telling when its container changes size. */
function ResizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);
  return null;
}

type SpotMapProps = {
  /** The reader's position, when they have offered it. */
  here?: { lat: number; lng: number; at: number } | null;
  spots: Spot[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
};

export default function SpotMap({
  spots,
  selectedSlug,
  onSelect,
  here = null,
}: SpotMapProps) {
  const { theme } = useTheme();

  // One icon per state, reused across every marker, instead of building a
  // fresh DivIcon per spot on each render.
  const icons = useMemo(
    () => ({ plain: markerIcon(false), selected: markerIcon(true) }),
    [],
  );

  return (
    <MapContainer
      className="h-full w-full bg-paper-raised"
      bounds={INDIA_BOUNDS}
      minZoom={2}
      worldCopyJump
      // Touch parity is Leaflet's default: dragging, pinch zoom and tap are
      // all on. Only the desktop-only wheel gesture needs stating.
      scrollWheelZoom
      zoomControl={false}
      attributionControl
    >
      <BasemapLayer theme={theme} />
      <FocusHere focus={here} />
      {here ? (
        <Marker
          position={[here.lat, here.lng]}
          icon={hereIcon()}
          interactive={false}
        />
      ) : null}

      <FitToSpots spots={spots} held={Boolean(here)} />
      <ResizeOnMount />
      <ZoomControls />

      {spots.map((spot) => (
        <Marker
          key={spot.slug}
          position={[spot.lat, spot.lng]}
          icon={spot.slug === selectedSlug ? icons.selected : icons.plain}
          eventHandlers={{ click: () => onSelect(spot.slug) }}
          // Leaflet exposes markers to assistive tech as buttons; give them
          // a name so the map isn't a wall of unlabelled controls.
          alt={`${spot.name}, ${spot.region}`}
          keyboard
        />
      ))}
    </MapContainer>
  );
}
