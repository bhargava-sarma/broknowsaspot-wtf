import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs on /admin only.
 *
 * Named `proxy` rather than `middleware`: Next.js 16 renamed the file
 * convention, and the old name now builds with a deprecation warning.
 * Nothing else about it changed — same request-time hook, same matcher.
 *
 * Two jobs, in this order of importance:
 *
 * 1. **Refresh the session.** Supabase access tokens are short-lived. A
 *    Server Component cannot write cookies, so if the refresh does not
 *    happen here it does not happen at all, and an admin gets logged out
 *    mid-session for no visible reason.
 *
 * 2. **Bounce signed-out visitors to the login screen.** This is a
 *    convenience, not the security boundary — this runs before the
 *    request reaches anything, which also means a routing mistake can
 *    skip it. The page re-checks, and Postgres checks again underneath.
 *    Treat this redirect as UX.
 *
 * Deliberately not matching the whole site: this makes a network call to
 * the auth server, and paying that on every public page view to find out
 * that nobody is logged in would be a waste.
 */

export const config = {
  // `:path*` matches zero or more segments, so this covers /admin itself.
  matcher: ["/admin/:path*"],
};

// Responses that carry Set-Cookie for a session must never be cached by a
// CDN — one admin's tokens served to the next visitor is the worst-case
// outcome of getting this wrong.
const NO_STORE = "private, no-cache, no-store, must-revalidate, max-age=0";

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("cache-control", NO_STORE);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without credentials there is no session to refresh and nothing to
  // guard. The page renders a "not configured" state instead.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
        response.headers.set("cache-control", NO_STORE);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const onLogin = pathname === "/admin/login";

  if (!user && !onLogin) {
    const target = request.nextUrl.clone();
    target.pathname = "/admin/login";
    // The query string is dropped rather than carried as a `next` param.
    // A redirect target taken from the URL is an open-redirect waiting to
    // happen, and /admin is the only destination worth returning to.
    target.search = "";
    const redirected = NextResponse.redirect(target);
    redirected.headers.set("cache-control", NO_STORE);
    return redirected;
  }

  // A signed-in *non-admin* is deliberately not redirected here: /admin
  // explains the situation and offers a sign-out. Sending them onwards
  // only to be sent back would loop.
  if (user && onLogin) {
    const target = request.nextUrl.clone();
    target.pathname = "/admin";
    target.search = "";
    const redirected = NextResponse.redirect(target);
    redirected.headers.set("cache-control", NO_STORE);
    return redirected;
  }

  return response;
}
