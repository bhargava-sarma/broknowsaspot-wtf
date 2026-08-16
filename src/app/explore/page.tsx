import type { Metadata } from "next";

import { ExploreView } from "@/components/explore/explore-view";
import { PageHeader } from "@/components/layout/page-header";
import { SPOTS } from "@/lib/data/spots";

export const metadata: Metadata = {
  title: "explore",
  description:
    "a filterable map of every logged spot — by category, difficulty and access type.",
};

export default function ExplorePage() {
  return (
    <>
      <PageHeader
        eyebrow="01 / explore"
        title="the map"
        lede="every logged spot, filterable by what it is, how hard it is, and whether you are strictly allowed to be there."
      />
      <ExploreView spots={SPOTS} />
    </>
  );
}
