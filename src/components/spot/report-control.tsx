"use client";

import { useState } from "react";

import { TurnstileWidget } from "@/components/security/turnstile-widget";
import {
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type ReportReason,
} from "@/lib/spots/reports";
import { cn } from "@/lib/utils/cn";

/**
 * Reporting something — a spot, or one note on it.
 *
 * Collapsed to a single quiet line by default. Reporting should be
 * findable without being an invitation: a prominent button next to every
 * entry turns into a dare.
 *
 * The endpoint is a prop rather than built from a slug here, because the
 * two things reportable on a page answer at different routes and the rest
 * of this component — the reasons, the silences, the states — is
 * identical for both. Duplicating it would mean two places to keep the
 * discretion right.
 *
 * The response never says how many reports something has or how close it
 * is to being hidden. That number is a brigading target, so it stays in
 * the database and out of every payload.
 */

type State =
  | { kind: "closed" }
  | { kind: "open" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "failed"; message: string };

type ReportControlProps = {
  /** Where the report goes. */
  endpoint: string;
  /** The closed-state line. Names what is being reported. */
  label?: string;
  className?: string;
};

export function ReportControl({
  endpoint,
  label = "report this entry",
  className,
}: ReportControlProps) {
  const [state, setState] = useState<State>({ kind: "closed" });
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [token, setToken] = useState<string | null>(null);

  async function submit() {
    if (!reason) return;
    setState({ kind: "sending" });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason, detail, turnstileToken: token }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setState({
          kind: "failed",
          message: payload?.message ?? "couldn't log that. try again shortly.",
        });
        return;
      }
      setState({ kind: "done" });
    } catch {
      setState({
        kind: "failed",
        message: "couldn't reach the server. try again in a moment.",
      });
    }
  }

  if (state.kind === "done") {
    return (
      <p className="font-mono text-micro text-muted lowercase">
        report logged. thanks — someone will look at it.
      </p>
    );
  }

  if (state.kind === "closed") {
    return (
      <button
        type="button"
        onClick={() => setState({ kind: "open" })}
        className={cn(
          "press touch-target font-mono text-micro text-faint lowercase",
          className,
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <div className={cn("max-w-[46ch]", className)}>
      <p className="label">why are you reporting it?</p>

      <div
        role="radiogroup"
        className="mt-3 flex flex-col gap-1 border-b border-rule pb-3"
      >
        {REPORT_REASONS.map((value) => {
          const active = value === reason;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setReason(value)}
              className={cn(
                "press touch-target relative text-left font-mono text-micro lowercase",
                active ? "text-ink" : "text-faint",
              )}
            >
              <span className="mr-2" aria-hidden="true">
                {active ? "▪" : "▫"}
              </span>
              {REPORT_REASON_LABELS[value]}
            </button>
          );
        })}
      </div>

      <label className="label mt-5 block" htmlFor="report-detail">
        anything else (optional)
      </label>
      <textarea
        id="report-detail"
        value={detail}
        rows={2}
        maxLength={500}
        onChange={(event) => setDetail(event.target.value)}
        className="w-full resize-y border-b border-rule bg-transparent pt-2 pb-2 text-small text-ink transition-colors duration-200 outline-none hover:border-muted focus:border-ink"
      />

      <div className="mt-5">
        <TurnstileWidget onToken={setToken} />
      </div>

      {state.kind === "failed" ? (
        <p
          role="alert"
          className="mt-4 font-mono text-micro text-accent lowercase"
        >
          {state.message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
        <button
          type="button"
          onClick={submit}
          disabled={!reason || state.kind === "sending"}
          className="press touch-target border-b border-accent pb-1 font-mono text-micro text-accent lowercase disabled:opacity-40"
        >
          {state.kind === "sending" ? "sending…" : "send report"}
        </button>
        <button
          type="button"
          onClick={() => setState({ kind: "closed" })}
          className="press touch-target font-mono text-micro text-faint lowercase"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
