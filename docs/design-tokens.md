# design tokens

Every token lives in `src/app/globals.css`. That file is the single source
of truth — `scripts/check-contrast.mjs` parses it directly, so there is no
second copy to drift out of sync.

## how theming works

1. `ThemeScript` (a blocking inline script in `<head>`) resolves the theme
   from `localStorage` — falling back to `prefers-color-scheme` — and sets
   `data-theme` on `<html>` **before first paint**. This is what eliminates
   the flash; nothing that waits for React can.
2. `:root` and `[data-theme="dark"]` each define the full `--tone-*` set.
3. `@theme static` maps Tailwind's `--color-*` onto those `--tone-*` vars.

Because the mapping is an indirection, flipping one attribute on `<html>`
restyles the entire app. Components use plain `bg-paper` / `text-muted` and
almost never need a `dark:` variant — the exceptions are places where an
element must diverge structurally between themes (the theme toggle's own
position marker, for instance).

## palette

Light and dark are authored independently. Dark is **not** an inversion:
the accent is lifted and desaturated for the dark ground, and the muted
greys are re-picked against their own background rather than mirrored.

| token          | light     | dark      | used for                        |
| -------------- | --------- | --------- | ------------------------------- |
| `paper`        | `#f2f1ed` | `#0d0d0c` | page ground                     |
| `paper-raised` | `#eae9e3` | `#161614` | input wells, map chrome — flat  |
| `ink`          | `#12120f` | `#eceae4` | primary text                    |
| `muted`        | `#4a4944` | `#9b988f` | secondary text                  |
| `faint`        | `#6e6c64` | `#817f76` | meta, labels, inactive nav      |
| `rule`         | `#c9c7bf` | `#33322e` | the hairline                    |
| `rule-strong`  | `#12120f` | `#eceae4` | emphatic hairline               |
| `accent`       | `#b23f18` | `#f0723c` | one mark per view — never fills |
| `accent-ink`   | `#f2f1ed` | `#0d0d0c` | text on an accent fill          |

### measured contrast

`npm run check:contrast` fails the build if any of these regress.

| pairing                | light     | dark      | floor |
| ---------------------- | --------- | --------- | ----- |
| ink / paper            | 16.60:1   | 16.16:1   | 4.5   |
| muted / paper          | 7.98:1    | 6.74:1    | 4.5   |
| faint / paper          | 4.65:1    | 4.84:1    | 4.5   |
| accent / paper         | 5.14:1    | 6.65:1    | 4.5   |
| accent-ink / accent    | 5.14:1    | 6.65:1    | 4.5   |
| rule / paper           | 1.50:1    | 1.52:1    | 1.45  |

The hairline floor is deliberately low and deliberately enforced. WCAG
exempts decorative separators, but here the rule carries *all* structural
separation — there are no cards, borders or shadows to fall back on — so it
has to be visible without becoming a heavy line.

## type

Two families, loaded as variable fonts through `next/font` (self-hosted at
build time, size-adjusted fallbacks, no FOUC):

- **JetBrains Mono** — headings, labels, nav, numerals, all UI chrome.
- **Inter** — body copy, descriptions, community notes.

The scale is fully fluid. Every step is a `clamp()` interpolating on
viewport width between a 375px floor and a ~1600px ceiling, so there are no
breakpoint jumps in type size at all.

| token   | min       | max        | used for               |
| ------- | --------- | ---------- | ---------------------- |
| `micro` | 10px      | 11px       | labels, nav, tags      |
| `tiny`  | 11px      | 12px       | wordmark, buttons      |
| `small` | 13px      | 14px       | dense body             |
| `body`  | 15px      | 17px       | prose                  |
| `lead`  | 17px      | 21px       | intro paragraphs       |
| `h3`    | 20px      | 28px       | card titles, readouts  |
| `h2`    | 28px      | 48px       | section titles         |
| `h1`    | 40px      | 92px       | page titles            |
| `mega`  | 52px      | 176px      | the homepage hero only |

Line-height and letter-spacing ride along with each step via Tailwind v4's
`--text-*--line-height` / `--text-*--letter-spacing` companions.

## layout

- `--gutter` — `clamp(1rem, 0.62rem + 1.6vw, 2rem)`, the only horizontal
  spacing value. Used as page padding *and* as grid gap so the rhythm is
  consistent everywhere.
- `--shell-max` — `96rem` container ceiling.
- `--bar-h` — `3.5rem`, shared by the sticky header and the mobile bar, and
  used as `scroll-padding-top` so anchors clear the header.
- `.grid-swiss` — the rigid 12-column grid. Sections declare column spans
  against it rather than inventing their own widths.

## motion

Presets live in `src/lib/motion/springs.ts`; all four are springs tuned at
or just under critical damping (ζ ≈ 0.95–0.98), so nothing overshoots
except `springPop` (ζ ≈ 0.72), reserved for small affordances like map
markers.

`--ease-damped` in CSS is a `linear()` approximation of the same curve, for
the handful of transitions that are cheaper to run in CSS than in JS.

Reduced motion is handled in three layers:

1. `useReducedMotion()` collapses every Framer variant to a static visible
   state — reveals stop translating and stop staggering.
2. A CSS `@media (prefers-reduced-motion: reduce)` block neutralises
   CSS-driven animation as a safety net.
3. The 3D hero swaps entirely for the static contour SVG.

## interaction rules

- Controls are borderless. The only hover feedback is `opacity: 0.7`
  (`.tap`) — never a colour swap, never a glow, never a shadow.
- Hover styling is behind `@media (hover: hover)` so touch devices don't
  get stuck in a hover state after a tap.
- `:focus-visible` draws a 2px accent outline. With no borders or fills
  anywhere, this is the *only* thing marking keyboard position, so it is
  intentionally loud.
- `.touch-target` enforces the 44px minimum under `@media (pointer: coarse)`
  without inflating the denser desktop layout.
