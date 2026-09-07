import type { Metadata } from "next";

import { LegalPage, Section } from "@/components/legal/legal-page";
import { SITE_TITLE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The rules for using this index, and the limits of what it can promise you.",
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms" updated="2026-09-07">
      <Section heading="What this is">
        <p>
          {SITE_TITLE} is a crowdsourced index of places. Everything on it was
          written by whoever submitted it. Nothing on it has been checked by us
          before publication, and nothing on it should be read as a
          recommendation to go anywhere.
        </p>
      </Section>

      <Section heading="Going anywhere is your decision">
        <p>
          This is the part that matters most, so it is not buried. The entries
          here describe unmarked, unmaintained and sometimes unsafe places.
          Conditions change between the note being written and you arriving.
          Tides come in. Rock is loose. Access closes.
        </p>
        <p>
          <strong>
            You are responsible for your own safety and for deciding whether to
            go.
          </strong>{" "}
          We provide the index as-is, with no warranty that anything on it is
          accurate, current, or safe, and we accept no liability for what
          happens if you act on it.
        </p>
      </Section>

      <Section heading="Access and the law">
        <p>
          Entries carry an access tag: open, permission needed, grey area or
          private land. Those tags are somebody&rsquo;s opinion, not a legal
          finding, and they can be wrong or go out of date.
        </p>
        <p>
          Nothing here is permission to enter anywhere. Trespass, local
          restrictions and protected-site rules are yours to check and yours to
          obey. Do not submit an entry that encourages people onto land where
          they are not allowed.
        </p>
      </Section>

      <Section heading="What you may submit">
        <p>By submitting, you confirm that:</p>
        <p>
          It is <strong>yours to submit</strong>. Do not paste in someone
          else&rsquo;s write-up or upload a photo you did not take.
        </p>
        <p>
          It does not identify anyone. No names, addresses, faces you did not
          get consent for, or anything that points at a private residence.
        </p>
        <p>
          It is honest. Difficulty and access ratings exist so that someone can
          decide whether to drive four hours. Overstating either is the one
          thing here that can actually hurt somebody.
        </p>
        <p>It is not spam, and not a place that is dangerous to publicise.</p>
      </Section>

      <Section heading="What happens to what you submit">
        <p>
          You keep ownership of your text and photos. By submitting you give us
          a non-exclusive licence to publish, store and display them on this
          site, and to remove them.
        </p>
        <p>
          Entries go live immediately. Anyone can report one, enough reports
          hide it automatically, and a moderator can hide or remove anything at
          any time without notice. Hiding and removing are both reversible and
          both leave a record.
        </p>
      </Section>

      <Section heading="Ratings">
        <p>
          The ball meter is an opinion poll, scored one to ten. It sorts entries
          and does nothing else: a low score never hides anything. One score per
          person per entry, and you can change yours.
        </p>
      </Section>

      <Section heading="Reporting">
        <p>
          Report an entry if it is unsafe, exposes someone, encourages illegal
          access, is inaccurate, or is not a real entry. Do not use reports to
          disagree with someone. If you think a note is wrong, the useful answer
          is to leave your own.
        </p>
      </Section>

      <Section heading="Using the site">
        <p>
          Do not scrape it, hammer it, try to get past the rate limits or the
          anti-bot check, or attempt to reach anything the permissions do not
          hand you. The index is small and the budget is smaller.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          This is a side project. It may be slow, it may be down, and it may
          stop. Nothing here is a service you are owed.
        </p>
      </Section>

      <Section heading="Getting in touch">
        <p>
          Takedowns, corrections and anything else:{" "}
          <a href="mailto:hello@broknowsaspot.app">hello@broknowsaspot.app</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
