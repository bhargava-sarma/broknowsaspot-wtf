"use client";

import { useActionState, useState } from "react";

import { IDLE } from "@/lib/admin/action-state";
import { moderateNoteAction } from "@/lib/admin/actions";
import type { NoteEntry } from "@/lib/admin/queue";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

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
    <li className="rule-b">
      <div className="shell grid-swiss py-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)]">
        <div className="col-span-12 lg:col-span-8">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span
              className={cn(
                "font-mono text-micro tracking-[0.13em] lowercase",
                entry.hidden ? "text-accent" : "text-faint",
              )}
            >
              {entry.hidden ? "hidden" : "live"}
            </span>
            <span className="font-mono text-micro text-ink lowercase">
              {entry.author}
            </span>
            <span className="font-mono text-micro text-faint lowercase">
              on{" "}
              <a href={`/spot/${entry.spotSlug}`} className="tap">
                {entry.spotName}
              </a>
              {" · visited "}
              {formatDate(entry.notedOn)}
            </span>
          </div>

          <p className="mt-3 max-w-[68ch] text-small text-muted">
            {entry.body}
          </p>
        </div>

        <div className="col-span-12 mt-5 lg:col-span-4 lg:mt-0">
          <form action={formAction}>
            <input type="hidden" name="noteId" value={entry.id} />
            <input type="hidden" name="slug" value={entry.spotSlug} />

            <label htmlFor={`note-reason-${entry.id}`} className="label block">
              note
            </label>
            <input
              id={`note-reason-${entry.id}`}
              name="reason"
              type="text"
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="why — goes in the record"
              className="touch-target w-full border-b border-rule bg-transparent pt-2 pb-2 text-body text-ink transition-colors duration-200 outline-none placeholder:text-faint hover:border-muted focus:border-ink"
            />

            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
              <button
                type="submit"
                name="action"
                value={entry.hidden ? "restore" : "hide"}
                disabled={pending}
                className={cn(
                  "press touch-target border-b pb-1 font-mono text-tiny tracking-[0.04em] lowercase disabled:opacity-50",
                  entry.hidden
                    ? "border-rule-strong text-ink"
                    : "border-accent text-accent",
                )}
              >
                {entry.hidden ? "restore" : "hide"}
              </button>
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
