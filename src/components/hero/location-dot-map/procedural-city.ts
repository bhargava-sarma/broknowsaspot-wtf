/**
 * Static vector road network → deterministic particle map.
 *
 * Every dot below is sampled from a named polyline. The road geometry remains
 * the source of truth: empty spaces have no particles, and intersections grow
 * dense naturally as independent road samples overlap.
 */

export type CityDot = {
  x: number;
  y: number;
  alpha: number;
  radius: number;
  dist: number;
  delay: number;
};

type RoadKind =
  | "motorway"
  | "trunk"
  | "primary"
  | "secondary"
  | "tertiary"
  | "residential"
  | "service";

type Point = readonly [number, number];
type Road = { type: RoadKind; points: readonly Point[] };

export const MAP_GEOMETRY = {
  centerX: 0.3,
  centerY: 0.5,
  color: "#f22f63",
  revealMs: 2050,
} as const;

const ROAD_STYLES: Record<
  RoadKind,
  {
    spacing: number;
    dotSize: number;
    opacity: number;
    spread: number;
    lanes: number;
    priority: number;
  }
> = {
  motorway: {
    spacing: 0.008,
    dotSize: 2.3,
    opacity: 0.76,
    spread: 2.6,
    lanes: 3,
    priority: 0.0,
  },
  trunk: {
    spacing: 0.009,
    dotSize: 2.1,
    opacity: 0.69,
    spread: 2.2,
    lanes: 3,
    priority: 0.04,
  },
  primary: {
    spacing: 0.011,
    dotSize: 1.85,
    opacity: 0.6,
    spread: 1.75,
    lanes: 2,
    priority: 0.09,
  },
  secondary: {
    spacing: 0.013,
    dotSize: 1.62,
    opacity: 0.52,
    spread: 1.35,
    lanes: 2,
    priority: 0.14,
  },
  tertiary: {
    spacing: 0.015,
    dotSize: 1.42,
    opacity: 0.44,
    spread: 1.0,
    lanes: 1,
    priority: 0.2,
  },
  residential: {
    spacing: 0.018,
    dotSize: 1.24,
    opacity: 0.36,
    spread: 0.72,
    lanes: 1,
    priority: 0.27,
  },
  service: {
    spacing: 0.022,
    dotSize: 1.05,
    opacity: 0.27,
    spread: 0.5,
    lanes: 1,
    priority: 0.33,
  },
};

/*
 * The coordinates describe an intentionally irregular city. Shared endpoints
 * are repeated verbatim so roads truly meet; smooth curves are represented by
 * several short polyline segments rather than by a radial particle algorithm.
 */
