"use client";

import L from "leaflet";
import type { Map as MaplibreMap } from "maplibre-gl";
import { useEffect, useState } from "react";
import { TileLayer, useMap } from "react-leaflet";

import { applyIndiaWorldview } from "@/lib/map/india-worldview";
import {
  ATTRIBUTION,
  DETECT_RETINA,
  TILE_SIZE,
  TILE_URL,
  VECTOR_ATTRIBUTION,
  VECTOR_STYLE,
  vectorBasemapEnabled,
  warnIfBordersUnverified,
  ZOOM_OFFSET,
  type Theme,
} from "@/lib/map/basemap";

/**
 * The basemap under everything else.
 *
 * Raster by default. The vector path — OpenFreeMap through MapLibre, so
 * that `india-worldview.ts` can filter the boundary lines to India's
 * depiction — is behind NEXT_PUBLIC_MAP_VECTOR=1 while it is being
 * fixed. See `basemap.ts` for why.
 *
 * The rule this component now follows, which it did not before: **it
 * always ends up drawing a map.** Every way the vector path can fail —
 * no WebGL, style unreachable, style unfilterable, MapLibre throwing on
 * construction, or MapLibre attaching and then never fetching a tile —
 * lands on the raster basemap rather than on an empty rectangle. Wrong
 * borders are a problem to fix; no map at all is a broken product, and
 * the previous version treated the second as the safe option.
 */

/** MapLibre cannot render without WebGL, and some clients have none. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * How long to give MapLibre to paint something before giving up on it.
 *
 * The failure that shipped was silent: the layer attached, no error was
 * thrown, and no tile was ever requested. Nothing to catch, so nothing
 * caught it. Waiting for a first frame and treating its absence as a
 * failure is the only thing that would have noticed.
 */
const FIRST_FRAME_MS = 6000;

export function BasemapLayer({ theme }: { theme: Theme }) {
  const map = useMap();
  const [useRaster, setUseRaster] = useState(!vectorBasemapEnabled);

  useEffect(() => {
    if (!vectorBasemapEnabled) {
      warnIfBordersUnverified();
      return;
    }

    let layer: L.Layer | null = null;
    let settled = false;
    let cancelled = false;
    const controller = new AbortController();

    const giveUp = (why: string, detail?: unknown) => {
      if (settled || cancelled) return;
      settled = true;
      console.warn(`[map] vector basemap ${why} — using raster`, detail ?? "");
      if (layer) {
        map.removeLayer(layer);
        layer = null;
      }
      setUseRaster(true);
      warnIfBordersUnverified();
    };

    const timer = window.setTimeout(
      () => giveUp("drew nothing in time"),
      FIRST_FRAME_MS,
    );

    (async () => {
      try {
        // Checked here rather than in the effect body so the fallback
        // goes through the one path that handles it.
        if (!hasWebGL()) return giveUp("needs webgl, which this client has no");

        const [maplibregl] = await Promise.all([
          import("maplibre-gl"),
          import("@maplibre/maplibre-gl-leaflet"),
          import("maplibre-gl/dist/maplibre-gl.css"),
        ]);
        const globals = window as unknown as { maplibregl?: unknown };
        globals.maplibregl ??=
          (maplibregl as { default?: unknown }).default ?? maplibregl;

        const response = await fetch(VECTOR_STYLE[theme], {
          signal: controller.signal,
        });
        if (!response.ok) {
          return giveUp(`style responded ${response.status}`);
        }

        const raw = (await response.json()) as { layers?: unknown[] };
        const { style, report } = applyIndiaWorldview(raw as never);

        // Nothing to filter means the schema moved and the borders cannot
        // be guaranteed. Raster's borders are wrong too, but they are at
        // least wrong visibly rather than wrong invisibly.
        if (report.rewritten.length === 0) {
          return giveUp("has no boundary layers to filter");
        }
        if (cancelled) return;

        layer = L.maplibreGL({
          style: style as never,
          attribution: VECTOR_ATTRIBUTION,
        } as Parameters<typeof L.maplibreGL>[0]);

        // Only once MapLibre has actually painted is the vector path
        // considered to have worked.
        const gl = (
          layer as unknown as { getMaplibreMap?: () => MaplibreMap }
        ).getMaplibreMap?.();
        gl?.once("idle", () => {
          if (settled || cancelled) return;
          settled = true;
          window.clearTimeout(timer);
          console.info(
            `[map] india worldview applied to ${report.rewritten.length} boundary layers`,
          );
        });
        gl?.on("error", (event: unknown) => giveUp("errored", event));

        layer.addTo(map);
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        giveUp("could not start", error);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
      if (layer) map.removeLayer(layer);
    };
  }, [map, theme]);

  if (!useRaster) return null;

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
