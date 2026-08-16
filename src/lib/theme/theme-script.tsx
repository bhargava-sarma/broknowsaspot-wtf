import {
  DARK_QUERY,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
} from "@/lib/theme/constants";

/**
 * Resolves and applies the theme *before first paint*.
 *
 * This has to be a blocking inline script in <head>: any approach that waits
 * for React (effects, client components, even `beforeInteractive` scripts)
 * paints one frame of the wrong theme first, which is the flash we are
 * eliminating. It is small enough that the parse cost is irrelevant.
 *
 * Stringified rather than imported so it inlines with no module boundary.
 */
const script = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var t=(p==="light"||p==="dark")?p:(window.matchMedia("${DARK_QUERY}").matches?"dark":"light");document.documentElement.setAttribute("${THEME_ATTRIBUTE}",t)}catch(e){document.documentElement.setAttribute("${THEME_ATTRIBUTE}","light")}})();`;

export function ThemeScript() {
  return (
    <script
      // Fully authored above from compile-time constants — no user input.
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
