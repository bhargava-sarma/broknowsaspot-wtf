"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";

import { BasemapLayer } from "@/components/map/basemap-layer";
import { INDIA_VIEW, LOCATED_ZOOM } from "@/lib/map/tiles";
import { useTheme } from "@/lib/theme/theme-provider";

/**
 * Coordinate picker for the submission form.
 *
 * Shares the tile setup, the opening view and the marker styling with the
 * explore map, so a submitted pin looks exactly like a logged one. Tap and click both set the
 * position — Leaflet's `click` event fires for touch taps too, so there is
 * no separate touch path to maintain.
 */

const pinIcon = L.divIcon({
  className: "bkas-marker",
  html: `<span class="bkas-marker-dot is-selected"></span>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

function ClickToSet({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (event) => {
      // Keep longitude in -180..180 after a world-wrap drag.
      const { lat, lng } = event.latlng.wrap();
      onPick(Number(lat.toFixed(5)), Number(lng.toFixed(5)));
    },
  });
  return null;
}

/** Re-centres when coordinates are typed into the number fields instead. */
/**
 * Flies to a position the reader explicitly asked to go to.
 *
 * Separate from SyncView because the two are different intentions.
 * SyncView follows the pin without fighting a reader who has panned
 * away, and deliberately will not zoom in on them. Pressing "use my
 * location" *is* a request to be taken somewhere, so this one moves the
 * view outright — and `focus.at` is a nonce rather than the coordinates,
 * so pressing it again after panning away brings you back.
 */
function FocusView({
  focus,
}: {
  focus: { lat: number; lng: number; at: number } | null;
}) {
  const map = useMap();
  const last = useRef(0);

  useEffect(() => {
    if (!focus || focus.at === last.current) return;
    last.current = focus.at;
    map.flyTo([focus.lat, focus.lng], LOCATED_ZOOM.pin, { duration: 0.9 });
  }, [focus, map]);

  return null;
}

function SyncView({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (lat === null || lng === null) return;
    const current = map.getCenter();
    // Don't fight the user's own panning over sub-degree differences.
    if (
      Math.abs(current.lat - lat) < 0.01 &&
      Math.abs(current.lng - lng) < 0.01
    ) {
      return;
    }
    map.setView([lat, lng], Math.max(map.getZoom(), 6), { animate: true });
  }, [lat, lng, map]);

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

type LocationPickerProps = {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  /** A place to fly to, with a nonce so repeat presses still move. */
  focus?: { lat: number; lng: number; at: number } | null;
};

export default function LocationPicker({
  lat,
  lng,
  onPick,
  focus = null,
}: LocationPickerProps) {
  const { theme } = useTheme();
  const placed = lat !== null && lng !== null;

  return (
    <MapContainer
      className="h-full w-full bg-paper-raised"
      // An unplaced picker opens on India; once a pin exists the map
      // follows it, wherever the spot turns out to be.
      center={placed ? [lat, lng] : INDIA_VIEW.center}
      zoom={placed ? 6 : INDIA_VIEW.zoom}
      minZoom={2}
      scrollWheelZoom
      zoomControl={false}
    >
      <BasemapLayer theme={theme} />
      <ClickToSet onPick={onPick} />
      <SyncView lat={lat} lng={lng} />
      <FocusView focus={focus} />
      {placed ? <Marker position={[lat, lng]} icon={pinIcon} /> : null}
    </MapContainer>
  );
}
