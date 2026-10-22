/**
 * The running order of the film. Each act is a <section data-act> in the DOM,
 * in this exact order. Act time `T` = act index + progress through that act.
 */

export type Transition = "none" | "flash" | "rack" | "iris" | "fade";
export type SetId = "projector" | "system" | "screening" | "fog" | "credits";

export interface ActDef {
  id: string;
  slate: string;
  label: string;
  /** Which 3D set is on screen during this act. */
  set: SetId;
  /** How the film cuts INTO this act from the previous one. */
  transitionIn: Transition;
  /** 0 = bars fully open, 1 = full 2.39:1 letterbox. */
  letterbox: number;
}

export const ACTS: readonly ActDef[] = [
  {
    id: "title",
    slate: "SC 00",
    label: "Cold open",
    set: "projector",
    transitionIn: "none",
    letterbox: 1,
  },
  {
    id: "problem",
    slate: "ACT I",
    label: "The Problem",
    set: "system",
    transitionIn: "flash",
    letterbox: 0.55,
  },
  {
    id: "build",
    slate: "ACT II",
    label: "The Build",
    set: "system",
    transitionIn: "none",
    letterbox: 0.9,
  },
  {
    id: "work",
    slate: "ACT III",
    label: "The Proof",
    set: "screening",
    transitionIn: "rack",
    letterbox: 0.3,
  },
  {
    id: "crew",
    slate: "ACT IV",
    label: "Services",
    set: "fog",
    transitionIn: "iris",
    letterbox: 0,
  },
  {
    id: "press",
    slate: "ACT V",
    label: "Press",
    set: "fog",
    transitionIn: "none",
    letterbox: 0.35,
  },
  {
    id: "contact",
    slate: "END",
    label: "End credits",
    set: "credits",
    transitionIn: "fade",
    letterbox: 0.6,
  },
];

export interface SetRange {
  id: SetId;
  start: number;
  end: number;
}

/** Contiguous T ranges per set, derived from ACTS. */
export const SET_RANGES: SetRange[] = ACTS.reduce<SetRange[]>((acc, act, i) => {
  const last = acc[acc.length - 1];
  if (last && last.id === act.set) last.end = i + 1;
  else acc.push({ id: act.set, start: i, end: i + 1 });
  return acc;
}, []);

export function setAt(T: number): SetRange {
  for (const r of SET_RANGES) if (T < r.end) return r;
  return SET_RANGES[SET_RANGES.length - 1]!;
}

/** Morph progress of the tangle → architecture, as a function of T. */
export const buildMorph = (T: number) => Math.min(1, Math.max(0, (T - 2.02) / 0.6));

/** Total running time used by the HUD timecode (seconds). */
export const RUNTIME_SECONDS = 7 * 60 + 12;
export const FPS = 24;
