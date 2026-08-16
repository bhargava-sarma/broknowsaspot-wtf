"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Subscribes to a media query.
 *
 * `useSyncExternalStore` rather than useState + useEffect: matchMedia *is*
 * an external store, and the effect form renders once with a wrong value
 * and then cascades a second render to correct it.
 *
 * The server snapshot is always `false`, so callers must treat `false` as
 * "not established yet" and render the cheap branch first. That is exactly
 * the behaviour we want for gating WebGL: the static fallback is in the
 * SSR HTML, and the canvas only mounts once the device qualifies.
 */
export function useMediaQuery(query: string): boolean {
  const list = useMemo(
    () => (typeof window === "undefined" ? null : window.matchMedia(query)),
    [query],
  );

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!list) return () => {};
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [list],
  );

  return useSyncExternalStore(
    subscribe,
    () => list?.matches ?? false,
    () => false,
  );
}
