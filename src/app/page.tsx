import { Footprints, Globe, MapPin, ShoppingBag } from "lucide-react";

import { HeroContours } from "@/components/hero/hero-contours";
import { HeroVisual } from "@/components/hero/hero-visual";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { ActionLink } from "@/components/ui/action-link";

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

const READOUT = [
  {
    label: "spots logged",
    value: "128",
    Icon: MapPin,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-500",
  },
  {
    label: "countries",
    value: "24",
    Icon: Globe,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-500",
  },
  {
    label: "median walk-in",
    value: "2.4km",
    Icon: Footprints,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    label: "gift shops",
    value: "0",
    Icon: ShoppingBag,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
];

export default function HomePage() {
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
              <Reveal>
                <p className="label flex items-center gap-3">
                  <span className="text-accent">{"///"}</span>
                  index of the unlisted
                </p>
              </Reveal>

              <Reveal>
                <h1 className="mt-[clamp(1.5rem,1rem+2vw,3rem)] text-mega font-bold lowercase leading-[0.88] tracking-[-0.045em]">
                  bro knows
                  <br />a spot
                </h1>
              </Reveal>

              <Reveal>
                <p className="mt-[clamp(1.5rem,1rem+1.6vw,2.5rem)] max-w-[46ch] text-lead font-light text-muted">
                  a crowdsourced guide to the places that never made the
                  guidebook. abandoned rail cuttings, unmarked springs, ridge
                  lines with no trail and a view that ruins other views.
                </p>
              </Reveal>

              <Reveal>
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
            {READOUT.map((item) => (
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

      {/* ----------------------------------------------------- manifesto */}
      <section>
        <div className="shell grid-swiss py-[clamp(3rem,2rem+5vw,7rem)]">
          <div className="col-span-12 lg:col-span-3">
            <p className="label">manifesto</p>
          </div>

          <RevealGroup className="col-span-12 mt-8 lg:col-span-9 lg:mt-0">
            <div className="grid gap-[clamp(2rem,1.4rem+2.4vw,3.5rem)] md:grid-cols-3">
              {MANIFESTO.map((item) => (
                <Reveal key={item.n}>
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
          <Reveal standalone className="col-span-12 lg:col-span-8">
            <h2 className="text-h2 font-bold text-ink lowercase">
              know somewhere that isn't on here?
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
