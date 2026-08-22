export type MapLocation = { latitude: number; longitude: number };

/** Default center — Bengaluru city centre. */
export const DEFAULT_MAP_LOCATION: MapLocation = {
  latitude: 12.9716,
  longitude: 77.5946,
};

export const MAP_CONFIG = {
  radiusKm: 2.5,
  lowAccuracyRadiusKm: 3.5,
  maxPoints: 6000,

  // Spacing in normalized 0-1 coords. Higher = more spread out dots.
  // On a 550px canvas: 0.009 * 550 ≈ 5px between dot centres (matches reference).
  majorRoadSpacing: 0.009,
  minorRoadSpacing: 0.014,
  railwaySpacing: 0.012,
  buildingSpacing: 0.018,
  parkSpacing: 0.024,
  waterwaySpacing: 0.013,

  // Dot appearance
  minRadius: 1.2,   // px — always clearly visible
  maxRadius: 2.4,   // px — major roads near centre

  // Radial falloff — be generous so dots reach canvas edges
  edgeFadeStart: 0.30,
  edgeFadeEnd: 0.75,

  // Animation
  transitionMs: 900,

  // Centre marker
  centerDotRadius: 7,
  centerGlowFraction: 0.20,   // fraction of min(w, h)
  centerGlowAlpha: 0.20,
} as const;

export const OVERPASS_ENDPOINT =
  process.env.NEXT_PUBLIC_MAP_DATA_ENDPOINT ??
  "https://overpass-api.de/api/interpreter";

export function getDebugLocation(): MapLocation | null {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.NEXT_PUBLIC_MAP_DEBUG_LOCATION !== "true") return null;
  const lat = Number(process.env.NEXT_PUBLIC_MAP_DEBUG_LATITUDE);
  const lon = Number(process.env.NEXT_PUBLIC_MAP_DEBUG_LONGITUDE);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}
