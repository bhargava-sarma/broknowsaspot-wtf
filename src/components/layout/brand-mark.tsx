import Link from "next/link";

import { SITE_NAME, SITE_TLD } from "@/lib/site";
import { cn } from "@/lib/utils/cn";

/**
 * The map pin, drawn once and imported everywhere it appears.
 *
 * Stroke inherits `currentColor`, so callers set the colour by setting
 * text colour and nothing here needs to know about the theme.
 */
export function PinMark({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

/** Pin plus wordmark, linking home. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "press inline-flex items-center gap-2.5 text-ink",
        className,
      )}
    >
      <PinMark className="text-accent" size={19} />
      <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
        {SITE_NAME}
        <span className="text-faint">{SITE_TLD}</span>
      </span>
    </Link>
  );
}
