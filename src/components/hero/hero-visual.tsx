"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { HeroContours } from "@/components/hero/hero-contours";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils/cn";

/**
 * Decides whether this visitor gets the WebGL hero or the static contour
 * SVG, and never blocks paint either way.
 *
 * The SVG ships in the server HTML and is what everyone sees first. The 3D
 * chunk is dynamically imported with `ssr: false` and is only ever
 * *referenced* once the gates below pass, so three.js never enters the
 * initial bundle and never downloads on a device that won't use it.
 */
const HeroCanvas = dynamic(() => import("@/components/three/hero-canvas"), {
  ssr: false,
  // Keep the contours on screen while the chunk downloads — no empty gap.
  loading: () => <HeroContours className="h-full w-full" />,
});

/** Memoised at module scope so the probe runs once per page load. */
let webglSupport: boolean | null = null;

/** Cheap feature probe; a context is created and immediately discarded. */
function detectWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    webglSupport = Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

export function HeroVisual({ className }: { className?: string }) {
  // Mobile and touch tablets are excluded outright rather than given a
  // reduced scene: on those devices the battery cost of a continuously
  // rendering canvas outweighs an ambient background effect.
  const bigEnough = useMediaQuery("(min-width: 768px) and (pointer: fine)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Safe to probe in a lazy initialiser rather than an effect: it returns
  // false during SSR, and `bigEnough` is still false on the hydration pass
  // regardless, so the first client render always matches the server.
  const [webgl] = useState(() =>
    typeof window === "undefined" ? false : detectWebGL(),
  );

  const use3D = bigEnough && !reducedMotion && webgl;

  return (
    <div className={cn(className)}>
      {use3D ? <HeroCanvas /> : <HeroContours className="h-full w-full" />}
    </div>
  );
}
