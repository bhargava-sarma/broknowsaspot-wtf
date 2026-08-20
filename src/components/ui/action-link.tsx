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
 * rule *is* the button, which is why it stays on the flat content plane
 * rather than becoming glass like the floating controls did.
 *
 * The hairline is two stacked rules rather than one. The lower is the
 * resting state; the upper is the same line in a stronger tone, scaled to
 * nothing on its left origin and drawn across on hover. A single line
 * changing colour reads as a state change — a line being *drawn* reads as
 * a response, and costs one composited transform to say so.
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
        ? "text-muted"
        : "text-ink";

  const ruleClass =
    tone === "accent"
      ? "bg-accent"
      : tone === "muted"
        ? "bg-rule"
        : "bg-rule-strong";

  const drawClass = tone === "muted" ? "bg-ink" : ruleClass;

  return (
    <Link
      href={href}
      className={cn(
        "group press touch-target relative inline-flex items-center gap-3 pb-2 font-mono text-tiny tracking-[0.04em] lowercase",
        toneClass,
        className,
      )}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className="inline-block transition-transform duration-300 ease-[var(--ease-spring)] group-hover:translate-x-1 motion-reduce:transition-none"
      >
        →
      </span>

      {/* resting rule */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-x-0 bottom-0 block h-px", ruleClass)}
      />
      {/* the one that draws across */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 bottom-0 block h-px origin-left scale-x-0 transition-transform duration-400 ease-[var(--ease-damped)] group-hover:scale-x-100 motion-reduce:transition-none",
          drawClass,
        )}
      />
    </Link>
  );
}
