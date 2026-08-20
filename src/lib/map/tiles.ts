/**
 * Basemap configuration, in one place for both maps.
 *
 * ---------------------------------------------------------------------
 * Boundaries are part of the tile, not part of this app
 * ---------------------------------------------------------------------
 *
 * Raster basemaps arrive as finished PNGs with every border already drawn
 * into the pixels. No amount of client code repaints them, and drawing a
 * boundary overlay on top does not help either — the provider's own lines
 * stay visible underneath, so the result reads as two disagreeing maps
 * rather than as a corrected one.
 *
 * That matters here because the default provider renders OpenStreetMap
 * data, which depicts de-facto lines of control: dashed boundaries
 * through Jammu & Kashmir, Aksai Chin outside India, and Arunachal
 * Pradesh marked as disputed. Maps published in India are required to
 * show the boundaries as depicted by the Survey of India, and the CARTO
 * default does not.
 *
 * **The fix is the provider.** Point the URLs below at a basemap whose
 * cartography is already Survey of India-aligned — Mappls (MapmyIndia)
 * and ISRO's Bhuvan are the usual choices — and the borders come out
 * right because they were rendered right. See the README for the
 * variables and where to get a key.
 *
 * The endpoint shape differs per provider, so the URL is configuration
 * rather than something hard-coded here: whatever template your provider
 * documents goes straight into the environment.
 */

const customLight = process.env.NEXT_PUBLIC_MAP_TILE_URL_LIGHT;
const customDark = process.env.NEXT_PUBLIC_MAP_TILE_URL_DARK;
const customAttribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION;

/**
 * The no-key fallback.
 *
 * Kept so the app runs before anyone has provisioned a basemap account,
 * and *only* for that. It is not suitable for serving India.
 */
const FALLBACK = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">openstreetmap</a> &middot; &copy; <a href="https://carto.com/attributions">carto</a>',
} as const;

/** True when a basemap has been configured explicitly. */
export const isBasemapConfigured = Boolean(customLight && customDark);

export const TILE_URL = {
  light: customLight || FALLBACK.light,
  dark: customDark || FALLBACK.dark,
} as const;

export const ATTRIBUTION = customAttribution || FALLBACK.attribution;

/**
 * Says so, once, when the fallback is live.
 *
 * A basemap with the wrong borders looks entirely normal — that is the
 * problem with it. Nothing about the running app would ever prompt
 * someone to check, so this is the prompt.
 */
let warned = false;
export function warnIfFallbackBasemap(): void {
  if (isBasemapConfigured || warned) return;
  warned = true;
  console.warn(
    "[map] using the CARTO/OpenStreetMap fallback basemap. Its borders " +
      "follow de-facto lines of control and do NOT match the Survey of " +
      "India depiction required for maps published in India. Set " +
      "NEXT_PUBLIC_MAP_TILE_URL_LIGHT / _DARK to a Survey of " +
      "India-aligned provider before serving Indian users — see README.",
  );
}

/**
 * India, framed.
 *
 * The bounds cover the full extent as depicted by the Survey of India,
 * which is wider than the de-facto one: north to the top of Jammu &
 * Kashmir and east across Aksai Chin, rather than stopping at a line of
 * control. Framing to anything narrower would crop territory off the top
 * of the map on the first load, which is its own kind of wrong depiction.
 */
export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.4, 68.1], // south-west — Indira Point / western Gujarat
  [37.4, 97.5], // north-east — northern J&K / eastern Arunachal
];

/** Centre and zoom, for the maps that take a view rather than bounds. */
export const INDIA_VIEW = {
  center: [22.6, 82.8] as [number, number],
  zoom: 4,
} as const;
