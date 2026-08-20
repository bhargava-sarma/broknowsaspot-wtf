"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import L from "leaflet";
import { useEffect, useState } from "react";
import { TileLayer, useMap } from "react-leaflet";

import {
  ATTRIBUTION,
  DETECT_RETINA,
  loadIndiaStyle,
  TILE_SIZE,
  TILE_URL,
  usesRasterBasemap,
  ZOOM_OFFSET,
  type Theme,
} from "@/lib/map/basemap";

/**
 * The basemap under everything else.
 *
 * Renders vector tiles through MapLibre inside the Leaflet map, so the
 * boundary filtering in `india-worldview.ts` applies — a raster basemap
 * ships borders as pixels and gives us no say in them.
 *
 * MapLibre is bridged in rather than replacing Leaflet outright. Every
 * marker, the zoom control, the fit-to-results behaviour and the pin
 * picker are Leaflet code that works and is styled to match the rest of
 * the site; swapping the whole engine to change which lines get drawn
 * would rewrite all of it to change none of it.
 *
 * The plugin and MapLibre itself are imported dynamically for the same
 * reason the map component is: MapLibre is a large dependency, and no
 * page except the two with maps on them should be paying for it.
 */
export function BasemapLayer({ theme }: { theme: Theme }) {
  const map = useMap();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (usesRasterBasemap) return;

    let layer: L.Layer | null = null;
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        // maplibre-gl reaches for `window` at module scope, and the
        // Leaflet plugin registers itself onto L as a side effect.
        const [maplibregl] = await Promise.all([
          import("maplibre-gl"),
          import("@maplibre/maplibre-gl-leaflet"),
        ]);
        // The plugin resolves maplibre-gl off the global in some bundling
        // paths, so make sure it is there before constructing the layer.
        const globals = window as unknown as { maplibregl?: unknown };
        globals.maplibregl ??=
          (maplibregl as { default?: unknown }).default ?? maplibregl;

        const { style, report } = await loadIndiaStyle(
          theme,
          controller.signal,
        );
        if (cancelled) return;

        if (process.env.NODE_ENV !== "production") {
          console.info(
            `[map] india worldview applied to ${report.rewritten.length} boundary layers` +
              (report.undashed.length
                ? `; dash removed from ${report.undashed.join(", ")}`
                : ""),
          );
        }

        // `attribution` is a Leaflet Layer option that Leaflet reads on
        // add; the plugin's types only describe MapLibre's own options,
        // so it has to go in through a cast rather than being dropped.
        layer = L.maplibreGL({
          style: style as never,
          attribution: ATTRIBUTION,
        } as Parameters<typeof L.maplibreGL>[0]);
        layer.addTo(map);
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        // Falling back to a raster basemap here would quietly serve the
        // borders this whole path exists to avoid, so it does not. An
        // empty basemap with the markers still on it is the honest
        // failure: the spots are readable and nothing is misdrawn.
        console.error("[map] could not load the basemap style", error);
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (layer) map.removeLayer(layer);
    };
  }, [map, theme]);

  // The opt-in raster path, for a provider whose own cartography is
  // already Survey of India-aligned.
  if (usesRasterBasemap) {
    return (
      <TileLayer
        key={theme}
        url={TILE_URL[theme]}
        attribution={ATTRIBUTION}
        tileSize={TILE_SIZE}
        zoomOffset={ZOOM_OFFSET}
        maxZoom={19}
        detectRetina={DETECT_RETINA}
      />
    );
  }

  if (failed) {
    return (
      <div className="pointer-events-none absolute inset-0 z-400 flex items-end justify-center pb-10">
        <p className="glass glass-dense glass-rim glass-r-sm px-3 py-2 font-mono text-micro text-muted lowercase">
          basemap unavailable — spots are still listed
        </p>
      </div>
    );
  }

  return null;
}
