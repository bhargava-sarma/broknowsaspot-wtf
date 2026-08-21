# broknowsaspot.app

a crowdsourced guide to hidden, offbeat, and adventurous spots — for people who
don't stick to the tourist path.

Live at **<https://broknowsaspot.app>**.

## stack

| layer     | choice                                              |
| --------- | --------------------------------------------------- |
| framework | Next.js (App Router) + TypeScript                   |
| data      | Appwrite Cloud (TablesDB)                           |
| basemap   | Leaflet + raster tiles (vector path opt-in, see below) |
| styling   | Tailwind CSS v4 (CSS-first design tokens)                    |
| motion    | Framer Motion + CSS                                          |
| maps      | Leaflet + react-leaflet                                      |
| fonts     | Instrument Serif + Manrope, self-hosted via `next/font`       |
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

**Aurora** — warm firelight against a cold sky. A midnight ground with
slow-drifting aurora light behind everything, and content floating on
layered glass above it.

- a display serif for every title, one humanist sans for everything else
- sentence case throughout; nothing is styled lowercase any more
- one material — glass — in three depths, and nothing else
- continuous, generous corner radii; nothing in the app is square
- one filled control per screen, in the ember accent, and no other fills
- fluid `clamp()` type scale instead of breakpoint jumps

The previous Teenage Engineering layer — monospace chrome, hairline-ruled
sections, all-lowercase copy, flat borderless controls, square corners —
was removed rather than blended.

### two skies

Both themes are authored independently; dark is not an inverted light
theme. Dark is midnight with the aurora at full strength. Light is the
same idea at dawn: a cool, faintly violet white with the light turned down
to a wash, because a pale ground turns into smeared pastel otherwise.

The glass flips direction with the theme. Light glass is frosted white
lifted **off** the ground — a pane that matches the page exactly reads as
flat fog. Dark glass leans **lighter** than its ground, because a dark
pane on a near-black page has no edge to catch and reads as a hole.

### three depths

Depth is blur radius, not shadow spread:

| tier      | blur | what it is                                |
| --------- | ---- | ----------------------------------------- |
| `.glass-1` | 14px | chips, segments, map controls             |
| `.glass`   | 28px | the default — cards, nav, form sections   |
| `.glass-3` | 44px | sheets, dialogs, the mobile filter tray   |

Phones drop one step across the board; a phone is where the scroll is and
every blurred pixel is paid for on the compositor.

Every tier carries the same edge — a bright inset line along the top where
the rim catches light, a dark one along the bottom where the glass is
thick, and a soft lens highlight off the top-left corner. Drop those three
and the same blur reads as a grey box.

Every text pair is contrast-checked in both themes (`npm run check:contrast`).
The full system, including the two `backdrop-filter` traps that cost real
debugging, is in [`docs/design-tokens.md`](docs/design-tokens.md).

### motion

Two speeds. Anything that responds to you resolves inside `--dur-surface`
(620ms) and settles without a bounce — glass is heavy, and a bouncing pane
reads as plastic. Anything ambient runs on the minute scale: the aurora
fields drift on periods of 52, 61, 67 and 79 seconds so they never re-sync
into a loop you can catch.

Most of it is CSS, not JavaScript. Scroll reveals are a class an
IntersectionObserver flips, with the stagger as an index-derived delay, so
nothing samples a spring on the main thread mid-scroll. Framer Motion is
kept for what needs it: the sheet's enter/exit and the nav marker that
travels between destinations.

Three rules hold it together:

- **Reveals fail visible.** Content is visible by default and a pre-paint
  script opts it into being hidden, so the hidden state cannot outlive the
  JavaScript meant to undo it. With the bundle blocked, the page is plain
  readable text.
- **The aurora only ever moves on transform and opacity.** A blurred field
  is expensive to rasterise once and free to move afterwards; nothing in
  that layer animates size, colour or `filter`.
- **At most six blurred surfaces at once.** `backdrop-filter` makes the
  compositor re-blur its backdrop on every frame that backdrop changes.

The design canvas the implementation was built from is in
[`.design/`](.design/) — six artboards covering the home, explore, spot,
submit and mobile screens plus the material sheet.

## routes

| route                      | what it is                                                    |
| -------------------------- | ------------------------------------------------------------- |
| `/`                        | hero, glass readout, manifesto, recently logged                |
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
| `buckets.read` / `buckets.write`         | the photo bucket                                                 |
| `files.read` / `files.write`             | **the running app** — uploading and removing photos              |

Photo uploads need `files.write` on the key the *app* runs with, not just
the one the scripts use. Without it every upload fails with "photo
uploads aren't set up on this deployment yet", and the server log names
which of the two setup steps is missing — the bucket, or the scope.

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

