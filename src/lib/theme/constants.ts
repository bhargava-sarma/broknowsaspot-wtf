/** What actually gets painted. */
export type Theme = "light" | "dark";

/** What the user chose. `system` means "keep following the OS". */
export type ThemePreference = Theme | "system";

/** localStorage key. Namespaced so it survives alongside future keys. */
export const THEME_STORAGE_KEY = "bkas.theme";

/** Attribute on <html> that every token in globals.css keys off. */
export const THEME_ATTRIBUTE = "data-theme";

/** Added for the duration of a theme flip so colours cross-fade. */
export const THEME_TRANSITION_CLASS = "theme-transition";

export const DARK_QUERY = "(prefers-color-scheme: dark)";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function isPreference(value: unknown): value is ThemePreference {
  return isTheme(value) || value === "system";
}
