type ClassValue = string | false | null | undefined;

/**
 * Minimal class joiner. Deliberately not `tailwind-merge`: the design
 * system is small and utilities are applied in one place per element, so
 * there are no conflicting-class pileups to resolve. Later arguments win
 * by convention — put caller-supplied `className` last.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
