import type { Metadata, Viewport } from "next";

import { MobileBar } from "@/components/layout/mobile-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { fontVariables } from "@/lib/fonts";
import {
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_SHORT,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { ThemeScript } from "@/lib/theme/theme-script";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_TITLE} — a guide to the spots regular people don't go`,
    template: `%s — ${SITE_TITLE}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION_SHORT,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Matches the paper token in each theme so the browser chrome agrees
  // with the page instead of flashing white behind it.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f1ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // ThemeScript mutates this element before React hydrates.
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <head>
        <ThemeScript />
        {/*
          Framer Motion serialises the `hidden` variant into the SSR markup,
          so every scroll reveal ships as opacity:0. With JS that resolves on
          intersection; without it the page would render blank. This restores
          the content for no-JS readers, crawlers and print.
        */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh">
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only font-mono text-micro lowercase focus:not-sr-only focus:absolute focus:top-3 focus:left-[var(--gutter)] focus:z-[100] focus:bg-paper focus:px-2 focus:py-2 focus:text-ink"
          >
            skip to content
          </a>

          <SiteHeader />
          <main id="main" className="min-h-[60vh]">
            {children}
          </main>
          <SiteFooter />
          <MobileBar />
        </ThemeProvider>
      </body>
    </html>
  );
}
