"use client";

import {
  GEO_MESSAGES,
  useGeolocation,
  type GeoStatus,
} from "@/lib/hooks/use-geolocation";
import { cn } from "@/lib/utils/cn";

/**
 * "Use my location", in the one shape both features share.
 *
 * The control is off until pressed and says what pressing it will do
 * *before* it does it — a browser permission prompt is a poor place to
 * learn what a site wants your location for, because by then the only
 * choices are yes and no.
 *
 * `caption` is where each caller states what happens to the coordinate,
 * and callers are expected to be blunt: one of these publishes a pin to
 * the open internet and the other never transmits anything, and a reader
 * cannot tell those apart from the button alone.
 */

type LocateButtonProps = {
  status: GeoStatus;
  onRequest: () => void;
  onClear: () => void;
  /** What happens to the coordinate. Stated plainly, always shown. */
  caption: string;
  label?: string;
  className?: string;
};

export function LocateButton({
  status,
  onRequest,
  onClear,
  caption,
  label = "use my location",
  className,
}: LocateButtonProps) {
  const busy = status.state === "locating";
  const found = status.state === "found";

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={found ? onClear : onRequest}
          disabled={busy}
          aria-busy={busy}
          className="press-pane glass-chip glass-rim glass-r-sm touch-target inline-flex items-center gap-2 px-3 py-2 font-mono text-micro text-ink lowercase disabled:opacity-60"
        >
          <span
            aria-hidden="true"
            className={cn(
              "block h-1.5 w-1.5",
              busy && "animate-pulse bg-accent",
              found ? "bg-accent" : "bg-faint",
            )}
          />
          {busy ? "locating…" : found ? "forget my location" : label}
        </button>

        {found ? (
          <p className="font-mono text-micro text-faint lowercase tabular-nums">
            ±{Math.round(status.accuracyM)}m
          </p>
        ) : null}
      </div>

      {status.state === "failed" ? (
        <p
          role="alert"
          className="mt-2 max-w-[46ch] font-mono text-micro text-accent lowercase"
        >
          {GEO_MESSAGES[status.reason]}
        </p>
      ) : (
        <p className="mt-2 max-w-[52ch] font-mono text-micro text-faint lowercase">
          {caption}
        </p>
      )}
    </div>
  );
}

export { useGeolocation };
