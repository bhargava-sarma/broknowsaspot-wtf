/**
 * Where the maps open.
 *
 * The basemap itself — which tiles, and which borders they draw — lives
 * in `basemap.ts` and `india-worldview.ts`. This file is only the view.
 */

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
