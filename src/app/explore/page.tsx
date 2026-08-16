import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { PendingPanel } from "@/components/ui/pending-panel";

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
      <PendingPanel
        summary="the leaflet map and its filter rail land in the next milestone. the design system, theme and layout grid this page sits on are already in place."
        items={[
          "leaflet canvas with themed tiles for light and dark",
          "filter rail — category, difficulty, access type",
          "pinch and drag parity with mouse interaction",
          "marker clustering and hover readout",
        ]}
      />
    </>
  );
}
