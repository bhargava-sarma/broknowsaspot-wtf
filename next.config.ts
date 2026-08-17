import type { NextConfig } from "next";

/**
 * Static export is opt-in via STATIC_EXPORT rather than always-on.
 *
 * GitHub Pages needs a fully static build, but hard-coding `output: export`
 * would permanently rule out the server features this project is heading
 * towards (Supabase, auth, a real POST handler). Gating it on an env var
 * lets the Pages workflow take a static bundle while `npm run build` stays
 * an ordinary Node build.
 */
const isStaticExport = process.env.STATIC_EXPORT === "true";

/**
 * Pages serves a project site from /<repo>/, so every asset and route needs
 * prefixing. Empty locally and on any root-domain host; set by the deploy
 * workflow. Next applies it to <Link> and next/image automatically, which
 * is why no component needs to know about it.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  ...(isStaticExport
    ? {
        output: "export" as const,
        // Emit out/explore/index.html rather than out/explore.html. Next's
        // client router prefetches "/explore/", which only resolves if the
        // route is a directory — without this those prefetches 404 on a
        // plain static host and every navigation falls back to a full load.
        trailingSlash: true,
      }
    : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),

  images: {
    // Seed photography is remote until we host our own bucket.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    formats: ["image/avif", "image/webp"],
    // There is no image optimiser on a static host. Harmless today, since
    // every photos[].src is still null, but it would break the export the
    // moment real photography lands.
    ...(isStaticExport ? { unoptimized: true } : {}),
  },

  // three.js ships untranspiled ESM in a few subpaths; keeping it in the
  // server-compiled set avoids "Unexpected token 'export'" during RSC builds.
  transpilePackages: ["three"],

  experimental: {
    // Pull only the icon/helper modules we touch instead of the drei barrel.
    optimizePackageImports: ["@react-three/drei", "framer-motion"],
  },
};

export default nextConfig;
