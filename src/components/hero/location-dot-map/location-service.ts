import { getDebugLocation, type MapLocation } from "./map-config";

export type LocationResult = {
  location: MapLocation;
  usedFallback: boolean;
  accuracy?: number;
};

export function getInitialLocation(
  fallback: MapLocation,
): Promise<LocationResult> {
  const debugLocation = getDebugLocation();
  if (debugLocation) {
    return Promise.resolve({ location: debugLocation, usedFallback: false });
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ location: fallback, usedFallback: true });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          usedFallback: false,
          accuracy: position.coords.accuracy,
        }),
      () => resolve({ location: fallback, usedFallback: true }),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 7_000 },
    );
  });
}
