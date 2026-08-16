"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

import { springContent, STAGGER, STAGGER_DELAY } from "@/lib/motion/springs";

/**
 * Scroll-triggered reveals.
 *
 * `RevealGroup` orchestrates, `Reveal` is the unit. Children inherit the
 * group's `hidden` / `shown` states, so the stagger lives in one place
 * instead of being hand-delayed per element.
 *
 * Under `prefers-reduced-motion` every variant collapses to a static
 * visible state — nothing translates, nothing fades in on scroll — while
 * the same component tree renders, so layout is identical either way.
 */

const groupVariants: Variants = {
  hidden: {},
  shown: {
    transition: {
      staggerChildren: STAGGER,
      delayChildren: STAGGER_DELAY,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: springContent },
};

/** Identity variants: present, but with nothing to animate. */
const staticVariants: Variants = {
  hidden: { opacity: 1, y: 0 },
  shown: { opacity: 1, y: 0, transition: { duration: 0 } },
};

/** Reduced motion drops the stagger too — everything arrives at once. */
const staticGroupVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0, delayChildren: 0 } },
};

type RevealGroupProps = {
  children: ReactNode;
  className?: string;
  /** Re-run every time it scrolls back into view. Default: once only. */
  repeat?: boolean;
  /** How far into the viewport before firing. */
  amount?: number;
};

export function RevealGroup({
  children,
  className,
  repeat = false,
  amount = 0.15,
}: RevealGroupProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduce ? staticGroupVariants : groupVariants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: !repeat, amount }}
    >
      {children}
    </motion.div>
  );
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  /**
   * Use inside a RevealGroup to inherit the stagger. Standalone reveals
   * drive their own viewport trigger.
   */
  standalone?: boolean;
  repeat?: boolean;
  amount?: number;
};

export function Reveal({
  children,
  className,
  standalone = false,
  repeat = false,
  amount = 0.2,
}: RevealProps) {
  const reduce = useReducedMotion();
  const variants = reduce ? staticVariants : itemVariants;

  if (standalone) {
    return (
      <motion.div
        data-reveal=""
        className={className}
        variants={variants}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: !repeat, amount }}
      >
        {children}
      </motion.div>
    );
  }

  // Inside a group: no initial/whileInView, the parent drives the state.
  return (
    <motion.div data-reveal="" className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
