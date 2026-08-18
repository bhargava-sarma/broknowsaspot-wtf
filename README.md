# broknowsaspot.app

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
| `/admin`       | moderation queue — hidden entries, report counts, audit log   |
| `/admin/login` | admin sign-in. no sign-up link, deliberately                  |
| `/api/spots`   | `GET` the index · `POST` a submission                         |
| `/api/spots/[slug]/notes`  | `POST` a community note                           |
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

## the domain

`broknowsaspot.app`, served from Vercel. Apex is canonical; `www` redirects
to it.

`.app` is on the [HSTS preload list](https://hstspreload.org), which is a
registry-level rule rather than a site setting: browsers refuse plain HTTP
to any `.app` host and there is no way to opt out. That is a good default
and it has one practical consequence — during DNS propagation the site is
not reachable *at all* rather than reachable over HTTP, so a blank page in
that window is expected rather than a misconfiguration.

The name lives in `src/lib/site.ts` and nowhere else. It used to be a
string typed into nine files, which is how a rename gets done eight times.

## the appwrite migration

In progress. The data layer is moving from Supabase to Appwrite for the
storage and bandwidth headroom, and because a Supabase Free project pauses
after seven days of inactivity.

Reads dispatch on configuration, in `src/lib/data/spots-repo.ts`:

```ts
const backend = isAppwriteConfigured ? "appwrite" : "supabase";
```

So the cutover is an environment change rather than a deploy, and both
paths end at the same seed fallback — neither can take the site down while
the other is being stood up. The branch goes away with the Supabase
modules once production has read from Appwrite long enough to trust it.

| script                     | does                                       |
| -------------------------- | ------------------------------------------ |
| `npm run appwrite:provision` | create the database, tables, columns, indexes and the admins team |
| `npm run appwrite:seed`      | load the 14 seed spots and their notes    |
| `npm run appwrite:verify`    | assert the security model against a live project |

All three need `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID` and
`APPWRITE_API_KEY` in the environment.

**The thing to understand before changing anything here.** Supabase
expressed visibility as a predicate the database evaluated:

```sql
using (hidden_at is null and removed_at is null)
```

Appwrite permissions are access-control lists, not predicates over the
row. So visibility lives in two places — `hiddenAt`/`removedAt` as data,
and the row's own `$permissions` as enforcement — and those can drift in a
way Postgres made structurally impossible. Three things hold them
together: one code path writes both, it does so inside a transaction, and
`appwrite:verify` asserts every row's permissions match its state. Treat a
failure there as a live exposure rather than a failing test.

Public reads use a **guest client with no API key**, so the rows that come
back are exactly the rows a browser could fetch. That is what keeps "a bug
in the query leaks nothing" true after losing RLS.

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
| `NEXT_PUBLIC_SITE_URL`          | public   | `https://broknowsaspot.app`        |
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
- Report counts are visible to admins only, by design — publishing how
  close an entry is to the threshold is a progress bar for brigading.
- No photo uploads; `photos[].src` is still `null` everywhere.
- No email flows: an admin who forgets their password needs a reset from
  the Supabase dashboard.

## notes

A spot entry is written once; conditions are not. A gate gets chained, a
path washes out, a landowner puts up signs — and a dated note from someone
who went last month is the only thing that carries that to the next
person. Hence `noted_on` being separate from `created_at`: *when the visit
happened* is what decides whether the information is still worth anything.

No account, published immediately, 10 per hour per person. The rate-limit
key lives in its own table rather than on `spot_notes`, because RLS
filters rows and not columns — a key stored alongside a publicly readable
note is a publicly readable key.

## moderation

Submissions publish immediately — nothing waits in a queue. Ten distinct
people reporting an entry auto-hides it, every reason counting the same.

`/admin` is where that gets reviewed. It is gated on membership in
`public.admins`, not on merely being signed in, and the gate is enforced
by Postgres rather than by the app: admin pages read as the signed-in user
under row level security, so a bug in the app's own check leaks nothing.

`anon` holds no EXECUTE on any admin function either, so an anonymous
client cannot reach even the membership check.

There is **no INSERT, UPDATE or DELETE policy anywhere in the schema**, for
any role, admins included. Every visibility change goes through one
function that writes the change and its audit row in a single transaction,
which is what makes the moderation log complete by construction. The full
reasoning is in [`supabase/README.md`](supabase/README.md).

## status

Live on Vercel, reading and writing Supabase. Spots and notes are both
open for contribution, and both are moderated from `/admin`. Photo uploads
are next.
