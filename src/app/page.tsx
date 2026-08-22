import { Footprints, Globe, MapPin, ShoppingBag } from "lucide-react";

import { HeroContours } from "@/components/hero/hero-contours";
import { HeroVisual } from "@/components/hero/hero-visual";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { ActionLink } from "@/components/ui/action-link";
import { listSpots } from "@/lib/data/spots-repo";
import type { Spot } from "@/lib/types/spot";

const MANIFESTO = [
  {
    n: "01",
    title: "the guidebook is a filter",
    body: "everything that makes it into one is there because it scales — parking, opening hours, a gift shop. the places worth the detour fail every one of those tests.",
  },
  {
    n: "02",
    title: "difficulty is the point",
    body: "every entry is tagged for what getting there actually costs you: the walk in, the scramble, the tide window, the fence nobody mentions.",
  },
  {
    n: "03",
    title: "log it honestly",
    body: "conditions change. access closes. notes come from people who actually went, dated, so you know how stale the intel is before you drive four hours.",
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
 * "gift shops: 0" is the joke, and it stays, because it is the one figure
 * that is true by construction.
 */
function readout(spots: Spot[]) {
  const countries = new Set(spots.map((spot) => spot.country)).size;

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
    { label: "spots logged", value: String(spots.length) },
    { label: "countries", value: String(countries) },
    {
      label: "median walk-in",
      // An em dash rather than "0km", which would read as a measurement
      // rather than as an absence.
      value: middle === null ? "—" : `${middle.toFixed(1)}km`,
    },
    { label: "gift shops", value: "0" },
  ];
}

const UNAVAILABLE = [
  { label: "spots logged", value: "—" },
  { label: "countries", value: "—" },
  { label: "median walk-in", value: "—" },
  { label: "gift shops", value: "0" },
];

const READOUT_ICONS: Record<
  string,
  { Icon: typeof MapPin; iconBg: string; iconColor: string }
> = {
  "spots logged": {
    Icon: MapPin,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-500",
  },
  countries: {
    Icon: Globe,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-500",
  },
  "median walk-in": {
    Icon: Footprints,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  "gift shops": {
    Icon: ShoppingBag,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
};

export const revalidate = 300;

export default async function HomePage() {
  // null means the index could not be reached, which is neither real
  // figures nor zero. Showing dashes says so without a scary banner on
  // a page that is mostly manifesto.
  const spots = await listSpots();
  const READOUT = spots === null ? UNAVAILABLE : readout(spots);
  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        {/* Sits behind the type, bleeding off the right edge. Resolves to
            the WebGL field on capable desktops, the SVG contours elsewhere. */}
        <HeroVisual className="absolute top-1/2 -right-[18%] hidden h-[132%] w-[62%] -translate-y-1/2 opacity-90 sm:block" />

        <div className="shell grid-swiss relative items-end pt-[clamp(3rem,2rem+6vw,8rem)] pb-[clamp(2.5rem,1.6rem+4vw,5rem)]">
          <div className="col-span-12 lg:col-span-8">
            <RevealGroup>
              <Reveal index={0}>
                <p className="label flex items-center gap-3">
                  <span className="text-accent">{"///"}</span>
                  index of the unlisted
                </p>
              </Reveal>

              <Reveal index={1}>
                <h1 className="mt-[clamp(1.5rem,1rem+2vw,3rem)] text-mega leading-[0.88] font-bold tracking-[-0.045em] lowercase">
                  bro knows
                  <br />a spot
                </h1>
              </Reveal>

              <Reveal index={2}>
                <p className="mt-[clamp(1.5rem,1rem+1.6vw,2.5rem)] max-w-[46ch] text-lead font-light text-muted">
                  a crowdsourced guide to the places that never made the
                  guidebook. abandoned rail cuttings, unmarked springs, ridge
                  lines with no trail and a view that ruins other views.
                </p>
              </Reveal>

              <Reveal index={3}>
                <div className="mt-[clamp(2rem,1.4rem+2.4vw,3.5rem)] flex flex-wrap items-center gap-x-4 gap-y-4">
                  <ActionLink href="/explore" tone="accent">
                    open the map
                  </ActionLink>
                  <ActionLink href="/submit" tone="muted">
                    add a spot
                  </ActionLink>
                </div>
              </Reveal>
            </RevealGroup>
          </div>

          {/* Contours again, but inline and small, for narrow screens. */}
          <div className="col-span-12 mt-10 sm:hidden">
            <HeroContours className="h-40 w-full" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- readout */}
      <section aria-label="index statistics">
        <div className="shell py-[clamp(1.5rem,1rem+2vw,3rem)]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {READOUT.map((item) => {
              const meta = READOUT_ICONS[item.label];
              return (
                <div key={item.label} className="stat-card">
                  <div className={`stat-icon ${meta?.iconBg ?? ""}`}>
                    {meta ? (
                      <meta.Icon
                        size={18}
                        className={meta.iconColor}
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <div>
                    <p className="font-display text-h3 leading-none font-bold text-ink tabular-nums">
                      {item.value}
                    </p>
                    <p className="label mt-1">{item.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- manifesto */}
      <section>
        <div className="shell grid-swiss py-[clamp(3rem,2rem+5vw,7rem)]">
          <div className="col-span-12 lg:col-span-3">
            <p className="label">manifesto</p>
          </div>

          <RevealGroup className="col-span-12 mt-8 lg:col-span-9 lg:mt-0">
            <div className="grid gap-[clamp(2rem,1.4rem+2.4vw,3.5rem)] md:grid-cols-3">
              {MANIFESTO.map((item, i) => (
                <Reveal key={item.n} index={i}>
                  <article>
                    <p className="font-mono text-micro text-accent tabular-nums">
                      {item.n}
                    </p>
                    <h2 className="mt-3 text-h3 font-bold text-ink lowercase">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-small text-muted">{item.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ----------------------------------------------------------- cta */}
      <section>
        <div className="shell grid-swiss py-[clamp(3rem,2rem+5vw,7rem)]">
          <Reveal className="col-span-12 lg:col-span-8">
            <h2 className="text-h2 font-bold text-ink lowercase">
              know somewhere that isn&rsquo;t on here?
            </h2>
            <p className="mt-4 max-w-[44ch] text-body text-muted">
              the index is only as good as what people are willing to give up.
              no account needed — just coordinates, an honest difficulty rating,
              and what to watch out for.
            </p>
            <div className="mt-8">
              <ActionLink href="/submit">submit a spot</ActionLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
