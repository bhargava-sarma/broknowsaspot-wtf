/**
 * The sky the whole app sits on.
 *
 * Four blurred colour fields drifting on unrelated periods (52s, 61s,
 * 67s, 79s) so they never re-sync into a loop you can catch, plus a
 * starfield that only lights in the dark theme and a vignette that pulls
 * the corners back toward the page ground.
 *
 * Three things keep it affordable, and all three are load-bearing:
 *
 * - **It is fixed, not repeated per section.** One layer for the whole
 *   document, painted once, that never re-rasterises on scroll.
 * - **Only transform and opacity animate.** A blurred field is
 *   expensive to rasterise and free to move afterwards. Nothing here
 *   animates size, colour or `filter`.
 * - **`contain: layout paint style` on the wrapper** (set in globals.css)
 *   keeps its layout and paint out of the rest of the page's business.
 *
 * It is a server component with no props: there is nothing here that
 * needs state, and shipping it as static markup keeps it out of the
 * hydration path entirely.
 */
export function AuroraGround() {
  return (
    <div aria-hidden="true" className="aurora-ground">
      <div
        className="aurora-field aurora-a"
        style={{
          width: "min(78vw, 1000px)",
          height: "min(70vh, 800px)",
          left: "-14vw",
          top: "-18vh",
          background:
            "radial-gradient(circle, rgb(var(--aurora-ice) / 0.55), transparent 68%)",
        }}
      />
      <div
        className="aurora-field aurora-b"
        style={{
          width: "min(82vw, 1060px)",
          height: "min(74vh, 830px)",
          right: "-18vw",
          top: "-12vh",
          background:
            "radial-gradient(circle, rgb(var(--aurora-violet) / 0.52), transparent 68%)",
        }}
      />
      <div
        className="aurora-field aurora-c"
        style={{
          width: "min(60vw, 780px)",
          height: "min(56vh, 640px)",
          left: "38%",
          top: "26vh",
          opacity: "calc(var(--aurora-strength) * 0.62)",
          background:
            "radial-gradient(circle, rgb(var(--aurora-ember) / 0.9), transparent 66%)",
        }}
      />
      <div
        className="aurora-field aurora-b"
        style={{
          width: "min(72vw, 940px)",
          height: "min(64vh, 720px)",
          left: "-10vw",
          bottom: "-22vh",
          animationDuration: "61s",
          opacity: "calc(var(--aurora-strength) * 0.8)",
          background:
            "radial-gradient(circle, rgb(var(--aurora-ice) / 0.42), transparent 70%)",
        }}
      />

      <div className="starfield" />
      <div className="aurora-vignette" />
    </div>
  );
}
