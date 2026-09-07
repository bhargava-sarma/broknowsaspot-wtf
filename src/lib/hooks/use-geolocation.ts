"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The browser's location, asked for once, on purpose.
 *
 * Three rules hold this to "privacy first", and they are rules about what
 * the code does *not* do:
 *
 * - **It never asks on its own.** There is no effect here, so nothing runs
 *   on mount, on route change, or on render. A permission prompt only ever
 *   appears because someone pressed something. That is also why it is a
 *   `request()` you call rather than a value you read.
 * - **It never persists.** No localStorage, no cookie, no sessionStorage.
 *   The position lives in React state and dies with the component, so
 *   closing the tab is a complete erasure and there is nothing to leak
 *   later.
 * - **It never sends anything anywhere.** This hook has no network access
 *   at all. Whether a coordinate is transmitted is a decision each caller
 *   makes visibly, rather than something that has quietly already
 *   happened by the time they get it.
 *
 * `enableHighAccuracy` is deliberately off. Coarse positioning is a
 * cell/wifi fix rather than GPS: it is faster, costs less battery, and —
 * the reason that matters here — it is less precise about where somebody
 * is standing while still being far more precise than the map needs.
 *
 * There is a second timeout here on top of `PositionOptions.timeout`, and
 * it is not redundant. That one only starts once permission has been
 * *granted*, so a reader who dismisses the permission prompt rather than
 * answering it leaves the request outstanding with neither callback ever
 * firing — the control would sit on "locating…" for the life of the page.
 * Confirmed in a real browser: the request was made and, fourteen seconds
 * later, nothing had come back. A wall-clock timer is the only thing that
 * recovers from it.
 */

export type GeoStatus =
  | { state: "idle" }
  | { state: "locating" }
  | { state: "found"; lat: number; lng: number; accuracyM: number }
  | { state: "failed"; reason: GeoFailure };

export type GeoFailure =
  "denied" | "unavailable" | "timeout" | "insecure" | "unsupported";

/** How long to wait before giving up on the browser entirely. */
const WALL_CLOCK_MS = 15_000;

const OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 12_000,
  // A fix from the last few minutes is fine, and reusing one avoids
  // waking the radio for a second reading.
  maximumAge: 120_000,
};

export const GEO_MESSAGES: Record<GeoFailure, string> = {
  denied:
    "Location permission was declined. You can still set the pin by hand.",
  unavailable: "Your device couldn't get a fix. Try again, or set it by hand.",
  timeout:
    "No answer from your browser. The permission prompt may still be open. Try again, or set it by hand.",
  insecure: "Location needs a secure connection. Set it by hand here.",
  unsupported: "This browser can't share a location. Set it by hand.",
};

type Options = {
  /**
   * Called with a fix, from the browser's own callback.
   *
   * Callers use this rather than watching `status` in an effect: the
   * position arriving is an event, and treating it as one keeps the
   * "what do we do with a coordinate" decision at the call site instead
   * of in a re-render.
   */
  onFound?: (lat: number, lng: number) => void;
};

export function useGeolocation({ onFound }: Options = {}) {
  const [status, setStatus] = useState<GeoStatus>({ state: "idle" });
  // Guards against a second press while the first is still outstanding,
  // which would stack permission prompts on some browsers.
  const pending = useRef(false);
  // Held in a ref so `request` stays stable even when the caller passes
  // an inline callback, which is the normal way to use this. Updated in
  // an effect rather than during render, which is the only point at
  // which a ref may be written.
  const onFoundRef = useRef(onFound);
  useEffect(() => {
    onFoundRef.current = onFound;
  });

  const request = useCallback(() => {
    if (pending.current) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus({ state: "failed", reason: "unsupported" });
      return;
    }
    // Browsers refuse geolocation outside a secure context, and the error
    // they raise is indistinguishable from a denial. Naming it up front
    // stops the UI blaming the reader for their own browser's rule.
    if (!window.isSecureContext) {
      setStatus({ state: "failed", reason: "insecure" });
      return;
    }

    pending.current = true;
    setStatus({ state: "locating" });

    // Whichever of the three outcomes lands first wins; the others become
    // no-ops. Without this, a dismissed prompt never resolves at all.
    let settled = false;
    const finish = (next: GeoStatus) => {
      if (settled) return;
      settled = true;
      pending.current = false;
      window.clearTimeout(timer);
      setStatus(next);
    };

    const timer = window.setTimeout(
      () => finish({ state: "failed", reason: "timeout" }),
      WALL_CLOCK_MS,
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const alreadySettled = settled;
        finish({
          state: "found",
          lat: latitude,
          lng: longitude,
          accuracyM: accuracy,
        });
        // A fix that arrives after the timer has already given up is
        // discarded rather than moving anything under the reader.
        if (!alreadySettled) onFoundRef.current?.(latitude, longitude);
      },
      (error) => {
        const reason: GeoFailure =
          error.code === error.PERMISSION_DENIED
            ? "denied"
            : error.code === error.TIMEOUT
              ? "timeout"
              : "unavailable";
        finish({ state: "failed", reason });
      },
      OPTIONS,
    );
  }, []);

  /** Drops the position from memory. Callers offer this as "forget". */
  const clear = useCallback(() => {
    pending.current = false;
    setStatus({ state: "idle" });
  }, []);

  return { status, request, clear };
}
