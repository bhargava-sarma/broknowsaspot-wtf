"use client";

import { useEffect, useState } from "react";

/**
 * Whether the page has scrolled past a threshold.
 *
 * The floating chrome uses this to firm up: at the top of a page the
 * header is barely there, and once content is sliding underneath it the
 * glass goes denser so the words on it stay readable over whatever
 * happens to be passing behind.
 *
 * Two things keep this off the critical path of a scroll:
 *
 * - The listener is passive, so it can never delay the scroll itself.
 * - It sets a boolean, not a scroll offset, so React re-renders twice
 *   per page rather than once per frame. Anything wanting a continuous
 *   value should read it in CSS or on the compositor, not through here.
 */
export function useScrolled(threshold = 12): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const read = () => setScrolled(window.scrollY > threshold);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, [threshold]);

  return scrolled;
}
