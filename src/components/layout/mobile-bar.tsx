"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { springUI } from "@/lib/motion/springs";
import { isActivePath, NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils/cn";

/**
 * Small-screen navigation: a floating glass tray rather than a hamburger
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
 * The active key is one element shared across items, so it travels to the
 * tapped destination rather than blinking out in one place and in again
 * in another.
 */
export function MobileBar() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav
      aria-label="primary"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] sm:hidden"
    >
      <div className="glass-3 mx-auto max-w-md rounded-[var(--radius-lg)] p-2">
        <ul className="relative grid grid-cols-3 gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press-pane relative flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] py-2.5",
                    active ? "text-paper" : "text-muted",
                  )}
                >
                  {/* Behind the label, so the type never sits on a moving
                      edge. A lit key rather than a filled tab. */}
                  {active ? (
                    <motion.span
                      aria-hidden="true"
                      layoutId={reduce ? undefined : "mobile-nav-key"}
                      transition={springUI}
                      className="absolute inset-0 block rounded-[var(--radius-md)] bg-ink shadow-[inset_0_1px_0_var(--glass-specular)]"
                    />
                  ) : null}

                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="relative"
                  >
                    <path d={item.icon} />
                  </svg>
                  <span
                    className={cn(
                      "relative text-[0.6875rem] tracking-[0.01em]",
                      active ? "font-semibold" : "font-medium",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
