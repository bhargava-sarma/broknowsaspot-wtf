"use client";

import { useEffect } from "react";

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
    <section className="shell grid-swiss py-[clamp(4rem,3rem+8vw,10rem)]">
      <div className="col-span-12 lg:col-span-7">
        <p className="label flex items-center gap-3">
          <span className="text-accent">{"///"}</span>
          error
        </p>
        <h1 className="mt-6 text-h1 font-light lowercase">
          that didn&rsquo;t load
        </h1>
        <p className="mt-5 max-w-[44ch] text-body text-muted">
          something broke on our side. the index is still there.
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono text-micro text-faint">
            ref {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="tap touch-target mt-10 inline-flex items-center gap-3 border-b border-rule-strong pb-2 font-mono text-tiny tracking-[0.04em] text-ink lowercase"
        >
          try again
          <span aria-hidden="true">↻</span>
        </button>
      </div>
    </section>
  );
}
