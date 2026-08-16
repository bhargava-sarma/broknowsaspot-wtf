import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { SubmitForm } from "@/components/submit/submit-form";

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
      <SubmitForm />
    </>
  );
}
