import Image from "next/image";

import type { SpotPhoto } from "@/lib/types/spot";
import { cn } from "@/lib/utils/cn";

/**
 * A photo slot.
 *
 * Renders the real image when there is one. Until then it draws a
 * deterministic night landscape derived from the caption — ridge lines
 * under a coloured sky, seeded so the same spot always gets the same
 * horizon and no two spots get the same one. It looks authored rather
 * than like a grey box with a broken-image icon, and a gallery of them
 * doesn't read as one repeated tile.
 *
 * The component's contract is the same either way, so populating
 * `photos[].src` in the data is the only change needed once real
 * photography exists.
 */

/** FNV-1a. Small, stable, and enough to seed a horizon. */
function seedFrom(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Cheap deterministic sequence — no Math.random, so SSR and client agree. */
function rng(seed: number) {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 10000) / 10000;
  };
}

/**
 * One ridge, as a closed polygon across the full width.
 *
 * `baseline` is where the ridge sits vertically and `amp` how jagged it
 * is; the far ridge gets a high baseline and a big amplitude, the near
 * one sits lower and calmer, which is what reads as distance.
 */
function ridge(next: () => number, baseline: number, amp: number): string {
  const points: string[] = ["M0 " + baseline.toFixed(1)];
  const steps = 7;
  for (let i = 1; i <= steps; i += 1) {
    const x = (160 / steps) * i;
    const y = baseline - (next() - 0.35) * amp;
    points.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  points.push("L160 120 L0 120 Z");
  return points.join(" ");
}

/** Sky pairs, picked by seed. Warm, cold, and violet nights. */
const SKIES: [string, string][] = [
  ["#3a2a5e", "#120f22"],
  ["#1e2748", "#0d1122"],
  ["#3a2140", "#150e1e"],
  ["#233054", "#0e1424"],
  ["#42284c", "#170f24"],
];

type SpotPlateProps = {
  photo: SpotPhoto;
  index: number;
  className?: string;
  /** Passed to next/image for correct responsive selection. */
  sizes?: string;
  priority?: boolean;
};

export function SpotPlate({
  photo,
  index,
  className,
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority = false,
}: SpotPlateProps) {
  if (photo.src) {
    return (
      <figure
        className={cn(
          "group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-paper-raised",
          className,
        )}
      >
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-700 ease-[var(--ease-glass)] group-hover:scale-[1.04] motion-reduce:transition-none"
        />
      </figure>
    );
  }

  const seed = seedFrom(photo.alt);
  const next = rng(seed);
  const sky = SKIES[seed % SKIES.length] ?? SKIES[0]!;
  const moonX = 24 + (seed % 110);
  // Two ridges, far then near — drawn in that order so the near one
  // overlaps and the pair reads as depth rather than as two outlines.
  const far = ridge(next, 74, 34);
  const near = ridge(next, 93, 20);
  const gradientId = `plate-sky-${seed.toString(36)}-${index}`;

  return (
    <figure className={cn("relative", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)]">
        <svg
          viewBox="0 0 160 120"
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sky[0]} />
              <stop offset="100%" stopColor={sky[1]} />
            </linearGradient>
          </defs>
          <rect width="160" height="120" fill={`url(#${gradientId})`} />

          {/* A crescent: one disc, and the same disc in the sky colour
              offset behind it. Cheaper and softer than a mask. */}
          <circle cx={moonX} cy="26" r="9" fill="#ffe7d4" opacity="0.85" />
          <circle cx={moonX - 3.5} cy="23" r="9" fill={sky[0]} opacity="0.95" />

          <path d={far} fill="#0b0916" opacity="0.88" />
          <path d={near} fill="#07060f" />

          <g
            fill="none"
            stroke="#8e7fd0"
            strokeWidth="0.4"
            opacity="0.32"
            vectorEffect="non-scaling-stroke"
          >
            <path d="M0 102 Q40 96 80 101 T160 97" />
            <path d="M0 110 Q40 104 80 109 T160 105" />
          </g>
        </svg>

        {/* Grain, so the glass above it has something to refract. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.5)_0.5px,transparent_0.5px)] [background-size:3px_3px] opacity-[0.14]"
        />
      </div>

      {/* The alt text is the real content until a photo exists, so it is
          shown rather than hidden — it describes what will be here. */}
      <figcaption className="mt-3 text-small text-muted">
        {photo.alt}
      </figcaption>
    </figure>
  );
}
