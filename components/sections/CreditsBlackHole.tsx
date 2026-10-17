"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import { BlackHole } from "@/components/BlackHole";

const MOBILE = "(max-width: 767px)";

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(MOBILE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

// The hole sits low enough that its lensed arc and glow stay clear of the
// canvas's top edge.
const DESKTOP_PROPS = { scale: 0.65, x: 0.3, y: 0, maxDpr: 1.5 } as const;
const MOBILE_PROPS = { scale: 0.5, x: 0.1, y: 0.12, maxDpr: 1 } as const;

/**
 * Feathers the canvas's top and bottom edges. The canvas scrolls in with the
 * top of the section and out above the footer; without this, the glow would be
 * sliced by a hard horizontal line at those moments.
 */
const FEATHER = "linear-gradient(to bottom, transparent 0%, #000 22%, #000 84%, transparent 100%)";
const featherStyle: CSSProperties = { maskImage: FEATHER, WebkitMaskImage: FEATHER };

/**
 * The end-credits backdrop: Shadeon's Black Hole, filling the section behind
 * the credits. The canvas is one viewport tall and sticky, so the ray tracer
 * only ever shades a screen's worth of pixels while the credits scroll over it.
 */
export function CreditsBlackHole() {
  const mobile = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE).matches,
    () => false,
  );
  const layout = mobile ? MOBILE_PROPS : DESKTOP_PROPS;

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="sticky top-0 h-svh w-full" style={featherStyle}>
        <BlackHole speed={0.9} intensity={0.8} tilt={5} {...layout} />
      </div>
    </div>
  );
}
