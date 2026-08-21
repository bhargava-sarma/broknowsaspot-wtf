# Aurora — design canvas sources

The `.dc.html` files here are the artboards for the Aurora design direction,
and `canvas.json` lays them out. They are design sources, not application code:
nothing in `src/` imports them.

- `Main.dc.html` — home
- `Explore.dc.html` — map view
- `Spot.dc.html` — spot detail
- `Submit.dc.html` — submission flow
- `Mobile.dc.html` — the phone layout
- `Material.dc.html` — palette, the three glass depths, type ramp, motion

The published canvas is assembled from these by the `/design` skill's
`seed-canvas.mjs`, which stamps them into a copy of the editor payload. The
seeded output (`broknowsaspot-aurora.html`, ~2.4 MB) is a build artifact and is
not committed — regenerate it by re-running the seeder over these files.

## One thing worth knowing before editing

Do not put a `<link rel="stylesheet">` in an artboard's `<helmet>` block. The
runtime waits for helmet stylesheets to load before it compiles the artboard,
and has no error path: a request that never resolves — offline, or a network
that blocks the font CDN — leaves the frame on "Loading artboard…" forever.
Each artboard therefore attaches the webfonts from a small script instead, so
they stay an enhancement over the fallback stack.
