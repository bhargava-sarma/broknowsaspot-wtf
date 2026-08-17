"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile, rendered explicitly rather than via the implicit
 * auto-scan, so React owns the element's lifetime and a re-render can't
 * leave a stale widget behind.
 *
 * When no site key is configured the component renders nothing and reports
 * a null token. That keeps local development workable — the server also
 * skips verification outside production — while production fails closed on
 * the server side if the secret is missing. The permissive path is only
 * ever the client's, never the decision that matters.
 */

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  // The callback is stashed in a ref so re-renders don't tear down and
  // rebuild the widget, which would make the user solve it twice. Assigned
  // in an effect rather than during render — a render-phase ref write is
  // not safe under concurrent rendering.
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    let cancelled = false;

    function mount() {
      if (cancelled || !holder.current || !window.turnstile) return;
      if (widgetId.current !== null) return;

      widgetId.current = window.turnstile.render(holder.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "auto",
        callback: (token) => callback.current(token),
        "expired-callback": () => callback.current(null),
        "error-callback": () => {
          setFailed(true);
          callback.current(null);
        },
      });
    }

    if (window.turnstile) {
      mount();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`,
      );
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
      script.addEventListener("error", () => setFailed(true));
    }

    return () => {
      cancelled = true;
      if (widgetId.current !== null && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div>
      <div ref={holder} />
      {failed ? (
        <p
          role="alert"
          className="mt-2 font-mono text-micro text-accent lowercase"
        >
          the anti-bot check couldn&rsquo;t load. check your connection and
          reload.
        </p>
      ) : null}
    </div>
  );
}
