"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { springUI } from "@/lib/motion/springs";
import { isActivePath, NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils/cn";

/**
 * Small-screen navigation: a floating glass pill rather than a hamburger
 * and a slide-in drawer.
 *
 * Every destination stays one thumb-tap away, there is no open/closed
 * state to animate or trap focus in, and it sits in the thumb's natural
 * arc at the bottom of the screen rather than in the far top corner.
 *
 * It floats clear of the screen edge instead of spanning it. Two reasons,
 * and the second is the real one:
 *
 * - Content passing *around* as well as behind it is what makes it read
 *   as an object above the page rather than a chrome strip welded to the
 *   bottom of the viewport.
 * - The gap keeps it off the home indicator and out of the way of the
 *   edge-swipe gestures that own the bottom of a modern phone screen.
 *
 * The active marker is one element shared across items, so it travels to
 * the tapped destination rather than blinking out in one place and in
 * again in another.
 */
export function MobileBar() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav
      aria-label="primary"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] sm:hidden"
    >
      <div className="glass glass-dense glass-rim glass-r-lg mx-auto max-w-md overflow-hidden">
        <ul className="relative grid grid-cols-3">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press-pane relative flex h-[var(--bar-h)] flex-col items-center justify-center gap-0.5 font-mono lowercase",
                    active ? "text-ink" : "text-faint",
                  )}
                >
                  {/* Behind the label, so the type never sits on a moving
                      edge. Inset by a hair so it reads as a key on a
                      device rather than as a filled tab. */}
                  {active ? (
                    <motion.span
                      aria-hidden="true"
                      layoutId={reduce ? undefined : "mobile-nav-marker"}
                      transition={springUI}
                      className="glass-r-sm absolute inset-x-1 inset-y-1 block bg-ink/[0.055] dark:bg-ink/[0.07]"
                    />
                  ) : null}

                  <span className="relative text-[0.5625rem] tracking-[0.16em] text-faint">
                    {item.code}
                  </span>
                  <span className="relative text-micro">{item.label}</span>

                  {active ? (
                    <motion.span
                      aria-hidden="true"
                      layoutId={reduce ? undefined : "mobile-nav-tick"}
                      transition={springUI}
                      className="absolute inset-x-[38%] top-1.5 block h-px bg-accent"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
