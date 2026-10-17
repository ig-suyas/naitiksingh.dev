"use client";

import { useEffect, useRef } from "react";
import { ACTS, setAt } from "@/lib/acts";
import { director, subscribe } from "@/lib/director";
import { projectorAudio } from "@/lib/audio";
import { clamp, lerp, smoothstep } from "@/lib/math";

/** Half-width of a transition, in viewport heights either side of the cut. */
const WINDOW = 0.5;

/**
 * Letterbox bars, vignette, light leaks, grain and the scroll-scrubbed film
 * transitions (flash, rack focus, iris, fade) that hide every cut between sets.
 */
export function FilmOverlays() {
  const flashRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const leakRef = useRef<HTMLDivElement>(null);
  const barTopRef = useRef<HTMLDivElement>(null);
  const barBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    let lastLb = -1;
    let lastMax = -1;
    let lastFilter = "";
    let lastClip = "";
    let lastFlash = -1;
    let lastBlack = -1;
    let lastLeak = "";
    let lastAct = -1;
    let lastSet = "";
    let stage: HTMLElement | null = null;

    return subscribe((d) => {
      stage ??= document.getElementById("stage");
      const { T, vw, vh } = d;
      const i = Math.min(ACTS.length - 1, Math.floor(T));
      const here = ACTS[i]!;
      const next = ACTS[i + 1] ?? here;

      // Transition intensity around the nearest cut.
      const { k, d: dist } = d.boundary;
      const type = ACTS[k]?.transitionIn ?? "none";
      const x = smoothstep(0, 1, 1 - clamp(Math.abs(dist) / WINDOW));
      const live = !d.reducedMotion && d.introDone;

      // Letterbox
      let amount = lerp(here.letterbox, next.letterbox, smoothstep(0.85, 1, T - i));
      if (!d.introDone) amount = 1;
      if (live && type !== "none") amount = Math.max(amount, x);
      // Bar height only changes on resize (a :root variable restyles the whole
      // page, so it must never change per frame); opening/closing is a scaleY.
      const landscape = vw > vh;
      const maxBar = Math.round(
        landscape ? clamp((vh - vw / 2.39) / 2, vh * 0.06, vh * 0.115) : vh * 0.06,
      );
      if (maxBar !== lastMax) {
        root.style.setProperty("--lb-max", `${maxBar}px`);
        lastMax = maxBar;
      }
      const lb = Math.round(amount * 1000) / 1000;
      if (lb !== lastLb) {
        const t = `scaleY(${lb})`;
        if (barTopRef.current) barTopRef.current.style.transform = t;
        if (barBottomRef.current) barBottomRef.current.style.transform = t;
        lastLb = lb;
      }

      // Scrubbed transitions
      let flash = 0;
      let black = 0;
      let filter = "";
      let clip = "";
      if (live && x > 0.001) {
        if (type === "flash") flash = Math.pow(x, 1.7) * 0.92;
        if (type === "fade") black = x;
        if (type === "rack")
          filter = `blur(${(x * 16).toFixed(2)}px) brightness(${(1 - x * 0.55).toFixed(3)})`;
        if (type === "iris") clip = `circle(${((1 - x) * 74).toFixed(2)}% at 50% 50%)`;
      }
      if (flash !== lastFlash && flashRef.current) {
        flashRef.current.style.opacity = flash.toFixed(3);
        lastFlash = flash;
      }
      if (black !== lastBlack && blackRef.current) {
        blackRef.current.style.opacity = black.toFixed(3);
        lastBlack = black;
      }
      if (stage && filter !== lastFilter) {
        stage.style.filter = filter;
        lastFilter = filter;
      }
      if (stage && clip !== lastClip) {
        stage.style.clipPath = clip;
        lastClip = clip;
      }
      const leak = (0.32 + flash * 0.7).toFixed(2);
      if (leak !== lastLeak) {
        leakRef.current?.style.setProperty("--leak", leak);
        lastLeak = leak;
      }

      // Reduced motion: every change of set is a quick cross-fade through black.
      const set = setAt(T).id;
      if (set !== lastSet) {
        if (lastSet && director.reducedMotion && blackRef.current) {
          const el = blackRef.current;
          el.classList.remove("is-cut");
          void el.offsetWidth;
          el.classList.add("is-cut");
        }
        lastSet = set;
      }
      if (d.act !== lastAct) {
        if (lastAct !== -1) projectorAudio.cue();
        lastAct = d.act;
      }
    });
  }, []);

  return (
    <div aria-hidden="true">
      <div className="film-overlay film-vignette" />
      <div className="film-overlay film-leak" ref={leakRef} />
      <div className="film-overlay film-flash" ref={flashRef} />
      <div className="film-overlay film-blackout" ref={blackRef} />
      <div className="letterbox-bar top" ref={barTopRef} />
      <div className="letterbox-bar bottom" ref={barBottomRef} />
      <div className="film-grain" />
    </div>
  );
}
