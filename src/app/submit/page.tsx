import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { PendingPanel } from "@/components/ui/pending-panel";

export const metadata: Metadata = {
  title: "submit",
  description: "add a spot to the index. no account needed.",
};

export default function SubmitPage() {
  return (
    <>
      <PageHeader
        eyebrow="02 / submit"
        title="add a spot"
        lede="no account, no moderation queue theatre. coordinates, an honest difficulty rating, and what to watch out for."
      />
      <PendingPanel
        summary="the submission form lands in the next milestone, backed by a mock api route until the database goes in."
        items={[
          "borderless field set with inline validation",
          "map picker for coordinates",
          "difficulty and access-type tagging",
          "optimistic local state, mock api endpoint",
        ]}
      />
    </>
  );
}
