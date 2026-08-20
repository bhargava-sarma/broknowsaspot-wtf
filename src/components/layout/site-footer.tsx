import Link from "next/link";

import { NAV_ITEMS } from "@/lib/nav";
import { SITE_NAME, SITE_TLD } from "@/lib/site";

/**
 * Terminal block. Reads like a device's back-panel legend: a column of
 * labelled readouts on a rigid grid, separated from the page by one rule.
 */
export function SiteFooter() {
  return (
    <footer className="rule-t mt-[clamp(3.5rem,2rem+6vw,8rem)]">
      <div className="shell grid-swiss py-[clamp(2rem,1.4rem+2.4vw,3.5rem)]">
        <div className="col-span-12 sm:col-span-6 lg:col-span-5">
          <p className="font-mono text-tiny text-ink lowercase">
            {SITE_NAME}
            <span className="text-accent">{SITE_TLD}</span>
          </p>
          <p className="mt-3 max-w-[38ch] text-small text-muted">
            a crowdsourced index of places that never made the guidebook. go
            carefully, leave it as you found it.
          </p>
        </div>

        <div className="col-span-6 mt-8 sm:col-span-3 sm:mt-0 lg:col-span-2 lg:col-start-9">
          <p className="label">pages</p>
          <ul className="mt-3 space-y-1.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="tap font-mono text-micro text-muted lowercase"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-6 mt-8 sm:col-span-3 sm:mt-0 lg:col-span-2">
          <p className="label">status</p>
          <ul className="mt-3 space-y-1.5 font-mono text-micro text-muted lowercase">
            <li>v0.1</li>
            <li>next · appwrite</li>
            <li>
              <span className="text-accent">●</span> open to submissions
            </li>
          </ul>
        </div>
      </div>

      {/* Spacer so the floating mobile bar never covers the last line.
          It clears the bar itself plus the gap it floats in; the safe-area
          inset is already applied to <body>. */}
      <div
        aria-hidden="true"
        className="h-[calc(var(--bar-h)+1.2rem)] sm:hidden"
      />
    </footer>
  );
}
