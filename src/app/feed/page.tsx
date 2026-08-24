import type { Metadata } from "next";

import { FeedView } from "@/components/feed/feed-view";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowRight, ButtonLink } from "@/components/ui/button";
import { listSpots } from "@/lib/data/spots-repo";

export const metadata: Metadata = {
  title: "Feed",
  description:
    "Everything just logged, newest first, with what people found when they went.",
};

/** Rebuild at most every 5 minutes; see the explore page for why. */
export const revalidate = 300;

export default async function FeedPage() {
  // null means the index could not be reached, which is not the same as
  // it being empty — the empty state below only speaks for the second.
  const spots = await listSpots();

  return (
    <>
      <PageHeader
        eyebrow="The feed"
        title="What bro found lately"
        lede="Every spot as it was logged, with the field notes underneath. Rate what you have been to; say what you found."
      />

      <section className="shell pb-[clamp(2rem,1.4rem+3vw,4rem)]">
        {spots === null ? (
          <p className="glass mx-auto max-w-[52rem] rounded-[var(--radius-lg)] p-6 text-body text-muted">
            The index could not be reached just now. Nothing has been lost — try
            again in a moment.
          </p>
        ) : spots.length === 0 ? (
          <div className="glass mx-auto max-w-[52rem] rounded-[var(--radius-xl)] p-[clamp(1.5rem,1.2rem+1.4vw,2.5rem)]">
            <h2 className="text-h3 text-ink">Nothing logged yet</h2>
            <p className="mt-3 max-w-[46ch] text-small text-muted">
              The feed fills up one spot at a time, and nobody has gone first.
            </p>
            <div className="mt-7">
              <ButtonLink href="/submit" tone="ember">
                Log the first one
                <ArrowRight />
              </ButtonLink>
            </div>
          </div>
        ) : (
          <FeedView spots={spots} />
        )}
      </section>
    </>
  );
}
