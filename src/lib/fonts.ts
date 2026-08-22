import { Instrument_Serif, Manrope } from "next/font/google";

/**
 * Two faces, one job each.
 *
 * next/font self-hosts both at build time: no request to Google at
 * runtime, no FOUC, and an auto-generated size-adjusted fallback so
 * swapping in the real face causes no layout shift.
 */

/**
 * Display. Every title, and the italic that carries the gradient accent
 * in the hero.
 *
 * Instrument Serif ships one weight — there is no axis to load, so the
 * weight and style lists are explicit rather than omitted. Asking for a
 * weight it does not have is a build error, which is the good kind.
 */
const fontDisplay = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

/**
 * Everything else. Loaded as a variable font (no `weight` array) so the
 * whole axis comes from one file — the 300 used for lede paragraphs and
 * the 600 used for labels are the same download.
 */
const fontSans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const fontVariables = `${fontDisplay.variable} ${fontSans.variable}`;
