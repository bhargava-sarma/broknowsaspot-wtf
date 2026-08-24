"use client";

import { useState } from "react";

import { BallMeter } from "@/components/ball/ball-meter";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Button } from "@/components/ui/button";
import {
  BALL_MAX,
  BALL_MIN,
  ballBand,
  type BallRating,
} from "@/lib/spots/ball";
import { cn } from "@/lib/utils/cn";

/**
 * Give a spot a score.
 *
 * Opens as an invitation rather than hiding behind a quiet line, which is
 * the opposite of `ReportControl` and deliberate: a rating is the thing
 * we want people to leave, and a report is the thing we would rather they
 * did not need. Reporting is discreet because prominence turns it into a
 * dare; rating is prominent because the meter is worthless unrated.
 *
 * The eleven buttons are a radio group, not a slider. A slider needs a
 * drag to say anything and cannot be tabbed to a specific value, and on a
 * phone it competes with the page scroll for the same gesture.
 *
 * The server returns the new aggregate, so the meter above updates from
 * the real total rather than from an optimistic guess that a second tab
 * would contradict.
 */

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "failed"; message: string };

export function BallRate({
  slug,
  rating: initial,
}: {
  slug: string;
  rating: BallRating | null;
}) {
  const [rating, setRating] = useState(initial);
  const [picked, setPicked] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });

  const scores = Array.from(
    { length: BALL_MAX - BALL_MIN + 1 },
    (_, i) => BALL_MIN + i,
  );

  // What the label says while you are choosing: the value under the
  // pointer, else the one you picked, else nothing.
  const previewing = hovered ?? picked;

  async function submit() {
    if (picked === null) return;
    setState({ kind: "sending" });

    try {
      const response = await fetch(`/api/spots/${slug}/rate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score: picked, turnstileToken: token }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setState({
          kind: "failed",
          message: payload?.message ?? "Couldn't save that. Try again shortly.",
        });
        return;
      }

      setRating(payload.rating as BallRating | null);
      setState({ kind: "done" });
    } catch {
      setState({
        kind: "failed",
        message: "Couldn't reach the server. Try again in a moment.",
      });
    }
  }

  return (
    <div className="glass rounded-[var(--radius-xl)] p-[clamp(1.25rem,1rem+1.2vw,2rem)]">
      <p className="eyebrow">Ball meter</p>

      <div className="mt-5">
        <BallMeter rating={rating} size="lg" />
      </div>

      <div className="mt-7 border-t border-[var(--glass-rim)] pt-6">
        <p className="eyebrow">
          {state.kind === "done" ? "Your score" : "Does bro know ball?"}
        </p>

        <div
          role="radiogroup"
          aria-label="Ball meter score, 0 to 10"
          className="well mt-3 grid grid-cols-6 gap-1 rounded-[var(--radius-md)] p-1.5"
          onMouseLeave={() => setHovered(null)}
        >
          {scores.map((score) => {
            const active = picked === score;
            return (
              <button
                key={score}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${score} — ${ballBand(score)}`}
                disabled={state.kind === "sending"}
                onMouseEnter={() => setHovered(score)}
                onFocus={() => setHovered(score)}
                onBlur={() => setHovered(null)}
                onClick={() => {
                  setPicked(score);
                  // Re-rating after a save is allowed, so clear the
                  // "done" state rather than leaving a stale receipt.
                  if (state.kind !== "idle") setState({ kind: "idle" });
                }}
                className={cn(
                  "press touch-target rounded-[var(--radius-xs)] py-2 text-small tabular-nums",
                  active
                    ? "bg-ink font-semibold text-paper shadow-[inset_0_1px_0_var(--glass-specular)]"
                    : "font-medium text-muted hover:bg-ink/[0.07] hover:text-ink",
                )}
              >
                {score}
              </button>
            );
          })}
        </div>

        <p
          className={cn(
            "mt-3 text-small",
            previewing === null ? "text-faint" : "font-semibold text-ink",
          )}
        >
          {previewing === null
            ? "0 is bro needs to touch grass. 10 is bro knows ball."
            : ballBand(previewing)}
        </p>

        {picked !== null ? (
          <div className="mt-5">
            <TurnstileWidget onToken={setToken} />
          </div>
        ) : null}

        {state.kind === "failed" ? (
          <p role="alert" className="mt-4 text-tiny font-medium text-accent">
            {state.message}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Button
            tone="ember"
            size="sm"
            onClick={submit}
            disabled={picked === null || state.kind === "sending"}
          >
            {state.kind === "sending" ? "Saving…" : "Rate it"}
          </Button>
          {state.kind === "done" ? (
            <p className="text-tiny text-faint">
              Saved. Pick another number to change it.
            </p>
          ) : (
            <p className="text-tiny text-faint">
              One score each. You can change yours later.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
