import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/appwrite/auth";

/**
 * Runs on /admin only.
 *
 * Routing, not authorisation. It bounces signed-out visitors to the login
 * screen so they meet a form rather than a refusal — the page re-checks,
 * and Appwrite decides per row what an admin session may actually read.
 * Treat a change here as a UX change.
 *
 * There is nothing to refresh, and so no network call at all: an Appwrite
 * session secret is long-lived and *is* the credential, not a pointer to
 * one that needs renewing. This reads whether the cookie exists and
 * nothing more — it cannot tell a real secret from an invented one, which
 * is exactly why it is not the thing protecting the data.
 *
 * Deliberately not matching the whole site: paying anything on every
 * public page view to learn that nobody is logged in would be waste.
 */

export const config = {
  // `:path*` matches zero or more segments, so this covers /admin itself.
  matcher: ["/admin/:path*"],
};

// A response carrying a session must never be cached by a CDN — one
// admin's cookie served to the next visitor is the worst outcome here.
const NO_STORE = "private, no-cache, no-store, must-revalidate, max-age=0";

function redirect(request: NextRequest, pathname: string): NextResponse {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  // The query string is dropped rather than carried as a `next` param. A
  // redirect target taken from the URL is an open redirect waiting to
  // happen, and /admin is the only destination worth returning to.
  target.search = "";
  const response = NextResponse.redirect(target);
  response.headers.set("cache-control", NO_STORE);
  return response;
}

export default function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  response.headers.set("cache-control", NO_STORE);

  const onLogin = request.nextUrl.pathname === "/admin/login";
  const signedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!signedIn && !onLogin) return redirect(request, "/admin/login");

  // A signed-in *non-admin* is deliberately not redirected away from
  // /admin: that page explains the situation and offers a sign-out.
  // Sending them onwards only to be sent back would loop.
  if (signedIn && onLogin) return redirect(request, "/admin");

  return response;
}
