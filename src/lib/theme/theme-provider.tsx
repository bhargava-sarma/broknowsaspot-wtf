"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DARK_QUERY,
  isPreference,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  THEME_TRANSITION_CLASS,
  type Theme,
  type ThemePreference,
} from "@/lib/theme/constants";

type ThemeContextValue = {
  /** The theme currently painted. */
  theme: Theme;
  /** What the user picked; `system` until they touch the toggle. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Flip light <-> dark, committing an explicit preference. */
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : "system";
  } catch {
    // Private mode / storage disabled — fall back to following the OS.
    return "system";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read straight through in a lazy initialiser rather than correcting in a
  // mount effect: the effect version renders once with the wrong value and
  // then cascades a second render for no reason.
  //
  // On the server both calls hit their `typeof window === "undefined"`
  // branch and return ("system", "light") deterministically. On the client
  // they return the real values during the hydration render — which is safe
  // precisely because no markup in the tree branches on theme (styling is
  // driven by the `data-theme` attribute and the `dark:` variant), so the
  // DOM React produces is identical either way.
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readPreference);
  const [resolved, setResolved] = useState<Theme>(() => {
    const stored = readPreference();
    return stored === "system" ? systemTheme() : stored;
  });

  // Live-follow the OS, but only while the user hasn't chosen for themselves.
  useEffect(() => {
    if (preference !== "system") return;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setResolved(event.matches ? "dark" : "light");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  // Apply to the DOM. On first run this is a no-op — ThemeScript already
  // wrote the same value before paint — so the equality guard also keeps
  // the mount pass from firing a pointless transition.
  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute(THEME_ATTRIBUTE) === resolved) return;

    // Cross-fade the swap rather than hard-cutting it, unless the user has
    // asked for reduced motion.
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;

    if (animate) root.classList.add(THEME_TRANSITION_CLASS);
    root.setAttribute(THEME_ATTRIBUTE, resolved);

    if (!animate) return;
    const timer = window.setTimeout(() => {
      root.classList.remove(THEME_TRANSITION_CLASS);
    }, 240);
    return () => {
      window.clearTimeout(timer);
      root.classList.remove(THEME_TRANSITION_CLASS);
    };
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setResolved(next === "system" ? systemTheme() : next);
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice still applies for this session.
    }
  }, []);

  // Keep other tabs in step.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = isPreference(event.newValue) ? event.newValue : "system";
      setPreferenceState(next);
      setResolved(next === "system" ? systemTheme() : next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolved === "dark" ? "light" : "dark");
  }, [resolved, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: resolved, preference, setPreference, toggle }),
    [resolved, preference, setPreference, toggle],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
}
