import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  /** Monospace eyebrow, e.g. the section code. */
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

/** Standard page masthead: eyebrow, title, optional lede. No hairline border. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <header className={cn(className)}>
      <div
        className={cn(
          "shell grid-swiss",
          compact
            ? "py-[clamp(1.1rem,0.7rem+2vw,4.5rem)]"
            : "py-[clamp(2rem,1.4rem+3vw,4.5rem)]",
        )}
      >
        <div className="col-span-12 lg:col-span-8">
          <p className="label flex items-center gap-3">
            <span className="text-accent">{"///"}</span>
            {eyebrow}
          </p>
          <h1
            className={cn(
              "font-bold lowercase",
              compact ? "mt-3 text-h2 sm:mt-5 sm:text-h1" : "mt-5 text-h1",
            )}
          >
            {title}
          </h1>
          {lede ? (
            <p
              className={cn(
                "max-w-[52ch] text-lead font-light text-muted",
                compact ? "mt-4 hidden sm:block" : "mt-5",
              )}
            >
              {lede}
            </p>
          ) : null}
        </div>
        {children ? (
          <div className="col-span-12 mt-8 lg:col-span-4 lg:mt-0">
            {children}
          </div>
        ) : null}
      </div>
    </header>
  );
}