const ROADS: readonly Road[] = [
  // Regional through-routes
  {
    type: "motorway",
    points: [
      [-0.08, 0.23],
      [0.05, 0.25],
      [0.18, 0.3],
      [0.31, 0.36],
      [0.44, 0.4],
      [0.62, 0.43],
      [0.84, 0.47],
      [1.08, 0.53],
    ],
  },
  {
    type: "motorway",
    points: [
      [0.22, -0.08],
      [0.25, 0.1],
      [0.28, 0.25],
      [0.31, 0.36],
      [0.38, 0.5],
      [0.47, 0.66],
      [0.58, 0.83],
      [0.65, 1.08],
    ],
  },
  {
    type: "trunk",
    points: [
      [-0.08, 0.72],
      [0.07, 0.65],
      [0.19, 0.57],
      [0.3, 0.55],
      [0.42, 0.5],
      [0.55, 0.44],
      [0.65, 0.35],
      [0.88, 0.27],
      [1.08, 0.19],
    ],
  },
  {
    type: "trunk",
    points: [
      [0.08, 1.08],
      [0.16, 0.86],
      [0.24, 0.67],
      [0.34, 0.58],
      [0.4, 0.45],
      [0.36, 0.31],
      [0.39, 0.14],
      [0.43, -0.08],
    ],
  },
  {
    type: "trunk",
    points: [
      [-0.08, 0.42],
      [0.07, 0.43],
      [0.17, 0.45],
      [0.32, 0.46],
      [0.48, 0.56],
      [0.66, 0.62],
      [0.83, 0.69],
      [1.08, 0.76],
    ],
  },
  {
    type: "primary",
    points: [
      [0.02, 0.08],
      [0.14, 0.15],
      [0.25, 0.24],
      [0.31, 0.36],
      [0.36, 0.5],
      [0.44, 0.63],
      [0.56, 0.72],
      [0.74, 0.79],
      [0.98, 0.85],
    ],
  },
  {
    type: "primary",
    points: [
      [0.52, -0.06],
      [0.48, 0.12],
      [0.44, 0.27],
      [0.47, 0.42],
      [0.56, 0.54],
      [0.69, 0.62],
      [0.86, 0.67],
      [1.08, 0.66],
    ],
  },
  {
    type: "primary",
    points: [
      [-0.08, 0.57],
      [0.08, 0.52],
      [0.19, 0.45],
      [0.32, 0.44],
      [0.43, 0.48],
      [0.56, 0.5],
      [0.7, 0.55],
      [0.88, 0.63],
    ],
  },
  {
    type: "primary",
    points: [
      [0.69, -0.08],
      [0.65, 0.08],
      [0.62, 0.21],
      [0.65, 0.35],
      [0.74, 0.48],
      [0.86, 0.55],
      [1.08, 0.58],
    ],
  },

  // Inner connectors and curved distributor roads
  {
    type: "secondary",
    points: [
      [0.05, 0.25],
      [0.1, 0.35],
      [0.17, 0.45],
      [0.27, 0.43],
      [0.38, 0.46],
      [0.43, 0.48],
      [0.57, 0.41],
    ],
  },
  {
    type: "secondary",
    points: [
      [0.07, 0.65],
      [0.13, 0.58],
      [0.19, 0.53],
      [0.3, 0.56],
      [0.42, 0.56],
      [0.54, 0.65],
      [0.66, 0.7],
    ],
  },
  {
    type: "secondary",
    points: [
      [0.31, 0.36],
      [0.38, 0.34],
      [0.46, 0.36],
      [0.54, 0.42],
      [0.65, 0.5],
      [0.74, 0.48],
    ],
  },
  {
    type: "secondary",
    points: [
      [0.24, 0.67],
      [0.35, 0.66],
      [0.44, 0.63],
      [0.56, 0.54],
      [0.63, 0.42],
      [0.65, 0.35],
    ],
  },
  {
    type: "secondary",
    points: [
      [0.14, 0.15],
      [0.18, 0.25],
      [0.23, 0.35],
      [0.31, 0.36],
      [0.39, 0.32],
      [0.48, 0.27],
    ],
  },
  {
    type: "secondary",
    points: [
      [0.47, 0.66],
      [0.54, 0.61],
      [0.64, 0.59],
      [0.74, 0.61],
      [0.84, 0.69],
    ],
  },
  {
    type: "secondary",
    points: [
      [0.47, 0.42],
      [0.54, 0.36],
      [0.62, 0.31],
      [0.72, 0.32],
      [0.82, 0.4],
    ],
  },
  {
    type: "secondary",
    points: [
      [0.44, 0.4],
      [0.48, 0.48],
      [0.48, 0.56],
      [0.44, 0.63],
    ],
  },
  {
    type: "secondary",
    points: [
      [0.56, 0.5],
      [0.64, 0.5],
      [0.74, 0.48],
      [0.86, 0.55],
    ],
  },
  {
    type: "tertiary",
    points: [
      [0.02, 0.34],
      [0.11, 0.34],
      [0.17, 0.38],
      [0.23, 0.35],
    ],
  },
  {
    type: "tertiary",
    points: [
      [0.05, 0.52],
      [0.1, 0.43],
      [0.17, 0.45],
      [0.22, 0.53],
    ],
  },
  {
    type: "tertiary",
    points: [
      [0.1, 0.73],
      [0.17, 0.67],
      [0.25, 0.72],
      [0.32, 0.77],
    ],
  },
  {
    type: "tertiary",
    points: [
      [0.32, 0.22],
      [0.39, 0.24],
      [0.44, 0.27],
      [0.43, 0.35],
    ],
  },
  {
    type: "tertiary",
    points: [
      [0.54, 0.18],
      [0.62, 0.21],
      [0.62, 0.31],
      [0.67, 0.37],
    ],
  },
  {
    type: "tertiary",
    points: [
      [0.7, 0.2],
      [0.76, 0.28],
      [0.72, 0.32],
      [0.82, 0.4],
    ],
  },
  {
    type: "tertiary",
    points: [
      [0.66, 0.7],
      [0.73, 0.68],
      [0.79, 0.74],
      [0.86, 0.76],
    ],
  },
  {
    type: "tertiary",
    points: [
      [0.45, 0.75],
      [0.51, 0.71],
      [0.56, 0.72],
      [0.62, 0.81],
    ],
  },
  {
    type: "tertiary",
    points: [
      [0.28, 0.83],
      [0.34, 0.75],
      [0.42, 0.77],
      [0.49, 0.86],
    ],
  },

  // Local street fragments: low-weight paths around the arterial network
  {
    type: "residential",
    points: [
      [0.08, 0.28],
      [0.16, 0.28],
      [0.19, 0.33],
      [0.16, 0.39],
      [0.09, 0.39],
    ],
  },
  {
    type: "residential",
    points: [
      [0.12, 0.3],
      [0.12, 0.45],
      [0.18, 0.45],
      [0.18, 0.31],
    ],
  },
  {
    type: "residential",
    points: [
      [0.12, 0.59],
      [0.2, 0.59],
      [0.23, 0.64],
      [0.17, 0.7],
      [0.1, 0.68],
    ],
  },
  {
    type: "residential",
    points: [
      [0.19, 0.54],
      [0.19, 0.68],
      [0.27, 0.68],
      [0.27, 0.56],
    ],
  },
  {
    type: "residential",
    points: [
      [0.24, 0.27],
      [0.32, 0.27],
      [0.36, 0.31],
      [0.33, 0.38],
      [0.25, 0.38],
    ],
  },
  {
    type: "residential",
    points: [
      [0.28, 0.25],
      [0.28, 0.4],
      [0.36, 0.4],
      [0.39, 0.32],
    ],
  },
  {
    type: "residential",
    points: [
      [0.39, 0.42],
      [0.47, 0.42],
      [0.51, 0.47],
      [0.47, 0.53],
      [0.38, 0.53],
    ],
  },
  {
    type: "residential",
    points: [
      [0.41, 0.37],
      [0.41, 0.57],
      [0.5, 0.57],
      [0.5, 0.42],
    ],
  },
  {
    type: "residential",
    points: [
      [0.53, 0.4],
      [0.61, 0.4],
      [0.66, 0.45],
      [0.62, 0.52],
      [0.53, 0.52],
    ],
  },
  {
    type: "residential",
    points: [
      [0.57, 0.33],
      [0.57, 0.56],
      [0.65, 0.56],
      [0.65, 0.4],
    ],
  },
  {
    type: "residential",
    points: [
      [0.67, 0.43],
      [0.76, 0.43],
      [0.8, 0.49],
      [0.75, 0.56],
      [0.67, 0.54],
    ],
  },
  {
    type: "residential",
    points: [
      [0.72, 0.36],
      [0.72, 0.58],
      [0.8, 0.58],
      [0.8, 0.45],
    ],
  },
  {
    type: "residential",
    points: [
      [0.5, 0.62],
      [0.59, 0.62],
      [0.64, 0.68],
      [0.59, 0.75],
      [0.5, 0.72],
    ],
  },
  {
    type: "residential",
    points: [
      [0.53, 0.57],
      [0.53, 0.76],
      [0.62, 0.76],
      [0.65, 0.64],
    ],
  },
  {
    type: "residential",
    points: [
      [0.3, 0.7],
      [0.4, 0.7],
      [0.45, 0.76],
      [0.41, 0.84],
      [0.31, 0.82],
    ],
  },
  {
    type: "residential",
    points: [
      [0.34, 0.65],
      [0.34, 0.84],
      [0.43, 0.84],
      [0.46, 0.74],
    ],
  },
  {
    type: "service",
    points: [
      [0.01, 0.15],
      [0.08, 0.19],
      [0.12, 0.15],
      [0.08, 0.1],
    ],
  },
  {
    type: "service",
    points: [
      [0.02, 0.81],
      [0.1, 0.77],
      [0.14, 0.82],
      [0.08, 0.88],
    ],
  },
  {
    type: "service",
    points: [
      [0.76, 0.12],
      [0.84, 0.16],
      [0.88, 0.24],
      [0.82, 0.27],
    ],
  },
  {
    type: "service",
    points: [
      [0.79, 0.77],
      [0.88, 0.79],
      [0.93, 0.86],
      [0.85, 0.91],
    ],
  },
];

