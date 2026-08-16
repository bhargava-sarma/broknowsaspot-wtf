#!/usr/bin/env node
/**
 * Contrast guard for the design tokens.
 *
 * Parses the --tone-* declarations straight out of src/app/globals.css —
 * the stylesheet stays the single source of truth — and fails if any
 * pairing the UI actually relies on drops below its required ratio.
 *
 * Run: npm run check:contrast
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = resolve(here, "../src/app/globals.css");

/* -------------------------------------------------- colour maths ---- */

const toLinear = (channel) => {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

function luminance(hex) {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------- parsing ---- */

/** Grabs a flat (no nested braces) rule body by selector. */
function ruleBody(css, selectorPattern) {
  const match = css.match(
    new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`, "m"),
  );
  if (!match) throw new Error(`could not find rule: ${selectorPattern}`);
  return match[1];
}

function tones(body) {
  const found = {};
  const re = /--tone-([a-z-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    // --tone-paper-raised -> paperRaised
    const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    found[key] = m[2].toLowerCase();
  }
  return found;
}

const css = readFileSync(CSS_PATH, "utf8");
const themes = {
  light: tones(ruleBody(css, "^:root")),
  dark: tones(ruleBody(css, '\\[data-theme="dark"\\]')),
};

/* ---------------------------------------------------- the checks ---- */

/** [foreground, background, minimum ratio, what it is used for] */
const CHECKS = [
  ["ink", "paper", 4.5, "body text"],
  ["ink", "paperRaised", 4.5, "text in wells"],
  ["muted", "paper", 4.5, "secondary text"],
  ["muted", "paperRaised", 4.5, "secondary text in wells"],
  ["faint", "paper", 4.5, "meta + labels"],
  ["accent", "paper", 4.5, "accent text + cta"],
  ["accent", "paperRaised", 4.5, "accent in wells"],
  ["accentInk", "accent", 4.5, "text on accent fill"],
  ["ruleStrong", "paper", 4.5, "emphatic hairline"],
  // Non-text separator: WCAG exempts purely decorative rules, but the
  // hairline carries all structural separation here, so it has to read.
  ["rule", "paper", 1.45, "hairline visibility"],
];

const REQUIRED_TONES = [
  "paper",
  "paperRaised",
  "ink",
  "muted",
  "faint",
  "rule",
  "ruleStrong",
  "accent",
  "accentInk",
];

let failures = 0;

for (const [themeName, tone] of Object.entries(themes)) {
  const missing = REQUIRED_TONES.filter((key) => !tone[key]);
  if (missing.length) {
    console.error(`${themeName}: missing tone(s) ${missing.join(", ")}`);
    failures += missing.length;
    continue;
  }

  console.log(`\n${themeName}`);
  console.log("-".repeat(64));

  for (const [fg, bg, min, label] of CHECKS) {
    const ratio = contrast(tone[fg], tone[bg]);
    const ok = ratio >= min;
    if (!ok) failures += 1;
    console.log(
      `${ok ? "pass" : "FAIL"}  ${ratio.toFixed(2).padStart(6)}:1  ` +
        `(min ${min.toFixed(2)})  ${fg} on ${bg} — ${label}`,
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} contrast check(s) failed\n`);
  process.exit(1);
}

console.log("\nall contrast checks passed\n");
