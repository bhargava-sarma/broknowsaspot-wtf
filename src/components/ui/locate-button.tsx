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
  label = "Use my location",
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
          className={cn(
            "press-pane glass-1 touch-target inline-flex items-center gap-2.5 rounded-[var(--radius-sm)] px-4 py-2.5 text-small font-medium disabled:opacity-60",
            found ? "text-accent" : "text-ink",
          )}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn(busy && "animate-spin")}
          >
            <circle cx="12" cy="12" r="3.2" />
            <circle cx="12" cy="12" r="8" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
          </svg>
          {busy ? "Locating…" : found ? "Forget my location" : label}
        </button>

        {found ? (
          <p className="text-tiny text-faint tabular-nums">
            ±{Math.round(status.accuracyM)} m
          </p>
        ) : null}
      </div>

      {status.state === "failed" ? (
        <p role="alert" className="mt-3 max-w-[52ch] text-tiny text-accent">
          {GEO_MESSAGES[status.reason]}
        </p>
      ) : (
        <p className="mt-3 flex max-w-[56ch] items-start gap-2 text-tiny text-faint">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mt-[3px] shrink-0"
          >
            <path d="M12 22s8-4 8-10V5.5L12 2 4 5.5V12c0 6 8 10 8 10z" />
          </svg>
          {caption}
        </p>
      )}
    </div>
  );
}

export { useGeolocation };
