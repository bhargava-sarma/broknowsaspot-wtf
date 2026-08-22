"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils/cn";

/**
 * Small-screen navigation.
 *
 * A fixed bottom bar rather than a hamburger + slide-in drawer: it stays
 * inside the flat visual language (hairlines, mono labels, no elevation),
 * every destination is one thumb-tap away, and there is no open/closed
 * state to animate or trap focus in.
 *
 * Columns divide with the same hairline used everywhere else, and each
 * cell is a full-height 44px+ target.
 */
export function MobileBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="primary"
      className="fixed inset-x-0 bottom-0 z-50 bg-paper pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.06)] sm:hidden"
    >
      <ul className="grid grid-cols-3">
        {NAV_ITEMS.map((item, index) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li
              key={item.href}
              className={cn(index > 0 && "border-l border-rule")}
            >
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap relative flex h-[var(--bar-h)] flex-col items-center justify-center gap-1 font-mono lowercase",
                  active ? "text-ink" : "text-faint",
                )}
              >
                <span className="text-[0.5625rem] tracking-[0.16em] text-faint">
                  {item.code}
                </span>
                <span className="text-micro">{item.label}</span>
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 block h-px bg-accent"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
