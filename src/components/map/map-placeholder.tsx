/**
 * Stand-in shown while Leaflet loads.
 *
 * Used in two places that must agree byte-for-byte: as the `loading`
 * fallback of the dynamic import, and as the pre-mount branch guarded by
 * `useMounted`. Sharing one component is what keeps the prerendered HTML
 * and the hydration render identical.
 */
export function MapPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-paper-raised">
      <p className="font-mono text-micro text-faint lowercase">loading map…</p>
    </div>
  );
}
