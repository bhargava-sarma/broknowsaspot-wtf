"use client";

import { motion, useReducedMotion } from "framer-motion";

import { springUI } from "@/lib/motion/springs";
import { useTheme } from "@/lib/theme/theme-provider";
import { cn } from "@/lib/utils/cn";

/**
 * Two-position theme switch, read like a hardware toggle: both positions
 * are always legible, the live one is inked, and an accent hairline sits
 * under whichever is active.
 *
 * The active-state styling is done entirely with the `dark:` variant — no
 * branch on a JS value — so the server and client render byte-identical
 * markup and the switch shows the correct position on first paint, before
 * hydration.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { toggle } = useTheme();
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={reduce ? undefined : { opacity: 0.55 }}
      transition={springUI}
      // Static label: an aria-pressed/state-bearing label would have to be
      // computed in JS and would mismatch on hydration.
      aria-label="toggle light and dark theme"
      title="toggle light and dark theme"
      className={cn(
        "tap touch-target relative inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 font-mono text-micro lowercase select-none",
        className,
      )}
    >
      <span className="text-ink transition-opacity duration-200 dark:text-faint">
        lt
      </span>
      <span aria-hidden="true" className="text-rule">
        ·
      </span>
      <span className="text-faint transition-opacity duration-200 dark:text-ink">
        dk
      </span>
    </motion.button>
  );
}
