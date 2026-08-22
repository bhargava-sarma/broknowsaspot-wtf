"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { isActivePath, NAV_ITEMS } from "@/lib/nav";
import { SITE_NAME, SITE_TLD } from "@/lib/site";
import { cn } from "@/lib/utils/cn";

/**
 * Sticky top bar. Solid — not translucent or blurred — because the design
 * language has no depth cues; a single hairline does the separating.
 *
 * `usePathname` resolves during SSR as well as on the client, so the
 * active-link marker is correct in the first paint.
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-paper shadow-sm">
      <div className="shell flex h-[var(--bar-h)] items-center justify-between gap-[var(--gutter)]">
        <Link
          href="/"
          className="tap font-display text-small font-bold tracking-tight text-ink lowercase"
        >
          {SITE_NAME}
          <span className="text-accent">{SITE_TLD}</span>
        </Link>

        <div className="flex items-center gap-[calc(var(--gutter)*0.85)]">
          {/* Inline nav is desktop-only; small screens get the bottom bar. */}
          <nav aria-label="primary" className="hidden sm:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "tap relative block rounded-full px-3 py-1.5 font-mono text-micro lowercase transition-colors",
                        active
                          ? "bg-accent text-accent-ink"
                          : "text-faint hover:text-ink",
                      )}
                    >
                      {item.label}
                    </Link>
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
