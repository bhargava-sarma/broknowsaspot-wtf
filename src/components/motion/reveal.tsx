"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Scroll-triggered reveals.
 *
 * CSS-driven, not JavaScript-driven, and that is the whole point of the
 * component. Two problems it solves:
 *
 * 1. **Content is visible without JavaScript.** The previous version was
 *    a Framer Motion tree whose `initial` state serialised into the SSR
 *    markup as `style="opacity:0"`. Inline styles win over stylesheets,
 *    so if the bundle failed to load — blocked, throttled, or simply
 *    slow — the page rendered permanently blank. The reveal is now a
 *    class that a blocking script arms before first paint, so the
 *    hidden state cannot outlive the script that is supposed to undo it.
 *
 * 2. **It costs nothing per frame.** An IntersectionObserver flips one
 *    class and the compositor takes it from there. Nothing samples a
 *    spring on the main thread while the reader is scrolling, which is
 *    what a phone actually cares about.
 *
 * The motion itself is unchanged: `--ease-damped` is a `linear()`
 * approximation of the same spring the old preset used, so the curve is
 * the one this design has always used.
 */

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Re-run every time it scrolls back into view. Default: once only. */
  repeat?: boolean;
  /** Fraction of the element that must be visible before it fires. */
  amount?: number;
  /** Position in a stagger, in units of one step. */
  index?: number;
  style?: CSSProperties;
};

function useReveal(repeat: boolean, amount: number) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // If the browser cannot observe intersections, show everything
    // rather than gambling that it will scroll into view.
    if (typeof IntersectionObserver === "undefined") {
      node.setAttribute("data-shown", "");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-shown", "");
            if (!repeat) observer.unobserve(entry.target);
          } else if (repeat) {
            entry.target.removeAttribute("data-shown");
          }
        }
      },
      { threshold: amount, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [repeat, amount]);

  return ref;
}

export function Reveal({
  children,
  className,
  repeat = false,
  amount = 0.15,
  index = 0,
  style,
}: RevealProps) {
  const ref = useReveal(repeat, amount);

  return (
    <div
      ref={ref}
      data-reveal=""
      className={className}
      style={{ ...style, "--reveal-i": index } as CSSProperties}
    >
      {children}
    </div>
  );
}

type RevealGroupProps = {
  children: ReactNode;
  className?: string;
  repeat?: boolean;
  amount?: number;
};

/**
 * Staggers its children.
 *
 * The stagger is a CSS delay derived from each child's index rather than
 * an orchestrated timeline, so a group costs exactly as much as the
 * elements in it — which is to say nothing.
 */
export function RevealGroup({
  children,
  className,
  repeat = false,
  amount = 0.1,
}: RevealGroupProps) {
  const ref = useReveal(repeat, amount);

  return (
    <div ref={ref} data-reveal-group="" className={cn(className)}>
      {children}
    </div>
  );
}
