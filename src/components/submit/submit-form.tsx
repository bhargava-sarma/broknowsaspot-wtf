"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";

import { MapPlaceholder } from "@/components/map/map-placeholder";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { ChoiceField, TextField } from "@/components/ui/field";
import { useMounted } from "@/lib/hooks/use-mounted";
import { type FieldErrors, validateDraft } from "@/lib/spots/validate";
import {
  ACCESS_LABELS,
  ACCESS_TYPES,
  CATEGORIES,
  CATEGORY_LABELS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Access,
  type Category,
  type Difficulty,
} from "@/lib/types/spot";

const LocationPicker = dynamic(
  () => import("@/components/map/location-picker"),
  { ssr: false, loading: () => <MapPlaceholder /> },
);

type FormState = {
  name: string;
  region: string;
  country: string;
  summary: string;
  description: string;
  watchOut: string;
  category: Category | null;
  difficulty: Difficulty | null;
  access: Access | null;
  lat: number | null;
  lng: number | null;
};

const EMPTY: FormState = {
  name: "",
  region: "",
  country: "",
  summary: "",
  description: "",
  watchOut: "",
  category: null,
  difficulty: null,
  access: null,
  lat: null,
  lng: null,
};

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent"; name: string; url: string }
  | { kind: "failed"; message: string };

