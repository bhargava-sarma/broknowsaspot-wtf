import type { Access, Category, Difficulty, Spot } from "@/lib/types/spot";

export type SpotFilters = {
  category: Category[];
  difficulty: Difficulty[];
  access: Access[];
  /** Free-text match across name, region and country. */
  query: string;
};

export const EMPTY_FILTERS: SpotFilters = {
  category: [],
  difficulty: [],
  access: [],
  query: "",
};

/**
 * Facets are OR within a group and AND across groups — the behaviour people
 * expect from faceted filtering: "ruins or shore, that are also easy".
 * An empty group means "no constraint", not "match nothing".
 */
export function filterSpots(spots: Spot[], filters: SpotFilters): Spot[] {
  const query = filters.query.trim().toLowerCase();

  return spots.filter((spot) => {
    if (filters.category.length && !filters.category.includes(spot.category)) {
      return false;
    }
    if (
      filters.difficulty.length &&
      !filters.difficulty.includes(spot.difficulty)
    ) {
      return false;
    }
    if (filters.access.length && !filters.access.includes(spot.access)) {
      return false;
    }
    if (query) {
      const haystack =
        `${spot.name} ${spot.region} ${spot.country} ${spot.summary}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function activeFilterCount(filters: SpotFilters): number {
  return (
    filters.category.length +
    filters.difficulty.length +
    filters.access.length +
    (filters.query.trim() ? 1 : 0)
  );
}

/** Immutable add/remove for a facet value. */
export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}
