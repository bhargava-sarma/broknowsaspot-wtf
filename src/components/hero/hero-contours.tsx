import { cn } from "@/lib/utils/cn";

/**
 * Topographic contour field, drawn as plain SVG paths in the rule colour.
 *
 * This is not a placeholder — it is the permanent fallback the 3D hero
 * degrades to on mobile, under `prefers-reduced-motion`, and anywhere
 * WebGL is unavailable. Being pure markup + one CSS keyframe, it costs no
 * JavaScript and renders in the first paint.
 *
 * `currentColor` throughout, so it themes for free.
 */
export function HeroContours({ className }: { className?: string }) {
  // Concentric, slightly irregular rings — a ridge seen from directly above.
  const rings = Array.from({ length: 11 }, (_, i) => i);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none text-rule select-none", className)}
    >
      <svg
        viewBox="0 0 400 400"
        fill="none"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <g className="hero-contours-drift origin-center">
          {rings.map((i) => {
            const r = 26 + i * 16;
            // Nudge each ring off-centre so the stack reads as terrain
            // rather than as a target.
            const cx = 200 + Math.sin(i * 0.9) * i * 2.1;
            const cy = 200 + Math.cos(i * 0.7) * i * 1.4;
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx={r}
                ry={r * (0.72 + i * 0.012)}
                stroke="currentColor"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                transform={`rotate(${-18 + i * 1.6} ${cx} ${cy})`}
              />
            );
          })}
        </g>

        {/* Survey crosshair — the one accent mark in the composition. */}
        <g className="text-accent" stroke="currentColor" strokeWidth="1">
          <line
            x1="200"
            y1="186"
            x2="200"
            y2="214"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="186"
            y1="200"
            x2="214"
            y2="200"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );
}
