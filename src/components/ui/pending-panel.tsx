import { ActionLink } from "@/components/ui/action-link";

type PendingPanelProps = {
  /** What lands here, stated plainly. */
  summary: string;
  /** Concrete list of what the milestone ships. */
  items: string[];
};

/**
 * Honest "not built yet" state for a route that exists so navigation is
 * complete. Says what is coming rather than pretending to be a feature,
 * and stays inside the flat language — a hairline-ruled list, no card.
 */
export function PendingPanel({ summary, items }: PendingPanelProps) {
  return (
    <section className="shell grid-swiss py-[clamp(3rem,2rem+5vw,7rem)]">
      <div className="col-span-12 lg:col-span-3">
        <p className="label">status</p>
        <p className="mt-3 font-mono text-micro text-accent lowercase">
          ● in progress
        </p>
      </div>

      <div className="col-span-12 mt-8 lg:col-span-9 lg:mt-0">
        <p className="max-w-[52ch] text-body text-muted">{summary}</p>

        <ul className="mt-8 border-t border-rule">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-baseline gap-4 border-b border-rule py-3.5"
            >
              <span
                aria-hidden="true"
                className="font-mono text-micro text-faint"
              >
                —
              </span>
              <span className="text-small text-ink lowercase">{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <ActionLink href="/" tone="muted">
            back to index
          </ActionLink>
        </div>
      </div>
    </section>
  );
}
