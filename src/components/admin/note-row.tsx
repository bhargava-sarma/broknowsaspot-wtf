"use client";

import { useActionState, useState } from "react";

import { IDLE } from "@/lib/admin/action-state";
import { moderateNoteAction } from "@/lib/admin/actions";
import { ReportBreakdown } from "@/components/admin/report-breakdown";
import type { NoteEntry } from "@/lib/admin/queue";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

/**
 * One community note in the review queue, with its controls attached.
 *
 * Same single-form idiom as the spot rows: the submit button's own
 * name/value says which verb was pressed, so one reason field serves both
 * and the whole thing still works with JavaScript off.
 */
export function NoteRow({ entry }: { entry: NoteEntry }) {
  const [state, formAction, pending] = useActionState(moderateNoteAction, IDLE);
  const [reason, setReason] = useState("");

  return (
    <li className="glass rounded-[var(--radius-lg)]">
      <div className="grid gap-x-6 gap-y-5 p-[clamp(1.25rem,1rem+1vw,1.75rem)] lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span
              className={cn(
                "inline-flex items-center rounded-[var(--radius-xs)] px-2.5 py-1 text-[0.6875rem] font-semibold tracking-[0.14em] uppercase",
                entry.hidden
                  ? "bg-accent/15 text-accent"
                  : "bg-ink/[0.07] text-muted",
              )}
            >
              {entry.hidden ? "Hidden" : "Live"}
            </span>
            <span className="text-small font-semibold text-ink">
              {entry.author}
            </span>
            <span className="text-tiny text-faint">
              on{" "}
              <a href={`/spot/${entry.spotSlug}`} className="press text-muted">
                {entry.spotName}
              </a>
              {" · visited "}
              {formatDate(entry.notedOn)}
            </span>
          </div>

          <p className="mt-3 max-w-[68ch] text-small text-muted">
            {entry.body}
          </p>

          {entry.reports.length > 0 ? (
            <ReportBreakdown reports={entry.reports} />
          ) : null}
        </div>

        <div className="lg:col-span-4">
          <form action={formAction}>
            <input type="hidden" name="noteId" value={entry.id} />
            <input type="hidden" name="slug" value={entry.spotSlug} />

            <label
              htmlFor={`note-reason-${entry.id}`}
              className="eyebrow block"
            >
              Note
            </label>
            <div className="well mt-2.5 rounded-[var(--radius-md)] px-4 py-3">
              <input
                id={`note-reason-${entry.id}`}
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
              <Button
                type="submit"
                name="action"
                value={entry.hidden ? "restore" : "hide"}
                disabled={pending}
                tone={entry.hidden ? "glass" : "ember"}
                size="sm"
              >
                {entry.hidden ? "Restore" : "Hide"}
              </Button>
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
