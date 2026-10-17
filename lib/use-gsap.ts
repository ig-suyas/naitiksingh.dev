"use client";

import { useEffect, type DependencyList, type RefObject } from "react";
import type { gsap as Gsap } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import { nextTask, whenIdle } from "./idle";

export interface GsapKit {
  gsap: typeof Gsap;
  ScrollTrigger: typeof ScrollTriggerType;
}

let kit: GsapKit | null = null;
let pending: Promise<GsapKit> | null = null;

/**
 * GSAP + ScrollTrigger, loaded on demand once the page is idle. Nothing can
 * scroll until the film leader finishes, so the scrubbed timelines never need
 * GSAP during first paint, and keeping it out of the initial bundle matters on
 * phones.
 */
export function loadGsap(): Promise<GsapKit> {
  pending ??= whenIdle(1)
    .then(() => Promise.all([import("gsap"), import("gsap/ScrollTrigger")]))
    .then(([g, st]) => {
      g.gsap.registerPlugin(st.ScrollTrigger);
      kit = { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger };
      return kit;
    });
  return pending;
}

/** The kit if it has already loaded, else null (never triggers a load). */
export const loadedGsap = () => kit;

/**
 * Runs GSAP code scoped to an element and reverts every tween/trigger on
 * unmount. Motion is skipped entirely for prefers-reduced-motion.
 */
export function useGsap(
  scope: RefObject<HTMLElement | null>,
  setup: (ctx: GsapKit & { q: (sel: string) => HTMLElement[] }) => void,
  deps: DependencyList = [],
) {
  useEffect(() => {
    if (!scope.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: ReturnType<typeof Gsap.context> | undefined;
    let cancelled = false;
    void loadGsap().then(async (k) => {
      // One section per task, so ScrollTrigger setup never forms a long task.
      await nextTask();
      if (cancelled || !scope.current) return;
      ctx = k.gsap.context(() => {
        setup({ ...k, q: (sel) => k.gsap.utils.toArray<HTMLElement>(sel, scope.current) });
      }, scope);
    });
    return () => {
      cancelled = true;
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
