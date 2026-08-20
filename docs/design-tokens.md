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

## the two planes

The design runs two materials, and which one a thing gets is decided by
one question: **does it float above the page, or is it part of it?**

|                | content plane                            | floating plane                       |
| -------------- | ---------------------------------------- | ------------------------------------ |
| what           | sections, prose, lists, fields, plates   | header, mobile bar, sheets, map controls |
| material       | flat `paper`, nothing behind it          | glass — translucent, blurred, top-lit |
| corners        | square, always                           | `--radius-glass` family              |
| separation     | one hairline                             | a specular edge and a rim            |
| shadow         | none                                     | none — the edge does the work        |

The content plane is unchanged and stays Swiss: flat surfaces, hairline
rules, no elevation, no radius. The floating plane is the only place
translucency, blur or a corner radius is allowed, and it is where the
Liquid Glass influence lives.

That split is the whole reconciliation. The two references pull opposite
ways — Teenage Engineering is matte and dead-flat, Liquid Glass is
depth and refraction — so mixing them per-element would produce neither.
Split by *role* instead and both are coherent: a flat instrument panel,
with a pane of glass in front of the parts that hover.

### glass tokens

| token                 | light                  | dark                   | is                                    |
| --------------------- | ---------------------- | ---------------------- | ------------------------------------- |
| `--glass-tint`        | `249 248 245`          | `18 18 16`             | the pane's own colour, as an RGB triplet |
| `--glass-alpha`       | `0.66`                 | `0.62`                 | resting opacity                        |
| `--glass-alpha-solid` | `0.93`                 | `0.92`                 | over busy content, or once scrolled    |
| `--glass-blur`        | `20px`                 | `22px`                 | backdrop blur radius                   |
| `--glass-saturate`    | `180%`                 | `165%`                 | colour behind is lifted, not just blurred |
| `--glass-specular`    | `rgba(255,255,255,.85)`| `rgba(255,255,255,.11)`| the top edge's light catch             |
| `--glass-shade`       | `rgba(18,18,15,.06)`   | `rgba(0,0,0,.34)`      | the bottom edge's shade                |
| `--glass-rim`         | `rgba(18,18,15,.10)`   | `rgba(255,255,255,.08)`| the outer hairline                     |

Dark glass leans **darker** than the page rather than lighter, and its
specular edge drops to a whisper. A bright pane over a near-black ground
reads as a lightbox, and a bright rim on a dark surface reads as a 2013
bevel.

These sit outside the `--tone-*` namespace on purpose: they are never text
colours, so the contrast guard has nothing to say about them. Anything a
word sits on still resolves to a `--tone-*` value.

### classes

- `.glass` — the material. Tint, backdrop blur, specular top edge, shaded
  bottom edge, and a `::before` carrying a faint top-lit gradient for the
  pane's thickness.
- `.glass-dense` — alpha only, for glass over a map or a photo. Because it
  changes nothing but opacity it can cross-fade without re-rasterising.
- `.glass-chip` — the same edge treatment with **no** backdrop filter, for
  a control sitting on a pane that is already glass (the theme toggle, the
  filters button). Blurring inside a blur costs a second full-region
  rasterisation to produce a worse result: the backdrop it samples is its
  already-blurred parent, so the effect compounds into mush.
- `.glass-rim`, `.glass-r` / `-sm` / `-lg` — edge and radius.

### two traps worth knowing

**`backdrop-filter` makes a containing block for `position: fixed`.**
Exactly as `transform` does. Anything fixed rendered *inside* a glass
element resolves against that element instead of the viewport — a modal
opened from the glass filter bar lands pinned under the masthead at the
bar's width. `Sheet` portals to `<body>` for this reason.

**Do not hand-write `-webkit-backdrop-filter`.** Lightning CSS adds the
prefix from the browser targets; writing it yourself makes it treat the
two declarations as one property and keep only the prefixed form, which
silently drops the blur in every browser wanting the standard name. That
failure is near-invisible in review, because the tint still lands and the
pane looks approximately right — it just never blurs.

### budget

`backdrop-filter` forces the compositor to re-blur the region behind it
whenever that region changes, which during a scroll on a phone is every
frame. The rule is **at most six live blurred surfaces at once** (explore,
the densest page, runs four), and the blur radius is never animated —
changing it re-rasterises, while changing opacity or transform does not.

Both fallbacks land on an opaque surface rather than on unreadable text
over a busy background: `@supports not (backdrop-filter: blur(1px))` for
browsers that cannot blur, and `@media (prefers-reduced-transparency:
reduce)` for readers who asked not to be shown translucency.

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

Presets live in `src/lib/motion/springs.ts`, tuned at or just under
critical damping (ζ ≈ 0.95–0.98) so nothing overshoots except `springPop`
(ζ ≈ 0.72), which is reserved for small physical affordances — a marker
landing, a press releasing.

`--ease-damped` is a `linear()` approximation of the same spring for CSS,
and `--ease-spring` is the overshooting one. Durations are tokens too:
`--dur-tap` (140ms), `--dur-ui` (240ms), `--dur-surface` (420ms).

**Most motion here is CSS, not JavaScript**, and deliberately. Scroll
reveals are a class an IntersectionObserver flips, with the stagger as a
delay derived from each child's index — so nothing samples a spring on the
main thread while the reader is scrolling, which is what a phone actually
cares about. Framer Motion is kept for the cases that genuinely need it:
discrete enter/exit (`Sheet`) and shared-element markers that travel
between nav destinations (`layoutId`).

### reveals fail visible

The reveal's hidden state lives under an `html.js` class that the
pre-paint script adds. The direction matters: content is visible by
default and JavaScript *opts it into* being hidden, so the hidden state
cannot outlive the script meant to undo it.

The previous implementation had it the other way round — Framer's
`initial` serialised into the SSR markup as `style="opacity:0"`, and
inline styles beat stylesheets, so a page whose bundle failed to load
rendered permanently blank. Anything added here must keep that property:
**if the JavaScript never arrives, the page is still readable.**

### reduced motion

1. CSS `@media (prefers-reduced-motion: reduce)` flattens reveals to
   visible with no transform and no transition, and neutralises the press
   physics.
2. `useReducedMotion()` collapses the Framer cases — the sheet crossfades
   instead of sliding, and the travelling nav marker stops travelling.
3. The counting readout does not run; it renders its final value.
4. The 3D hero swaps entirely for the static contour SVG.

## interaction rules

- Controls are borderless. Hover is `opacity` (`.tap`) — never a colour
  swap, never a glow, never a shadow.
- `.press` is the control idiom: a small inward scale on contact,
  springing back on release. On a touch screen this is the whole feedback
  story, since there is no hover to confirm a finger landed correctly.
  `.press-pane` is its variant for a whole glass panel, which sinks rather
  than shrinking.
- A state change that can be *drawn* is drawn: the CTA underline, the
  field's focus rule and the filter's active mark all sweep in from their
  left origin rather than switching colour. One composited transform, and
  it reads as a response rather than as a repaint.
- Hover styling is behind `@media (hover: hover)` so touch devices don't
  get stuck in a hover state after a tap.
- `:focus-visible` draws a 2px accent outline. With no borders or fills
  anywhere, this is the *only* thing marking keyboard position, so it is
  intentionally loud.
- `.touch-target` enforces the 44px minimum under `@media (pointer: coarse)`
  without inflating the denser desktop layout.
