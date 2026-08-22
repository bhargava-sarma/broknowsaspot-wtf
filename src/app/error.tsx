"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Swap for the real reporter once one exists.
    console.error(error);
  }, [error]);

  return (
    <section className="shell py-[clamp(3rem,2rem+6vw,7rem)]">
      <div className="glass mx-auto max-w-[46rem] rounded-[var(--radius-2xl)] px-[clamp(1.5rem,1rem+3vw,4rem)] py-[clamp(2.5rem,1.6rem+4vw,4.5rem)] text-center">
        <p className="eyebrow">Error</p>
        <h1 className="mt-5 text-h1 text-ink">That didn&rsquo;t load</h1>
        <p className="mx-auto mt-6 max-w-[42ch] text-body text-muted">
          Something broke on our side. The index is still there.
        </p>
        {error.digest ? (
          <p className="mt-4 text-tiny text-faint tabular-nums">
            Ref {error.digest}
          </p>
        ) : null}
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button tone="ember" onClick={reset}>
            Try again
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 11A8 8 0 1 0 18 17" />
              <path d="M20 5v6h-6" />
            </svg>
          </Button>
          <ButtonLink href="/">Back to the index</ButtonLink>
        </div>
      </div>
    </section>
  );
}
