import Link from "next/link";

import { cn } from "@/lib/utils/cn";

/**
 * The one button vocabulary, in three weights.
 *
 * - `ember` — the single primary action on a screen. The only filled
 *   control in the whole app; everything else is glass or nothing. Use it
 *   once per view, or it stops meaning "this one".
 * - `glass` — a real but secondary action. A pane, with the same rim and
 *   lens as every other surface.
 * - `quiet` — tertiary. No surface at all until you hover it.
 *
 * Renders an `<a>` when given `href` and a `<button>` otherwise, so a
 * navigation never ships as a click handler and a submit never ships as a
 * link. The shared class string is the whole point: one place decides how
 * a control is shaped, and the two elements can never drift apart.
 */

export type ButtonTone = "ember" | "glass" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

const SIZES: Record<ButtonSize, string> = {
  sm: "gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-small",
  md: "gap-2.5 rounded-[var(--radius-md)] px-5 py-3 text-small",
  lg: "gap-3 rounded-[var(--radius-lg)] px-7 py-4 text-body",
};

const TONES: Record<ButtonTone, string> = {
  ember: "ember sheen font-semibold",
  glass: "glass sheen font-medium text-ink",
  quiet:
    "font-medium text-muted hover:bg-ink/[0.06] hover:text-ink border border-transparent",
};

export function buttonClass(
  tone: ButtonTone = "glass",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "press touch-target relative inline-flex items-center justify-center overflow-hidden text-center whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-50",
    SIZES[size],
    TONES[tone],
    className,
  );
}

type Shared = {
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = Shared &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({
  tone = "glass",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(tone, size, className)}
      {...rest}
    >
      {/* Above the sheen band and the lens, both of which are ::after /
          ::before on the same element. */}
      <span className="relative inline-flex items-center gap-[inherit]">
        {children}
      </span>
    </button>
  );
}

type ButtonLinkProps = Shared & {
  href: string;
} & Omit<React.ComponentProps<typeof Link>, "className" | "children" | "href">;

export function ButtonLink({
  tone = "glass",
  size = "md",
  className,
  children,
  href,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClass(tone, size, className)} {...rest}>
      <span className="relative inline-flex items-center gap-[inherit]">
        {children}
      </span>
    </Link>
  );
}

/** The trailing arrow shared by every "go somewhere" button. */
export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}
