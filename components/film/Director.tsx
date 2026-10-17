"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import { loadGsap, loadedGsap } from "@/lib/use-gsap";
import { whenIdle } from "@/lib/idle";
import { director, measure, scrollToId, setPointer, update } from "@/lib/director";

/**
 * Owns the single animation clock and smooth scrolling. Every frame it
 * advances Lenis, then recomputes the director state that the canvas, HUD and
 * overlays read. Lenis and GSAP load once the page is idle (scrolling is
 * locked behind the film leader until then). Also handles anchor navigation.
 */
export function Director() {
  useEffect(() => {
    director.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __director: typeof director }).__director = director;
    }

    let lenis: Lenis | null = null;
    let alive = true;

    measure();
    let frame = 0;
    const tick = (ms: number) => {
      lenis?.raf(ms);
      update(ms / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    if (!director.reducedMotion) {
      void whenIdle(2).then(async () => {
        const { default: LenisCtor } = await import("lenis");
        if (!alive) return;
        lenis = new LenisCtor({
          autoRaf: false,
          lerp: 0.09,
          smoothWheel: true,
          wheelMultiplier: 0.95,
          touchMultiplier: 1.3,
        });
        director.lenis = lenis;
        if (document.documentElement.classList.contains("is-loading")) lenis.stop();
        const { ScrollTrigger } = await loadGsap();
        if (alive) lenis.on("scroll", ScrollTrigger.update);
      });
    }

    let raf = 0;
    const remeasure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        measure();
        loadedGsap()?.ScrollTrigger.refresh();
      });
    };
    const ro = new ResizeObserver(remeasure);
    const main = document.getElementById("main");
    if (main) ro.observe(main);
    window.addEventListener("resize", remeasure);
    void document.fonts?.ready.then(remeasure);

    const onPointer = (e: PointerEvent) => setPointer(e.clientX, e.clientY);
    window.addEventListener("pointermove", onPointer, { passive: true });

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!a) return;
      const id = decodeURIComponent(a.getAttribute("href")!.slice(1));
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      scrollToId(id);
    };
    document.addEventListener("click", onClick);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("click", onClick);
      lenis?.destroy();
      director.lenis = null;
    };
  }, []);

  return null;
}
