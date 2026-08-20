import Image from "next/image";

import type { SpotPhoto } from "@/lib/types/spot";
import { cn } from "@/lib/utils/cn";

/**
 * A photo slot.
 *
 * Renders the real image when there is one. Until then it draws a
 * deterministic terrain cross-section derived from the caption — a plate
 * that looks authored rather than a grey box with a broken-image icon, and
 * that differs per photo so a gallery doesn't read as one repeated tile.
 *
 * The component's contract is the same either way, so populating
 * `photos[].src` in the data is the only change needed once real
 * photography exists.
 */

/** FNV-1a. Small, stable, and enough to seed a few sine waves. */
function seedFrom(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function crossSection(seed: number, index: number): string {
  const a = 6 + (seed % 11);
  const b = 3 + ((seed >> 5) % 7);
  const phase = ((seed >> 9) % 100) / 12 + index * 0.8;
  const amp = 9 + ((seed >> 13) % 10);

  const points: string[] = [];
  for (let x = 0; x <= 160; x += 4) {
    const t = x / 160;
    const y =
      60 -
      Math.sin(t * a + phase) * amp -
      Math.sin(t * b + phase * 1.7) * (amp * 0.45);
    points.push(`${x},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

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
          "group relative aspect-[4/3] overflow-hidden bg-paper-raised",
          className,
        )}
      >
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-700 ease-[var(--ease-damped)] group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </figure>
    );
  }

  const seed = seedFrom(photo.alt);
  const lines = [0, 1, 2, 3, 4];

  return (
    <figure className={cn("relative", className)}>
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-raised">
        <svg
          viewBox="0 0 160 120"
          preserveAspectRatio="none"
          className="h-full w-full text-rule"
          aria-hidden="true"
        >
          {lines.map((line) => (
            <polyline
              key={line}
              points={crossSection(seed, index * 3 + line)}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              vectorEffect="non-scaling-stroke"
              transform={`translate(0 ${line * 13})`}
            />
          ))}
        </svg>

        <span className="absolute bottom-2 left-2 font-mono text-[0.5625rem] tracking-[0.14em] text-faint lowercase">
          plate {String(index + 1).padStart(2, "0")} / no image yet
        </span>
      </div>

      {/* The alt text is the real content until a photo exists, so it is
          shown rather than hidden — it describes what will be here. */}
      <figcaption className="mt-2 text-small text-muted">
        {photo.alt}
      </figcaption>
    </figure>
  );
}
