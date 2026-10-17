"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { director, measure } from "@/lib/director";
import { loading } from "@/lib/loading";

const MAX_MS = 9000;

/**
 * Academy-style film leader: 5…4…3…2…1 with a sweeping hand, driven by real
 * loading progress (fonts, page load, the 3D chunk, textures, shaders).
 * Ends in a hard cut, after which the cold open's light strikes.
 */
export function Leader() {
  const [hidden, setHidden] = useState(false);
  const digitRef = useRef<SVGTextElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setHidden(true);
    const html = document.documentElement;
    html.classList.remove("is-loading");
    html.classList.add("intro-done");
    director.introDone = true;
    director.introAt = performance.now() / 1000;
    try {
      sessionStorage.setItem("seen-leader", "1");
    } catch {
      /* private mode */
    }
    measure();
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) {
      director.lenis?.scrollTo(target, { immediate: true, force: true });
      if (!director.lenis) target.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
    director.lenis?.start();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fast = reduce || html.classList.contains("leader-fast");
    const perDigit = reduce ? 0.06 : fast ? 0.14 : 0.42;

    loading.add("dom", 1);
    loading.add("fonts", 1);
    if (document.readyState === "complete") loading.done("dom");
    else window.addEventListener("load", () => loading.done("dom"), { once: true });
    void document.fonts?.ready.then(() => loading.done("fonts"));

    let real = 0;
    const unsub = loading.subscribe((p) => (real = p));
    const start = performance.now();
    let last = start;
    let shown = 0;
    let raf = 0;
    let lastDigit = 5;

    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // The hand sweeps at most one digit per `perDigit` seconds and never
      // runs ahead of what has actually loaded.
      const target = now - start > MAX_MS ? 5 : Math.min(5, real * 5);
      shown = Math.min(target, shown + dt / perDigit);
      const digit = Math.max(1, 5 - Math.floor(shown));
      if (digit !== lastDigit && digitRef.current) {
        digitRef.current.textContent = String(digit);
        lastDigit = digit;
      }
      const frac = shown >= 5 ? 1 : shown % 1;
      sweepRef.current?.style.setProperty("--sweep", `${(frac * 360).toFixed(1)}deg`);
      if (pctRef.current) pctRef.current.textContent = `${Math.round(real * 100)}%`;
      if (shown >= 5) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
      window.removeEventListener("keydown", onKey);
    };
  }, [finish]);

  return (
    <div className="leader leader-flicker" hidden={hidden}>
      <span className="sr-only" role="status">
        {hidden ? "" : "Loading the film"}
      </span>
      <div className="film-scratch" aria-hidden="true" />
      <div
        className="border-paper/15 pointer-events-none absolute inset-[4vmin] rounded-[3vmin] border"
        aria-hidden="true"
      />
      <div className="leader-frame" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" fill="none">
          <circle cx="50" cy="50" r="47" stroke="rgb(236 230 218 / 0.38)" strokeWidth="0.45" />
          <circle cx="50" cy="50" r="40" stroke="rgb(236 230 218 / 0.22)" strokeWidth="0.35" />
          <line
            x1="-40"
            y1="50"
            x2="140"
            y2="50"
            stroke="rgb(236 230 218 / 0.22)"
            strokeWidth="0.3"
          />
          <line
            x1="50"
            y1="-40"
            x2="50"
            y2="140"
            stroke="rgb(236 230 218 / 0.22)"
            strokeWidth="0.3"
          />
        </svg>
        <div className="leader-sweep" ref={sweepRef} />
        {/* SVG text is not an LCP candidate, so the countdown never delays LCP. */}
        <svg viewBox="0 0 100 100" className="leader-digit-svg">
          <text
            ref={digitRef}
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            className="leader-digit"
          >
            5
          </text>
        </svg>
      </div>
      <div className="leader-meta mono-label" aria-hidden="true">
        <span>Reel 01</span>
        <span className="text-amber">The Final Cut</span>
        <span ref={pctRef}>0%</span>
      </div>
      <button type="button" className="leader-skip mono-label" onClick={finish}>
        Skip intro
      </button>
    </div>
  );
}
