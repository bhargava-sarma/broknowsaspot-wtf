"use client";

import { useState } from "react";

import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { ArrowRight, Button } from "@/components/ui/button";
import { PhotoField, type AttachedPhoto } from "@/components/ui/photo-field";
import {
  ANONYMOUS,
  NOTE_LIMITS,
  today,
  validateNote,
  type NoteFieldErrors,
} from "@/lib/spots/validate-note";
import type { CommunityNote } from "@/lib/types/spot";
import { cn } from "@/lib/utils/cn";

/**
 * Leaving a field note.
 *
 * Unlike the report control this opens as an invitation rather than
 * hiding behind a quiet line — a note is the thing we want people to
 * leave, and the whole index decays without them.
 *
 * A posted note is pushed into local state as well as revalidated on the
 * server. The server copy is authoritative, but ISR means the page the
 * visitor is looking at may not show their own note for a moment, and
 * "did that work?" is exactly the doubt that stops someone bothering
 * again.
 */

type State =
  { kind: "idle" } | { kind: "sending" } | { kind: "failed"; message: string };

export function NoteForm({
  slug,
  onPosted,
}: {
  slug: string;
  onPosted: (note: CommunityNote) => void;
}) {
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [notedOn, setNotedOn] = useState(today);
  const [errors, setErrors] = useState<NoteFieldErrors>({});
  const [state, setState] = useState<State>({ kind: "idle" });
  const [token, setToken] = useState<string | null>(null);
  const [photos, setPhotos] = useState<AttachedPhoto[]>([]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    // Same validator the route runs. This copy is for fast inline
    // feedback; the route re-runs it and is the enforcement point.
    const result = validateNote({ author, body, notedOn });
    if (!result.ok) {
      setErrors(result.errors);
      setState({ kind: "idle" });
      return;
    }

    setErrors({});
    setState({ kind: "sending" });

    try {
      const response = await fetch(`/api/spots/${slug}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...result.draft,
          turnstileToken: token,
          photoIds: photos
            .filter((photo) => photo.status === "ready" && photo.id)
            .map((photo) => photo.id),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        if (payload?.errors) setErrors(payload.errors);
        setState({
          kind: "failed",
          message:
            payload?.message ?? "The server rejected that. Check the fields.",
        });
        return;
      }

      onPosted(payload.note as CommunityNote);
      setAuthor("");
      setBody("");
      setNotedOn(today());
      setState({ kind: "idle" });
    } catch {
      setState({
        kind: "failed",
        message: "Couldn't reach the server. Try again in a moment.",
      });
    }
  }

  // Same recess as the shared TextField; this form pre-dates it and
  // carries its own state and validation, so it reuses the classes
  // rather than the component.
  const control =
    "w-full bg-transparent text-small text-ink outline-none placeholder:text-faint";
  const well = "well mt-2.5 rounded-[var(--radius-md)] px-4 py-3";

  return (
    <form
      onSubmit={submit}
      noValidate
      className="glass rounded-[var(--radius-xl)] p-[clamp(1.25rem,1rem+1.2vw,2rem)] lg:sticky lg:top-[calc(var(--bar-h)+1.5rem)]"
    >
      <p className="eyebrow">Been recently?</p>
      <h3 className="mt-3 text-h3 text-ink">Leave a note</h3>
      <p className="mt-3 text-small text-muted">
        Say what it was actually like. Access, conditions, anything that has
        changed since the entry was written.
      </p>

      <div className="mt-6">
        <label htmlFor="note-body" className="eyebrow block">
          What you found
        </label>
        <div className={cn(well, errors.body && "border-accent")}>
          <textarea
            id="note-body"
            value={body}
            rows={4}
            maxLength={NOTE_LIMITS.body.max}
            onChange={(event) => {
              setBody(event.target.value);
              setErrors((current) => ({ ...current, body: undefined }));
            }}
            aria-invalid={Boolean(errors.body)}
            aria-describedby={errors.body ? "note-body-error" : undefined}
            placeholder="The lower gate was chained in March, but the fence line still works"
            className={cn(control, "resize-y leading-relaxed")}
          />
        </div>
        {errors.body ? (
          <p
            id="note-body-error"
            role="alert"
            className="mt-2 text-tiny font-medium text-accent"
          >
            {errors.body}
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-[var(--gutter)] sm:grid-cols-2">
        <div>
          <label htmlFor="note-author" className="eyebrow block">
            Name (optional)
          </label>
          <div className={cn(well, errors.author && "border-accent")}>
            <input
              id="note-author"
              type="text"
              value={author}
              maxLength={NOTE_LIMITS.author.max}
              onChange={(event) => setAuthor(event.target.value)}
              aria-invalid={Boolean(errors.author)}
              placeholder={ANONYMOUS}
              className={cn(control, "block h-6")}
            />
          </div>
          {errors.author ? (
            <p role="alert" className="mt-2 text-tiny font-medium text-accent">
              {errors.author}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="note-date" className="eyebrow block">
            When you were there
          </label>
          <div className={cn(well, errors.notedOn && "border-accent")}>
            <input
              id="note-date"
              type="date"
              value={notedOn}
              max={today()}
              onChange={(event) => {
                setNotedOn(event.target.value);
                setErrors((current) => ({ ...current, notedOn: undefined }));
              }}
              aria-invalid={Boolean(errors.notedOn)}
              aria-describedby={errors.notedOn ? "note-date-error" : undefined}
              className={cn(control, "block h-6")}
            />
          </div>
          {errors.notedOn ? (
            <p
              id="note-date-error"
              role="alert"
              className="mt-2 text-tiny font-medium text-accent"
            >
              {errors.notedOn}
            </p>
          ) : null}
        </div>
      </div>

      <PhotoField
        className="mt-7"
        label="Photos (optional)"
        max={2}
        photos={photos}
        onChange={setPhotos}
        turnstileToken={token ?? undefined}
        hint="What it looks like now. Location, timestamp and camera details are stripped in your browser before anything is uploaded."
      />

      <div className="mt-6">
        <TurnstileWidget onToken={setToken} />
      </div>

      {state.kind === "failed" ? (
        <p role="alert" className="mt-5 text-tiny font-medium text-accent">
          {state.message}
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <Button type="submit" tone="ember" disabled={state.kind === "sending"}>
          {state.kind === "sending" ? "Posting…" : "Post the note"}
          <ArrowRight />
        </Button>
        <p className="text-tiny text-faint">
          No account. It goes live immediately.
        </p>
      </div>
    </form>
  );
}
