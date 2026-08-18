/**
 * Import the seed set from src/lib/data/spots.ts.
 *
 * Node strips types but does not resolve the `@/` path alias, so the
 * type-only import is stripped and the annotation dropped, leaving plain
 * JS that imports cleanly. The temp file must be `.mts` — a `.mjs` copy
 * would not have its types stripped at all.
 */
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");

export async function loadSeedSpots() {
  const source = resolve(root, "src/lib/data/spots.ts");
  const temp = resolve(root, ".seed-source.tmp.mts");

  const stripped = readFileSync(source, "utf8")
    .replace(/^import type .*$/m, "")
    .replace(/export const SPOTS: Spot\[\]/, "export const SPOTS");

  writeFileSync(temp, stripped);
  try {
    const mod = await import(pathToFileURL(temp).href);
    return mod.SPOTS;
  } finally {
    rmSync(temp, { force: true });
  }
}
