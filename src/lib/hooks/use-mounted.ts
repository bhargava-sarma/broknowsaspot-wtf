"use client";

import { useSyncExternalStore } from "react";

/** Never fires — the value is constant per environment, not a live store. */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` on the server and on the hydration render, `true` immediately
 * after.
 *
 * Needed to mount client-only widgets safely under `output: export`. A
 * `dynamic(..., { ssr: false })` component with a `loading` fallback bakes
 * that fallback into the prerendered HTML; on a static host the chunk is
 * often already resolved by the time React hydrates, so React renders the
 * real component against markup containing the fallback and throws a
 * hydration mismatch.
 *
 * Gating on this guarantees the first client render reproduces exactly what
 * was prerendered, and the swap happens on the next render instead.
 *
 * `useSyncExternalStore` rather than useState + useEffect: it expresses
 * "server snapshot vs client snapshot" directly and doesn't trip the
 * set-state-in-effect rule.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
