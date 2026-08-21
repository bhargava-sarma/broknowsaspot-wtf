"use client";

import { useState } from "react";

import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Button } from "@/components/ui/button";
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
  label = "Report this entry",
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
          message: payload?.message ?? "Couldn't log that. Try again shortly.",
        });
        return;
      }
      setState({ kind: "done" });
    } catch {
      setState({
        kind: "failed",
        message: "Couldn't reach the server. Try again in a moment.",
      });
    }
  }

  if (state.kind === "done") {
    return (
      <p className="text-tiny text-muted">
        Report logged. Thanks — someone will look at it.
      </p>
    );
  }

  if (state.kind === "closed") {
    return (
      <button
        type="button"
        onClick={() => setState({ kind: "open" })}
        className={cn(
          "press touch-target text-tiny text-faint hover:text-muted",
          className,
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "glass w-full max-w-[46ch] rounded-[var(--radius-lg)] p-5",
        className,
      )}
    >
      <p className="eyebrow">Why are you reporting it?</p>

      <div role="radiogroup" className="mt-3.5 flex flex-col gap-1">
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
                "press touch-target flex items-center gap-2.5 rounded-[var(--radius-xs)] px-2.5 py-2 text-left text-tiny transition-colors duration-[var(--dur-ui)]",
                active
                  ? "bg-ink/[0.08] font-semibold text-ink"
                  : "font-medium text-muted hover:bg-ink/[0.05] hover:text-ink",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block size-2 shrink-0 rounded-full",
                  active ? "bg-accent" : "bg-ink/20",
                )}
              />
              {REPORT_REASON_LABELS[value]}
            </button>
          );
        })}
      </div>

      <label className="eyebrow mt-5 block" htmlFor="report-detail">
        Anything else (optional)
      </label>
      <div className="well mt-2.5 rounded-[var(--radius-md)] px-3.5 py-2.5">
        <textarea
          id="report-detail"
          value={detail}
          rows={2}
          maxLength={500}
          onChange={(event) => setDetail(event.target.value)}
          className="w-full resize-y bg-transparent text-small text-ink outline-none"
        />
      </div>

      <div className="mt-5">
        <TurnstileWidget onToken={setToken} />
      </div>

      {state.kind === "failed" ? (
        <p role="alert" className="mt-4 text-tiny text-accent">
          {state.message}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          tone="ember"
          size="sm"
          onClick={submit}
          disabled={!reason || state.kind === "sending"}
        >
          {state.kind === "sending" ? "Sending…" : "Send report"}
        </Button>
        <Button
          tone="quiet"
          size="sm"
          onClick={() => setState({ kind: "closed" })}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
