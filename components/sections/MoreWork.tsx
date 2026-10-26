"use client";

import { useRef, useState, type ReactNode } from "react";
import { director } from "@/lib/director";

/** Jump the page to a document y (through Lenis when it is running). */
function scrollToY(y: number) {
  const top = Math.max(0, Math.round(y));
  if (director.lenis && !director.reducedMotion) {
    director.lenis.resize();
    director.lenis.scrollTo(top, { immediate: true });
  } else {
    window.scrollTo({ top, behavior: "auto" });
  }
}

/**
 * "See more work": a disclosure that expands the remaining features in place.
 * The features stay in the DOM; while collapsed the panel is `inert`, which
 * also removes them from the director (see `measure`), so their screens can't
 * show. Height and opacity animate in CSS (`.more-work` in globals.css),
 * instantly under reduced motion.
 */
export function MoreWork({ range, children }: { range: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    const btn = button.current;
    if (!btn) return;
    if (open) {
      // Collapse back to 02. Keyboard users can press the button while it is
      // offscreen: bring it back into view first so the page doesn't clamp.
      const r = btn.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) {
        scrollToY(r.top + scrollY - innerHeight * 0.6);
      }
      setOpen(false);
      return;
    }
    // Expand in place: nothing above the button moves, and scrolling simply
    // carries on from 02 into 03 and 04 (no programmatic jump).
    setOpen(true);
  };

  return (
    <>
      <div className="relative z-10 mx-auto -mt-[10vh] mb-[8vh] w-full max-w-[1500px] px-5 sm:px-10 lg:-mt-[42vh]">
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls="more-work"
          onClick={toggle}
          data-cursor={open ? "Close" : "More"}
          className="mono-label border-paper/20 text-paper/85 hover:border-paper/50 hover:text-paper flex h-11 items-center gap-3 rounded-full border px-5 transition-colors"
        >
          {open ? "Show less" : "See more work"}
          <span className="text-dim" aria-hidden="true">
            {range}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className={`transition-transform duration-500 ${open ? "rotate-180" : ""}`}
          >
            <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
      <div id="more-work" className="more-work" data-open={open || undefined} inert={!open}>
        <div>
          {/* Extra air on desktop so 02 has fully handed off before 03 enters. */}
          <div className="lg:pt-[60vh]">{children}</div>
        </div>
      </div>
    </>
  );
}
