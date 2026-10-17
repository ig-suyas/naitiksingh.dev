import type { CSSProperties } from "react";

/** Transition delay for a `[data-reveal]` element (see RevealObserver). */
export const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
