"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up to its value the first time it is scrolled into
 * view.
 *
 * The readout is the one place on the site that is pretending to be an
 * instrument, and an instrument's figures settle rather than appear. It
 * runs once, for well under a second, and then never again.
 *
 * Three things keep it honest rather than decorative:
 *
 * - The **final value is what renders server-side**, so the figure is
 *   correct in the markup, correct with JavaScript off, and correct to a
 *   crawler. The animation can only ever be an embellishment on top of a
 *   number that is already right.
 * - Anything non-numeric — the em dash a missing median renders as — is
 *   passed straight through. There is nothing to count to.
 * - Under `prefers-reduced-motion` it does not run at all.
 */

/** Splits "1.2km" into 1.2 and "km"; returns null for "—". */
function parse(value: string): { target: number; suffix: string } | null {
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const target = Number(match[1]);
  if (!Number.isFinite(target)) return null;
  return { target, suffix: match[2] ?? "" };
}

const DURATION = 620;

export function Ticker({ value }: { value: string }) {
  const parsed = parse(value);
  const decimals = parsed && value.includes(".") ? 1 : 0;

  // Server render and first client render are both the true value, so
  // hydration matches and nothing flashes a zero.
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !parsed) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const { target, suffix } = parsed;
    let frame = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();

          const started = performance.now();
          const step = (now: number) => {
            const t = Math.min(1, (now - started) / DURATION);
            // Ease out: fast at the start, settling at the end, which is
            // how a needle behaves and how a linear ramp does not.
            const eased = 1 - (1 - t) ** 3;
            setShown((target * eased).toFixed(decimals) + suffix);
            if (t < 1) frame = requestAnimationFrame(step);
            else setShown(value);
          };
          frame = requestAnimationFrame(step);
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // `value` is the only real input; parsed/decimals derive from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown}
    </span>
  );
}
