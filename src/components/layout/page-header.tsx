import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  /** Monospace eyebrow, e.g. the section code. */
  eyebrow: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
  className?: string;
};

/** Standard page masthead: eyebrow, title, optional lede. No hairline border. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn(className)}>
      <div className="shell grid-swiss py-[clamp(2rem,1.4rem+3vw,4.5rem)]">
        <div className="col-span-12 lg:col-span-8">
          <p className="label flex items-center gap-3">
            <span className="text-accent">{"///"}</span>
            {eyebrow}
          </p>
          <h1 className="mt-5 text-h1 font-bold lowercase">{title}</h1>
          {lede ? (
            <p className="mt-5 max-w-[52ch] text-lead font-light text-muted">
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

