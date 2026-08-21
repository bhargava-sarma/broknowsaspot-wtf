"use client";

import { motion, useReducedMotion } from "framer-motion";

import { springUI } from "@/lib/motion/springs";
import { useTheme } from "@/lib/theme/theme-provider";
import { cn } from "@/lib/utils/cn";

/**
 * Two-position theme switch, read like a hardware toggle: both icons stay
 * visible, the live one is inked, and a glass knob slides under it.
 *
 * All of the active-state styling is done with the `dark:` variant rather
 * than by branching on a JS value, so the server and the client render
 * byte-identical markup and the switch shows the correct position in the
 * first paint, before hydration. The knob slides on a CSS transform for
 * the same reason: no layout animation can run before hydration, and a
 * knob that jumped into place on load would undo the point of it.
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
      aria-label="Switch between light and dark"
      title="Switch between light and dark"
      className={cn(
        "touch-target relative inline-flex items-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--glass-rim)] bg-ink/[0.05] p-1 select-none",
        className,
      )}
    >
      {/* The knob. Half the track wide, stepping to the other half in
          dark — the accent rule of the old switch, given mass. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 block w-[calc(50%-0.25rem)] rounded-[var(--radius-xs)] bg-paper shadow-[inset_0_1px_0_var(--glass-specular),0_4px_10px_-4px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-[var(--ease-spring)] motion-reduce:transition-none dark:translate-x-full"
      />

      <span className="relative z-1 flex h-7 w-8 items-center justify-center text-ink transition-colors duration-200 dark:text-faint">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
        </svg>
      </span>

      <span className="relative z-1 flex h-7 w-8 items-center justify-center text-faint transition-colors duration-200 dark:text-ink">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z" />
        </svg>
      </span>
    </motion.button>
  );
}
