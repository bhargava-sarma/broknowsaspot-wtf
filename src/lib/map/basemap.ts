/**
 * Which basemap the maps draw, and where its style comes from.
 *
 * Two paths, and the default is the one that gets the borders right.
 *
 * **Vector (default).** OpenFreeMap serves OpenMapTiles vector tiles over
 * HTTPS with no API key, no registration and no request cap. Because the
 * tiles carry boundary *data* rather than a picture of boundaries, the
 * style decides which lines are drawn — which is what makes
 * `applyIndiaWorldview` possible at all. See `india-worldview.ts`.
 *
 * **Raster (opt-in).** Setting the tile URL variables switches to a plain
 * XYZ basemap instead. That exists for a commercial provider whose
 * cartography is already Survey of India-aligned — Mapbox with
 * `worldview=IN`, Mappls — where the borders are the provider's problem
 * rather than ours. It is a deliberate override, so it does not warn.
 */

import {
  applyIndiaWorldview,
  type WorldviewReport,
} from "@/lib/map/india-worldview";

/* ------------------------------------------------------- raster ---- */

const customLight = process.env.NEXT_PUBLIC_MAP_TILE_URL_LIGHT;
const customDark = process.env.NEXT_PUBLIC_MAP_TILE_URL_DARK;
const customAttribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION;

/** True when raster URLs are configured, which opts out of the vector path. */
export const usesRasterBasemap = Boolean(customLight && customDark);

export const TILE_URL = {
  light: customLight ?? "",
  dark: customDark ?? "",
} as const;

/**
 * Tile size, because not every provider serves 256px tiles.
 *
 * Mapbox's Static Tiles API returns 512px by default. Leaflet assumes 256
 * and will happily draw 512s at the wrong scale: one zoom level too far
 * in, everything soft. It reads as a styling problem rather than a
 * configuration one, which is how it survives review.
 *
 * `zoomOffset` is the other half of that fix and is only ever correct
 * together with the size, so it is derived rather than left as a second
 * knob to set inconsistently.
 */
const parsedSize = Number(process.env.NEXT_PUBLIC_MAP_TILE_SIZE);
export const TILE_SIZE =
  Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : 256;
export const ZOOM_OFFSET = TILE_SIZE === 512 ? -1 : 0;

/**
 * Retina is the provider's job once tiles are 512px: `detectRetina` works
 * by fetching the next zoom level and packing it into the same space,
 * which on an already-doubled tile scales it twice. Put `@2x` in the URL
 * template instead.
 */
export const DETECT_RETINA = TILE_SIZE === 256;

/* ------------------------------------------------------- vector ---- */

const VECTOR_STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

export const ATTRIBUTION =
  customAttribution ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">openstreetmap</a> &middot; <a href="https://openfreemap.org">openfreemap</a>';

export type Theme = "light" | "dark";

/**
 * Fetches the basemap style and rewrites its borders for India.
 *
 * The style is fetched rather than vendored so the basemap keeps
 * improving without a redeploy — but that also means its shape is not
 * ours to guarantee, which is why the rewrite reports what it touched and
 * this throws when it touched nothing. A style whose boundary layers were
 * renamed or restructured would otherwise silently render the provider's
 * own depiction, and a caller that swallowed that would show the wrong
 * borders while looking completely healthy.
 *
 * `scripts/check-borders.mts` runs the same rewrite against committed
 * copies of both styles, so a shape change is caught by the check rather
 * than by a reader in India.
 */
export async function loadIndiaStyle(
  theme: Theme,
  signal?: AbortSignal,
): Promise<{ style: unknown; report: WorldviewReport }> {
  const response = await fetch(VECTOR_STYLE[theme], { signal });
  if (!response.ok) {
    throw new Error(
      `basemap style ${VECTOR_STYLE[theme]} responded ${response.status}`,
    );
  }

  const raw = (await response.json()) as { layers?: unknown[] };
  const { style, report } = applyIndiaWorldview(raw as never);

  if (report.rewritten.length === 0) {
    throw new Error(
      "basemap style has no boundary layers to rewrite — its schema " +
        "changed, and India's borders cannot be guaranteed. Refusing to " +
        "render it. Refresh scripts/fixtures/ and re-run check:borders.",
    );
  }

  return { style, report };
}
