/**
 * Which basemap the maps draw.
 *
 * ---------------------------------------------------------------------
 * Raster is the default, and that is a deliberate step backwards
 * ---------------------------------------------------------------------
 *
 * The vector path below renders OpenFreeMap tiles through MapLibre so
 * that `india-worldview.ts` can filter the boundary lines — the only way
 * to get the Survey of India depiction without buying a basemap. It
 * shipped, and it did not render: MapLibre fetched the style, the
 * TileJSON and the sprite, then requested no tiles at all, leaving an
 * empty map with the markers still on it.
 *
 * So it is behind an opt-in flag until that is understood and fixed, and
 * the raster basemap is the default again. The borders are wrong on
 * raster — that is the whole reason the vector path exists — but a map
 * nobody can see is not a better answer to it.
 *
 * Set NEXT_PUBLIC_MAP_VECTOR=1 to try the vector path. It falls back to
 * raster on any failure rather than rendering nothing, and it will not
 * even attempt WebGL where WebGL is unavailable.
 */

const customLight = process.env.NEXT_PUBLIC_MAP_TILE_URL_LIGHT;
const customDark = process.env.NEXT_PUBLIC_MAP_TILE_URL_DARK;
const customAttribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION;

/** Opt in to the vector basemap while it is being fixed. */
export const vectorBasemapEnabled = process.env.NEXT_PUBLIC_MAP_VECTOR === "1";

/**
 * The raster fallback.
 *
 * CARTO renders OpenStreetMap, which depicts de-facto lines of control.
 * It is not a correct basemap to publish in India; it is a working one.
 * Configure a Survey of India-aligned provider — Mapbox with
 * `worldview=IN`, Mappls — through the variables below and this stops
 * being the compromise it currently is.
 */
const FALLBACK = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">openstreetmap</a> &middot; &copy; <a href="https://carto.com/attributions">carto</a>',
} as const;

export const isBasemapConfigured = Boolean(customLight && customDark);

export const TILE_URL = {
  light: customLight || FALLBACK.light,
  dark: customDark || FALLBACK.dark,
} as const;

export const ATTRIBUTION = customAttribution || FALLBACK.attribution;

/**
 * Tile size, because not every provider serves 256px tiles.
 *
 * Mapbox's Static Tiles API returns 512px by default. Leaflet assumes 256
 * and draws 512s one zoom level too far in with everything soft, which
 * reads as a styling problem rather than a configuration one. `zoomOffset`
 * is the other half of that fix and is only correct together with the
 * size, so it is derived rather than left as a second knob.
 */
const parsedSize = Number(process.env.NEXT_PUBLIC_MAP_TILE_SIZE);
export const TILE_SIZE =
  Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : 256;
export const ZOOM_OFFSET = TILE_SIZE === 512 ? -1 : 0;

/**
 * Retina is the provider's job once tiles are 512px: `detectRetina` fetches
 * the next zoom level and packs it into the same space, which on an
 * already-doubled tile scales it twice. Put `@2x` in the template instead.
 */
export const DETECT_RETINA = TILE_SIZE === 256;

/**
 * Says so, once, when the borders on screen are not India's.
 *
 * A basemap with the wrong borders looks entirely normal — that is the
 * problem with it — so nothing about the running app would prompt anyone
 * to check. This is the prompt.
 */
let warned = false;
export function warnIfBordersUnverified(): void {
  if (isBasemapConfigured || warned) return;
  warned = true;
  console.warn(
    "[map] drawing the CARTO/OpenStreetMap raster basemap. Its borders " +
      "follow de-facto lines of control and do NOT match the Survey of " +
      "India depiction required for maps published in India. Either " +
      "configure a Survey of India-aligned provider via " +
      "NEXT_PUBLIC_MAP_TILE_URL_LIGHT / _DARK, or set " +
      "NEXT_PUBLIC_MAP_VECTOR=1 once the vector basemap is fixed.",
  );
}

/* ------------------------------------------------------- vector ---- */

export const VECTOR_STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

export const VECTOR_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">openstreetmap</a> &middot; <a href="https://openfreemap.org">openfreemap</a>';

export type Theme = "light" | "dark";
