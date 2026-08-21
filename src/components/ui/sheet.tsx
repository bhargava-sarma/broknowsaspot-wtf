"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useMounted } from "@/lib/hooks/use-mounted";
import { fade, springSurface } from "@/lib/motion/springs";

/**
 * A bottom sheet on the floating plane.
 *
 * Used where a panel of controls would otherwise eat the fold on a phone
 * — the explore filters being the case that motivated it. It is glass,
 * because it is unambiguously a thing in front of the page, and the page
 * staying visible and blurred behind it is what says "you are still on
 * the map, this is on top of it" rather than "you have navigated away".
 *
 * The parts that are not decoration:
 *
 * - **Escape closes it**, and the backdrop is clickable. A sheet with no
 *   way out but one small control is a trap on a phone.
 * - **Focus is held inside** while it is open, and returned to whatever
 *   opened it on close. Without that, tabbing walks invisibly through the
 *   page underneath.
 * - **Body scroll is locked**, so the page behind does not slide around
 *   under the reader's thumb while they are scrolling the sheet.
 * - It carries `env(safe-area-inset-bottom)`, so the last control never
 *   lands under a home indicator.
 *
 * **It renders through a portal, and has to.** `backdrop-filter` makes an
 * element a containing block for `position: fixed` descendants, exactly
 * as `transform` does. The filter bar that opens this sheet is itself
 * glass, so a sheet rendered in place resolves `fixed inset-0` against
 * that bar rather than against the viewport — it lands pinned under the
 * masthead, at the width of the bar, instead of covering the screen.
 * Portalling to <body> puts it outside every glass ancestor, which is
 * also simply where a modal belongs.
 */

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Rendered along the bottom edge, inside the safe area. */
  footer?: ReactNode;
};

/** Mirrors `--ease-exit` in globals.css. */
const EXIT = [0.32, 0, 0.67, 0] as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();

  // Remember what had focus, and hand it back on close.
  useEffect(() => {
    if (open) {
      restoreTo.current = document.activeElement as HTMLElement | null;
    } else {
      restoreTo.current?.focus?.();
    }
  }, [open]);

  // Lock the page behind. Restoring the previous value rather than
  // clearing it keeps this safe if anything else ever locks too.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /**
   * Escape is bound on the document, not on the panel.
   *
   * A React handler on the wrapper only sees keys that bubble from inside
   * it, which assumes focus is inside it. On a touch screen that
   * assumption is wrong: tapping a button does not necessarily focus it,
   * so focus stays on <body>, the key never reaches the panel, and the
   * sheet cannot be dismissed from the keyboard at all. Listening on the
   * document is the only placement that holds however the sheet was
   * opened.
   */
  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  /** Tab still needs the panel-scoped handler, to cycle within it. */
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== "Tab") return;

    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  // Move focus into the sheet once it exists.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const first =
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? null;
      (first ?? panelRef.current)?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const mounted = useMounted();
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-100 sm:hidden"
          onKeyDown={onKeyDown}
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            className="absolute inset-0 w-full cursor-default bg-ink/35 backdrop-blur-[3px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            // Arrives on a spring — it should feel picked up. Leaves on a
            // curve: the spring took over 800ms to clear the screen, and
            // dismissing something has to feel immediate.
            exit={
              reduce
                ? { opacity: 0 }
                : { y: "100%", transition: { duration: 0.26, ease: EXIT } }
            }
            transition={reduce ? fade : springSurface}
            className="glass-3 absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-[var(--radius-2xl)] outline-none"
          >
            {/* Grab handle. Purely a signifier — it says "this came from
                the bottom edge and goes back there" at a glance. */}
            <div className="flex justify-center pt-2.5 pb-1">
              <span
                aria-hidden="true"
                className="block h-1 w-10 rounded-full bg-ink/25"
              />
            </div>

            <div className="flex items-center justify-between px-[var(--gutter)] pt-2 pb-3">
              <h2 className="text-h3 text-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="press touch-target -mr-2 px-2 text-small font-semibold text-accent"
              >
                Done
              </button>
            </div>

            <div className="max-h-[54dvh] overflow-y-auto overscroll-contain px-[var(--gutter)] pb-4">
              {children}
            </div>

            {footer ? (
              <div className="border-t border-rule px-[var(--gutter)] py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {footer}
              </div>
            ) : (
              <div className="pb-[env(safe-area-inset-bottom)]" />
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
