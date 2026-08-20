"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useScrolled } from "@/lib/hooks/use-scrolled";
import { springUI } from "@/lib/motion/springs";
import { isActivePath, NAV_ITEMS } from "@/lib/nav";
import { SITE_NAME, SITE_TLD } from "@/lib/site";
import { cn } from "@/lib/utils/cn";

/**
 * Sticky top bar, and the first piece of the floating plane.
 *
 * It is glass rather than a solid fill, which is a deliberate break from
 * the flat rule the content plane still follows. The reasoning: a solid
 * bar and the page it sits on are the same material, so the bar reads as
 * part of the page that happens not to scroll. Glass reads as a pane in
 * front of it — which is what it actually is — and the content sliding
 * and blurring underneath is the thing that says so.
 *
 * At the top of a page there is nothing behind it, so it stays barely
 * present and the hairline does the separating. Once content is passing
 * underneath, the material firms up so the words on it stay readable
 * against whatever happens to be behind them at the time.
 *
 * `usePathname` resolves during SSR as well as on the client, so the
 * active-link marker is correct in the first paint.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const reduce = useReducedMotion();

  return (
    <header
      className={cn(
        "glass sticky top-0 z-50 border-b",
        // The rule strengthens with the material: invisible against an
        // empty page, definite once it has something to separate.
        scrolled ? "glass-dense border-rule" : "border-transparent",
      )}
    >
      <div className="shell flex h-[var(--bar-h)] items-center justify-between gap-[var(--gutter)]">
        <Link
          href="/"
          className="press touch-target -mx-1 inline-flex items-center px-1 font-mono text-tiny tracking-[0.02em] text-ink lowercase"
        >
          {SITE_NAME}
          <span className="text-accent">{SITE_TLD}</span>
        </Link>

        <div className="flex items-center gap-[calc(var(--gutter)*0.85)]">
          {/* Inline nav is desktop-only; small screens get the bottom bar. */}
          <nav aria-label="primary" className="hidden sm:block">
            <ul className="flex items-center gap-[calc(var(--gutter)*0.85)]">
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href} className="relative">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "press relative block py-2 font-mono text-micro lowercase",
                        active ? "text-ink" : "text-faint",
                      )}
                    >
                      {item.label}
                    </Link>

                    {/* One marker for the whole nav, not one per item:
                        the shared layoutId makes it travel between
                        destinations instead of blinking out and in. */}
                    {active ? (
                      <motion.span
                        aria-hidden="true"
                        layoutId={reduce ? undefined : "nav-marker"}
                        transition={springUI}
                        className="absolute inset-x-0 bottom-1 block h-px bg-accent"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
