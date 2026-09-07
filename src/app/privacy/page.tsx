import type { Metadata } from "next";

import { LegalPage, Section } from "@/components/legal/legal-page";
import { SITE_TITLE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What this site collects, what it does not, and how long it keeps any of it.",
};

/**
 * Written from the code, not from a template.
 *
 * Every claim here corresponds to something in the repository, and the
 * file that backs it is named so a future change to that file is a
 * prompt to change this page:
 *
 *   salted hash, never the address   lib/security/request-key.ts
 *   EXIF stripped in the browser     lib/photos/prepare.ts
 *   location never stored            lib/hooks/use-geolocation.ts
 *   ratings unreadable by anyone     lib/appwrite/schema.ts
 */
export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy" updated="2026-09-07">
      <Section heading="The short version">
        <p>
          There are no accounts, so there is nothing here that is <em>you</em>.
          We do not set analytics cookies, we do not run advertising, and we do
          not sell or share anything with anyone.
        </p>
      </Section>

      <Section heading="What you type in">
        <p>
          A spot you submit is published: its name, coordinates, category,
          difficulty, access type and write-up all appear on the site. A field
          note is published too, with whatever name you put on it. If you leave
          the name blank it is stored as <strong>anonymous</strong>.
        </p>
        <p>
          Do not put anything in those fields you would not want in public. A
          coordinate is precise, and the pin you drop is the pin everyone sees.
        </p>
      </Section>

      <Section heading="Your IP address">
        <p>
          We never store it. What is stored is a <strong>salted HMAC</strong> of
          it, which cannot be reversed back to an address without the salt, and
          the salt is never in the database.
        </p>
        <p>
          That value does two jobs and no others: it caps how many submissions,
          notes and photos come from one place in an hour, and it counts
          distinct people against a report so that one person clicking ten times
          counts once. It is deliberately weak as identity. Everyone behind one
          office connection shares it, and anyone with a VPN has as many as they
          like.
        </p>
      </Section>

      <Section heading="Photos">
        <p>
          Photos are re-encoded <strong>in your browser</strong> before anything
          is uploaded. That re-encode drops the GPS coordinates, the timestamp
          and the camera the file came from. The original file is read and
          discarded on your device and never reaches our server.
        </p>
      </Section>

      <Section heading="Your location">
        <p>
          The site never asks for your location on load. It is read only when
          you press a button that says it will, and only in that tab.
        </p>
        <p>
          On the submit form it moves the map pin, and nothing is sent until you
          submit. On the explore map it sorts the list by distance, and that
          sorting happens <strong>entirely in your browser</strong>. Your
          coordinates are not sent to this site or anywhere else for it. We do
          not write your position to storage of any kind.
        </p>
      </Section>

      <Section heading="Ratings and reports">
        <p>
          A ball-meter score is stored with the salted hash described above, so
          that one person rates a spot once. Individual scores are readable by
          nobody, including us: only the average and the count are public.
        </p>
        <p>
          A report is stored with the same hash, its reason, and anything you
          type in the detail box. Moderators can read the reason and the detail.
          Nobody can read the hash.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>Two, both strictly functional, neither used for tracking:</p>
        <p>
          A <strong>theme preference</strong> is kept in your browser&rsquo;s
          local storage so the site does not flash the wrong colours on load. It
          never leaves your device.
        </p>
        <p>
          A short-lived <strong>anti-bot ticket</strong> is set after you pass
          the Cloudflare Turnstile check, so that adding three photos and then
          submitting does not make you pass it four times. It lasts twenty
          minutes, carries no identity, and is bound to the same salted hash.
        </p>
      </Section>

      <Section heading="Who else is involved">
        <p>
          <strong>Vercel</strong> hosts the site and terminates the connection.{" "}
          <strong>Appwrite Cloud</strong> stores the index and the uploaded
          photos, in its Singapore region. <strong>Cloudflare Turnstile</strong>{" "}
          runs the anti-bot check on the forms. Map tiles are fetched by your
          browser from the tile provider configured for this deployment, which
          means that provider sees your IP address in the ordinary way any
          server does when you request a file from it.
        </p>
      </Section>

      <Section heading="How long any of it is kept">
        <p>
          Published spots and notes stay until they are removed by a moderator
          or by you asking. Rate-limit records are only consulted inside a
          one-hour window. Reports and ratings are kept for as long as the entry
          they belong to.
        </p>
      </Section>

      <Section heading="Taking something down">
        <p>
          Because there are no accounts, we cannot look up &ldquo;your&rdquo;
          submissions. To have something removed, use the report control on the
          entry itself and say what it is in the detail box, or write to{" "}
          <a href="mailto:hello@broknowsaspot.app">hello@broknowsaspot.app</a>.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If this page changes in a way that affects what is collected, the date
          at the top changes with it. {SITE_TITLE} is a small project and this
          page is maintained by hand.
        </p>
      </Section>
    </LegalPage>
  );
}
