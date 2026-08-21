"use client";

import Image from "next/image";
import { useState } from "react";

import { NoteForm } from "@/components/spot/note-form";
import { ReportControl } from "@/components/spot/report-control";
import type { CommunityNote } from "@/lib/types/spot";
import { formatDate } from "@/lib/utils/date";

/**
 * The notes list and the form that adds to it, together, because they
 * share state.
 *
 * A posted note is appended locally as well as revalidated server-side.
 * The server copy is authoritative and will win on the next load; this
 * exists so the visitor sees their own contribution land instead of
 * staring at an unchanged page and wondering whether it worked. That
 * doubt is what stops someone bothering a second time.
 */
export function SpotNotes({
  slug,
  notes: initial,
}: {
  slug: string;
  notes: CommunityNote[];
}) {
  const [notes, setNotes] = useState(initial);

  const ordered = [...notes].sort((a, b) => b.date.localeCompare(a.date));

  return (
    // The thread and the composer sit side by side once there is room:
    // the composer is a rail, the same width as the facts card above it,
    // so the page has one gutter rather than two competing ones.
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_minmax(0,24rem)]">
      <div>
        {ordered.length === 0 ? (
          <p className="glass rounded-[var(--radius-lg)] p-6 text-small text-muted">
            Nobody has logged a note here yet. If you go, come back and say what
            it was like.
          </p>
        ) : (
          // A thread rather than a table: an avatar column with a hairline
          // running down it, and each note on its own pane beside it.
          <ul className="relative space-y-3">
            <span
              aria-hidden="true"
              className="absolute top-3 bottom-3 left-[1.375rem] hidden w-px bg-gradient-to-b from-rule-strong/25 to-rule-strong/5 sm:block"
            />
            {ordered.map((note) => (
              <li
                key={note.id}
                className="relative grid gap-4 sm:grid-cols-[2.75rem_1fr]"
              >
                <span
                  aria-hidden="true"
                  className="z-1 hidden size-11 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-accent/80 to-accent text-body font-bold text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] sm:flex"
                >
                  {note.author.slice(0, 1).toUpperCase()}
                </span>

                <div className="glass rounded-[var(--radius-lg)] p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-small font-semibold text-ink">
                      {note.author}
                    </p>
                    <time
                      dateTime={note.date}
                      className="shrink-0 text-tiny text-faint tabular-nums"
                    >
                      {formatDate(note.date)}
                    </time>
                  </div>
                  <p className="mt-3 max-w-[60ch] text-small text-muted">
                    {note.body}
                  </p>

                  {note.photos && note.photos.length > 0 ? (
                    <ul className="mt-4 flex flex-wrap gap-3">
                      {note.photos.map((src) => (
                        <li
                          key={src}
                          className="relative aspect-[4/3] w-40 overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-rim)] bg-paper-raised sm:w-56"
                        >
                          <Image
                            src={src}
                            alt={`Photo attached by ${note.author}`}
                            fill
                            sizes="(min-width: 640px) 14rem, 10rem"
                            className="object-cover"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {/* Quiet, and last. A note is somebody's account of going
                  somewhere; the way to disagree with one is to leave your
                  own, and reporting is for the cases where that will not
                  do. Prominence here would invite the opposite. */}
                  <ReportControl
                    endpoint={`/api/notes/${note.id}/report`}
                    label="Report this note"
                    className="mt-4"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NoteForm
        slug={slug}
        onPosted={(note) => setNotes((current) => [note, ...current])}
      />
    </div>
  );
}
