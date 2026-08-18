import type { Metadata } from "next";

/**
 * Everything under /admin is per-request and never cached: it renders
 * hidden and removed entries, which is exactly the data the public
 * caches must never hold.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
