/**
 * Rewrites a MapLibre style so its boundaries are drawn as the Government
 * of India depicts them.
 *
 * ---------------------------------------------------------------------
 * Why this can exist at all
 * ---------------------------------------------------------------------
 *
 * Raster basemaps arrive as finished images with the borders already
 * painted in, so the only lever is which provider you pay. Vector tiles
 * ship the *data* and leave the drawing to the client, which means the
 * boundary question stops being a procurement problem and becomes a
 * filter.
 *
 * The OpenMapTiles `boundary` layer — the schema OpenFreeMap serves —
 * carries the fields needed to answer it:
 *
 *   claimed_by      ISO2 of the country that wants to see this line
 *   disputed        1 when the border is contested
 *   disputed_name   which dispute, e.g. "IndianClaimwesternKashmir"
 *
 * A default style draws every claimant's line at once, which is why the
 * usual OSM render shows dashed lines cutting through Jammu & Kashmir and
 * puts Aksai Chin outside India. Keeping only the lines India recognises
 * produces the Survey of India depiction from the same tiles.
 *
 * This is the same idea as Mapbox's `worldview`, applied to an open
 * schema rather than bought with a key.
 *
 * ---------------------------------------------------------------------
 * What it does to each layer
 * ---------------------------------------------------------------------
 *
 * For every layer reading `source-layer: "boundary"`:
 *
 * 1. Any `["!", ["has", "claimed_by"]]` clause is neutralised. Styles use
 *    it to suppress *all* claim lines, which also suppresses India's — so
 *    the northern edge of Jammu & Kashmir would simply be missing.
 * 2. The worldview predicate is ANDed onto the filter, so foreign claim
 *    lines and the competing claims in India's theatre both drop out.
 * 3. Where a layer exists to draw disputed borders, the dash is removed.
 *    Once only India's line survives, it is not a disputed border in this
 *    depiction — it is the border, and it should read like every other
 *    stretch of it.
 *
 * Layer *names* are never matched, only `source-layer`. The two styles in
 * use here already disagree about names — positron calls them
 * `boundary_2` / `boundary_disputed`, dark calls them
 * `boundary_country_z0-4` / `boundary_country_z5-` — and a provider is
 * free to rename them again next week.
 */

export const INDIA_ISO2 = "IN";

/**
 * Disputes in India's theatre whose lines are somebody else's claim.
 *
 * Values come from the OpenMapTiles `disputed_name` field. India's own
 * two — `IndianClaim-North` and `IndianClaimwesternKashmir` — are
 * deliberately absent: those are the lines being kept.
 *
 * The `claimed_by` test alone is not enough. Some of these are tagged
 * with the dispute but no claimant, and a line with no `claimed_by`
 * otherwise passes as an ordinary border — which is exactly how a line of
 * control ends up drawn through Kashmir on a map that filtered for it.
 */
const FOREIGN_CLAIMS_IN_INDIA = [
  "ChineseClaim",
  "PakistaniClaim",
  "Demchok",
  "BaraHotiiValleys",
  "SamduValleys",
  "TirpaniValleys",
];

type Expr = unknown;

/** `claimed_by` names India — as an exact value or within a list. */
const claimedByIndia: Expr = [
  "any",
  ["==", ["get", "claimed_by"], INDIA_ISO2],
  ["in", INDIA_ISO2, ["coalesce", ["get", "claimed_by"], ""]],
];

/** The whole rule, as one expression. */
export const indiaWorldviewFilter: Expr = [
  "all",
  // Either nobody's specific claim, or India's.
  ["any", ["!", ["has", "claimed_by"]], claimedByIndia],
  // And never a competing claim from India's own disputes.
  [
    "!",
    [
      "in",
      ["coalesce", ["get", "disputed_name"], ""],
      ["literal", FOREIGN_CLAIMS_IN_INDIA],
    ],
  ],
];

/** Deep equality, enough for the small literal arrays in a filter. */
function sameExpr(a: Expr, b: Expr): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const SUPPRESS_ALL_CLAIMS: Expr = ["!", ["has", "claimed_by"]];

/**
 * Replaces every `["!", ["has","claimed_by"]]` with `true`, wherever it
 * is nested. Returns the rewritten expression and whether anything moved.
 */
function neutraliseClaimSuppression(expr: Expr): { expr: Expr; hit: boolean } {
  if (sameExpr(expr, SUPPRESS_ALL_CLAIMS)) return { expr: true, hit: true };
  if (!Array.isArray(expr)) return { expr, hit: false };

  let hit = false;
  const next = expr.map((part) => {
    const result = neutraliseClaimSuppression(part);
    if (result.hit) hit = true;
    return result.expr;
  });
  return { expr: next, hit };
}

/** True when the filter only matches features tagged as disputed. */
function requiresDisputed(expr: Expr): boolean {
  if (!Array.isArray(expr)) return false;
  if (sameExpr(expr, ["==", ["get", "disputed"], 1])) return true;
  // Only descend through `all`; inside `any` a disputed clause is optional.
  if (expr[0] === "all") return expr.slice(1).some(requiresDisputed);
  return false;
}

type Layer = {
  id: string;
  "source-layer"?: string;
  filter?: Expr;
  paint?: Record<string, unknown>;
  [key: string]: unknown;
};

type Style = { layers?: Layer[]; [key: string]: unknown };

export type WorldviewReport = {
  /** Boundary layers that were rewritten. */
  rewritten: string[];
  /** Layers whose dash was dropped because only India's line remains. */
  undashed: string[];
};

/**
 * Applies the India worldview to a style, without mutating the input.
 *
 * Returns the new style alongside a report, so a caller can log what
 * happened. A style that changed shape upstream — no boundary layers
 * found — should be loud rather than quietly rendering the wrong borders,
 * and the report is what makes that detectable.
 */
export function applyIndiaWorldview(style: Style): {
  style: Style;
  report: WorldviewReport;
} {
  const report: WorldviewReport = { rewritten: [], undashed: [] };
  const layers = style.layers ?? [];

  const next = layers.map((layer) => {
    if (layer["source-layer"] !== "boundary") return layer;

    const original = layer.filter;
    const { expr: relaxed } = neutraliseClaimSuppression(original);

    const filter: Expr =
      relaxed === undefined
        ? indiaWorldviewFilter
        : ["all", relaxed, indiaWorldviewFilter];

    const updated: Layer = { ...layer, filter };
    report.rewritten.push(layer.id);

    // Once only India's line survives, a dash misdescribes it.
    if (requiresDisputed(original) && layer.paint?.["line-dasharray"]) {
      const paint = { ...layer.paint };
      delete paint["line-dasharray"];
      updated.paint = paint;
      report.undashed.push(layer.id);
    }

    return updated;
  });

  return { style: { ...style, layers: next }, report };
}
