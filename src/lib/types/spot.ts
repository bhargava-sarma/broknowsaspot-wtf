/** What kind of place it is. */
export const CATEGORIES = [
  "ruin",
  "water",
  "viewpoint",
  "underground",
  "shore",
  "transit",
  "structure",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** What getting there actually costs you. */
export const DIFFICULTIES = ["easy", "moderate", "hard", "serious"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * Whether you are strictly allowed to be there. Stated plainly rather than
 * euphemistically — the whole point of the index is honest intel.
 */
export const ACCESS_TYPES = ["open", "permit", "grey", "private"] as const;
export type Access = (typeof ACCESS_TYPES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  ruin: "ruin",
  water: "water",
  viewpoint: "viewpoint",
  underground: "underground",
  shore: "shore",
  transit: "transit",
  structure: "structure",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "easy",
  moderate: "moderate",
  hard: "hard",
  serious: "serious",
};

export const ACCESS_LABELS: Record<Access, string> = {
  open: "open access",
  permit: "permission needed",
  grey: "grey area",
  private: "private land",
};

/** Longer-form explanation shown next to the tag on a detail page. */
export const ACCESS_NOTES: Record<Access, string> = {
  open: "public land or a right of way. nothing to negotiate.",
  permit: "someone owns it and will say yes if you ask. ask.",
  grey: "unposted, unenforced, and not technically yours. your call.",
  private: "posted private. listed for the record — we don't recommend it.",
};

export type CommunityNote = {
  id: string;
  author: string;
  /** ISO date — conditions rot, so every note is stamped. */
  date: string;
  body: string;
};

export type SpotPhoto = {
  /**
   * Remote URL once real photography exists. Null renders the generated
   * plate instead, so the gallery layout is identical either way.
   */
  src: string | null;
  alt: string;
};

export type Spot = {
  slug: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  category: Category;
  difficulty: Difficulty;
  access: Access;
  /** One line, shown in the map rail and list. */
  summary: string;
  description: string;
  /** Distance on foot from the nearest parking, in km. */
  walkInKm: number;
  /** When it's worth going — tide, season, light. */
  bestWindow: string;
  /** The thing that will actually catch you out. */
  watchOut: string;
  photos: SpotPhoto[];
  notes: CommunityNote[];
  addedAt: string;
};

/** Shape accepted by POST /api/spots. */
export type SpotDraft = {
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  category: Category;
  difficulty: Difficulty;
  access: Access;
  summary: string;
  description: string;
  watchOut: string;
};

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.includes(value as Category);
}

export function isDifficulty(value: unknown): value is Difficulty {
  return DIFFICULTIES.includes(value as Difficulty);
}

export function isAccess(value: unknown): value is Access {
  return ACCESS_TYPES.includes(value as Access);
}