export function SubmitForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Keeps the hydration render identical to the prerendered HTML; see
  // useMounted for why this is needed.
  const mounted = useMounted();

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
      // Clear a field's error the moment it's edited; re-validated on submit.
      setErrors((current) => {
        if (!(key in current)) return current;
        const next = { ...current };
        delete next[key as keyof FieldErrors];
        return next;
      });
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      // Same validator the API route runs. This copy is for fast inline
      // feedback only — the server re-runs it and is the enforcement point.
      const result = validateDraft(form);

      if (!result.ok) {
        setErrors(result.errors);
        setStatus({ kind: "idle" });
        // Move focus to the problem rather than leaving it at the button.
        const first = document.querySelector<HTMLElement>(
          "[aria-invalid=true]",
        );
        first?.focus();
        first?.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }

      setErrors({});
      setStatus({ kind: "submitting" });

      try {
        const response = await fetch("/api/spots", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...result.draft, turnstileToken }),
        });
        const payload = await response.json();

        if (!response.ok) {
          // 422 carries per-field errors; everything else is a single
          // message about the request rather than about the content.
          if (payload?.errors) setErrors(payload.errors);
          setStatus({
            kind: "failed",
            message:
              payload?.message ??
              "the server rejected that — see the fields above.",
          });
          return;
        }

        setStatus({
          kind: "sent",
          name: result.draft.name,
          url: payload.url ?? "/explore",
        });
        setForm(EMPTY);
      } catch {
        setStatus({
          kind: "failed",
          message: "couldn't reach the server. try again in a moment.",
        });
      }
    },
    [form, turnstileToken],
  );

  if (status.kind === "sent") {
    return (
      <section className="shell grid-swiss py-[clamp(3rem,2rem+5vw,7rem)]">
        <div className="col-span-12 lg:col-span-7">
          <p className="label flex items-center gap-3">
            <span className="text-accent">{"///"}</span>
            received
          </p>
          <h2 className="mt-6 text-h2 font-light text-ink lowercase">
            {status.name} is on the map
          </h2>
          <p className="mt-5 max-w-[46ch] text-body text-muted">
            it&rsquo;s live now — no queue, no moderation wait. if it turns out
            to be wrong or unsafe, anyone can report it and enough reports take
            it down again.
          </p>
          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            <Link
              href={status.url}
              className="press touch-target inline-flex items-center gap-3 border-b border-accent pb-2 font-mono text-tiny tracking-[0.04em] text-accent lowercase"
            >
              see the entry
              <span aria-hidden="true">→</span>
            </Link>
            <button
              type="button"
              onClick={() => setStatus({ kind: "idle" })}
              className="press touch-target inline-flex items-center gap-3 border-b border-rule-strong pb-2 font-mono text-tiny tracking-[0.04em] text-ink lowercase"
            >
              add another
              <span aria-hidden="true">→</span>
            </button>
            <Link
              href="/explore"
              className="press touch-target inline-flex items-center gap-3 border-b border-rule pb-2 font-mono text-tiny tracking-[0.04em] text-muted lowercase"
            >
              back to the map
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="shell py-[clamp(2rem,1.4rem+3vw,4rem)]"
    >
      <div className="grid gap-x-[var(--gutter)] gap-y-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] lg:grid-cols-12">
        {/* ------------------------------------------------ what it is */}
        <div className="lg:col-span-3">
          <p className="label">what it is</p>
        </div>
        <div className="grid gap-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] sm:grid-cols-2 lg:col-span-8">
          <TextField
            label="name"
            value={form.name}
            onChange={(v) => set("name", v)}
            error={errors.name}
            placeholder="what people call it"
            maxLength={80}
            className="sm:col-span-2"
          />
          <TextField
            label="region"
            value={form.region}
            onChange={(v) => set("region", v)}
            error={errors.region}
            placeholder="county, state, province"
            maxLength={60}
          />
          <TextField
            label="country"
            value={form.country}
            onChange={(v) => set("country", v)}
            error={errors.country}
            maxLength={60}
          />
          <TextField
            label="summary"
            value={form.summary}
            onChange={(v) => set("summary", v)}
            error={errors.summary}
            hint="one line. what makes it worth the detour."
            maxLength={140}
            className="sm:col-span-2"
          />
        </div>

        <div className="lg:col-span-12">
          <hr className="border-0 border-t border-rule" />
        </div>

        {/* --------------------------------------------------- tagging */}
        <div className="lg:col-span-3">
          <p className="label">tagging</p>
          <p className="mt-3 max-w-[30ch] text-small text-muted">
            be honest about difficulty and access. someone is going to drive
            four hours on this.
          </p>
        </div>
        <div className="grid gap-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] lg:col-span-8">
          <ChoiceField
            label="category"
            options={CATEGORIES}
            labels={CATEGORY_LABELS}
            value={form.category}
            onChange={(v) => set("category", v)}
            error={errors.category}
          />
          <ChoiceField
            label="difficulty"
            options={DIFFICULTIES}
            labels={DIFFICULTY_LABELS}
            value={form.difficulty}
            onChange={(v) => set("difficulty", v)}
            error={errors.difficulty}
          />
          <ChoiceField
            label="access type"
            options={ACCESS_TYPES}
            labels={ACCESS_LABELS}
            value={form.access}
            onChange={(v) => set("access", v)}
            error={errors.access}
          />
        </div>

        <div className="lg:col-span-12">
          <hr className="border-0 border-t border-rule" />
        </div>

        {/* -------------------------------------------------- location */}
        <div className="lg:col-span-3">
          <p className="label">location</p>
          <p className="mt-3 max-w-[30ch] text-small text-muted">
            tap the map, or type coordinates. the pin is what gets logged.
          </p>
        </div>
        <div className="lg:col-span-8">
          <div className="h-[46vh] min-h-[280px] border border-rule">
            {mounted ? (
              <LocationPicker
                lat={form.lat}
                lng={form.lng}
                onPick={(lat, lng) => {
                  set("lat", lat);
                  set("lng", lng);
                }}
              />
            ) : (
              <MapPlaceholder />
            )}
          </div>

          <div className="mt-5 grid gap-[var(--gutter)] sm:grid-cols-2">
            <TextField
              label="latitude"
              inputMode="decimal"
              value={form.lat === null ? "" : String(form.lat)}
              onChange={(v) => set("lat", v === "" ? null : Number(v))}
              error={errors.lat}
              placeholder="-90 to 90"
            />
            <TextField
              label="longitude"
              inputMode="decimal"
              value={form.lng === null ? "" : String(form.lng)}
              onChange={(v) => set("lng", v === "" ? null : Number(v))}
              error={errors.lng}
              placeholder="-180 to 180"
            />
          </div>
        </div>

        <div className="lg:col-span-12">
          <hr className="border-0 border-t border-rule" />
        </div>

        {/* ------------------------------------------------- the intel */}
        <div className="lg:col-span-3">
          <p className="label">the intel</p>
        </div>
        <div className="grid gap-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] lg:col-span-8">
          <TextField
            label="description"
            multiline
            rows={8}
            value={form.description}
            onChange={(v) => set("description", v)}
            error={errors.description}
            hint="how to get there, what it's actually like, what it isn't."
            maxLength={4000}
          />
          <TextField
            label="watch out"
            multiline
            rows={3}
            value={form.watchOut}
            onChange={(v) => set("watchOut", v)}
            error={errors.watchOut}
            hint="the thing that will catch someone out. tides, loose rock, dogs."
            maxLength={500}
          />
        </div>

        {/* ---------------------------------------------------- submit */}
        <div className="lg:col-span-3" />
        <div className="lg:col-span-8">
          <div className="mb-6">
            <TurnstileWidget onToken={setTurnstileToken} />
          </div>

          {status.kind === "failed" ? (
            <p
              role="alert"
              className="mb-6 font-mono text-micro text-accent lowercase"
            >
              {status.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status.kind === "submitting"}
            className="press touch-target inline-flex items-center gap-3 border-b border-rule-strong pb-2 font-mono text-tiny tracking-[0.04em] text-ink lowercase disabled:opacity-50"
          >
            {status.kind === "submitting" ? "sending…" : "submit the spot"}
            <span aria-hidden="true">→</span>
          </button>

          <p className="mt-5 max-w-[46ch] font-mono text-micro text-faint lowercase">
            no account, no email. it goes live immediately — and anyone can
            report it, so please be accurate about access and difficulty.
          </p>
        </div>
      </div>
    </form>
  );
}