## location and photos, and what stays on your device

Three things ask for something personal. Each is off until pressed, and
each keeps as little as it can.

### location

Never requested on load — there is no effect anywhere that calls
`getCurrentPosition`, so a permission prompt only ever appears because
somebody pressed something. Nothing is written to `localStorage`, a
cookie, or the server; the position lives in React state and dies with
the page.

The two uses are deliberately different, and the button says which is
which before it is pressed:

| where | what happens to the coordinate |
| --- | --- |
| **submit** | moves the pin. Sent only when the form is submitted — and then it is *published*, which the caption says plainly. Rounded to 5 decimals (about a metre). |
| **explore** | **never leaves the browser.** |

"Near me" is worth expanding on, because the easy version would have
leaked. Appwrite could answer it — `location` is a Point with a spatial
index — but asking the server which spots are near you means telling the
server where you are. Every spot's coordinates are already in the page,
so the ranking is computed on the device instead, in
[`src/lib/spots/distance.ts`](src/lib/spots/distance.ts). That is the
entire reason that file exists rather than a query.

A dismissed permission prompt is handled too. `PositionOptions.timeout`
only starts once permission is *granted*, so a prompt someone closes
without answering leaves the request outstanding forever — confirmed in a
real browser, fourteen seconds with neither callback firing. A wall-clock
timer recovers the control.

### photos

**Metadata is stripped in the browser, before anything is uploaded.**

A photo off a phone carries EXIF: GPS to a few metres, the exact
timestamp, camera make and serial, and on some devices a thumbnail of the
*original* frame that survives cropping. On an index of places people
would rather keep quiet, uploading a raw camera file is a much larger
disclosure than uploading a picture — it can pin down someone's home from
a photo taken there earlier, or reveal a spot's true position when the
contributor placed the pin loosely on purpose.

So [`src/lib/photos/prepare.ts`](src/lib/photos/prepare.ts) decodes the
file, draws it to a canvas and re-encodes it. A canvas cannot carry
metadata forward, so the output is pixels and nothing else. Because it
happens before any network call, the file with the GPS in it never leaves
the device at all — there is no window in which a server, a log or a
proxy could have seen it. Downscaling to 2000px is part of the same
measure: fewer pixels means less incidental detail surviving into
something published.

Verified end to end rather than asserted. A JPEG carrying real GPS EXIF
and a camera make goes in; the bytes that reach storage are checked for
those markers:

```
input   19003b   Exif: true   make: true
stored  16443b   Exif: false  make: false  APP1: false
```

The rest of the handling is the same shape as every other write here:

- Uploads go through a route handler on the API key. **The bucket grants
  create to nobody**, so a browser cannot put a file in this project —
  which is what keeps Turnstile, the rate limit and the type check on the
  only path in. `appwrite:verify` asserts the bucket has no write grants.
- The server re-checks the size and sniffs for a JPEG magic number,
  because "the client already did it" is not a control.
- Photos upload as they are added rather than at submit, so a slow upload
  is not the thing standing between a contributor and a successful
  submission. The trade is that an abandoned form leaves orphaned files;
  they are cheap and sweepable, and a lost spot is not.
- Stored as ids, resolved to URLs on read, so moving project or region is
  a config change rather than a migration.

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

## the aurora layer

The sky the whole app sits on: four blurred colour fields drifting behind
everything, a starfield that only lights in the dark theme, and a vignette
pulling the corners back toward the page ground.

It is one fixed layer for the whole document, painted once, that never
re-rasterises on scroll. Three rules keep it affordable, and all three are
load-bearing:

| rule                         | why                                                                       |
| ---------------------------- | ------------------------------------------------------------------------- |
| transform and opacity only   | a blurred field is expensive to rasterise once and free to move afterwards |
| `position: fixed`, one layer | not repeated per section, so scrolling costs nothing                       |
| `contain: layout paint style`| keeps its layout and paint out of the rest of the page's business          |
| unrelated periods            | 52s / 61s / 67s / 79s, so the fields never re-sync into a visible loop     |
| disabled under reduced motion| `animation: none` and `will-change: auto` — **verified 0/4 fields running** |

A vignette rather than a horizon line, deliberately: the layer is fixed, so
a top-to-bottom fade would sit at the same screen position forever and read
as "the sky only exists above the fold". Pulling the corners back works at
any scroll position.

