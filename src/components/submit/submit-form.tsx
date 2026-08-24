"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import { MapPlaceholder } from "@/components/map/map-placeholder";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { ArrowRight, Button, ButtonLink } from "@/components/ui/button";
import { ChoiceField, TextField } from "@/components/ui/field";
import { LocateButton } from "@/components/ui/locate-button";
import { PhotoField, type AttachedPhoto } from "@/components/ui/photo-field";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
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

/**
 * The four promises the submission path actually keeps, stated where
 * someone is deciding whether to make one. Each line corresponds to a
 * real property of the code — see `lib/security/request-key.ts` for the
 * salted hash and `lib/photos/prepare.ts` for the canvas re-encode.
 */
const PRIVACY = [
  "No account, no email, no name.",
  "Your IP address is never stored — only a salted hash, used for rate limiting.",
  "Photo GPS, timestamps and camera data are removed in your browser.",
  "Your location is read only when you press the button, and never saved.",
];

/** Every section of the form is the same pane. */
const PANEL =
  "glass rounded-[var(--radius-xl)] p-[clamp(1.25rem,1rem+1.4vw,2.25rem)]";
const PANEL_TITLE = "text-h3 text-ink";

export function SubmitForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [photos, setPhotos] = useState<AttachedPhoto[]>([]);
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

  // Where the map should fly to, if anywhere. The nonce means pressing
  // the button again after panning away brings the view back.
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    at: number;
  } | null>(null);

  // Moves the pin, and nothing else. The coordinate is not transmitted
  // here — it goes out with the rest of the form, when submitted.
  const geo = useGeolocation({
    onFound: (lat, lng) => {
      const rounded = {
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
      };
      set("lat", rounded.lat);
      set("lng", rounded.lng);
      setFocus({ ...rounded, at: Date.now() });
    },
  });

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
          body: JSON.stringify({
            ...result.draft,
            turnstileToken,
            // Only the ones that finished uploading. A photo still in
            // flight, or one that failed, is simply not attached rather
            // than blocking the submission it belongs to.
            photoIds: photos
              .filter((photo) => photo.status === "ready" && photo.id)
              .map((photo) => photo.id),
          }),
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
    [form, turnstileToken, photos],
  );

  if (status.kind === "sent") {
    return (
      <section className="shell py-[clamp(2.5rem,1.8rem+3vw,5rem)]">
        <div className="glass sheen mx-auto max-w-[46rem] rounded-[var(--radius-2xl)] px-[clamp(1.5rem,1rem+3vw,4rem)] py-[clamp(2.5rem,1.6rem+4vw,4.5rem)] text-center">
          <span
            aria-hidden="true"
            className="mx-auto flex size-14 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-accent/70 to-accent text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_16px_36px_-14px_var(--color-accent)]"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12.5l5.5 5.5L20 7" />
            </svg>
          </span>
          <h2 className="mt-7 text-h2 text-ink">{status.name} is on the map</h2>
          <p className="mx-auto mt-5 max-w-[48ch] text-body text-muted">
            It&rsquo;s live now — no queue, no moderation wait. If it turns out
            to be wrong or unsafe, anyone can report it and enough reports take
            it down again.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href={status.url} tone="ember">
              See the entry
              <ArrowRight />
            </ButtonLink>
            <Button onClick={() => setStatus({ kind: "idle" })}>
              Add another
            </Button>
            <ButtonLink href="/explore" tone="quiet">
              Back to the map
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="shell pb-[clamp(2rem,1.4rem+3vw,4rem)]"
    >
      {/* A rail beside the panels, not under them: full-bleed text fields
          on a wide screen run to about 160 characters, which is roughly
          twice a readable measure. The rail spends that width on
          something worth reading instead. */}
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_minmax(0,21rem)]">
        <div className="grid gap-4">
          {/* ------------------------------------------------ what it is */}
          <section className={PANEL}>
            <h2 className={PANEL_TITLE}>What is it</h2>
            <div className="mt-6 grid gap-[clamp(1.25rem,1rem+1vw,1.75rem)]">
              <TextField
                label="Name"
                value={form.name}
                onChange={(v) => set("name", v)}
                error={errors.name}
                placeholder="What people call it"
                maxLength={80}
              />
              <TextField
                label="Summary"
                value={form.summary}
                onChange={(v) => set("summary", v)}
                error={errors.summary}
                hint="One line. What makes it worth the detour."
                maxLength={140}
              />
            </div>
          </section>

          {/* --------------------------------------------------- tagging */}
          <section className={PANEL}>
            <h2 className={PANEL_TITLE}>How hard, and how open</h2>
            <p className="mt-3 max-w-[52ch] text-small text-muted">
              Be honest about difficulty and access. Someone is going to drive
              four hours on this.
            </p>
            <div className="mt-6 grid gap-[clamp(1.25rem,1rem+1vw,1.75rem)]">
              <ChoiceField
                label="Category"
                options={CATEGORIES}
                labels={CATEGORY_LABELS}
                value={form.category}
                onChange={(v) => set("category", v)}
                error={errors.category}
              />
              <ChoiceField
                label="Difficulty"
                options={DIFFICULTIES}
                labels={DIFFICULTY_LABELS}
                value={form.difficulty}
                onChange={(v) => set("difficulty", v)}
                error={errors.difficulty}
              />
              <ChoiceField
                label="Access type"
                options={ACCESS_TYPES}
                labels={ACCESS_LABELS}
                value={form.access}
                onChange={(v) => set("access", v)}
                error={errors.access}
              />
            </div>
          </section>

          {/* -------------------------------------------------- location */}
          <section className={PANEL}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className={PANEL_TITLE}>Where is it</h2>
                <p className="mt-3 max-w-[46ch] text-small text-muted">
                  Drag the map, or type coordinates. The pin is what gets
                  logged.
                </p>
              </div>

              {/*
            Off until pressed, and it only *moves the pin* — it does not
            submit anything. The caption is deliberately blunt about the
            consequence: this is the one place on the site where a
            coordinate becomes public, and "use my location" is an easy
            way to publish where you are standing without meaning to.
          */}
              <LocateButton
                className="w-full sm:w-auto sm:max-w-[24rem]"
                status={geo.status}
                onRequest={geo.request}
                onClear={geo.clear}
                label="Use my location"
                caption="Moves the pin to where you are. Nothing is sent until you submit — and the pin is published, so drop it on the spot rather than on your doorstep."
              />
            </div>
            <div className="mt-6">
              {/* `glass-isolate`: Leaflet stacks its panes at z-index 400–1000,
              which without a stacking context of their own compete with
              the page chrome. */}
              <div className="glass-isolate h-[46vh] min-h-[280px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-rim)]">
                {mounted ? (
                  <LocationPicker
                    lat={form.lat}
                    lng={form.lng}
                    focus={focus}
                    onPick={(lat, lng) => {
                      set("lat", lat);
                      set("lng", lng);
                    }}
                  />
                ) : (
                  <MapPlaceholder />
                )}
              </div>

              <div className="mt-5 grid gap-[clamp(1.25rem,1rem+1vw,1.75rem)] sm:grid-cols-2">
                <TextField
                  label="Latitude"
                  inputMode="decimal"
                  value={form.lat === null ? "" : String(form.lat)}
                  onChange={(v) => set("lat", v === "" ? null : Number(v))}
                  error={errors.lat}
                  placeholder="-90 to 90"
                />
                <TextField
                  label="Longitude"
                  inputMode="decimal"
                  value={form.lng === null ? "" : String(form.lng)}
                  onChange={(v) => set("lng", v === "" ? null : Number(v))}
                  error={errors.lng}
                  placeholder="-180 to 180"
                />
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------- photos */}
          <section className={PANEL}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className={PANEL_TITLE}>Photos</h2>
              <p className="text-tiny text-faint">Optional · up to 3</p>
            </div>
            <p className="mt-3 max-w-[52ch] text-small text-muted">
              Worth more than the write-up. What it actually looks like when you
              get there.
            </p>
            <PhotoField
              className="mt-6"
              label="Attach"
              max={3}
              photos={photos}
              onChange={setPhotos}
              turnstileToken={turnstileToken ?? undefined}
            />
          </section>

          {/* ------------------------------------------------- the intel */}
          <section className={PANEL}>
            <h2 className={PANEL_TITLE}>The intel</h2>
            <div className="mt-6 grid gap-[clamp(1.25rem,1rem+1vw,1.75rem)]">
              <TextField
                label="Description"
                multiline
                rows={8}
                value={form.description}
                onChange={(v) => set("description", v)}
                error={errors.description}
                hint="How to get there, what it's actually like, what it isn't."
                maxLength={4000}
              />
              <TextField
                label="Watch out"
                multiline
                rows={3}
                value={form.watchOut}
                onChange={(v) => set("watchOut", v)}
                error={errors.watchOut}
                hint="The thing that will catch someone out. Tides, loose rock, dogs."
                maxLength={500}
              />
            </div>
          </section>

          {/* ---------------------------------------------------- submit */}
          <section className={PANEL}>
            <div className="mb-6">
              <TurnstileWidget onToken={setTurnstileToken} />
            </div>

            {status.kind === "failed" ? (
              <p
                role="alert"
                className="mb-6 text-tiny font-medium text-accent"
              >
                {status.message}
              </p>
            ) : null}

            <Button
              type="submit"
              tone="ember"
              size="lg"
              disabled={status.kind === "submitting"}
              className="w-full sm:w-auto"
            >
              {status.kind === "submitting" ? "Sending…" : "Submit the spot"}
              <ArrowRight />
            </Button>

            <p className="mt-5 max-w-[56ch] text-tiny text-faint">
              No account, no email. It goes live immediately — and anyone can
              report it, so please be accurate about access and difficulty.
            </p>
          </section>
        </div>

        <aside className="glass rounded-[var(--radius-xl)] p-6 lg:sticky lg:top-[calc(var(--bar-h)+1.5rem)]">
          <p className="flex items-center gap-2.5 text-small font-semibold text-ink">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-accent"
            >
              <path d="M12 22s8-4 8-10V5.5L12 2 4 5.5V12c0 6 8 10 8 10z" />
            </svg>
            What we do not keep
          </p>
          <ul className="mt-5 space-y-3.5">
            {PRIVACY.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-accent"
                >
                  <path d="M4 12.5l5.5 5.5L20 7" />
                </svg>
                <span className="text-tiny text-muted">{line}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </form>
  );
}
