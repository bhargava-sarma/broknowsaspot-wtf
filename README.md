# broknowsaspot.app

a crowdsourced guide to hidden, offbeat, and adventurous spots — for people who
don't stick to the tourist path.

Live at **<https://broknowsaspot.app>**.

## stack

| layer     | choice                                              |
| --------- | --------------------------------------------------- |
| framework | Next.js (App Router) + TypeScript                   |
| data      | Appwrite Cloud (TablesDB)                           |
| styling   | Tailwind CSS v4 (CSS-first design tokens)           |
| 3d        | React Three Fiber + drei + three                    |
| motion    | Framer Motion                                       |
| maps      | Leaflet + react-leaflet                             |
| fonts     | JetBrains Mono + Inter, self-hosted via `next/font` |
| hosting   | Vercel, deployed from `main`                        |

## getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

With no Appwrite credentials in the environment the site runs, but the index
is empty and every write route answers 503. See [data](#data) for standing up
a database of your own.

| script                | does                                       |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | dev server                                 |
| `npm run build`       | production build                           |
| `npm start`           | serve the production build                 |
| `npm run check`       | typecheck, lint, contrast, format — all of it |
| `npm run lint`        | eslint                                     |
| `npm run typecheck`   | `tsc --noEmit`                             |
| `npm run format`      | prettier, writing in place                 |
| `npm run check:contrast` | assert every token pair meets its contrast target |

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
Every token pair is contrast-checked; see [`docs/design-tokens.md`](docs/design-tokens.md).

## routes

| route                      | what it is                                                    |
| -------------------------- | ------------------------------------------------------------- |
| `/`                        | hero (3D field), manifesto, readout                           |
| `/explore`                 | Leaflet map + faceted filters over the index                  |
| `/spot/[slug]`             | detail: plates, write-up, access notes, dated community notes |
| `/submit`                  | submission form with a map picker                             |
| `/admin`                   | moderation queue — hidden entries, report counts, audit log   |
| `/admin/login`             | admin sign-in. no sign-up link, deliberately                  |
| `/api/spots`               | `GET` the index · `POST` a submission                         |
| `/api/spots/[slug]/notes`  | `POST` a community note                                       |
| `/api/spots/[slug]/report` | `POST` a report                                               |

Spot pages prerender from `generateStaticParams` and revalidate every five
minutes, so an added spot appears without a redeploy. `dynamicParams` is on,
so a slug created after the last build renders on demand instead of 404ing.

## data

Appwrite Cloud, using the TablesDB API. Six tables: `spots` and `notes` are
publicly readable per row; `reports`, `submission_log`, `note_log` and
`moderation_log` are readable only by the `admins` team.

[`src/lib/appwrite/schema.ts`](src/lib/appwrite/schema.ts) is the only
description of that database that exists — Appwrite offers nothing to dump a
live schema back out, so both the provisioner and the verifier read this one
file and cannot disagree about what the schema is supposed to be.

| script                       | does                                     |
| ---------------------------- | ---------------------------------------- |
| `npm run appwrite:provision` | database, tables, columns, indexes, team |
| `npm run appwrite:seed`      | the 14 seed spots and their notes        |
| `npm run appwrite:verify`    | assert the security model against it     |
| `npm run appwrite:setup`     | provision, seed and verify in order      |
| `npm run appwrite:admin`     | create the first moderator               |

All of them need `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID` and
`APPWRITE_API_KEY`; `appwrite:admin` additionally takes `ADMIN_EMAIL` and
`ADMIN_PASSWORD`. `appwrite:provision` is idempotent — it reads the live
columns first and writes only genuine differences, so re-running it on a
populated database is safe.

### api key scopes

| scope                                    | for                                                             |
| ---------------------------------------- | --------------------------------------------------------------- |
| `databases.read` / `databases.write`     | the database itself                                             |
| `tables.read` / `tables.write`           | tables, columns, indexes                                        |
| `collections.read` / `collections.write` | the legacy names for the same                                    |
| `documents.read` / `documents.write`     | rows                                                            |
| `teams.read` / `teams.write`             | the admins team                                                  |
| `users.read` / `users.write`             | **`appwrite:admin` only** — the one script that touches accounts |
| `sessions.write`                         | **the running app** — `/admin/login` creates sessions server-side |

The key deployed to Vercel needs `sessions.write` even though no script uses
it. Appwrite has no cookie-based SSR helper, so `/admin/login` creates the
session with the API key and puts the returned secret in an httpOnly cookie.
Without that scope sign-in fails for every password — which is
indistinguishable, from the form, from getting one wrong.

### reading

[`src/lib/data/spots-repo.ts`](src/lib/data/spots-repo.ts) is the only way
pages read spots, and it reports failure rather than substituting anything:

| returns              | means                            |
| -------------------- | -------------------------------- |
| `Spot[]` (non-empty) | real data                        |
| `Spot[]` (empty)     | the index is genuinely empty     |
| `null`               | the index could not be reached   |

That distinction is load-bearing. An earlier version fell back to the in-repo
seed set on failure, which meant an outage silently republished spots a
moderator had deliberately taken down. An empty index now renders as an empty
index.

Public reads go through a **guest client with no API key**, so what comes back
is exactly what a browser could fetch. Hidden and removed entries are not
filtered out by a query that could be wrong — Appwrite never hands them over.

### the visibility invariant

Appwrite permissions are access-control lists, not predicates over the row's
data. There is no way to say "readable by anyone *while* `hiddenAt` is null",
so visibility is carried in two places at once:

- `hiddenAt` / `removedAt` — the data, and the audit trail
- each row's `$permissions` — the enforcement

Two copies of one fact can drift. Three things hold them together:

1. One code path writes either of them, and it writes both.
2. It does so inside a transaction, so a partial write rolls back.
3. `appwrite:verify` asserts every row's permissions match its state.

**Treat a failure of (3) as a live exposure, not a failing test.** A row whose
data says hidden and whose ACL says `any` is publicly readable, and that check
is the only thing that would ever say so. Its output separates the two cases
explicitly: schema drift tells you to re-run `appwrite:provision`, an exposure
does not.

Notes cascade by hand for the same reason. An ACL cannot reference another
row, so "public while the parent spot is visible" is not expressible as a
rule — hiding a spot rewrites every one of its notes' permissions in the same
transaction.

### validation

[`src/lib/spots/validate.ts`](src/lib/spots/validate.ts) holds **one**
validator. It runs in the browser for the submission form and again in the
`POST` handler. The client copy is a convenience for fast inline feedback; the
server copy is the enforcement point, and neither can drift from the other.

Appwrite column sizes cover upper bounds only. Minimums — `summary` of at
least ten characters, and so on — have no schema-level equivalent, so the
validators are the only thing enforcing them.

### photography

`photos[].src` is `null` throughout and the gallery renders a deterministic
terrain plate per caption. Populating the field with real URLs is a data
change — `SpotPlate` already renders `next/image` when a `src` is present.

## submissions, notes and moderation

Submissions publish immediately — nothing waits in a queue. Community notes
do too: no account, 10 per hour per person.

Reporting is what takes an entry down. Enough distinct people reporting a spot
auto-hides it, with every reason counting the same. The threshold itself lives
only in server-only code and is never rendered anywhere, because publishing
how close an entry is to coming down is a progress bar for brigading.

"Distinct people" is approximated by an HMAC of the client address, keyed with
`REPORTER_KEY_SALT`. Only the HMAC is stored, so the database never holds
anything that resolves back to a person. It is not an identity — everyone
behind one NAT shares an address, and a VPN grants as many as you like — it
raises the cost of gaming the threshold without making it impossible. The salt
must stay pinned for the life of the deployment: rotating it renumbers
everyone, so reports filed before the change stop counting against reports
filed after it.

Rate-limit keys live in their own admin-only tables rather than on the
published rows, because a key stored alongside a publicly readable note is a
publicly readable key.

### the admin surface

`/admin` is gated on membership in the `admins` team, not on merely being
signed in — Appwrite accepts public sign-ups by default, so "has an account"
and "may moderate" have to be two different questions.

The gate that protects the data is not the app's own check. The queue is read
through the **signed-in admin's session**, so hidden rows come back only
because they carry `read("team:admins")` and Appwrite agrees. Measured with a
real non-admin session:

```
admin queue      -> 14
NON-ADMIN queue  -> 13
non-admin log    -> refused 401
```

A membership check that was somehow wrong yields an empty queue rather than a
full one.

`src/proxy.ts` bounces visitors with no session cookie to the login screen.
That is routing, not authorisation: it reads whether a cookie exists and
cannot tell a real secret from an invented one. It runs on `/admin` only —
paying anything on every public page view to learn that nobody is signed in
would be waste.

**No row grants create, update or delete to anyone**, so a browser cannot
write to this database at all. Every write comes through a route handler on
the API key, which is what keeps Turnstile, the rate limiter and the validator
on the only path in. Every visibility change writes its audit row in the same
transaction as the change, which is what makes the moderation log complete by
construction — including automatic hides, which are logged with no actor so
the screen can say plainly that no person decided them.

## the 3d hero

An ambient topographic point field behind the homepage headline — the same
survey-contour motif as the SVG fallback, given depth. It is background
texture, not a centrepiece, and it is budgeted accordingly.

| rule                      | how it's met                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------- |
| cap devicePixelRatio at 2 | `dpr={[1, 2]}` on `<Canvas>` — **measured 2.0 at a device ratio of 3**               |
| InstancedMesh for repeats | one `InstancedMesh`, ~3.7k instances, one geometry, one material                     |
| draw calls under ~100     | **measured 2 per frame**                                                             |
| light triangle count      | ~7.5k (2 per instance)                                                               |
| no allocation in the loop | instance matrices written once on mount; the loop only increments a group rotation   |
| simple materials          | `MeshBasicMaterial`; the scene is unlit, so there are no lights at all               |
| never block first paint   | dynamic import, `ssr: false`; three.js is not in the initial bundle                  |
| pause when hidden         | IntersectionObserver + `visibilitychange` flip `frameloop` — **measured ~8fps → ~1** |
| mobile                    | no canvas is created at all — **measured 0 WebGL contexts, 0 draw calls**            |
| dispose on unmount        | geometry and material disposed explicitly in an effect cleanup                       |

Numbers come from Playwright probes that patch the WebGL context prototypes
and count real `drawElements*` calls, so they measure GPU work rather than
three.js's own bookkeeping. Frame rates were captured under SwiftShader
(software rasterisation, headless) and are a floor, not a representative
figure for real hardware.

The hero degrades to the static contour SVG on mobile, under
`prefers-reduced-motion`, and where WebGL is unavailable — all three verified.

## deploying

Production is **Vercel**, deployed from `main`. Nothing special is required:
Next.js is detected automatically and the default build settings are correct.

Environment variables live in the Vercel dashboard. Anything prefixed
`NEXT_PUBLIC_` is compiled into the browser bundle and is readable by anyone;
everything else stays server-side.

| variable                          | exposure | notes                                       |
| --------------------------------- | -------- | ------------------------------------------- |
| `APPWRITE_ENDPOINT`               | server   | e.g. `https://sgp.cloud.appwrite.io/v1`     |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | public   | identifies the project; not a secret        |
| `APPWRITE_API_KEY`                | secret   | server-only, never `NEXT_PUBLIC_`           |
| `REPORTER_KEY_SALT`               | secret   | **required for writes**; pin it and keep it |
| `NEXT_PUBLIC_SITE_URL`            | public   | `https://broknowsaspot.app`                 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`  | public   | Cloudflare Turnstile widget                 |
| `TURNSTILE_SECRET_KEY`            | secret   | **required for writes in prod**             |

The project id is accepted as either `NEXT_PUBLIC_APPWRITE_PROJECT_ID` or
`APPWRITE_PROJECT_ID` everywhere, because the scripts want the bare name and
the app needs the value where only `NEXT_PUBLIC_` variables are reliable.
Setting one is enough; setting the wrong one alone gives a working app and
broken scripts with no error that says so.

Missing `REPORTER_KEY_SALT` does not fall back to anything. A default would be
predictable, so the write routes answer 503 instead of accepting writes they
cannot attribute.

## the domain

`broknowsaspot.app`, served from Vercel. Apex is canonical; `www` redirects to
it.

`.app` is on the [HSTS preload list](https://hstspreload.org), which is a
registry-level rule rather than a site setting: browsers refuse plain HTTP to
any `.app` host and there is no way to opt out. That is a good default, and it
has one practical consequence — during DNS propagation the site is not
reachable *at all* rather than reachable over HTTP, so a blank page in that
window is expected rather than a misconfiguration.

The name lives in `src/lib/site.ts` and nowhere else. It used to be a string
typed into nine files, which is how a rename gets done eight times.

## known gaps

- **Tiles are on CARTO's free basemaps**, which are not a production plan.
  Verified rendering in both themes on the live deploy; get a proper tile
  account (CARTO, MapTiler, Mapbox) before any real traffic. Swapping provider
  is a one-line change to `TILE_URL` in the map components.
- No photo uploads; `photos[].src` is still `null` everywhere.
- Proximity search is unbuilt, though the schema is ready for it: `location`
  is a `Point` with a spatial index, so `Query.distanceLessThan` is a query
  away.
- Filters are component state, not URL state — no shareable filtered views.
- Notes can be moderated but not reported; only spots have a report path.
- No email flows. An admin who forgets their password needs a reset from the
  Appwrite console.

## why dated notes

A spot entry is written once; conditions are not. A gate gets chained, a path
washes out, a landowner puts up signs — and a dated note from someone who went
last month is the only thing that carries that to the next person. Hence
`notedOn` being separate from `$createdAt`: *when the visit happened* is what
decides whether the information is still worth anything.
