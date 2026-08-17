import { NextResponse } from "next/server";

import { SPOTS } from "@/lib/data/spots";

/**
 * The seed index as JSON.
 *
 * `force-static` matters: it lets this handler survive `output: export`,
 * where it is emitted as a plain JSON file rather than a running route. The
 * same URL therefore works on GitHub Pages and on a Node host, which keeps
 * the static build from being a different application.
 *
 * There is deliberately no POST. A static host has no server to accept one,
 * and the previous mock handler validated and then discarded the payload —
 * so removing it costs nothing real. The submission form now runs the same
 * validator client-side and says plainly that nothing is stored.
 *
 * When Supabase lands, POST comes back here alongside a server runtime:
 * `validateDraft` in lib/spots/validate.ts is already the shared contract,
 * and `SpotDraft` is already the payload shape.
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({ spots: SPOTS, total: SPOTS.length });
}
