"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/layout/brand-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useScrolled } from "@/lib/hooks/use-scrolled";
import { springUI } from "@/lib/motion/springs";
import { isActivePath, NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils/cn";

/**
 * A floating glass pill, not a bar welded to the top of the viewport.
 *
 * The distinction is the whole point of the material: content passing
 * *around* the pane as well as behind it is what says "this is an object
 * in front of the page" rather than "this is the page's top edge". A
 * full-bleed bar can only ever be the second thing.
 *
 * At the top of a page there is nothing behind it, so it sits light. Once
 * content is sliding underneath, the rim and the cast shadow firm up so
 * the words on it stay readable against whatever is behind them.
 *
 * `usePathname` resolves during SSR as well as on the client, so the
 * active-link marker is correct in the first paint.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const reduce = useReducedMotion();

  return (
    <header className="pointer-events-none sticky top-0 z-50 px-[var(--gutter)] pt-3 sm:pt-4">
      <div
        className={cn(
          "glass pointer-events-auto mx-auto flex max-w-[var(--shell-max)] items-center justify-between gap-3 rounded-[var(--radius-lg)] py-2 pr-2 pl-4 transition-shadow sm:pl-5",
          scrolled ? "shadow-[var(--glass-cast-lifted)]" : "",
        )}
      >
        <BrandMark />

        <div className="flex items-center gap-1.5">
          {/* Inline nav is desktop-only; small screens get the bottom bar. */}
          <nav aria-label="primary" className="hidden sm:block">
            <ul className="flex items-center gap-0.5">
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href} className="relative">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "press relative block rounded-[var(--radius-sm)] px-4 py-2 text-small font-medium",
                        active ? "text-ink" : "text-muted",
                      )}
                    >
                      {/* One marker for the whole nav, not one per item:
                          the shared layoutId makes it travel between
                          destinations instead of blinking out and in. */}
                      {active ? (
                        <motion.span
                          aria-hidden="true"
                          layoutId={reduce ? undefined : "nav-marker"}
                          transition={springUI}
                          className="absolute inset-0 block rounded-[var(--radius-sm)] bg-ink/[0.07]"
                        />
                      ) : null}
                      <span className="relative">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <span
            aria-hidden="true"
            className="mx-1 hidden h-5 w-px bg-rule sm:block"
          />

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
