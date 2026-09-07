import { Children, isValidElement, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";

/**
 * The shared frame for the privacy policy and the terms.
 *
 * One component so the two cannot drift apart typographically, and so the
 * measure is set once. Legal text is the one place on this site where the
 * reading column matters more than the layout does.
 */

/** Heading to anchor. Shared, so the link and the target cannot disagree. */
function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  /** ISO date. Shown, because a policy with no date is not a policy. */
  updated: string;
  children: ReactNode;
}) {
  // The contents list is read off the sections themselves rather than
  // passed in beside them. Two copies of the same list is how a policy
  // ends up linking to a heading that was renamed months ago.
  const headings = Children.toArray(children)
    .filter(
      (child): child is React.ReactElement<{ heading: string }> =>
        isValidElement(child) &&
        typeof (child.props as { heading?: unknown }).heading === "string",
    )
    .map((child) => child.props.heading);

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      <div className="shell grid items-start gap-6 pb-[clamp(3rem,2rem+4vw,6rem)] lg:grid-cols-[minmax(0,68ch)_minmax(0,1fr)] xl:gap-10">
        <div className="glass rounded-[var(--radius-xl)] p-[clamp(1.5rem,1.2rem+1.6vw,3rem)]">
          <p className="eyebrow">
            Last updated{" "}
            {new Date(updated).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="mt-8 space-y-8">{children}</div>
        </div>

        {/* Plain anchors, so this works with no JavaScript and survives a
            print. Hidden on small screens, where scrolling past ten short
            sections is faster than reading a list of them first. */}
        <nav
          aria-label={`${title} contents`}
          className="glass-1 sticky top-[calc(var(--bar-h)+1.25rem)] hidden rounded-[var(--radius-xl)] p-5 lg:block"
        >
          <p className="eyebrow">On this page</p>
          <ul className="mt-4 space-y-1">
            {headings.map((heading) => (
              <li key={heading}>
                <a
                  href={`#${anchor(heading)}`}
                  className="press block rounded-[var(--radius-control-sm)] px-2.5 py-1.5 text-small text-muted transition-colors duration-[var(--dur-ui)] hover:bg-ink/[0.05] hover:text-ink"
                >
                  {heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section
      id={anchor(heading)}
      className="scroll-mt-[calc(var(--bar-h)+2rem)]"
    >
      <h2 className="text-h3 text-ink">{heading}</h2>
      <div className="mt-3.5 space-y-3.5 text-small text-muted [&_a]:text-accent [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}
