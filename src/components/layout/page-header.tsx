import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  /** Uppercase label above the title. */
  eyebrow: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
  className?: string;
  /**
   * Shrinks the masthead on phones and drops the lede there.
   *
   * For pages whose real content is a viewport-sized object rather than
   * prose — the map being the case that needs it. At full size the
   * masthead costs about two-thirds of a phone screen, so the thing the
   * reader came for starts below the fold. The lede still renders on
   * larger screens, where there is room for it to be worth reading.
   */
  compact?: boolean;
};

/** Standard page masthead: eyebrow, serif title, optional lede. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <header className={cn("shell", className)}>
      <div
        className={cn(
          "flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between",
          compact
            ? "pt-[clamp(1.75rem,1rem+2.4vw,3.5rem)] pb-[clamp(1rem,0.7rem+1.4vw,2rem)]"
            : "pt-[clamp(2.5rem,1.6rem+3.4vw,5rem)] pb-[clamp(1.5rem,1rem+2vw,3rem)]",
        )}
      >
        <div className="max-w-[52ch]">
          <p className="eyebrow flex items-center gap-3">
            <span
              aria-hidden="true"
              className="breathe block size-[7px] rounded-full bg-accent shadow-[0_0_14px_var(--color-accent)]"
            />
            {eyebrow}
          </p>
          <h1
            className={cn(
              "text-ink",
              compact ? "mt-4 text-h2 sm:text-h1" : "mt-5 text-h1",
            )}
          >
            {title}
          </h1>
          {lede ? (
            <p
              className={cn(
                "text-lead font-light text-muted",
                compact ? "mt-4 hidden sm:block" : "mt-5",
              )}
            >
              {lede}
            </p>
          ) : null}
        </div>
        {children ? <div className="lg:shrink-0">{children}</div> : null}
      </div>
    </header>
  );
}
