"use client";

import { useActionState, useState } from "react";

import { IDLE } from "@/lib/admin/action-state";
import { moderateAction } from "@/lib/admin/actions";
import type { QueueEntry } from "@/lib/admin/queue";
import { REPORT_REASON_LABELS } from "@/lib/spots/reports";
import { formatDate, formatTimestamp } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/**
 * One entry in the queue, with its controls attached.
 *
 * A single form serves all three verbs — the submit button's own
 * name/value says which one was pressed. That keeps one reason field
 * shared between them and means the row still works with JavaScript
 * off, which for a moderation tool is not a nicety: the one time you
 * need it is the time something else is broken.
 */

const STATE_COPY: Record<QueueEntry["state"], string> = {
  visible: "live",
  hidden: "hidden",
  removed: "removed",
};

/** Which verbs make sense from here. Restoring a live spot is a no-op. */
const AVAILABLE: Record<
  QueueEntry["state"],
  Array<"hide" | "restore" | "remove">
> = {
  visible: ["hide", "remove"],
  hidden: ["restore", "remove"],
  removed: ["restore"],
};

export function ModerationRow({ entry }: { entry: QueueEntry }) {
  const [state, formAction, pending] = useActionState(moderateAction, IDLE);
  const [reason, setReason] = useState("");

  const reported = entry.reportCount > 0;

  return (
    <li className="rule-b">
      <div className="shell grid-swiss py-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)]">
        {/* --------------------------------------------- what it is */}
        <div className="col-span-12 lg:col-span-5">
          <div className="flex items-baseline gap-3">
            <span
              className={cn(
                "font-mono text-micro tracking-[0.13em] lowercase",
                entry.state === "visible" ? "text-faint" : "text-accent",
              )}
            >
              {STATE_COPY[entry.state]}
            </span>
            {entry.autoHidden ? (
              <span className="font-mono text-micro tracking-[0.13em] text-faint lowercase">
                automatic
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 text-h3 font-light text-ink lowercase">
            <a href={`/spot/${entry.slug}`} className="tap">
              {entry.name}
            </a>
          </h3>

          <p className="mt-1 font-mono text-micro text-faint lowercase">
            {entry.region}, {entry.country} · logged {formatDate(entry.addedAt)}
          </p>

          {entry.hiddenReason ? (
            <p className="mt-3 max-w-[42ch] text-small text-muted">
              {entry.hiddenReason}
            </p>
          ) : null}
        </div>

        {/* ------------------------------------------------- reports */}
        <div className="col-span-12 mt-5 lg:col-span-3 lg:mt-0">
          <p className="label">reports</p>
          <p
            className={cn(
              "mt-2 font-mono text-lead",
              reported ? "text-accent" : "text-faint",
            )}
          >
            {entry.reportCount}
          </p>

          {reported ? (
            <>
              <ul className="mt-3 space-y-1">
                {entry.reasons.map((code) => (
                  <li
                    key={code}
                    className="max-w-[34ch] text-small leading-snug text-muted"
                  >
                    {REPORT_REASON_LABELS[code] ?? code}
                  </li>
                ))}
              </ul>
              {entry.lastReportAt ? (
                <p className="mt-3 font-mono text-micro text-faint lowercase">
                  last {formatTimestamp(entry.lastReportAt)}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        {/* -------------------------------------------------- verbs */}
        <div className="col-span-12 mt-6 lg:col-span-4 lg:mt-0">
          <form action={formAction}>
            <input type="hidden" name="slug" value={entry.slug} />

            <label htmlFor={`reason-${entry.slug}`} className="label block">
              note
            </label>
            <input
              id={`reason-${entry.slug}`}
              name="reason"
              type="text"
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="why — goes in the record"
              className="touch-target w-full border-b border-rule bg-transparent pt-2 pb-2 text-body text-ink transition-colors duration-200 outline-none placeholder:text-faint hover:border-muted focus:border-ink"
            />

            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
              {AVAILABLE[entry.state].map((verb) => (
                <button
                  key={verb}
                  type="submit"
                  name="action"
                  value={verb}
                  disabled={pending}
                  className={cn(
                    "tap touch-target border-b pb-1 font-mono text-tiny tracking-[0.04em] lowercase disabled:opacity-50",
                    verb === "restore"
                      ? "border-rule-strong text-ink"
                      : "border-accent text-accent",
                  )}
                >
                  {verb}
                </button>
              ))}
            </div>

            {state.status !== "idle" ? (
              <p
                role="status"
                className={cn(
                  "mt-4 font-mono text-micro lowercase",
                  state.status === "ok" ? "text-faint" : "text-accent",
                )}
              >
                {state.message}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </li>
  );
}
