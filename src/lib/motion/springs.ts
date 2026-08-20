import type { Transition } from "framer-motion";

/**
 * Shared spring vocabulary.
 *
 * Everything is a spring — no `ease-in-out` defaults anywhere — and every
 * preset is tuned at or just under critical damping so motion settles
 * without the rubbery overshoot that reads as "web animation". The feel
 * target is a well-behaved iOS transition: quick to leave, gently arriving.
 *
 * damping ratio = damping / (2 * sqrt(stiffness * mass))
 *   1.0  -> critically damped, zero overshoot
 *   <1.0 -> overshoot, which reads as bounce; nothing here uses it
 */

/** Chrome: toggles, nav, buttons. Fast, dead-still on arrival. (ζ ≈ 0.97) */
export const springUI: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.86,
};

/** Content reveals. Slower and softer so text doesn't snap. (ζ ≈ 0.95) */
export const springContent: Transition = {
  type: "spring",
  stiffness: 150,
  damping: 23,
  mass: 1,
};

/** Opacity-only crossfades, where a spring would be imperceptible anyway. */
export const fade: Transition = {
  duration: 0.22,
  ease: [0.22, 0.61, 0.36, 1],
};

/** Stagger rhythm for grouped reveals — subtle, never a cascade. */
export const STAGGER = 0.055;
export const STAGGER_DELAY = 0.03;
