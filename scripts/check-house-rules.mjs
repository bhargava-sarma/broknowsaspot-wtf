/**
 * House rules, checked.
 *
 * The standing constraints on what this site is allowed to look like and
 * claim (README → design language → house rules). Four of them can be
 * decided from the source alone, and those four are here so that breaking
 * one fails `npm run check` rather than waiting to be noticed in a
 * screenshot months later.
 *
 * The rest are geometric or rendered — whether a control reads as a
 * capsule, what colour a gradient actually paints, whether a contents
 * link lands on a section — and need a browser with the app running.
 * Those are not faked here: this script checks what it can decide, and
 * the README says which is which.
 *
 * Run: node scripts/check-house-rules.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "src");

const failures = [];
const fail = (rule, where, detail) =>
  failures.push(`${rule}\n    ${where}\n    ${detail}`);

function walk(dir, exts) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path, exts));
    else if (exts.some((e) => entry.endsWith(e))) out.push(path);
  }
  return out;
}

const files = walk(SRC, [".ts", ".tsx", ".css"]);
const read = (path) => readFileSync(path, "utf8");
const rel = (path) => relative(ROOT, path);

/* -------------------------------------------------------------------- *
 * 1. No em dashes in copy people read.
 *
 * Comments carry them freely; they never reach a page. What matters is
 * string literals and JSX text. A standalone "—" is the no-data glyph
 * (an unrated ball meter, an empty admin cell) and is the one allowed
 * use, so a dash only counts when it sits between two words.
 * -------------------------------------------------------------------- */
{
  // Strip block comments, line comments and JSX comment expressions. This
  // is deliberately cruder than a parser: it over-strips at worst, and an
  // over-strip is a missed warning, not a false alarm.
  const stripComments = (source) =>
    source
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Line comments anywhere on the line, including trailing ones. The
      // guard on the preceding character keeps `https://` intact, which
      // is the only other way two slashes appear in this codebase.
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  // A console call is a developer surface, not a page.
  const stripLogs = (source) =>
    source.replace(/console\.(log|warn|error|info|debug)\([\s\S]*?\);/g, "");

  for (const path of files) {
    if (path.endsWith(".css")) continue;
    const source = stripLogs(stripComments(read(path)));
    for (const [index, line] of source.split("\n").entries()) {
      if (!line.includes("—")) continue;
      // Between two word characters, allowing one space either side.
      if (!/\w\s?—\s?\w/.test(line)) continue;
      fail(
        "em dash in copy",
        `${rel(path)}:${index + 1}`,
        line.trim().slice(0, 100),
      );
    }
  }
}

/* -------------------------------------------------------------------- *
 * 2. No purple anywhere in the token layer.
 *
 * Hue 260-330 at real saturation. The palette runs blue to ember and
 * nothing in between, so a violet can only arrive by accident.
 * -------------------------------------------------------------------- */
{
  const hue = (r, g, b) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) return { h: 0, s: 0 };
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    return { h: h < 0 ? h + 360 : h, s: d / max };
  };

  const isPurple = (r, g, b) => {
    const { h, s } = hue(r, g, b);
    return h >= 260 && h <= 330 && s > 0.15;
  };

  for (const path of files) {
    const source = read(path);
    for (const [index, line] of source.split("\n").entries()) {
      const where = `${rel(path)}:${index + 1}`;

      // #rrggbb and #rgb
      for (const m of line.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
        const hex = m[1];
        const full =
          hex.length === 3
            ? hex
                .split("")
                .map((c) => c + c)
                .join("")
            : hex;
        const [r, g, b] = [0, 2, 4].map((i) =>
          parseInt(full.slice(i, i + 2), 16),
        );
        if (isPurple(r, g, b)) fail("purple", where, m[0]);
      }

      // rgb()/rgba(), and the bare "r g b" triples the aurora tokens use.
      for (const m of line.matchAll(
        /rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/g,
      )) {
        const [r, g, b] = [m[1], m[2], m[3]].map(Number);
        if (isPurple(r, g, b)) fail("purple", where, m[0]);
      }
      for (const m of line.matchAll(
        /^\s*--[\w-]+:\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*;/gm,
      )) {
        const [r, g, b] = [m[1], m[2], m[3]].map(Number);
        if (isPurple(r, g, b)) fail("purple", where, m[0].trim());
      }
    }
  }
}

/* -------------------------------------------------------------------- *
 * 3. No emoji. Every icon in this app is a hand-written SVG path.
 * -------------------------------------------------------------------- */
{
  // Unicode "Symbol, other" above the punctuation block: emoji, dingbats,
  // and the pictographs that get used as icons. Arrows and box-drawing
  // are category So too but sit below this range and are not in play.
  const EMOJI =
    /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/u;
  for (const path of files) {
    for (const [index, line] of read(path).split("\n").entries()) {
      const m = EMOJI.exec(line);
      if (m)
        fail(
          "emoji",
          `${rel(path)}:${index + 1}`,
          `${m[0]} in ${line.trim().slice(0, 60)}`,
        );
    }
  }
}

/* -------------------------------------------------------------------- *
 * 4. The seed invents no ratings, notes or photos.
 *
 * A fresh install must open with "Not rated yet", no comments and no
 * gallery, rather than with testimony from people who do not exist.
 * -------------------------------------------------------------------- */
{
  const path = join(SRC, "lib/data/spots.ts");
  const source = read(path);
  // Read the value and compare it, rather than asking a lookahead not to
  // match a zero: `\s*(?!0)` is happy to match no whitespace at all and
  // then find a space where it wanted a digit, which passes everything.
  const nonZero = (field) =>
    [...source.matchAll(new RegExp(`${field}:\\s*([^\\s,}]+)`, "g"))].filter(
      (m) => m[1] !== "0",
    ).length;

  const counts = {
    "a non-empty notes array": (source.match(/notes:\s*\[[^\]]/g) ?? []).length,
    "a non-empty photos array": (source.match(/photos:\s*\[[^\]]/g) ?? [])
      .length,
    "a non-zero ratingSum": nonZero("ratingSum"),
    "a non-zero ratingCount": nonZero("ratingCount"),
  };
  for (const [what, n] of Object.entries(counts)) {
    if (n > 0) fail("invented seed content", rel(path), `${n}x ${what}`);
  }
}

/* -------------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} house rule violation(s):\n`);
  for (const f of failures) console.error(`  ${f}\n`);
  process.exit(1);
}
console.log("house rules: em dashes, purple, emoji and seed content all clean");
