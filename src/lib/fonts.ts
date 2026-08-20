import { Inter, JetBrains_Mono } from "next/font/google";

/**
 * Both faces are loaded as variable fonts (no `weight` array) so the whole
 * axis is available from a single file — that keeps the hairline 300 weight
 * and the 500 label weight on the same download.
 *
 * next/font self-hosts these at build time: no request to Google at runtime,
 * no FOUC, and an auto-generated size-adjusted fallback so swapping in the
 * real face causes no layout shift.
 */

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  // Chrome, labels, headings — the technical/industrial voice.
});

const fontSans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  // Long-form descriptions and community notes, where mono would tire.
});

export const fontVariables = `${fontMono.variable} ${fontSans.variable}`;
