import Link from "next/link";

import { cn } from "@/lib/utils/cn";

type ActionLinkProps = {
  href: string;
  children: React.ReactNode;
  /** `accent` is the single primary call to action on a page — use once. */
  tone?: "accent" | "ink" | "muted";
  className?: string;
};

/**
 * The site's only call-to-action idiom.
 *
 * Borderless by definition: a monospace label, a hairline underneath, and
 * a mark that steps right on hover. No fill, no radius, no shadow — the
 * rule *is* the button.
 */
export function ActionLink({
  href,
  children,
  tone = "ink",
  className,
}: ActionLinkProps) {
  const toneClass =
    tone === "accent"
      ? "text-accent border-accent"
      : tone === "muted"
        ? "text-muted border-rule"
        : "text-ink border-rule-strong";

  return (
    <Link
      href={href}
      className={cn(
        "group tap touch-target inline-flex items-center gap-3 border-b pb-2 font-mono text-tiny tracking-[0.04em] lowercase",
        toneClass,
        className,
      )}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className="inline-block transition-transform duration-300 ease-[var(--ease-damped)] group-hover:translate-x-1 motion-reduce:transition-none"
      >
        →
      </span>
    </Link>
  );
}
