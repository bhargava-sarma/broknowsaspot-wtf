import type { NextConfig } from "next";

/** Storage hostname, taken from whichever Appwrite endpoint is configured. */
const appwriteHost = (() => {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  if (!endpoint) return null;
  try {
    return new URL(endpoint).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    // Uploaded photos are served from Appwrite Storage, whose hostname
    // varies by region and project — so it is derived from the endpoint
    // rather than hard-coded. Without this, next/image refuses to render
    // a stored photo at all and the gallery silently falls back to the
    // generated plate, which looks like the upload never worked.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(appwriteHost
        ? [{ protocol: "https" as const, hostname: appwriteHost }]
        : []),
    ],
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
