"use client";

import { motion, useReducedMotion } from "framer-motion";

import { fade } from "@/lib/motion/springs";

/**
 * Route transition.
 *
 * App Router remounts `template.tsx` on every navigation, which gives us a
 * clean enter animation without an AnimatePresence exit dance that Next
 * can't actually await.
 *
 * Opacity only, deliberately: animating `transform` here would make this
 * element a containing block for the whole page, quietly breaking
 * `position: fixed` (the mobile bar, the map controls) for the lifetime of
 * the route. Per-section movement is the job of <Reveal>.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={fade}
    >
      {children}
    </motion.div>
  );
}
