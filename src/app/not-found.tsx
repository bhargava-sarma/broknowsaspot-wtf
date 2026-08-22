import { ArrowRight, ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="shell py-[clamp(3rem,2rem+6vw,7rem)]">
      <div className="glass sheen mx-auto max-w-[46rem] rounded-[var(--radius-2xl)] px-[clamp(1.5rem,1rem+3vw,4rem)] py-[clamp(2.5rem,1.6rem+4vw,4.5rem)] text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-5 text-h1 text-ink">Nothing logged here</h1>
        <p className="mx-auto mt-6 max-w-[46ch] text-body text-muted">
          This one is off the index. Either it never existed, or someone took it
          down because it stopped being a secret.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/explore" tone="ember">
            Open the map
            <ArrowRight />
          </ButtonLink>
          <ButtonLink href="/">Back to the index</ButtonLink>
        </div>
      </div>
    </section>
  );
}
