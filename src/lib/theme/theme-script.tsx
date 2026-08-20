import {
  DARK_QUERY,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
} from "@/lib/theme/constants";

/**
 * Runs *before first paint*, and does two jobs.
 *
 * **Theme.** Resolves light/dark and stamps it on <html>. This has to be a
 * blocking inline script: any approach that waits for React (effects,
 * client components, even `beforeInteractive` scripts) paints one frame of
 * the wrong theme first, which is the flash we are eliminating.
 *
 * **Arming the reveals.** It also adds a `js` class, which is what lets the
 * scroll reveals start hidden. The direction matters: reveals are visible
 * by default and this script *opts them into* being hidden, so the hidden
 * state can never outlive the JavaScript that is supposed to undo it. If
 * the bundle fails to load, or the reader has scripting off, the page is
 * plain text rather than a blank rectangle.
 *
 * Both are cheap enough that the parse cost is irrelevant, and stringified
 * rather than imported so they inline with no module boundary.
 */
const script = `(function(){var d=document.documentElement;try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var t=(p==="light"||p==="dark")?p:(window.matchMedia("${DARK_QUERY}").matches?"dark":"light");d.setAttribute("${THEME_ATTRIBUTE}",t)}catch(e){d.setAttribute("${THEME_ATTRIBUTE}","light")}d.classList.add("js")})();`;

export function ThemeScript() {
  return (
    <script
      // Fully authored above from compile-time constants — no user input.
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
