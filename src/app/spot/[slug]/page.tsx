import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { ReportControl } from "@/components/spot/report-control";
import { SpotNotes } from "@/components/spot/spot-notes";
import { SpotPlate } from "@/components/spot/spot-plate";
import { ActionLink } from "@/components/ui/action-link";
import { ArrowRight, ButtonLink } from "@/components/ui/button";
import {
  AccessTag,
  CategoryTag,
  DifficultyMeter,
} from "@/components/ui/spot-tags";
import { BallRate } from "@/components/ball/ball-rate";
import { getSpotBySlug, listSpotSlugs } from "@/lib/data/spots-repo";
import { ballRating } from "@/lib/spots/ball";
import { SITE_TITLE } from "@/lib/site";
import { formatDate } from "@/lib/utils/date";
import {
  ACCESS_NOTES,
  CATEGORY_LABELS,
  DIFFICULTIES,
  placeLine,
} from "@/lib/types/spot";

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
  if (!spot) return { title: "Not found" };

  return {
    title: spot.name,
    description: spot.summary,
    openGraph: {
      title: `${spot.name} — ${SITE_TITLE}`,
      description: spot.summary,
      type: "article",
    },
  };
}

export default async function SpotPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const spot = await getSpotBySlug(slug);
  if (!spot) notFound();

  const place = placeLine(spot);
  const lead = spot.photos[0];
  const rest = spot.photos.slice(1);

  const facts = [
    {
      label: "Walk in",
      value: spot.walkInKm > 0 ? `${spot.walkInKm} km` : "By boat",
    },
    { label: "Logged", value: formatDate(spot.addedAt) },
    { label: "Latitude", value: spot.lat.toFixed(4) },
    { label: "Longitude", value: spot.lng.toFixed(4) },
  ];

  // The meter reads as a proportion of the scale rather than a word, which
  // is what makes it comparable at a glance against another entry.
  const difficultyPct =
    ((DIFFICULTIES.indexOf(spot.difficulty) + 1) / DIFFICULTIES.length) * 100;

  return (
    <article className="shell">
      {/* --------------------------------------------------------- head */}
      <header className="pt-[clamp(1.75rem,1.2rem+2vw,3rem)]">
        <ActionLink href="/explore" tone="muted" className="mb-8">
          Back to the map
        </ActionLink>

        <div className="grid items-center gap-[clamp(2rem,1.4rem+3vw,3.5rem)] lg:grid-cols-[1fr_minmax(0,32rem)]">
          <div>
            <p className="eyebrow flex items-center gap-3">
              <span
                aria-hidden="true"
                className="breathe block size-[7px] rounded-full bg-accent shadow-[0_0_14px_var(--color-accent)]"
              />
              {place ?? CATEGORY_LABELS[spot.category]}
            </p>
            <h1 className="mt-5 text-h1 text-ink">{spot.name}</h1>
            <p className="mt-6 max-w-[44ch] text-lead font-light text-muted">
              {spot.summary}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <CategoryTag value={spot.category} />
              <DifficultyMeter value={spot.difficulty} />
              <AccessTag value={spot.access} />
            </div>
          </div>

          {/* The lead plate, floating. */}
          {lead ? (
            <div className="glass floaty rounded-[var(--radius-2xl)] p-3.5">
              <SpotPlate
                photo={lead}
                index={0}
                sizes="(min-width: 1024px) 32rem, 100vw"
                priority
                className="[&>figcaption]:hidden"
              />
            </div>
          ) : null}
        </div>
      </header>

      {/* --------------------------------------------------- action rail */}
      <div className="glass mt-[clamp(2rem,1.4rem+2vw,3rem)] flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-[var(--radius-lg)] px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="flex items-center gap-2.5 text-tiny text-muted">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-accent"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.2 2" />
            </svg>
            Logged
            <span className="font-semibold text-ink">
              {formatDate(spot.addedAt)}
            </span>
          </span>
          <span className="hidden items-center gap-2.5 text-tiny text-muted sm:flex">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.4" />
            </svg>
            <span className="tabular-nums">
              {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
            </span>
          </span>
        </div>

        <ButtonLink
          href={`https://www.openstreetmap.org/?mlat=${spot.lat}&mlon=${spot.lng}#map=14/${spot.lat}/${spot.lng}`}
          tone="ember"
          size="sm"
          target="_blank"
          rel="noreferrer noopener"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 11l18-8-8 18-2-8-8-2z" />
          </svg>
          Directions
        </ButtonLink>
      </div>

      {/* -------------------------------------------- write-up + facts */}
      <div className="mt-[clamp(2.5rem,1.8rem+3vw,4.5rem)] grid items-start gap-[clamp(2rem,1.4rem+2.4vw,3rem)] lg:grid-cols-[1fr_minmax(0,24rem)]">
        <div>
          <p className="eyebrow">The write-up</p>
          <p className="mt-6 max-w-[62ch] text-body text-muted">
            {spot.description}
          </p>

          <dl className="mt-10 grid gap-3">
            {spot.bestWindow ? (
              <div className="glass rounded-[var(--radius-lg)] p-5">
                <dt className="eyebrow">Best window</dt>
                <dd className="mt-2.5 max-w-[56ch] text-small text-ink">
                  {spot.bestWindow}
                </dd>
              </div>
            ) : null}
            {/* The one place the accent marks prose: this is the field
                that stops someone getting hurt. */}
            <div className="glass rounded-[var(--radius-lg)] p-5">
              <dt className="eyebrow flex items-center gap-2 text-accent">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 9v5" />
                  <path d="M12 17.5v.01" />
                  <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
                Watch out
              </dt>
              <dd className="mt-2.5 max-w-[56ch] text-small text-ink">
                {spot.watchOut}
              </dd>
            </div>
            <div className="glass rounded-[var(--radius-lg)] p-5">
              <dt className="eyebrow">Access</dt>
              <dd className="mt-2.5 max-w-[56ch] text-small text-ink">
                {ACCESS_NOTES[spot.access]}
              </dd>
            </div>
          </dl>
        </div>

        {/* The rail: the ball meter first, because it is the thing
            people came to compare, then the costs. */}
        <aside className="grid gap-4 lg:sticky lg:top-[calc(var(--bar-h)+1.5rem)]">
          <BallRate
            slug={spot.slug}
            rating={ballRating(spot.ratingSum, spot.ratingCount)}
          />

          <div className="glass rounded-[var(--radius-xl)] p-6">
            <p className="eyebrow">What it costs you</p>

            <div className="mt-5">
              <div className="flex items-baseline justify-between">
                <span className="text-small text-muted">Difficulty</span>
                <span className="text-small font-semibold text-ink">
                  {spot.difficulty.charAt(0).toUpperCase() +
                    spot.difficulty.slice(1)}
                </span>
              </div>
              <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent"
                  style={{ width: `${difficultyPct}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-[var(--glass-rim)] pt-6">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <p className="eyebrow">{fact.label}</p>
                  <p className="mt-2 text-small font-medium text-ink tabular-nums">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ------------------------------------------------------- plates */}
      {rest.length > 0 ? (
        <section className="mt-[clamp(3rem,2rem+3vw,5rem)]">
          <p className="eyebrow">From people who went</p>
          <RevealGroup className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((photo, index) => (
              <Reveal key={photo.alt} index={index}>
                <div className="glass lift sheen rounded-[var(--radius-xl)] p-3">
                  <SpotPlate
                    photo={photo}
                    index={index + 1}
                    className="[&>figcaption]:px-1 [&>figcaption]:pb-1"
                  />
                </div>
              </Reveal>
            ))}
          </RevealGroup>
        </section>
      ) : null}

      {/* -------------------------------------------------------- notes */}
      <section className="mt-[clamp(3rem,2rem+3vw,5rem)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Field notes</p>
            <h2 className="mt-3 text-h2 text-ink">What people found</h2>
          </div>
          <p className="max-w-[32ch] text-small text-muted">
            Dated, because conditions rot. Newest first.
          </p>
        </div>

        <div className="mt-8">
          <SpotNotes slug={spot.slug} notes={spot.notes} />
        </div>
      </section>

      {/* ---------------------------------------------------------- out */}
      <section className="mt-[clamp(3rem,2rem+3vw,5rem)] flex flex-wrap items-center justify-between gap-x-8 gap-y-5 border-t border-rule pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/explore">
            Back to the map
            <ArrowRight />
          </ButtonLink>
          <ButtonLink href="/submit" tone="quiet">
            Log a new spot
          </ButtonLink>
        </div>

        {/* Deliberately quiet and last. Findable, not an invitation. */}
        <ReportControl endpoint={`/api/spots/${spot.slug}/report`} />
      </section>
    </article>
  );
}
