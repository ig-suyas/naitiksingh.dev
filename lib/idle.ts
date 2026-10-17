/**
 * Resolves once the page has loaded and the main thread is idle. Used to keep
 * non-critical code (animation libraries, the phone fallback) out of first
 * paint and hydration.
 *
 * Resolution is bounced through a macrotask so each caller's follow-up work
 * runs as its own task instead of piling into one long idle callback, and
 * `slot` staggers callers further apart (each slot waits for another idle
 * period). Long tasks are what Total Blocking Time counts.
 */
export function whenIdle(slot = 0, timeout = 1500): Promise<void> {
  return new Promise((resolve) => {
    const w = window as Window;
    const idleOnce = (next: () => void) => {
      if (typeof w.requestIdleCallback === "function") {
        w.requestIdleCallback(() => setTimeout(next, 0), { timeout });
      } else {
        setTimeout(next, 200);
      }
    };
    let remaining = slot;
    const step = () => {
      if (remaining-- <= 0) resolve();
      else idleOnce(step);
    };
    const start = () => idleOnce(step);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  });
}

/** Yield to the browser between chunks of work. */
export const nextTask = () => new Promise<void>((r) => setTimeout(r, 0));
