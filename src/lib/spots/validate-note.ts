export type NoteDraft = {
  author: string;
  body: string;
  notedOn: string;
};

export type NoteFieldErrors = Partial<Record<keyof NoteDraft | "_", string>>;

export type NoteValidationResult =
  { ok: true; draft: NoteDraft } | { ok: false; errors: NoteFieldErrors };

/**
 * Mirrors the column sizes declared for `notes` in the Appwrite schema.
 * If the two drift, the database rejects the insert and the visitor gets
 * a 500 for something the form should have caught — so treat the schema
 * as the source of truth and follow it here.
 */
export const NOTE_LIMITS = {
  author: { min: 0, max: 40 },
  body: { min: 10, max: 2000 },
} as const;

/** How far back a visit date is allowed to be. Older than this is far
 *  more likely a typo than a genuinely useful decade-old report. */
export const NOTE_MAX_AGE_YEARS = 5;

export const ANONYMOUS = "anonymous";

/** Today in the same YYYY-MM-DD shape the date input uses. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * One validator, run by the form for inline feedback and again by the
 * route on the way in. The route's copy is the enforcement point.
 */
export function validateNote(input: unknown): NoteValidationResult {
  const errors: NoteFieldErrors = {};

  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { _: "expected an object" } };
  }
  const raw = input as Record<string, unknown>;

  // Blank is allowed and becomes "anonymous" — the column requires at
  // least one character, and demanding a name for a field report nobody
  // signs anyway would just produce a page of made-up ones.
  const author =
    typeof raw.author === "string" && raw.author.trim()
      ? raw.author.trim()
      : ANONYMOUS;

  if (author.length > NOTE_LIMITS.author.max) {
    errors.author = `name must be under ${NOTE_LIMITS.author.max} characters`;
  }

  const body = typeof raw.body === "string" ? raw.body.trim() : "";
  if (!body) {
    errors.body = "the note is required";
  } else if (body.length < NOTE_LIMITS.body.min) {
    errors.body = `needs at least ${NOTE_LIMITS.body.min} characters`;
  } else if (body.length > NOTE_LIMITS.body.max) {
    errors.body = `must be under ${NOTE_LIMITS.body.max} characters`;
  }

  const notedOn = typeof raw.notedOn === "string" ? raw.notedOn.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(notedOn)) {
    errors.notedOn = "give the date you were there";
  } else {
    // Parsed as UTC midnight, which is what the YYYY-MM-DD form means to
    // Date, so this comparison never depends on the viewer's zone.
    const when = new Date(`${notedOn}T00:00:00Z`);
    if (Number.isNaN(when.getTime())) {
      errors.notedOn = "that isn't a real date";
    } else {
      const now = new Date();
      if (notedOn > today()) {
        errors.notedOn = "you can't have been there yet";
      } else {
        const floor = new Date(now);
        floor.setUTCFullYear(floor.getUTCFullYear() - NOTE_MAX_AGE_YEARS);
        if (when < floor) {
          errors.notedOn = `older than ${NOTE_MAX_AGE_YEARS} years — probably a typo`;
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, draft: { author, body, notedOn } };
}
