"use client";

import Link from "next/link";
import { useState } from "react";

import { BallScore } from "@/components/ball/ball-meter";
import { NoteForm } from "@/components/spot/note-form";
import { SpotPlate } from "@/components/spot/spot-plate";
import { AccessTag, CategoryTag } from "@/components/ui/spot-tags";
import { ballRating } from "@/lib/spots/ball";
import { placeLine, type CommunityNote, type Spot } from "@/lib/types/spot";
import { formatDate } from "@/lib/utils/date";

/**
 * One post in the feed: a logged spot, with its field notes as comments.
 *
 * The shape is borrowed from a link aggregator because the content
 * already has that shape — somebody posts a place, other people who went
 * add what they found. What is *not* borrowed is the vote arrows: the
 * ball meter is the score, and it means "was this worth the trip", which
 * is a more useful axis for this than agreement is.
 *
 * Comments are collapsed by default and the whole thread renders on the
 * spot page. Expanding here keeps someone in the feed when they only
 * wanted to skim the top reply, which is most of the time.
 */
export function FeedPost({ spot, index }: { spot: Spot; index: number }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<CommunityNote[]>(spot.notes);

  const ordered = [...notes].sort((a, b) => b.date.localeCompare(a.date));
  const place = placeLine(spot);
  const rating = ballRating(spot.ratingSum, spot.ratingCount);
  const lead = spot.photos[0] ?? { src: null, alt: spot.name };

  return (
    <article className="glass rounded-[var(--radius-xl)] p-[clamp(1rem,0.85rem+0.8vw,1.5rem)]">
      <div className="flex gap-4 sm:gap-5">
        {/* The score rail — where the vote arrows would be. */}
        <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
          <BallScore rating={rating} size="md" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-tiny text-faint">
            <CategoryTag value={spot.category} />
            {place ? <span>{place}</span> : null}
            <span aria-hidden="true">·</span>
            <time dateTime={spot.addedAt}>
              Logged {formatDate(spot.addedAt)}
            </time>
          </div>

          <h2 className="mt-2.5 text-h3 text-ink">
            <Link href={`/spot/${spot.slug}`} className="press">
              {spot.name}
            </Link>
          </h2>

          <div className="mt-2.5 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div className="min-w-0 flex-1">
              <p className="max-w-[62ch] text-small text-muted">
                {spot.summary}
              </p>
              <p className="mt-3 line-clamp-3 max-w-[62ch] text-small text-faint">
                {spot.description}
              </p>
            </div>

            <Link
              href={`/spot/${spot.slug}`}
              className="press block w-full shrink-0 sm:w-[15rem] lg:w-[17rem]"
            >
              <SpotPlate
                photo={lead}
                index={index}
                sizes="(min-width: 640px) 17rem, 100vw"
                className="[&>figcaption]:hidden"
              />
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              className="press touch-target inline-flex items-center gap-2 rounded-[var(--radius-control-sm)] bg-ink/[0.06] px-3.5 py-2 text-tiny font-medium text-ink"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" />
              </svg>
              {ordered.length === 0
                ? "No comments"
                : `${ordered.length} ${ordered.length === 1 ? "comment" : "comments"}`}
            </button>

            <AccessTag value={spot.access} className="ml-1" />

            <Link
              href={`/spot/${spot.slug}`}
              className="press touch-target ml-auto text-tiny font-semibold text-muted hover:text-ink"
            >
              Open entry
            </Link>
          </div>

          {open ? (
            <div className="mt-5 border-t border-[var(--glass-rim)] pt-5">
              {ordered.length > 0 ? (
                <ul className="space-y-3">
                  {ordered.map((note) => (
                    <li
                      key={note.id}
                      className="rounded-[var(--radius-md)] bg-ink/[0.04] p-4"
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="text-tiny font-semibold text-ink">
                          {note.author}
                        </p>
                        <time
                          dateTime={note.date}
                          className="shrink-0 text-tiny text-faint tabular-nums"
                        >
                          {formatDate(note.date)}
                        </time>
                      </div>
                      <p className="mt-2 max-w-[68ch] text-small text-muted">
                        {note.body}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small text-muted">
                  Nobody has been back to say what it was like. If you go, come
                  back and add a note.
                </p>
              )}

              <div className="mt-4">
                <NoteForm
                  slug={spot.slug}
                  onPosted={(note) => setNotes((current) => [note, ...current])}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
