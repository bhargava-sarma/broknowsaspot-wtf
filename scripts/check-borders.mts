/**
 * Proves the India worldview filter keeps the right boundary lines and
 * drops the wrong ones.
 *
 * This is the check that matters for the borders. Everything else about
 * the basemap is plumbing — whether tiles load, whether the style parses —
 * and all of it can be working perfectly while the map still draws a line
 * of control through Kashmir. So the filters are evaluated here directly,
 * with MapLibre's own expression engine, against synthetic boundary
 * features standing in for each line the tiles actually contain.
 *
 * The styles are committed fixtures rather than fetched, so the check
 * runs offline and in CI. Refresh them from the provider when the
 * basemap is updated: a style that changes shape is exactly the event
 * this needs to catch.
 *
 *   npm run check:borders
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { featureFilter } from "@maplibre/maplibre-gl-style-spec";

import { applyIndiaWorldview } from "@/lib/map/india-worldview";

const here = dirname(fileURLToPath(import.meta.url));

type Layer = {
  id: string;
  "source-layer"?: string;
  filter?: unknown;
  paint?: Record<string, unknown>;
};
type Style = { layers?: Layer[] };

/**
 * One boundary line as the tiles would carry it.
 *
 * `keep` is whether India's depiction includes this line.
 */
type Case = {
  what: string;
  keep: boolean;
  props: Record<string, unknown>;
};

const CASES: Case[] = [
  {
    what: "an ordinary undisputed international border",
    keep: true,
    props: { admin_level: 2 },
  },
  {
    what: "india's claim in western kashmir",
    keep: true,
    props: {
      admin_level: 2,
      disputed: 1,
      claimed_by: "IN",
      disputed_name: "IndianClaimwesternKashmir",
    },
  },
  {
    what: "india's northern claim (aksai chin / gilgit)",
    keep: true,
    props: {
      admin_level: 2,
      disputed: 1,
      claimed_by: "IN",
      disputed_name: "IndianClaim-North",
    },
  },
  {
    what: "china's competing claim",
    keep: false,
    props: {
      admin_level: 2,
      disputed: 1,
      claimed_by: "CN",
      disputed_name: "ChineseClaim",
    },
  },
  {
    what: "pakistan's competing claim",
    keep: false,
    props: {
      admin_level: 2,
      disputed: 1,
      claimed_by: "PK",
      disputed_name: "PakistaniClaim",
    },
  },
  {
    what: "a line of control tagged with no claimant",
    keep: false,
    props: { admin_level: 2, disputed: 1, disputed_name: "ChineseClaim" },
  },
  {
    what: "demchok, unclaimed tagging",
    keep: false,
    props: { admin_level: 2, disputed: 1, disputed_name: "Demchok" },
  },
  {
    what: "the bara hotii valleys",
    keep: false,
    props: { admin_level: 2, disputed: 1, disputed_name: "BaraHotiiValleys" },
  },
  {
    what: "a dispute outside india, left alone",
    keep: true,
    props: { admin_level: 2, disputed: 1, disputed_name: "Crimea" },
  },
];

/** Zoom levels to evaluate at — styles band their layers by zoom. */
const ZOOMS = [2, 4, 6, 9, 12];

function boundaryLayers(style: Style): Layer[] {
  return (style.layers ?? []).filter((l) => l["source-layer"] === "boundary");
}

/** Does any boundary layer in this style draw the feature at this zoom? */
function drawn(layers: Layer[], props: Record<string, unknown>, zoom: number) {
  const hits: string[] = [];
  for (const [index, layer] of layers.entries()) {
    const min = (layer as { minzoom?: number }).minzoom ?? 0;
    const max = (layer as { maxzoom?: number }).maxzoom ?? 24;
    if (zoom < min || zoom >= max) continue;

    const compiled = featureFilter(
      layer.filter as never,
      `layers[${index}].filter`,
    );
    const feature = { type: 2 as const, properties: props };
    if (compiled.filter({ zoom }, feature as never, {} as never)) {
      hits.push(layer.id);
    }
  }
  return hits;
}

let failed = 0;
const line = (okay: boolean, text: string) => {
  if (!okay) failed += 1;
  console.log(`${okay ? "ok  " : "FAIL"}  ${text}`);
};

for (const name of ["positron", "dark"]) {
  const raw = readFileSync(
    resolve(here, `fixtures/openfreemap-${name}.json`),
    "utf8",
  );
  const original = JSON.parse(raw) as Style;

  console.log(`\n${name}`);
  console.log("-".repeat(64));

  const before = boundaryLayers(original);
  line(before.length > 0, `style has boundary layers (${before.length})`);

  const { style, report } = applyIndiaWorldview(original);
  line(
    report.rewritten.length === before.length,
    `every boundary layer rewritten (${report.rewritten.join(", ")})`,
  );

  const after = boundaryLayers(style);

  for (const c of CASES) {
    const zoomsDrawn = ZOOMS.filter((z) => drawn(after, c.props, z).length > 0);
    const held = c.keep ? zoomsDrawn.length > 0 : zoomsDrawn.length === 0;
    line(
      held,
      `${c.keep ? "keeps " : "drops "} ${c.what}` +
        (zoomsDrawn.length ? `  [z${zoomsDrawn.join(",")}]` : "  [never]"),
    );
  }

  // A competing claim must be gone at EVERY zoom, not merely most.
  for (const c of CASES.filter((x) => !x.keep)) {
    for (const z of ZOOMS) {
      const hits = drawn(after, c.props, z);
      line(
        hits.length === 0,
        `z${z}: nothing draws "${c.what}"${hits.length ? ` — ${hits.join(", ")}` : ""}`,
      );
    }
  }

  // And India's own line must not be dashed anywhere.
  for (const id of report.undashed) {
    const layer = after.find((l) => l.id === id);
    line(
      !layer?.paint?.["line-dasharray"],
      `${id}: dash removed, india's border draws solid`,
    );
  }
}

console.log();
if (failed > 0) {
  console.log(`${failed} failed — the map would not show India's borders.`);
  process.exit(1);
}
console.log("all border checks passed");
