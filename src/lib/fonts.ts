import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

/**
 * Both faces are loaded as variable fonts (no `weight` array) so the whole
 * axis is available from a single file — that keeps the hairline 300 weight
 * and the 500 label weight on the same download.
 *
 * next/font self-hosts these at build time: no request to Google at runtime,
 * no FOUC, and an auto-generated size-adjusted fallback so swapping in the
 * real face causes no layout shift.
 */

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  // Chrome, labels, headings — the technical/industrial voice.
});

export const fontSans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  // Long-form descriptions and community notes, where mono would tire.
});

/**
 * Display font for large headings and hero numbers.
 * Heavy geometric sans-serif matching the bold app aesthetic.
 */
export const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
});

export const fontVariables = `${fontMono.variable} ${fontSans.variable} ${fontDisplay.variable}`;
