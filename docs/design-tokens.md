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

Keep both rule bodies **flat**. The contrast guard reads them with a
brace-naive regex, so a nested block would silently truncate the match.

## the direction

**Aurora** — warm firelight against a cold sky.

Dark is midnight with the aurora at full strength. Light is the same idea
at dawn: a cool, faintly violet white with the light turned down to a wash,
because a pale ground turns into smeared pastel otherwise. The two are
authored independently; dark is **not** an inversion.

## palette

| token          | light (dawn) | dark (midnight) | used for                       |
| -------------- | ------------ | --------------- | ------------------------------ |
| `paper`        | `#f6f4fb`    | `#0a0912`       | page ground                    |
| `paper-raised` | `#eceaf6`    | `#151327`       | recessed wells, map chrome     |
| `ink`          | `#171326`    | `#f2eff5`       | primary text                   |
| `muted`        | `#4b4462`    | `#b6aecb`       | secondary text                 |
| `faint`        | `#645b7d`    | `#8b83a6`       | meta, labels, inactive nav     |
| `rule`         | `#cac3e0`    | `#363059`       | the hairline                   |
| `rule-strong`  | `#171326`    | `#f2eff5`       | emphatic hairline              |
| `accent`       | `#b53d13`    | `#ff7a45`       | the ember — one filled control per screen |
| `accent-ink`   | `#fff7f2`    | `#1a0d06`       | text on an accent fill         |

The ember drops several steps for the light theme. The dark value on a pale
ground fails contrast outright, and the point of an accent that means "this
one" is that it can carry text.

### measured contrast

`npm run check:contrast` fails the build if any of these regress.

| pairing                | light   | dark    | floor |
| ---------------------- | ------- | ------- | ----- |
| ink / paper            | 16.63:1 | 17.39:1 | 4.5   |
| muted / paper          | 8.36:1  | 9.34:1  | 4.5   |
| faint / paper          | 5.77:1  | 5.56:1  | 4.5   |
| accent / paper         | 5.29:1  | 7.66:1  | 4.5   |
| accent / paper-raised  | 4.85:1  | 7.04:1  | 4.5   |
| accent-ink / accent    | 5.45:1  | 7.36:1  | 4.5   |
| rule / paper           | 1.55:1  | 1.63:1  | 1.45  |

## the aurora

Three light fields, as RGB triplets so they can be used at any alpha.

| token                | light         | dark          |
| -------------------- | ------------- | ------------- |
| `--aurora-ice`       | `96 170 255`  | `96 214 255`  |
| `--aurora-violet`    | `168 110 255` | `168 110 255` |
| `--aurora-ember`     | `255 122 69`  | `255 122 69`  |
| `--aurora-strength`  | `0.2`         | `0.55`        |
| `--starfield-opacity`| `0`           | `0.5`         |

`--aurora-strength` is the whole light/dark story for this layer: at dawn
the fields are a wash, at midnight they are the light source. The starfield
is simply off in light — stars at dawn are noise.

These sit outside the `--tone-*` namespace on purpose: they are never text
colours, so the contrast guard has nothing to say about them. Anything a
word sits on still resolves to a `--tone-*` value.

## type

Two families, through `next/font` (self-hosted at build time, size-adjusted
fallbacks, no FOUC):

- **Instrument Serif** — every title, and the italic that carries the
  gradient accent in the hero. One weight only, so `weight` and `style` are
  listed explicitly rather than omitted.
- **Manrope** — everything else, loaded as a variable font so the 300 used
  for lede paragraphs and the 600 used for labels are one download.

There is no third face, and no mono.

The scale is fully fluid. Every step is a `clamp()` interpolating on
viewport width between a 375px floor and a ~1600px ceiling, so there are no
breakpoint jumps in type size at all.

| token   | min  | max   | family  | used for               |
| ------- | ---- | ----- | ------- | ---------------------- |
| `micro` | 11px | 12px  | sans    | `.eyebrow` labels      |
| `tiny`  | 12px | 13px  | sans    | meta, chips, captions  |
| `small` | 13px | 14.5px| sans    | dense body             |
| `body`  | 15px | 17px  | sans    | prose                  |
| `lead`  | 17px | 22px  | sans    | intro paragraphs       |
| `h3`    | 22px | 31px  | serif   | card titles            |
| `h2`    | 30px | 52px  | serif   | section titles         |
| `h1`    | 44px | 96px  | serif   | page titles            |
| `mega`  | 56px | 132px | serif   | the homepage hero only |

Display steps carry tighter leading and negative tracking — a serif at
those sizes reads loose and Victorian otherwise.

`.eyebrow` is the counterweight to a soft display serif: uppercase, 0.22em
tracking, 600 weight, `faint`.

## glass — one material, three depths

Depth is **blur radius**, not shadow spread. A chip barely disturbs what is
behind it; a sheet takes the whole ground with it.

| class      | blur | phone | what it is                              |
| ---------- | ---- | ----- | --------------------------------------- |
| `.glass-1` | 14px | 10px  | chips, segments, map controls           |
| `.glass`   | 28px | 20px  | the default — cards, nav, form sections |
| `.glass-3` | 44px | 30px  | sheets, dialogs, the mobile filter tray |

Phones drop one step across the board. A phone is where the scroll is, and
every blurred pixel is paid for on the compositor.

### the edge

Every tier carries the same three marks, and they are what make it read as
glass rather than as a grey box:

| token               | light                    | dark                      | is                                  |
| ------------------- | ------------------------ | ------------------------- | ----------------------------------- |
| `--glass-specular`  | `rgba(255,255,255,.95)`  | `rgba(255,255,255,.34)`   | inset top edge — the rim's light catch |
| `--glass-shade`     | `rgba(23,19,38,.07)`     | `rgba(0,0,0,.22)`         | inset bottom edge — the glass's thickness |
| `--glass-lens`      | `rgba(255,255,255,.70)`  | `rgba(255,255,255,.20)`   | the `::before` highlight off the top-left |
| `--glass-rim`       | `rgba(23,19,38,.09)`     | `rgba(255,255,255,.13)`   | the outer hairline                  |
| `--glass-cast`      | `0 24px 60px -28px …`    | `0 28px 70px -26px …`     | the shadow it casts on the ground   |

**Light falls from the top left.** Every rim highlight, lens gradient and
cast shadow in the app agrees on that; a surface lit from anywhere else
stops reading as the same pane.

The glass flips direction with the theme. Light glass is frosted white
lifted **off** the ground — a pane that matches the page exactly reads as
flat fog. Dark glass leans **lighter** than its ground, because a dark pane
on a near-black page has no edge to catch and reads as a hole.

### wells

Form controls are cut **into** the surface rather than raised off it —
`--well-fill`, `--well-rim`, `--well-inner`. Everything else in the app
floats, and if a field floated too, a form would read as a stack of panes
with no hierarchy. `.well:focus-within` lights the whole recess rather than
a line under it, which also means there is no focus state to track in React.

### helpers

- `.sheen` — a specular band crossing the surface once on hover. Never loops.
- `.lift` — hover on a card: up 6px, with the cast shadow deepening.
- `.press` / `.press-pane` — touch. Scale to 0.972, or sink 1px for a pane.
- `.glass-isolate` — `isolation: isolate`, for a pane wrapping the map.
- `.ember` — the one filled control in the app.

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
frame. The rule is **at most six live blurred surfaces at once**, and the
blur radius is never animated — changing it re-rasterises, while changing
opacity or transform does not.

Both fallbacks land on an opaque surface rather than on unreadable text
over a busy background: `@supports not (backdrop-filter: blur(1px))` for
browsers that cannot blur, and `@media (prefers-reduced-transparency:
reduce)` for readers who asked not to be shown translucency.

## radius

Continuous and generous, scaled to the surface so the curvature reads the
same on a chip as on a sheet. Nothing in the app is square any more.

`--radius-xs` 10px · `--radius-sm` 13px · `--radius-md` 18px ·
`--radius-lg` 24px · `--radius-xl` 30px · `--radius-2xl` 38px

## layout

- `--gutter` — `clamp(1rem, 0.62rem + 1.6vw, 2rem)`, the only horizontal
  spacing value. Used as page padding *and* as grid gap so the rhythm is
  consistent everywhere.
- `--shell-max` — `90rem` container ceiling.
- `--bar-h` — `3.5rem`, shared by the floating header and the mobile bar,
  and used as `scroll-padding-top` so anchors clear the header.

## motion

**Two speeds, and that is the whole contract.**

Anything that responds to you resolves inside `--dur-surface` and settles
without a bounce — glass is heavy, and a bouncing pane reads as plastic.
Anything ambient runs on the minute scale, slow enough to be felt rather
than watched.

| token           | value  | for                                     |
| --------------- | ------ | --------------------------------------- |
| `--dur-tap`     | 220ms  | press                                   |
| `--dur-ui`      | 380ms  | colour and state changes                |
| `--dur-surface` | 620ms  | hover lift, sheen, anything on a surface |
| `--dur-enter`   | 1150ms | scroll reveals                          |

`--ease-glass` is `cubic-bezier(0.16, 0.84, 0.28, 1)`: nearly all of the
distance in the first third, then it coasts. Fast to start feels
responsive; no overshoot keeps glass feeling heavy. `--ease-spring` is kept
for the few things that should feel picked up rather than set down.

Ambient periods are deliberately unrelated — the aurora fields run at 52s,
61s, 67s and 79s — so they never re-sync into a loop you can catch.

**Most motion here is CSS, not JavaScript**, and deliberately. Scroll
reveals are a class an IntersectionObserver flips, with the stagger as a
delay derived from each child's index — so nothing samples a spring on the
main thread while the reader is scrolling, which is what a phone actually
cares about. Framer Motion is kept for the cases that genuinely need it:
discrete enter/exit (`Sheet`) and shared-element markers that travel
between nav destinations (`layoutId`).

The sheet arrives on a spring and leaves on a curve. Measured, the spring
exit took over 800ms to clear the screen — dismissing something has to feel
immediate, so `exit` carries its own 260ms transition.

The theme cross-fade is **220ms**, not 240: `ThemeProvider` strips the
`.theme-transition` class after 240ms, and a transition longer than that
window gets cut off mid-fade. The two numbers have to be read together.

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
   visible with no transform, blur or transition, stops the aurora
   (`animation: none`, `will-change: auto`) and neutralises the press
   physics.
2. `useReducedMotion()` collapses the Framer cases — the sheet crossfades
   instead of sliding, and the travelling nav marker stops travelling.
3. The counting readout does not run; it renders its final value.

## interaction rules

- **One filled control per screen.** `.ember` is the primary action;
  everything else is glass or nothing. Use it twice and it stops meaning
  "this one".
- **A chosen thing is a lit key.** The active nav tab, the chosen segment
  in a form, and the active filter chip are all the same figure — an inked
  fill with a specular top edge — so there is nothing new to learn anywhere.
- Hover styling is behind `@media (hover: hover)` so touch devices don't
  get stuck in a hover state after a tap.
- `:focus-visible` draws a 2px accent outline. It is the *only* thing
  marking keyboard position, so it is intentionally loud.
- `.touch-target` enforces the 44px minimum under `@media (pointer: coarse)`
  without inflating the denser desktop layout.