The previous homepage carried an ambient WebGL point field. Aurora replaces
it, so `three`, `@react-three/fiber` and `@react-three/drei` are no longer
dependencies.

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
| `NEXT_PUBLIC_MAP_TILE_URL_LIGHT`  | public   | optional — opts out to a raster provider    |
| `NEXT_PUBLIC_MAP_TILE_URL_DARK`   | public   | optional — opts out to a raster provider    |
| `NEXT_PUBLIC_MAP_ATTRIBUTION`     | public   | attribution the tile licence requires       |

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

## the basemap, and India's borders

The maps open on India. **The borders are not yet India's** — this is the
one known-wrong thing in the app, and it is a blocker for serving Indian
users rather than a nice-to-have.

### where it stands

The basemap is CARTO's raster tiles, rendering OpenStreetMap. That
depicts *de-facto lines of control*: dashed boundaries through Jammu &
Kashmir, Aksai Chin outside India, Arunachal Pradesh marked disputed.
Maps published in India are required to show boundaries as depicted by
the Survey of India.

A raster tile arrives as a finished image with the borders already
painted in, so nothing in this repo can correct them. Two ways out, and
one of them is half-built:

**Buy a compliant basemap.** Point the variables below at a provider
whose cartography is already Survey of India-aligned — Mapbox with a
`worldview=IN` style, or Mappls — and the borders are correct because
they were rendered correct.

| variable                          | is                                         |
| --------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_MAP_TILE_URL_LIGHT`  | light-theme tile URL template              |
| `NEXT_PUBLIC_MAP_TILE_URL_DARK`   | dark-theme tile URL template               |
| `NEXT_PUBLIC_MAP_ATTRIBUTION`     | the attribution your licence requires      |
| `NEXT_PUBLIC_MAP_TILE_SIZE`       | `512` for providers serving 512px tiles    |

`NEXT_PUBLIC_MAP_TILE_SIZE` matters more than it looks: Leaflet assumes
256px tiles and draws 512s one zoom level too far in with everything
soft, which reads as a styling problem rather than a configuration one.
Setting `512` also applies the `zoomOffset` of -1 that must accompany it,
and hands retina back to the provider — a 512px tile is already doubled,
so Leaflet's `detectRetina` would scale it twice. Put `@2x` in the URL
template instead.

**Or finish the vector path**, which needs no provider account at all.

### the vector path (opt-in, currently broken)

Vector tiles ship boundary *data* rather than a picture of boundaries, so
the style decides which lines are drawn.
[OpenFreeMap](https://openfreemap.org) serves OpenMapTiles vector tiles
over HTTPS with no API key, no registration and no request cap, and that
schema carries what the question needs:

| field           | is                                              |
| --------------- | ----------------------------------------------- |
| `claimed_by`    | ISO2 of the country that wants to see this line  |
| `disputed`      | 1 when the border is contested                   |
| `disputed_name` | which dispute, e.g. `IndianClaimwesternKashmir`  |

A default style draws every claimant's line at once, which is precisely
why the stock render puts a line of control through Kashmir. Keeping only
the lines India recognises produces the Survey of India depiction from
the same tiles — the same idea as Mapbox's `worldview`, applied to an
open schema rather than bought with a key.

[`src/lib/map/india-worldview.ts`](src/lib/map/india-worldview.ts)
implements it and is **tested and correct**: `npm run check:borders`
evaluates the rewritten filters with MapLibre's own expression engine
against synthetic boundary features, and it runs in CI.

**What does not work is the rendering.** With
`NEXT_PUBLIC_MAP_VECTOR=1`, MapLibre fetches the style, the TileJSON and
the sprite, and then requests no tiles at all — an empty map with the
markers still on it. That is unresolved, and it is why the flag exists
rather than the vector path being the default.

It fails over to raster rather than to nothing. Every way it can fail —
no WebGL, style unreachable, style unfilterable, MapLibre throwing, or
MapLibre attaching and never painting — ends on the raster basemap. That
last one needs a timeout to detect, because it throws nothing: the
version that shipped had no such timeout, and an empty map was the
result.

### what else was considered

| candidate              | outcome                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| Mapbox `worldview=IN`  | works; needs a key and a billing account                          |
| OpenFreeMap + filter   | keyless and correct in principle; does not render yet             |
| Bharatmaps / NIC       | Survey of India data, but credentials are issued to govt bodies   |
| openstreetmap.in       | a community site, not a tile service                              |
| osm-in/tileserver      | self-hosting recipe; its demo is HTTP on a bare IP, unusable here |
| CARTO / OSM raster     | **in use** — working, and not correct for India                   |

## known gaps

- **The map's borders are not the Survey of India depiction** — see
  above. This is the one item here that blocks serving Indian users.
- There is no end-to-end check that the map actually paints. The vector
  regression would have been caught by asserting a tile grid exists in
  the DOM; nothing in CI does that today.
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
