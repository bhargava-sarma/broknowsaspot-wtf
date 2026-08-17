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
| `/api/spots`   | `GET` the index · `POST` a submission                         |
| `/api/spots/[slug]/report` | `POST` a report                                   |

Spot pages prerender from `generateStaticParams` and revalidate every five
minutes, so an added spot appears without a redeploy. `dynamicParams` is on,
so a slug created after the last build renders on demand instead of 404ing.

## data

Postgres on Supabase, with PostGIS. Schema, migrations and the reasoning
behind them live in [`supabase/README.md`](supabase/README.md).

`src/lib/data/spots-repo.ts` is the only way pages read spots, and **every
read falls back to the in-repo seed set** when the database is unreachable.
That is load-bearing rather than defensive decoration: Supabase's Vercel
integration syncs credentials as soon as the projects are linked, which is
*before* anyone runs the migrations. Without the fallback the live site
would 500 on every page during that window.

The ladder is: no credentials → seed; credentials but the query fails or
throws → log and seed; query succeeds → real data. The site is never down
because of a half-finished migration.

`src/lib/spots/validate.ts` holds **one** validator. It runs in the browser
for the submission form and again in the `POST` handler. The client copy is
a convenience for fast inline feedback; the server copy is the enforcement
point, and neither can drift from the other.

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
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`| public   | Cloudflare Turnstile widget        |
| `TURNSTILE_SECRET_KEY`          | secret   | **required for writes in prod**    |

The Supabase → Vercel integration syncs the first three automatically.


## known gaps

- **Tiles are on CARTO's free basemaps**, which are not a production plan.
  Verified rendering in both themes on the live deploy; get a proper tile
  account (CARTO, MapTiler, Mapbox) before any real traffic. Swapping
  provider is a one-line change to `TILE_URL` in the map components.
- Filters are component state, not URL state — no shareable filtered views
  yet.
- **No admin screen yet.** Moderation happens in the Supabase Table Editor:
  set `hidden_at` to hide, clear it to restore. The admin UI is next.
- Report counts are only visible in the database, by design.
- No photo uploads; `photos[].src` is still `null` everywhere.

## status

Live on Vercel, reading and writing Supabase. Submissions publish
immediately and are reportable; ten distinct reports auto-hide an entry.
Admin moderation UI and photo uploads are next.
