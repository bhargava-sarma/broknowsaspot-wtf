import Link from "next/link";

import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { BallScore } from "@/components/ball/ball-meter";
import { SpotPlate } from "@/components/spot/spot-plate";
import { ActionLink } from "@/components/ui/action-link";
import { ArrowRight, ButtonLink } from "@/components/ui/button";
import {
  AccessTag,
  CategoryTag,
  DifficultyMeter,
} from "@/components/ui/spot-tags";
import { Ticker } from "@/components/ui/ticker";
import { listSpots } from "@/lib/data/spots-repo";
import { ballRating } from "@/lib/spots/ball";
import { placeLine, type Spot } from "@/lib/types/spot";

const MANIFESTO = [
  {
    n: "01",
    title: "The guidebook is a filter",
    body: "Everything that makes it into one is there because it scales — parking, opening hours, a gift shop. The places worth the detour fail every one of those tests.",
  },
  {
    n: "02",
    title: "Difficulty is the point",
    body: "Every entry is tagged for what getting there actually costs you: the walk in, the scramble, the tide window, the fence nobody mentions.",
  },
  {
    n: "03",
    title: "Log it honestly",
    body: "Conditions change. Access closes. Notes come from people who actually went, dated, so you know how stale the intel is before you drive four hours.",
  },
];

/**
 * The readout, counted rather than claimed.
 *
 * These were scaffold placeholders — "128 spots logged", "24 countries" —
 * and they stayed placeholders after the site started holding real
 * entries. An index whose entire pitch is that its information is honest
 * cannot open with four invented numbers, and the failure mode is quiet:
 * they look plausible at any size, so nothing ever prompts you to check.
 *
 * "Gift shops: 0" is the joke, and it stays, because it is the one figure
 * that is true by construction.
 */
function readout(spots: Spot[]) {
  const rated = spots
    .map((spot) => ballRating(spot.ratingSum, spot.ratingCount))
    .filter((rating): rating is NonNullable<typeof rating> => rating !== null);
  const meanBall =
    rated.length === 0
      ? null
      : rated.reduce((total, rating) => total + rating.average, 0) /
        rated.length;

  const walks = spots
    .map((spot) => spot.walkInKm)
    .filter((km) => Number.isFinite(km) && km > 0)
    .sort((a, b) => a - b);
  // noUncheckedIndexedAccess is on, so every index is possibly undefined
  // and the median has to be written as if it might be.
  const median = (): number | null => {
    if (walks.length === 0) return null;
    if (walks.length % 2 === 1) return walks[(walks.length - 1) / 2] ?? null;
    const lower = walks[walks.length / 2 - 1];
    const upper = walks[walks.length / 2];
    if (lower === undefined || upper === undefined) return null;
    return (lower + upper) / 2;
  };
  const middle = median();

  return [
    { label: "Spots logged", value: String(spots.length) },
    {
      label: "Mean ball",
      // An em dash rather than 0, which would read as "everything here is
      // rubbish" instead of "nobody has scored anything yet".
      value: meanBall === null ? "—" : meanBall.toFixed(1),
    },
    {
      label: "Median walk-in",
      // An em dash rather than "0km", which would read as a measurement
      // rather than as an absence.
      value: middle === null ? "—" : `${middle.toFixed(1)}km`,
    },
    { label: "Gift shops", value: "0" },
  ];
}

const UNAVAILABLE = [
  { label: "Spots logged", value: "—" },
  { label: "Mean ball", value: "—" },
  { label: "Median walk-in", value: "—" },
  { label: "Gift shops", value: "0" },
];

export const revalidate = 300;

