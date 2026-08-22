import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Compass, Footprints, MapPin } from "lucide-react";

import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { ReportControl } from "@/components/spot/report-control";
import { SpotNotes } from "@/components/spot/spot-notes";
import { SpotPlate } from "@/components/spot/spot-plate";
import { ActionLink } from "@/components/ui/action-link";
import {
  AccessTag,
  CategoryTag,
  DifficultyMeter,
} from "@/components/ui/spot-tags";
import { getSpotBySlug, listSpotSlugs } from "@/lib/data/spots-repo";
import { SITE_TITLE } from "@/lib/site";
import { formatDate } from "@/lib/utils/date";
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

  return (
    <article>
      {/* --------------------------------------------------------- head */}
      <header>
        <div className="shell grid-swiss py-[clamp(2rem,1.4rem+3vw,4.5rem)]">
          <div className="col-span-12 lg:col-span-8">
            <p className="label flex items-center gap-3">
              <span className="text-accent">{"///"}</span>
              {spot.region} / {spot.country}
            </p>
            <h1 className="mt-5 text-h1 font-bold lowercase">{spot.name}</h1>
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
      <section aria-label="key figures">
        <div className="shell py-[clamp(1rem,0.8rem+1.2vw,1.75rem)]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              {
                label: "walk in",
                value: spot.walkInKm > 0 ? `${spot.walkInKm}km` : "by boat",
                Icon: Footprints,
                iconBg: "bg-emerald-100",
                iconColor: "text-emerald-600",
              },
              {
                label: "latitude",
                value: spot.lat.toFixed(4),
                Icon: MapPin,
                iconBg: "bg-rose-100",
                iconColor: "text-rose-500",
              },
              {
                label: "longitude",
                value: spot.lng.toFixed(4),
                Icon: Compass,
                iconBg: "bg-indigo-100",
                iconColor: "text-indigo-500",
              },
              {
                label: "logged",
                value: formatDate(spot.addedAt),
                Icon: CalendarDays,
                iconBg: "bg-amber-100",
                iconColor: "text-amber-600",
              },
            ].map((item) => (
              <div key={item.label} className="stat-card">
                <div className={`stat-icon ${item.iconBg}`}>
                  <item.Icon
                    size={18}
                    className={item.iconColor}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="font-display text-h3 font-bold leading-none text-ink tabular-nums">
                    {item.value}
                  </p>
                  <p className="label mt-1">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- plates */}
      <section>
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
      <section>
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
      <section>
        <div className="shell grid-swiss py-[clamp(2.5rem,1.8rem+3vw,5rem)]">
          <div className="col-span-12 lg:col-span-3">
            <p className="label">community notes</p>
            <p className="mt-3 max-w-[28ch] text-small text-muted">
              dated, because conditions rot. newest first.
            </p>
          </div>

          <div className="col-span-12 mt-6 lg:col-span-8 lg:mt-0">
            <SpotNotes slug={spot.slug} notes={spot.notes} />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- out */}
      <section>
        <div className="shell grid-swiss py-[clamp(2rem,1.4rem+2.4vw,3.5rem)]">
          <div className="col-span-12 flex flex-wrap gap-x-10 gap-y-4 lg:col-span-8">
            <ActionLink href="/explore" tone="accent">
              back to the map
            </ActionLink>
            <ActionLink href="/submit" tone="muted">
              log a note or a new spot
            </ActionLink>
          </div>

          {/* Deliberately quiet and last. Findable, not an invitation. */}
          <div className="col-span-12 mt-8 lg:col-span-4 lg:mt-0 lg:text-right">
            <ReportControl slug={spot.slug} />
          </div>
        </div>
      </section>
    </article>
  );
}
