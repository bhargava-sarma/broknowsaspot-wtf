import Link from "next/link";

import { cn } from "@/lib/utils/cn";

type ActionLinkProps = {
  href: string;
  children: React.ReactNode;
  /** `accent` is the single primary text link on a page — use once. */
  tone?: "accent" | "ink" | "muted";
  className?: string;
};

/**
 * A text link that goes somewhere, as distinct from a `Button`.
 *
 * Where a button is a surface, this is just words and a mark that steps
 * right when you reach for it. It is what a section heading's "see all"
 * wants to be — present enough to click, quiet enough not to compete with
 * the glass panes around it.
 */
export function ActionLink({
  href,
  children,
  tone = "ink",
  className,
}: ActionLinkProps) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "muted"
        ? "text-muted hover:text-ink"
        : "text-ink";

  return (
    <Link
      href={href}
      className={cn(
        "group press touch-target inline-flex items-center gap-2 text-small font-medium",
        toneClass,
        className,
      )}
    >
      <span>{children}</span>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="transition-transform duration-300 ease-[var(--ease-glass)] group-hover:translate-x-1 motion-reduce:transition-none"
      >
        <path d="M5 12h13M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