function hash(a: number, b: number, c = 0): number {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.3) * 43758.5453;
  return value - Math.floor(value);
}

/** A gentle global warp; matching coordinates transform identically. */
function warp([x, y]: Point): Point {
  return [
    x + 0.012 * Math.sin(y * 7.2 + x * 2.1) + 0.006 * Math.sin(x * 16),
    y + 0.01 * Math.sin(x * 6.6 - y * 2.6) + 0.004 * Math.sin(y * 15),
  ];
}

function appendParticle(
  dots: CityDot[],
  point: Point,
  road: RoadKind,
  laneOffset: number,
  normal: Point,
  seed: number,
) {
  const style = ROAD_STYLES[road];
  const offset = laneOffset + (hash(seed, 3) - 0.5) * style.spread * 0.00075;
  const [x, y] = warp([
    point[0] + normal[0] * offset,
    point[1] + normal[1] * offset,
  ]);
  if (x < -0.09 || x > 1.09 || y < -0.09 || y > 1.09) return;

  // Soft oval edge mask preserves the road topology while letting the network
  // dissolve elegantly at the perimeter instead of ending in a rectangle.
  const ovalDistance = Math.hypot((x - 0.47) / 0.68, (y - 0.49) / 0.57);
  const edgeFade = Math.max(0.08, Math.min(1, (1.22 - ovalDistance) / 0.4));
  const variation = hash(x * 17.3, y * 23.9, seed);
  const markerDistance = Math.hypot(
    x - MAP_GEOMETRY.centerX,
    y - MAP_GEOMETRY.centerY,
  );
  dots.push({
    x,
    y,
    alpha: style.opacity * (0.78 + variation * 0.22) * edgeFade,
    radius: style.dotSize * (0.86 + variation * 0.2) * (0.72 + edgeFade * 0.28),
    dist: markerDistance,
    // Trunk routes reveal just ahead of lower-weight streets, while every
    // particle still resolves to the same immutable road position.
    delay: Math.min(
      0.8,
      style.priority + markerDistance * 0.52 + hash(seed, 9) * 0.12,
    ),
  });
}

function appendRoadParticles(dots: CityDot[], road: Road, roadIndex: number) {
  const style = ROAD_STYLES[road.type];
  for (let segment = 1; segment < road.points.length; segment++) {
    const start = road.points[segment - 1]!;
    const end = road.points[segment]!;
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.hypot(dx, dy);
    if (length < 0.0001) continue;
    const normal: Point = [-dy / length, dx / length];
    const count = Math.max(1, Math.ceil(length / style.spacing));

    for (let step = 0; step <= count; step++) {
      const t = step / count;
      const point: Point = [start[0] + dx * t, start[1] + dy * t];
      for (let lane = 0; lane < style.lanes; lane++) {
        const lanePosition = lane - (style.lanes - 1) / 2;
        const laneOffset = lanePosition * style.spread * 0.00165;
        appendParticle(
          dots,
          point,
          road.type,
          laneOffset,
          normal,
          roadIndex * 10_000 + segment * 100 + step * 4 + lane,
        );
      }
    }
  }
}

export function generateProceduralCity(): CityDot[] {
  const dots: CityDot[] = [];
  ROADS.forEach((road, index) => appendRoadParticles(dots, road, index + 1));
  return dots;
}

export const CITY_DOTS = generateProceduralCity();
