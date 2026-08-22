import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { SubmitForm } from "@/components/submit/submit-form";

export const metadata: Metadata = {
  title: "Submit",
  description: "Add a spot to the index. No account needed.",
};

export default function SubmitPage() {
  return (
    <>
      <PageHeader
        eyebrow="Add to the index"
        title="Tell us where you went"
        lede="No account, no moderation queue theatre. Coordinates, an honest difficulty rating, and what to watch out for."
      />
      <SubmitForm />
    </>
  );
}
