import Link from "next/link";

import { PinMark } from "@/components/layout/brand-mark";
import { NAV_ITEMS } from "@/lib/nav";
import { SITE_NAME, SITE_TLD } from "@/lib/site";

/**
 * The last thing on every page. One hairline, then a quiet row — the
 * footer is the one surface that deliberately is NOT glass, because a
 * pane floating at the very bottom of a document has nothing to float
 * over and reads as a stray card.
 */
export function SiteFooter() {
  return (
    <footer className="mt-[clamp(4rem,2.5rem+7vw,9rem)] border-t border-rule">
      <div className="shell flex flex-col gap-8 py-[clamp(2rem,1.4rem+2.4vw,3rem)] sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[42ch]">
          <p className="flex items-center gap-2.5 text-small font-semibold text-ink">
            <PinMark className="text-accent" size={17} />
            {SITE_NAME}
            <span className="-ml-2.5 text-faint">{SITE_TLD}</span>
          </p>
          <p className="mt-3 text-small text-muted">
            A crowdsourced index of places that never made the guidebook. Go
            quietly, and leave it as you found it.
          </p>
        </div>

        <div>
          <p className="eyebrow">Pages</p>
          <ul className="mt-4 space-y-2.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="press text-small text-muted hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Spacer so the floating mobile bar never covers the last line.
          It clears the bar itself plus the gap it floats in; the safe-area
          inset is already applied to <body>. */}
      <div
        aria-hidden="true"
        className="h-[calc(var(--bar-h)+1.6rem)] sm:hidden"
      />
    </footer>
  );
}
