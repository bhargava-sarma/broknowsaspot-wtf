import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    // Seed photography is remote until we host our own bucket; Supabase
    // Storage gets added here when uploads land.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    formats: ["image/avif", "image/webp"],
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
