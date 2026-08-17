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

## the 3d hero

An ambient topographic point field behind the homepage headline — the same
survey-contour motif as the SVG fallback, given depth. It is background
texture, not a centrepiece, and it is budgeted accordingly.

| rule                        | how it's met                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------- |
| cap devicePixelRatio at 2   | `dpr={[1, 2]}` on `<Canvas>` — **measured 2.0 at a device ratio of 3**              |
| InstancedMesh for repeats   | one `InstancedMesh`, ~3.7k instances, one geometry, one material                    |
| draw calls under ~100       | **measured 2 per frame**                                                             |
| light triangle count        | ~7.5k (2 per instance)                                                               |
| no allocation in the loop   | instance matrices written once on mount; the loop only increments a group rotation  |
| simple materials            | `MeshBasicMaterial`; the scene is unlit, so there are no lights at all               |
| never block first paint     | dynamic import, `ssr: false`; three.js is not in the initial bundle                  |
| pause when hidden           | IntersectionObserver + `visibilitychange` flip `frameloop` — **measured ~8fps → ~1** |
| mobile                      | no canvas is created at all — **measured 0 WebGL contexts, 0 draw calls**            |
| dispose on unmount          | geometry and material disposed explicitly in an effect cleanup                       |

Numbers come from `scripts/`-adjacent Playwright probes that patch the
WebGL context prototypes and count real `drawElements*` calls, so they
measure the GPU work rather than three.js's own bookkeeping. Frame rates
were captured under SwiftShader (software rasterisation, headless) and are
a floor, not a representative figure for real hardware.

The hero degrades to the static contour SVG on mobile, under
`prefers-reduced-motion`, and where WebGL is unavailable — all three
verified.

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

## routes

| route          | what it is                                                    |
| -------------- | ------------------------------------------------------------- |
| `/`            | hero (3D field), manifesto, readout                           |
| `/explore`     | Leaflet map + faceted filters over the seed index             |
| `/spot/[slug]` | detail: plates, write-up, access notes, dated community notes |
| `/submit`      | submission form with a map picker                             |
| `/api/spots`   | the seed index as JSON (`GET` only until the database lands)  |

Spot pages are statically generated from `generateStaticParams`, so all 14
seed entries prerender.

## data

`src/lib/data/spots.ts` is the stand-in for the database. Coordinates are
real; write-ups are illustrative.

`src/lib/spots/validate.ts` holds **one** validator. It runs in the browser
for the submission form today, and it is the same function a server will run
once there is one — so the rules never get reimplemented on two sides and
drift apart.

Nothing is persisted anywhere yet. `SpotDraft` is already the payload shape
and `validateDraft` is already the contract, so adding `POST` back alongside
a Supabase-backed runtime is additive rather than a rewrite.

Photography doesn't exist yet, so `photos[].src` is `null` throughout and
the gallery renders a deterministic terrain plate per caption. Populating
the field with real URLs is a data change — `SpotPlate` already renders
`next/image` when a `src` is present.

## deploying

Production is **Vercel**, deployed from `main`. Nothing special is required:
Next.js is detected automatically and the default build settings are correct.

Environment variables live in the Vercel dashboard. Anything prefixed
`NEXT_PUBLIC_` is compiled into the browser bundle and is readable by anyone;
everything else stays server-side.

| variable                        | exposure | notes                              |
| ------------------------------- | -------- | ---------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | public   | project URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public   | publishable / anon key             |
| `SUPABASE_SERVICE_ROLE_KEY`     | secret   | server-only, never `NEXT_PUBLIC_`  |
| `NEXT_PUBLIC_SITE_URL`          | public   | absolute URLs in OG metadata       |

The Supabase → Vercel integration syncs the first three automatically.


## known gaps

- **Tiles are on CARTO's free basemaps**, which are not a production plan.
  Verified rendering in both themes on the live deploy; get a proper tile
  account (CARTO, MapTiler, Mapbox) before any real traffic. Swapping
  provider is a one-line change to `TILE_URL` in the map components.
- Filters are component state, not URL state — no shareable filtered views
  yet.
- No persistence, no auth. Both land with the database.

## status

Live on Vercel, reading from an in-repo seed set. Supabase/Postgres, real
persistence, submissions and admin moderation land next.
