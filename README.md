# broknowsaspot.wtf

a crowdsourced guide to hidden, offbeat, and adventurous spots — for people who
don't stick to the tourist path.

## stack

| layer      | choice                                             |
| ---------- | -------------------------------------------------- |
| framework  | Next.js (App Router) + TypeScript                  |
| styling    | Tailwind CSS v4 (CSS-first design tokens)          |
| 3d         | React Three Fiber + drei + three                   |
| motion     | Framer Motion                                      |
| maps       | Leaflet + react-leaflet                            |
| fonts      | JetBrains Mono + Inter, self-hosted via `next/font` |

## design language

Teenage Engineering flavoured industrial minimalism:

- everything lowercase in UI copy
- monospace for chrome/labels, humanist sans for long-form reading
- dead-flat surfaces — no shadows, no gradients, no elevation
- sections separated by a single hairline rule, never by cards
- borderless controls; hover is an opacity shift, never a colour swap
- near-black / near-white / one muted warm-orange accent used sparingly
- rigid Swiss grid, fluid `clamp()` type scale instead of breakpoint jumps

Both themes are authored independently — dark is not an inverted light theme.
Every token pair is contrast-checked; see `docs/design-tokens.md`.

## getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## scripts

| script              | does                                     |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | dev server                               |
| `npm run build`     | production build                         |
| `npm start`         | serve the production build               |
| `npm run lint`      | eslint                                   |
| `npm run typecheck` | `tsc --noEmit`                           |

## status

Scaffold stage. Data is served from an in-repo seed set through a mock API
route; Supabase/Postgres and auth land in a follow-up.
