import { MAP_CONFIG, type MapLocation } from "./map-config";
import type { MapFeature, MapFeatureKind } from "./map-data-provider";

export type DotPoint = {
  /** Normalized 0-1 x position (0 = left, 1 = right). */
  x: number;
  /** Normalized 0-1 y position (0 = top, 1 = bottom). */
  y: number;
  /** Feature importance 0-1. Controls dot size and opacity. */
  importance: number;
  /** Deterministic 0-1 variation seed — no Math.random(). */
  seed: number;
};

/** Visual importance weights per feature type. */
const WEIGHT: Record<MapFeatureKind, number> = {
  "major-road": 1.0,
  "minor-road": 0.65,
  railway: 0.52,
  waterway: 0.45,
  park: 0.28,
  building: 0.20,
};

/** Dot-spacing in normalized 0-1 coordinates per feature type. */
function dotSpacing(kind: MapFeatureKind): number {
  switch (kind) {
    case "major-road": return MAP_CONFIG.majorRoadSpacing;
    case "minor-road": return MAP_CONFIG.minorRoadSpacing;
    case "railway":    return MAP_CONFIG.railwaySpacing;
    case "waterway":   return MAP_CONFIG.waterwaySpacing;
    case "building":   return MAP_CONFIG.buildingSpacing;
    case "park":       return MAP_CONFIG.parkSpacing;
    default:           return MAP_CONFIG.minorRoadSpacing;
  }
}

/**
 * Maximum points per importance tier bucket.
 * More important features get a larger share of the budget.
 */
function tierBudget(importance: number): number {
  if (importance >= 0.9) return 2200; // major roads
  if (importance >= 0.6) return 1400; // minor roads, railways
  if (importance >= 0.4) return 800;  // waterways
  return 500;                          // buildings, parks
}

/**
 * Mercator projection: (lat, lon) → normalized (x, y) where (0.5, 0.5) is
 * the viewport center. Range ≈ 0..1 across the queried radius.
 */
function project(
  lat: number,
  lon: number,
  center: MapLocation,
  radiusKm: number,
): { x: number; y: number } {
  const toRad = Math.PI / 180;
  const centerRad = center.latitude * toRad;
  const latDelta = radiusKm / 111;
  const cosLat = Math.max(0.15, Math.cos(centerRad));
  const lonDelta = radiusKm / (111 * cosLat);

  const mercY = (deg: number) =>
    Math.log(Math.tan(Math.PI / 4 + (deg * toRad) / 2));
  const centerMY = mercY(center.latitude);
  const northMY  = mercY(center.latitude + latDelta);
  const halfSpan = northMY - centerMY;

  return {
    x: (lon - center.longitude) / (2 * lonDelta) + 0.5,
    y: 0.5 - (mercY(lat) - centerMY) / (2 * halfSpan),
  };
}

/** Deterministic hash → 0-1 (no Math.random). */
function hash(a: number, b: number, c: number): number {
  const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.3) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Convert geographic features into a flat array of canvas-ready dot positions.
 *
 * Roads and waterways are sampled along their line segments at regular spacing.
 * Closed polygons (buildings, parks) also get a sparse interior fill so dense
 * urban areas naturally produce higher overall point density.
 *
 * Deterministic: same input → same output, no randomness.
 */
export function sampleGeometry(
  features: MapFeature[],
  center: MapLocation,
  radiusKm: number = MAP_CONFIG.radiusKm,
): DotPoint[] {
  // Buckets keyed by importance tier (rounded to 0.1) so each tier stays
  // within its own budget without starving other feature types.
  const buckets = new Map<number, DotPoint[]>();

  function add(pt: DotPoint) {
    const tier = Math.round(pt.importance * 10) / 10;
    const bucket = buckets.get(tier) ?? [];
    if (bucket.length >= tierBudget(tier)) return;
    bucket.push(pt);
    buckets.set(tier, bucket);
  }

  for (let fi = 0; fi < features.length; fi++) {
    const feature = features[fi]!;
    const projected = feature.geometry.map((p) =>
      project(p.lat, p.lon, center, radiusKm),
    );
    const step = dotSpacing(feature.kind);
    const importance = WEIGHT[feature.kind];

    // ── sample along each line segment ────────────────────────────────────
    for (let i = 1; i < projected.length; i++) {
      const a = projected[i - 1]!;
      const b = projected[i]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1e-7) continue;

      const count = Math.min(200, Math.ceil(len / step));
      for (let j = 0; j <= count; j++) {
        const t = j / count;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        // Allow points slightly outside the unit square so edges look complete.
        if (x < -0.05 || x > 1.05 || y < -0.05 || y > 1.05) continue;
        add({ x, y, importance, seed: hash(x, y, fi) });
      }
    }

    // ── sparse interior fill for closed polygons ───────────────────────────
    if (feature.closed && (feature.kind === "building" || feature.kind === "park")) {
      const xs = projected.map((p) => p.x);
      const ys = projected.map((p) => p.y);
      const x0 = Math.max(-0.05, Math.min(...xs));
      const x1 = Math.min(1.05, Math.max(...xs));
      const y0 = Math.max(-0.05, Math.min(...ys));
      const y1 = Math.min(1.05, Math.max(...ys));
      const fillStep = step * 1.8;
      // Buildings get denser interior fill than parks.
      const threshold = feature.kind === "building" ? 0.42 : 0.22;
      for (let gy = y0; gy <= y1; gy += fillStep) {
        for (let gx = x0; gx <= x1; gx += fillStep) {
          if (hash(gx, gy, fi + 100) < threshold) {
            add({
              x: gx,
              y: gy,
              importance: importance * 0.8,
              seed: hash(gy, gx, fi + 200),
            });
          }
        }
      }
    }
  }

  // Flatten and apply global cap.
  return [...buckets.values()].flat().slice(0, MAP_CONFIG.maxPoints);
}
