"use client";

import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils/cn";

import { DotMapCanvas } from "./dot-map-canvas";
import { CITY_DOTS } from "./procedural-city";

/**
 * Static dot-map hero visualization.
 *
 * Renders a deterministic city road-network as tiny pink dots on canvas.
 * No location permission. No network requests. Animates on mount.
 */
export function LocationDotMap({ className }: { className?: string }) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  return (
    <figure
      className={cn("relative h-full w-full", className)}
      aria-label="A stylized dot-map visualization of an urban road network."
    >
      <DotMapCanvas dots={CITY_DOTS} reducedMotion={reducedMotion} />
    </figure>
  );
}
