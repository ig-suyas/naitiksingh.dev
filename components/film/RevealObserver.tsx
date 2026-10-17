"use client";

import { useEffect } from "react";

/**
 * One IntersectionObserver for every `[data-reveal]` element on the page.
 * Reveals are pure CSS transitions (see globals.css): no layout reads, no
 * per-element scroll listeners. Stagger with `style={{ "--d": "120ms" }}`.
 */
export function RevealObserver() {
  useEffect(() => {
    if (!document.documentElement.classList.contains("js-reveal")) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
