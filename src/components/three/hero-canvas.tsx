"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

import { TerrainField } from "@/components/three/terrain-field";
import { useTokenColor } from "@/lib/hooks/use-token-color";

/**
 * WebGL hero. Loaded through a dynamic import with `ssr: false`, so none of
 * three.js is in the initial bundle and it cannot block first paint.
 *
 * Everything gating whether this even mounts lives in <HeroVisual>; by the
 * time this renders we have already established that the device should get
 * it. What this file owns is keeping the running scene cheap.
 */
export default function HeroCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  // Pull the dot colour from the CSS token so the scene themes with
  // everything else and the palette stays defined in exactly one place.
  // `faint` rather than `rule`: at 50% opacity the hairline tone all but
  // disappears against the dark ground, where faint holds its weight in
  // both themes.
  const color = useTokenColor("--tone-faint", "#6e6c64");

  // Stop rendering once the hero scrolls away.
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setOnScreen(entry.isIntersecting);
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // ...and once the tab goes to the background.
  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const running = onScreen && tabVisible;

  return (
    <div ref={wrapperRef} className="h-full w-full" aria-hidden="true">
      <Canvas
        // `demand` rather than `never` when paused: the loop stops, but the
        // last frame stays on screen instead of blanking to an empty canvas.
        frameloop={running ? "always" : "demand"}
        // Caps the render resolution at 2x — the explicit equivalent of
        // setPixelRatio(Math.min(devicePixelRatio, 2)).
        dpr={[1, 2]}
        camera={{ fov: 32, position: [0, 0.4, 16], near: 1, far: 40 }}
        gl={{
          alpha: true, // page background shows through, so themes just work
          antialias: true, // the dots are small; aliasing is very visible
          powerPreference: "low-power",
        }}
        style={{ pointerEvents: "none" }}
      >
        <TerrainField color={color} />
      </Canvas>
    </div>
  );
}
