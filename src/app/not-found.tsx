import { ActionLink } from "@/components/ui/action-link";

export default function NotFound() {
  return (
    <section className="shell grid-swiss py-[clamp(4rem,3rem+8vw,10rem)]">
      <div className="col-span-12 lg:col-span-7">
        <p className="label flex items-center gap-3">
          <span className="text-accent">{"///"}</span>
          404
        </p>
        <h1 className="mt-6 text-h1 font-light lowercase">
          nothing logged here
        </h1>
        <p className="mt-5 max-w-[44ch] text-body text-muted">
          this one is off the index. either it never existed, or someone took it
          down because it stopped being a secret.
        </p>
        <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
          <ActionLink href="/explore" tone="accent">
            open the map
          </ActionLink>
          <ActionLink href="/" tone="muted">
            back to index
          </ActionLink>
        </div>
      </div>
    </section>
  );
}
