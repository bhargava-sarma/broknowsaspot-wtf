import type { Metadata } from "next";

import { ExploreView } from "@/components/explore/explore-view";
import { PageHeader } from "@/components/layout/page-header";
import { listSpots } from "@/lib/data/spots-repo";

export const metadata: Metadata = {
  title: "explore",
  description:
    "a filterable map of every logged spot — by category, difficulty and access type.",
};

/** Rebuild at most every 5 minutes, so an approved spot appears without a
 *  redeploy but the page is still served from cache. */
export const revalidate = 300;

export default async function ExplorePage() {
  const spots = await listSpots();

  return (
    <>
      <PageHeader
        eyebrow="01 / explore"
        title="the map"
        lede="every logged spot, filterable by what it is, how hard it is, and whether you are strictly allowed to be there."
      />
      <ExploreView spots={spots} />
    </>
  );
}
