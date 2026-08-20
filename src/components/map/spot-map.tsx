"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import {
  ATTRIBUTION,
  DETECT_RETINA,
  INDIA_BOUNDS,
  TILE_SIZE,
  TILE_URL,
  ZOOM_OFFSET,
  warnIfFallbackBasemap,
} from "@/lib/map/tiles";
import { useTheme } from "@/lib/theme/theme-provider";
import type { Spot } from "@/lib/types/spot";

/**
 * Leaflet canvas. Always reached through a dynamic import with `ssr: false`
 * — Leaflet touches `window` at module scope and cannot be server-rendered.
 *
 * Tiles and the opening view both come from `lib/map/tiles.ts`, which the
 * submission picker shares — a pin looks the same wherever it is drawn,
 * and the basemap is swapped in one place. Read that file before changing
 * providers: the borders are rendered into the tiles, so which provider
 * is configured decides whether the map is legal to publish in India.
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
function FitToSpots({ spots }: { spots: Spot[] }) {
  const map = useMap();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
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
  }, [spots, map]);

  return null;
}

/**
 * Zoom buttons in the site's own language. Leaflet's built-in control is
 * disabled because its bordered, rounded, shadowed chrome is the exact
 * opposite of the flat system, and restyling it is more work than this.
 */
function ZoomControls() {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right">
      {/* Floating over the map, so: glass. Dense, because the tiles
          underneath are busy and a 66% pane over a coastline stops
          reading as a control. */}
      <div className="leaflet-control glass glass-dense glass-rim glass-r-sm pointer-events-auto m-3! flex flex-col overflow-hidden">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          aria-label="zoom in"
          className="press touch-target flex h-11 w-11 items-center justify-center border-b border-rule/60 font-mono text-tiny text-ink"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          aria-label="zoom out"
          className="press touch-target flex h-11 w-11 items-center justify-center font-mono text-tiny text-ink"
        >
          −
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
  spots: Spot[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
};

export default function SpotMap({
  spots,
  selectedSlug,
  onSelect,
}: SpotMapProps) {
  const { theme } = useTheme();

  useEffect(() => {
    warnIfFallbackBasemap();
  }, []);

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
      <TileLayer
        // Keyed so a theme flip swaps the raster set instead of tinting it.
        key={theme}
        url={TILE_URL[theme]}
        attribution={ATTRIBUTION}
        tileSize={TILE_SIZE}
        zoomOffset={ZOOM_OFFSET}
        maxZoom={19}
        detectRetina={DETECT_RETINA}
      />

      <FitToSpots spots={spots} />
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
