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
 * The site's call-to-action idiom.
 *
 * Pill-shaped filled button: a solid background, rounded capsule shape, and
 * a mark that steps right on hover. Mirrors the heavy rounded button aesthetic
 * of the phone mockup reference.
 */
export function ActionLink({
  href,
  children,
  tone = "ink",
  className,
}: ActionLinkProps) {
  const toneClass =
    tone === "accent"
      ? "bg-accent text-accent-ink"
      : tone === "muted"
        ? "bg-paper-raised text-ink border border-rule"
        : "bg-ink text-accent-ink";

  return (
    <Link
      href={href}
      className={cn("btn-pill touch-target", toneClass, className)}
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
