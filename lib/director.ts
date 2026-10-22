/**
 * The director: one mutable store that is the single source of truth for
 * scroll-driven state. DOM components subscribe to it; the WebGL canvas reads
 * it directly inside useFrame. Nothing here triggers React re-renders.
 */
import type Lenis from "lenis";
import { ACTS } from "./acts";
import { clamp } from "./math";

export type Tier = "high" | "medium" | "low";

interface Beat {
  group: string;
  index: number;
  el: HTMLElement;
  center: number;
}

export interface DirectorState {
  /** Continuous act time: index of the act + progress through it. */
  T: number;
  act: number;
  /** Page scroll progress 0..1. */
  progress: number;
  scroll: number;
  velocity: number;
  vw: number;
  vh: number;
  /** Pointer in -1..1, y up. */
  pointer: { x: number; y: number };
  /** Continuous index per beat group, e.g. beats.work = 0.4 between project 0 and 1. */
  beats: Record<string, number>;
  /** Nearest act boundary (k = index of the act being entered) and signed distance in viewport heights. */
  boundary: { k: number; d: number };
  reducedMotion: boolean;
  tier: Tier;
  introDone: boolean;
  introAt: number;
  /** True while shaders are pre-compiled: every set is made visible. */
  compiling: boolean;
  time: number;
  lenis: Lenis | null;
}

type Listener = (s: DirectorState) => void;

const listeners = new Set<Listener>();
let sectionTops: number[] = [];
let sectionHeights: number[] = [];
let beats: Beat[] = [];
let lastScroll = 0;
let scrollMax = 1;
/** Set when layout was re-measured or something non-scroll changed; forces a notify. */
let dirty = true;
let lastKey = "";

export const director: DirectorState = {
  T: 0,
  act: 0,
  progress: 0,
  scroll: 0,
  velocity: 0,
  vw: 1280,
  vh: 800,
  pointer: { x: 0, y: 0 },
  beats: {},
  boundary: { k: 1, d: -10 },
  reducedMotion: false,
  tier: "high",
  introDone: false,
  introAt: 0,
  compiling: false,
  time: 0,
  lenis: null,
};

export function subscribe(fn: Listener) {
  listeners.add(fn);
  fn(director);
  dirty = true;
  return () => {
    listeners.delete(fn);
  };
}

/** Re-measure section and beat positions. Call on resize / layout change. */
export function measure() {
  const sy = window.scrollY;
  director.vw = window.innerWidth;
  director.vh = window.innerHeight;
  scrollMax = Math.max(1, document.documentElement.scrollHeight - director.vh);
  dirty = true;
  // A missing act (e.g. Press with no reviews) collapses to zero height in place.
  sectionTops = [];
  sectionHeights = [];
  let cursor = 0;
  for (const a of ACTS) {
    const el = document.getElementById(a.id);
    const top = el ? el.getBoundingClientRect().top + sy : cursor;
    const h = el ? el.offsetHeight : 0;
    sectionTops.push(top);
    sectionHeights.push(h);
    cursor = top + h;
  }
  beats = Array.from(document.querySelectorAll<HTMLElement>("[data-beat]")).map((el) => {
    const [group = "", index = "0"] = (el.dataset.beat ?? "").split(":");
    const r = el.getBoundingClientRect();
    return { group, index: Number(index), el, center: r.top + sy + r.height / 2 };
  });
}

/** Called once per frame by the ticker in <Director/>. */
export function update(time: number) {
  const scroll = window.scrollY;
  const { vh } = director;
  director.time = time;
  director.velocity = scroll - lastScroll;
  lastScroll = scroll;
  director.scroll = scroll;

  // scrollHeight is cached by measure(): reading it here would force a layout every frame.
  const max = scrollMax;
  director.progress = clamp(scroll / max);

  // Act time: measured against the viewport's center line.
  const ref = scroll + vh * 0.5;
  let T = 0;
  const n = sectionTops.length;
  if (n) {
    T = n - 0.0001;
    for (let i = 0; i < n; i++) {
      const top = sectionTops[i]!;
      const h = Math.max(1, sectionHeights[i]!);
      if (ref < top + h || i === n - 1) {
        T = i + clamp((ref - top) / h, 0, 0.9999);
        break;
      }
    }
    // The first act starts at the very top of the page, not at the center line,
    // so T = 0 exactly at scroll 0.
    if (n > 1 && ref < sectionTops[1]!) {
      T = clamp(scroll / Math.max(1, sectionTops[1]! - vh * 0.5), 0, 0.9999);
    }
    // The page bottom can never bring the last act's center line to its end;
    // stretch the final viewport of scroll so T reaches n at the very bottom.
    const lastTop = sectionTops[n - 1]!;
    if (ref > lastTop) {
      const lastSpan = Math.max(1, max + vh * 0.5 - lastTop);
      T = n - 1 + clamp((ref - lastTop) / lastSpan, 0, 0.9999);
    }
  }
  director.T = T;
  director.act = Math.floor(T);

  // Nearest boundary for film transitions.
  let bestK = 1;
  let bestD = Infinity;
  for (let k = 1; k < n; k++) {
    const d = (ref - sectionTops[k]!) / vh;
    if (Math.abs(d) < Math.abs(bestD)) {
      bestD = d;
      bestK = k;
    }
  }
  director.boundary.k = bestK;
  director.boundary.d = bestD;

  // Beats: continuous index per group.
  const groups: Record<string, Beat[]> = {};
  for (const b of beats) (groups[b.group] ??= []).push(b);
  for (const g in groups) {
    const list = groups[g]!.sort((a, b) => a.index - b.index);
    let v = 0;
    const first = list[0]!;
    const last = list[list.length - 1]!;
    if (ref <= first.center) v = clamp((ref - first.center) / vh, -1, 0);
    else if (ref >= last.center) v = list.length - 1 + clamp((ref - last.center) / vh, 0, 1);
    else {
      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i]!;
        const b = list[i + 1]!;
        if (ref >= a.center && ref < b.center) {
          v = i + (ref - a.center) / (b.center - a.center);
          break;
        }
      }
    }
    director.beats[g] = v;
  }

  // Nothing moved: skip the listeners entirely (most frames while idle).
  const key = `${scroll}|${director.pointer.x}|${director.pointer.y}|${director.introDone}`;
  if (!dirty && key === lastKey) return;
  lastKey = key;
  dirty = false;
  for (const fn of listeners) fn(director);
}

/** Ask for a notify on the next frame (e.g. after intro state changes). */
export function invalidate() {
  dirty = true;
}

export function setPointer(clientX: number, clientY: number) {
  director.pointer.x = (clientX / director.vw) * 2 - 1;
  director.pointer.y = -((clientY / director.vh) * 2 - 1);
}

/** Smooth-scroll to an element id, then move focus there for keyboard users. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const focus = () => {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  };
  if (director.lenis && !director.reducedMotion) {
    const distance = Math.abs(el.getBoundingClientRect().top);
    const duration = clamp(0.8 + distance / 6000, 0.8, 2.6);
    director.lenis.scrollTo(el, { duration, onComplete: focus });
  } else {
    el.scrollIntoView({ behavior: "auto" });
    focus();
  }
  history.replaceState(null, "", `#${id}`);
}
