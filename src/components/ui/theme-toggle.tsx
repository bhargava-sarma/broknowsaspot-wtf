"use client";

import { motion, useReducedMotion } from "framer-motion";

import { springUI } from "@/lib/motion/springs";
import { useTheme } from "@/lib/theme/theme-provider";
import { cn } from "@/lib/utils/cn";

/**
 * Two-position theme switch, read like a hardware toggle: both positions
 * stay legible, the live one is inked, and a glass knob sits under it.
 *
 * The knob is the one place the floating material appears at this size,
 * and it earns it — a switch is the most physical control on the page, so
 * it is the one that most wants to look like an object you could push.
 *
 * All of the active-state styling is done with the `dark:` variant rather
 * than by branching on a JS value, so the server and the client render
 * byte-identical markup and the switch shows the correct position in the
 * first paint, before hydration. The knob slides on a CSS transform for
 * the same reason: no layout animation can run before hydration, and a
 * knob that jumps into place on load would undo the point of it.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { toggle } = useTheme();
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={springUI}
      // Static label: a state-bearing one would have to be computed in JS
      // and would mismatch on hydration.
      aria-label="toggle light and dark theme"
      title="toggle light and dark theme"
      className={cn(
        "glass-chip glass-rim glass-r-sm touch-target relative inline-flex items-center gap-1 overflow-hidden px-1.5 py-1.5 font-mono text-micro lowercase select-none",
        className,
      )}
    >
      {/* The knob. Half the track wide, stepping to the other half in
          dark — the same trick as the old accent rule, given mass. */}
      <span
        aria-hidden="true"
        className="glass-r-sm absolute inset-y-1 left-1 block w-[calc(50%-0.25rem)] bg-ink/[0.07] transition-transform duration-300 ease-[var(--ease-spring)] motion-reduce:transition-none dark:translate-x-[calc(100%+0.0rem)] dark:bg-ink/[0.1]"
      />

      <span className="relative z-1 px-1 text-ink transition-opacity duration-200 dark:text-faint">
        lt
      </span>
      <span className="relative z-1 px-1 text-faint transition-opacity duration-200 dark:text-ink">
        dk
      </span>
    </motion.button>
  );
}
