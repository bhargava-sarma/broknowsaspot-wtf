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
| `/api/spots`   | mock API — `GET` lists, `POST` validates and accepts          |

Spot pages are statically generated from `generateStaticParams`, so all 14
seed entries prerender.

## data

`src/lib/data/spots.ts` is the stand-in for the database. Coordinates are
real; write-ups are illustrative.

`src/lib/spots/validate.ts` holds **one** validator, used by both the
submission form (for inline feedback) and the API route (for enforcement) —
the client copy is a convenience, never the gate.

`POST /api/spots` validates and returns `201` with the accepted draft, but
does not persist: the process is stateless, and an in-memory store would
start lying the moment there were two instances. The handler bodies are the
only thing that needs replacing when Supabase lands.

Photography doesn't exist yet, so `photos[].src` is `null` throughout and
the gallery renders a deterministic terrain plate per caption. Populating
the field with real URLs is a data change — `SpotPlate` already renders
`next/image` when a `src` is present.

## known gaps

- **Tiles are unverified from CI.** CARTO basemap tiles (and any remote
  image host) are blocked by the sandbox's egress policy, so the map was
  verified with markers, controls and interaction but never with raster
  tiles actually painted. Swap `TILE_URL` in the map components for another
  provider if needed.
- Filters are component state, not URL state — no shareable filtered views
  yet.
- No persistence, no auth. Both land with the database.

## status

Scaffold stage. Data is served from an in-repo seed set through a mock API
route; Supabase/Postgres and auth land in a follow-up.