export default async function HomePage() {
  // null means the index could not be reached, which is neither real
  // figures nor zero. Showing dashes says so without a scary banner on
  // a page that is mostly manifesto.
  const spots = await listSpots();
  const stats = spots === null ? UNAVAILABLE : readout(spots);

  // Newest first, and only what the hero and the strip can actually show.
  const recent = (spots ?? [])
    .slice()
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const featured = recent[0] ?? null;
  const strip = recent.slice(featured ? 1 : 0, featured ? 4 : 3);

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="shell pt-[clamp(3rem,2rem+6vw,7rem)]">
        <div className="grid items-center gap-[clamp(2.5rem,1.6rem+4vw,4rem)] lg:grid-cols-[1fr_minmax(0,26rem)]">
          <RevealGroup>
            <Reveal index={0}>
              <p className="eyebrow flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="breathe block size-[7px] rounded-full bg-accent shadow-[0_0_14px_var(--color-accent)]"
                />
                Index of the unlisted
              </p>
            </Reveal>

            <Reveal index={1}>
              <h1 className="mt-[clamp(1.25rem,0.9rem+1.6vw,2rem)] text-mega text-ink">
                Bro knows
                <br />
                {/* The one gradient in the app, and the reason the display
                    face carries an italic: it is the half of the line that
                    catches the light. */}
                <span className="bg-gradient-to-r from-[#c96a2e] via-accent to-[#7a4bd0] bg-clip-text text-transparent italic dark:from-[#ffd9c2] dark:via-accent dark:to-[#c9a2ff]">
                  a spot
                </span>
              </h1>
            </Reveal>

            <Reveal index={2}>
              <p className="mt-[clamp(1.5rem,1rem+1.4vw,2.25rem)] max-w-[44ch] text-lead font-light text-muted">
                A crowdsourced guide to the places that never made the
                guidebook. Abandoned rail cuttings, unmarked springs, ridge
                lines with no trail and a view that ruins other views.
              </p>
            </Reveal>

            <Reveal index={3}>
              <div className="mt-[clamp(2rem,1.4rem+2vw,3rem)] flex flex-wrap items-center gap-3">
                <ButtonLink href="/explore" tone="ember" size="lg">
                  Open the map
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/submit" size="lg">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add a spot
                </ButtonLink>
              </div>
            </Reveal>
          </RevealGroup>

          {/* The floating card. Only rendered when there is a real spot to
              put in it — a placeholder here would be exactly the invented
              content the readout above refuses to print. */}
          {featured ? (
            <Reveal index={4} className="hidden lg:block">
              <article className="glass floaty relative rounded-[var(--radius-2xl)] p-4">
                <SpotPlate
                  photo={
                    featured.photos[0] ?? {
                      src: null,
                      alt: featured.name,
                    }
                  }
                  index={0}
                  sizes="26rem"
                  priority
                  className="[&>figcaption]:hidden"
                />
                <div className="px-2 pt-5 pb-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-h3 text-ink">
                      <Link
                        href={`/spot/${featured.slug}`}
                        className="press before:absolute before:inset-0 before:content-['']"
                      >
                        {featured.name}
                      </Link>
                    </h2>
                    <CategoryTag value={featured.category} />
                  </div>
                  {placeLine(featured) ? (
                    <p className="mt-1.5 text-small text-faint">
                      {placeLine(featured)}
                    </p>
                  ) : null}
                  <p className="mt-4 text-small text-muted">
                    {featured.summary}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <BallScore
                      rating={ballRating(
                        featured.ratingSum,
                        featured.ratingCount,
                      )}
                    />
                    <DifficultyMeter value={featured.difficulty} />
                    <AccessTag value={featured.access} />
                  </div>
                </div>
              </article>
            </Reveal>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------------- readout */}
      <section
        className="shell mt-[clamp(3rem,2rem+4vw,5.5rem)]"
        aria-label="Index statistics"
      >
        <Reveal>
          <div className="glass grid grid-cols-2 rounded-[var(--radius-xl)] sm:grid-cols-4">
            {stats.map((item, i) => (
              <div
                key={item.label}
                className={[
                  "px-[clamp(1.25rem,1rem+1.4vw,2.25rem)] py-[clamp(1.25rem,1rem+1.2vw,2rem)]",
                  i % 2 === 1 ? "border-l border-[var(--glass-rim)]" : "",
                  i >= 2
                    ? "border-t border-[var(--glass-rim)] sm:border-t-0"
                    : "",
                  i % 4 !== 0 ? "sm:border-l sm:border-[var(--glass-rim)]" : "",
                ].join(" ")}
              >
                <p className="font-[family-name:var(--font-display)] text-h2 text-ink tabular-nums">
                  <Ticker value={item.value} />
                </p>
                <p className="eyebrow mt-3">{item.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ----------------------------------------------------- manifesto */}
      <section className="shell mt-[clamp(4rem,2.5rem+5vw,8rem)]">
        <Reveal>
          <p className="eyebrow">Manifesto</p>
        </Reveal>

        <RevealGroup className="mt-8 grid gap-4 md:grid-cols-3">
          {MANIFESTO.map((item, i) => (
            <Reveal key={item.n} index={i}>
              <article className="glass lift h-full rounded-[var(--radius-xl)] p-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)]">
                <p className="font-[family-name:var(--font-display)] text-h2 leading-none text-accent">
                  {item.n}
                </p>
                <h2 className="mt-5 text-h3 text-ink">{item.title}</h2>
                <p className="mt-3.5 text-small text-muted">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </RevealGroup>
      </section>

      {/* ------------------------------------------------- recently added */}
      {strip.length > 0 ? (
        <section className="shell mt-[clamp(4rem,2.5rem+5vw,8rem)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Reveal>
              <p className="eyebrow">Recently logged</p>
              <h2 className="mt-3 text-h2 text-ink">
                Somewhere you haven&rsquo;t been
              </h2>
            </Reveal>
            <Reveal index={1}>
              <ActionLink href="/explore" tone="muted">
                All {recent.length} spots
              </ActionLink>
            </Reveal>
          </div>

          <RevealGroup className="mt-8 grid gap-4 md:grid-cols-3">
            {strip.map((spot, i) => (
              <Reveal key={spot.slug} index={i}>
                <article className="glass lift sheen relative h-full rounded-[var(--radius-xl)] p-3.5">
                  <div className="relative">
                    <SpotPlate
                      photo={spot.photos[0] ?? { src: null, alt: spot.name }}
                      index={i}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="[&>figcaption]:hidden"
                    />
                    <CategoryTag
                      value={spot.category}
                      className="absolute top-3 right-3"
                    />
                  </div>

                  <div className="px-2 pt-5 pb-2">
                    <h3 className="text-h3 text-ink">
                      {/* The whole card is the hit area, without nesting
                          the link around content that contains links. */}
                      <Link
                        href={`/spot/${spot.slug}`}
                        className="press before:absolute before:inset-0 before:content-['']"
                      >
                        {spot.name}
                      </Link>
                    </h3>
                    {placeLine(spot) ? (
                      <p className="mt-1.5 text-small text-faint">
                        {placeLine(spot)}
                      </p>
                    ) : null}
                    <p className="mt-3.5 text-small text-muted">
                      {spot.summary}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <BallScore
                        rating={ballRating(spot.ratingSum, spot.ratingCount)}
                      />
                      <DifficultyMeter value={spot.difficulty} />
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </RevealGroup>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- cta */}
      <section className="shell mt-[clamp(4rem,2.5rem+5vw,8rem)]">
        <Reveal>
          <div className="glass sheen relative overflow-hidden rounded-[var(--radius-2xl)] px-[clamp(1.5rem,1rem+3vw,5rem)] py-[clamp(2.5rem,1.6rem+4vw,5rem)] text-center">
            <p className="eyebrow">Contribute</p>
            <h2 className="mx-auto mt-5 max-w-[20ch] text-h1 text-ink">
              Know somewhere that{" "}
              <span className="text-accent italic">isn&rsquo;t</span> on here?
            </h2>
            <p className="mx-auto mt-6 max-w-[52ch] text-body text-muted">
              The index is only as good as what people are willing to give up.
              No account needed — just coordinates, an honest difficulty rating,
              and what to watch out for.
            </p>
            <div className="mt-9 flex justify-center">
              <ButtonLink href="/submit" tone="ember" size="lg">
                Submit a spot
                <ArrowRight />
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
