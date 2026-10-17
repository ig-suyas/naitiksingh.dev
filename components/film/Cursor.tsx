"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, summary, select, label, [data-cursor]";
const TEXT = "input, textarea";

/**
 * A film-camera reticle that trails the pointer. Fine pointers only; touch
 * devices and keyboard users keep the platform defaults.
 */
export function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current!;
    const html = document.documentElement;
    html.classList.add("has-reticle");

    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let raf = 0;

    const loop = () => {
      const k = reduce ? 1 : 0.2;
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      ringRef.current!.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      dotRef.current!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      root.classList.add("is-visible");
    };
    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null;
      const text = t?.closest?.(TEXT);
      const hit = text ? null : t?.closest?.(INTERACTIVE);
      root.classList.toggle("is-text", !!text);
      root.classList.toggle("is-hover", !!hit);
      labelRef.current!.textContent = (hit as HTMLElement | null)?.dataset?.cursor ?? "";
    };
    const onLeave = () => root.classList.remove("is-visible");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      html.classList.remove("has-reticle");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className="reticle" aria-hidden="true">
      <div ref={ringRef} className="absolute top-0 left-0">
        <div className="reticle-ring" />
        <span ref={labelRef} className="reticle-label" />
      </div>
      <div ref={dotRef} className="absolute top-0 left-0">
        <div className="reticle-dot" />
      </div>
    </div>
  );
}
