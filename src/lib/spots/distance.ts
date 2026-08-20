/**
 * Distance between two points on the earth, in kilometres.
 *
 * Haversine, on a sphere. The error against a proper ellipsoid model is
 * about 0.5% — metres, at the distances anybody sorts a list by — and it
 * is a handful of arithmetic rather than an iterative solve.
 *
 * This exists so "what is near me" can be answered **in the browser**.
 * The database could do it: `location` is a Point with a spatial index
 * and Appwrite has `Query.distanceLessThan`. But asking the server which
 * spots are near you means telling the server where you are, on every
 * keystroke of a filter, and that request is logged by every hop in
 * between whatever this app does with it. The whole index is already in
 * the page — every spot's coordinates arrive with the list — so the
 * comparison can happen on the device and the position can stay there.
 *
 * That is the entire reason this file exists rather than a query.
 */

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Human-readable, with the precision the number actually supports. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}
