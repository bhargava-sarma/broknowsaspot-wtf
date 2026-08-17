import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { SpotPlate } from "@/components/spot/spot-plate";
import { ActionLink } from "@/components/ui/action-link";
import {
  AccessTag,
  CategoryTag,
  DifficultyMeter,
} from "@/components/ui/spot-tags";
import { getSpotBySlug, listSpotSlugs } from "@/lib/data/spots-repo";
import { ACCESS_NOTES } from "@/lib/types/spot";

type Params = { slug: string };

/** Rebuild at most every 5 minutes; see the explore page for why. */
export const revalidate = 300;

/** Slugs added after the last build render on demand rather than 404ing. */
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await listSpotSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const spot = await getSpotBySlug(slug);
  if (!spot) return { title: "not found" };

  return {
    title: spot.name,
    description: spot.summary,
    openGraph: {
      title: `${spot.name} — broknowsaspot.wtf`,
      description: spot.summary,
      type: "article",
    },
  };
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? iso
    : dateFormat.format(parsed).toLowerCase();
}

export default async function SpotPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const spot = await getSpotBySlug(slug);
  if (!spot) notFound();

  return (
    <article>
      {/* --------------------------------------------------------- head */}
      <header className="rule-b">
        <div className="shell grid-swiss py-[clamp(2rem,1.4rem+3vw,4.5rem)]">
          <div className="col-span-12 lg:col-span-8">
            <p className="label flex items-center gap-3">
              <span className="text-accent">{"///"}</span>
              {spot.region} / {spot.country}
            </p>
            <h1 className="mt-5 text-h1 font-light lowercase">{spot.name}</h1>
            <p className="mt-5 max-w-[46ch] text-lead font-light text-muted">
              {spot.summary}
            </p>
          </div>

          <div className="col-span-12 mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 lg:col-span-4 lg:mt-0 lg:flex-col lg:items-start lg:justify-end lg:gap-3">
            <CategoryTag value={spot.category} />
            <DifficultyMeter value={spot.difficulty} />
            <AccessTag value={spot.access} />
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------ readout */}
      <section className="rule-b" aria-label="key figures">
        <div className="shell grid grid-cols-2 sm:grid-cols-4">
          {[
            {
              label: "walk in",
              value: spot.walkInKm > 0 ? `${spot.walkInKm}km` : "by boat",
            },
            { label: "latitude", value: spot.lat.toFixed(4) },
            { label: "longitude", value: spot.lng.toFixed(4) },
            { label: "logged", value: formatDate(spot.addedAt) },
          ].map((item, i) => (
            <div
              key={item.label}
              className={[
                "py-[clamp(1rem,0.9rem+1vw,1.75rem)]",
                i % 2 === 1 ? "border-l border-rule pl-[var(--gutter)]" : "",
                i >= 2 ? "border-t border-rule sm:border-t-0" : "",
                i % 4 !== 0 ? "sm:border-l sm:pl-[var(--gutter)]" : "",
              ].join(" ")}
            >
              <p className="font-mono text-h3 font-light text-ink tabular-nums">
                {item.value}
              </p>
              <p className="label mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- plates */}
      <section className="rule-b">
        <div className="shell py-[clamp(2rem,1.4rem+2.4vw,3.5rem)]">
          <p className="label">plates</p>
          <RevealGroup className="mt-6">
            <div className="grid gap-[var(--gutter)] sm:grid-cols-2 lg:grid-cols-3">
              {spot.photos.map((photo, index) => (
                <Reveal key={photo.alt}>
                  <SpotPlate photo={photo} index={index} />
                </Reveal>
              ))}
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* --------------------------------------------------- the write-up */}
      <section className="rule-b">
        <div className="shell grid-swiss py-[clamp(2.5rem,1.8rem+3vw,5rem)]">
          <div className="col-span-12 lg:col-span-3">
            <p className="label">the write-up</p>
          </div>
          <div className="col-span-12 mt-6 lg:col-span-8 lg:mt-0">
            <p className="max-w-[60ch] text-body text-muted">
              {spot.description}
            </p>

            <dl className="mt-10 border-t border-rule">
              <div className="border-b border-rule py-4">
                <dt className="label">best window</dt>
                <dd className="mt-2 max-w-[52ch] text-small text-ink">
                  {spot.bestWindow}
                </dd>
              </div>
              <div className="border-b border-rule py-4">
                {/* The one place the accent marks prose: this is the field
                    that stops someone getting hurt. */}
                <dt className="label text-accent">watch out</dt>
                <dd className="mt-2 max-w-[52ch] text-small text-ink">
                  {spot.watchOut}
                </dd>
              </div>
              <div className="border-b border-rule py-4">
                <dt className="label">access</dt>
                <dd className="mt-2 max-w-[52ch] text-small text-ink">
                  {ACCESS_NOTES[spot.access]}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- notes */}
      <section className="rule-b">
        <div className="shell grid-swiss py-[clamp(2.5rem,1.8rem+3vw,5rem)]">
          <div className="col-span-12 lg:col-span-3">
            <p className="label">community notes</p>
            <p className="mt-3 max-w-[28ch] text-small text-muted">
              dated, because conditions rot. newest first.
            </p>
          </div>

          <div className="col-span-12 mt-6 lg:col-span-8 lg:mt-0">
            {spot.notes.length === 0 ? (
              <p className="text-small text-muted">
                nobody has logged a note here yet.
              </p>
            ) : (
              <ul className="border-t border-rule">
                {[...spot.notes]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((note) => (
                    <li key={note.id} className="border-b border-rule py-5">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="font-mono text-micro text-ink lowercase">
                          {note.author}
                        </p>
                        <time
                          dateTime={note.date}
                          className="shrink-0 font-mono text-micro text-faint lowercase tabular-nums"
                        >
                          {formatDate(note.date)}
                        </time>
                      </div>
                      <p className="mt-3 max-w-[60ch] text-small text-muted">
                        {note.body}
                      </p>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- out */}
      <section>
        <div className="shell flex flex-wrap gap-x-10 gap-y-4 py-[clamp(2rem,1.4rem+2.4vw,3.5rem)]">
          <ActionLink href="/explore" tone="accent">
            back to the map
          </ActionLink>
          <ActionLink href="/submit" tone="muted">
            log a note or a new spot
          </ActionLink>
        </div>
      </section>
    </article>
  );
}
