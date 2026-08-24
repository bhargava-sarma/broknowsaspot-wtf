"use client";

import { useActionState, useState } from "react";

import { IDLE } from "@/lib/admin/action-state";
import { moderateAction } from "@/lib/admin/actions";
import type { QueueEntry } from "@/lib/admin/queue";
import { ReportBreakdown } from "@/components/admin/report-breakdown";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { placeLine } from "@/lib/types/spot";

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
  visible: "Live",
  hidden: "Hidden",
  removed: "Removed",
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
    <li className="glass rounded-[var(--radius-lg)]">
      <div className="grid gap-x-6 gap-y-5 p-[clamp(1.25rem,1rem+1vw,1.75rem)] lg:grid-cols-12">
        {/* --------------------------------------------- what it is */}
        <div className="lg:col-span-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-[var(--radius-xs)] px-2.5 py-1 text-[0.6875rem] font-semibold tracking-[0.14em] uppercase",
                entry.state === "visible"
                  ? "bg-ink/[0.07] text-muted"
                  : "bg-accent/15 text-accent",
              )}
            >
              {STATE_COPY[entry.state]}
            </span>
            {entry.autoHidden ? (
              <span className="rounded-[var(--radius-xs)] bg-ink/[0.07] px-2.5 py-1 text-[0.6875rem] font-semibold tracking-[0.14em] text-faint uppercase">
                Automatic
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-h3 text-ink">
            <a href={`/spot/${entry.slug}`} className="press">
              {entry.name}
            </a>
          </h3>

          <p className="mt-1.5 text-tiny text-faint">
            {[placeLine(entry), `logged ${formatDate(entry.addedAt)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {entry.hiddenReason ? (
            <p className="mt-3 max-w-[42ch] text-small text-muted">
              {entry.hiddenReason}
            </p>
          ) : null}
        </div>

        {/* ------------------------------------------------- reports */}
        <div className="lg:col-span-3">
          <p className="eyebrow">Reports</p>
          <p
            className={cn(
              "mt-2 font-[family-name:var(--font-display)] text-h3 tabular-nums",
              reported ? "text-accent" : "text-faint",
            )}
          >
            {entry.reportCount}
          </p>

          {reported ? <ReportBreakdown reports={entry.reports} /> : null}
        </div>

        {/* -------------------------------------------------- verbs */}
        <div className="lg:col-span-4">
          <form action={formAction}>
            <input type="hidden" name="slug" value={entry.slug} />

            <label htmlFor={`reason-${entry.slug}`} className="eyebrow block">
              Note
            </label>
            <div className="well mt-2.5 rounded-[var(--radius-md)] px-4 py-3">
              <input
                id={`reason-${entry.slug}`}
                name="reason"
                type="text"
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why — goes in the record"
                className="block h-6 w-full bg-transparent text-small text-ink outline-none placeholder:text-faint"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {AVAILABLE[entry.state].map((verb) => (
                <Button
                  key={verb}
                  type="submit"
                  name="action"
                  value={verb}
                  disabled={pending}
                  tone={verb === "restore" ? "glass" : "ember"}
                  size="sm"
                  className="capitalize"
                >
                  {verb}
                </Button>
              ))}
            </div>

            {state.status !== "idle" ? (
              <p
                role="status"
                className={cn(
                  "mt-4 text-tiny",
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
