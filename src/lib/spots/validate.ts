import {
  isAccess,
  isCategory,
  isDifficulty,
  type SpotDraft,
} from "@/lib/types/spot";

export type FieldErrors = Partial<Record<keyof SpotDraft | "_", string>>;

export type ValidationResult =
  { ok: true; draft: SpotDraft } | { ok: false; errors: FieldErrors };

export const LIMITS = {
  name: { min: 3, max: 80 },
  summary: { min: 10, max: 140 },
  description: { min: 40, max: 4000 },
  watchOut: { min: 10, max: 500 },
  /**
   * The one optional field, so it carries a max and no min: plenty of
   * places are worth going year round, and forcing a sentence there
   * produces "anytime" fourteen times rather than information.
   */
  bestWindow: { max: 120 },
} as const;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function checkLength(
  value: string,
  { min, max }: { min: number; max: number },
  label: string,
): string | null {
  if (!value) return `${label} is required`;
  if (value.length < min) return `${label} needs at least ${min} characters`;
  if (value.length > max) return `${label} must be under ${max} characters`;
  return null;
}

/**
 * Single validator shared by the client form and the API route.
 *
 * The form runs it for inline feedback and the route runs it again on the
 * way in — the client copy is a convenience, never the enforcement point.
 */
export function validateDraft(input: unknown): ValidationResult {
  const errors: FieldErrors = {};

  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: { _: "expected an object" } };
  }
  const raw = input as Record<string, unknown>;

  const name = text(raw.name);
  const summary = text(raw.summary);
  const description = text(raw.description);
  const watchOut = text(raw.watchOut);
  const bestWindow = text(raw.bestWindow);

  const nameError = checkLength(name, LIMITS.name, "name");
  if (nameError) errors.name = nameError;

  const summaryError = checkLength(summary, LIMITS.summary, "summary");
  if (summaryError) errors.summary = summaryError;

  const descriptionError = checkLength(
    description,
    LIMITS.description,
    "description",
  );
  if (descriptionError) errors.description = descriptionError;

  // Label is the human field name, not the payload key — these strings go
  // straight into the form's inline errors.
  const watchOutError = checkLength(watchOut, LIMITS.watchOut, "watch out");
  if (watchOutError) errors.watchOut = watchOutError;

  const lat = Number(raw.lat);
  const lng = Number(raw.lng);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.lat = "latitude must be between -90 and 90";
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.lng = "longitude must be between -180 and 180";
  }
  // 0,0 is in the gulf of guinea and is almost always an unset field.
  if (lat === 0 && lng === 0) {
    errors.lat = "pick a location on the map";
  }

  if (bestWindow.length > LIMITS.bestWindow.max) {
    errors.bestWindow = `best window must be under ${LIMITS.bestWindow.max} characters`;
  }

  if (!isCategory(raw.category)) errors.category = "pick a category";
  if (!isDifficulty(raw.difficulty)) errors.difficulty = "pick a difficulty";
  if (!isAccess(raw.access)) errors.access = "pick an access type";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    draft: {
      name,
      lat,
      lng,
      summary,
      description,
      watchOut,
      bestWindow,
      // Narrowed by the isX guards above.
      category: raw.category as SpotDraft["category"],
      difficulty: raw.difficulty as SpotDraft["difficulty"],
      access: raw.access as SpotDraft["access"],
    },
  };
}
