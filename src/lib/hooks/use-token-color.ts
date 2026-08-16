"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a `--tone-*` custom property off <html> as a plain colour string.
 *
 * three.js can't consume CSS variables, but duplicating the palette in JS
 * would hand the design system a second source of truth that silently
 * drifts from globals.css. Reading the computed value keeps the stylesheet
 * canonical.
 *
 * Subscribed to the DOM rather than to the theme context on purpose:
 * ThemeProvider writes `data-theme` in an effect, which runs *after* the
 * render triggered by the theme state change. A context-derived read would
 * therefore see the previous theme's colour for one frame. A
 * MutationObserver fires once the attribute has actually changed.
 */

/** `theme|token` -> resolved value. At most one style read per pairing. */
const cache = new Map<string, string>();

function readToken(token: string, fallback: string): string {
  const theme = document.documentElement.getAttribute("data-theme") ?? "light";
  const key = `${theme}|${token}`;

  const cached = cache.get(key);
  if (cached) return cached;

  const value =
    getComputedStyle(document.documentElement).getPropertyValue(token).trim() ||
    fallback;

  cache.set(key, value);
  return value;
}

export function useTokenColor(token: string, fallback: string): string {
  const subscribe = useCallback((onChange: () => void) => {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => readToken(token, fallback),
    () => fallback,
  );
}
