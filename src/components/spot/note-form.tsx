"use client";

import { useState } from "react";

import { TurnstileWidget } from "@/components/security/turnstile-widget";
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
        body: JSON.stringify({ ...result.draft, turnstileToken: token }),
      });
      const payload = await response.json();

      if (!response.ok) {
        if (payload?.errors) setErrors(payload.errors);
        setState({
          kind: "failed",
          message:
            payload?.message ?? "the server rejected that — check the fields.",
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
        message: "couldn't reach the server. try again in a moment.",
      });
    }
  }

  const control =
    "w-full border-b bg-transparent pt-2 pb-2 text-small text-ink outline-none transition-colors duration-200 placeholder:text-faint";

  function rule(error?: string) {
    return error
      ? "border-accent"
      : "border-rule hover:border-muted focus:border-ink";
  }

  return (
    <form onSubmit={submit} noValidate className="mt-10 max-w-[52ch]">
      <p className="label">leave a note</p>
      <p className="mt-3 text-small text-muted">
        went recently? say what it was actually like. access, conditions,
        anything that has changed since the entry was written.
      </p>

      <div className="mt-6">
        <label htmlFor="note-body" className="label block">
          what you found
        </label>
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
          placeholder="the lower gate was chained in march — the fence line still works"
          className={cn(control, rule(errors.body), "resize-y leading-relaxed")}
        />
        {errors.body ? (
          <p
            id="note-body-error"
            role="alert"
            className="mt-1.5 font-mono text-micro text-accent lowercase"
          >
            {errors.body}
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-[var(--gutter)] sm:grid-cols-2">
        <div>
          <label htmlFor="note-author" className="label block">
            name (optional)
          </label>
          <input
            id="note-author"
            type="text"
            value={author}
            maxLength={NOTE_LIMITS.author.max}
            onChange={(event) => setAuthor(event.target.value)}
            aria-invalid={Boolean(errors.author)}
            placeholder={ANONYMOUS}
            className={cn(control, rule(errors.author), "touch-target")}
          />
          {errors.author ? (
            <p
              role="alert"
              className="mt-1.5 font-mono text-micro text-accent lowercase"
            >
              {errors.author}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="note-date" className="label block">
            when you were there
          </label>
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
            className={cn(control, rule(errors.notedOn), "touch-target")}
          />
          {errors.notedOn ? (
            <p
              id="note-date-error"
              role="alert"
              className="mt-1.5 font-mono text-micro text-accent lowercase"
            >
              {errors.notedOn}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <TurnstileWidget onToken={setToken} />
      </div>

      {state.kind === "failed" ? (
        <p
          role="alert"
          className="mt-5 font-mono text-micro text-accent lowercase"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state.kind === "sending"}
        className="tap touch-target mt-7 inline-flex items-center gap-3 border-b border-rule-strong pb-2 font-mono text-tiny tracking-[0.04em] text-ink lowercase disabled:opacity-50"
      >
        {state.kind === "sending" ? "posting…" : "post the note"}
        <span aria-hidden="true">→</span>
      </button>

      <p className="mt-5 font-mono text-micro text-faint lowercase">
        no account. it goes live immediately.
      </p>
    </form>
  );
}
