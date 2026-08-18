"use client";

import { useState } from "react";

import { NoteForm } from "@/components/spot/note-form";
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
    <>
      {ordered.length === 0 ? (
        <p className="text-small text-muted">
          nobody has logged a note here yet. if you go, come back and say what
          it was like.
        </p>
      ) : (
        <ul className="border-t border-rule">
          {ordered.map((note) => (
            <li key={note.id} className="border-b border-rule py-5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-mono text-micro text-ink lowercase">
                  {note.author}
                </p>
                <time
                  dateTime={note.date}
                  className="shrink-0 font-mono text-micro text-faint lowercase tabular-nums"
                >
                  {formatDate(note.date)}
                </time>
              </div>
              <p className="mt-3 max-w-[60ch] text-small text-muted">
                {note.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <NoteForm
        slug={slug}
        onPosted={(note) => setNotes((current) => [note, ...current])}
      />
    </>
  );
}
