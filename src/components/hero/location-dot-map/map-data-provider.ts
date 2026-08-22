import { MAP_CONFIG, OVERPASS_ENDPOINT, type MapLocation } from "./map-config";

export type MapFeatureKind =
  "major-road" | "minor-road" | "railway" | "waterway" | "park" | "building";

export type MapFeature = {
  kind: MapFeatureKind;
  geometry: Array<{ lat: number; lon: number }>;
  closed: boolean;
};

type OverpassElement = {
  type: string;
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
};

type OverpassResponse = { elements?: OverpassElement[] };

function featureKind(tags: Record<string, string> = {}): MapFeatureKind | null {
  if (tags.highway) {
    return ["motorway", "trunk", "primary", "motorway_link"].includes(
      tags.highway,
    )
      ? "major-road"
      : "minor-road";
  }
  if (tags.railway) return "railway";
  if (tags.waterway) return "waterway";
  if (tags.building) return "building";
  if (
    tags.leisure === "park" ||
    tags.leisure === "garden" ||
    ["park", "grass", "forest", "recreation_ground"].includes(
      tags.landuse ?? "",
    )
  ) {
    return "park";
  }
  return null;
}

function viewportFor(location: MapLocation, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lonDelta =
    radiusKm /
    (111 * Math.max(0.2, Math.cos((location.latitude * Math.PI) / 180)));
  return {
    south: location.latitude - latDelta,
    west: location.longitude - lonDelta,
    north: location.latitude + latDelta,
    east: location.longitude + lonDelta,
  };
}

export interface MapDataProvider {
  getViewportGeometry(
    location: MapLocation,
    radiusKm: number,
    signal?: AbortSignal,
  ): Promise<MapFeature[]>;
}

export const overpassProvider: MapDataProvider = {
  async getViewportGeometry(location, radiusKm, signal) {
    const box = viewportFor(location, radiusKm);
    const bbox = `${box.south},${box.west},${box.north},${box.east}`;
    const query = `[out:json][timeout:14];(way[highway](${bbox});way[railway](${bbox});way[waterway](${bbox});way[building](${bbox});way[leisure~"park|garden"](${bbox});way[landuse~"park|grass|forest|recreation_ground"](${bbox}););out geom;`;
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal,
    });
    if (!response.ok) throw new Error("map data unavailable");

    const data = (await response.json()) as OverpassResponse;
    return (data.elements ?? []).flatMap((element) => {
      const kind = featureKind(element.tags);
      if (!kind || !element.geometry || element.geometry.length < 2) return [];
      return [
        {
          kind,
          geometry: element.geometry,
          closed:
            element.geometry.length > 3 &&
            element.geometry[0]!.lat === element.geometry.at(-1)?.lat &&
            element.geometry[0]!.lon === element.geometry.at(-1)?.lon,
        },
      ];
    });
  },
};

export { MAP_CONFIG };
