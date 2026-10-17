"use client";

import { useEffect, useRef } from "react";
import { ACTS, FPS, RUNTIME_SECONDS } from "@/lib/acts";
import { subscribe } from "@/lib/director";

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");

/** Bottom-corner slate (current act) and timecode with a film-strip progress bar. */
export function Hud() {
  const slateRef = useRef<HTMLSpanElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastAct = -1;
    let lastTc = "";
    let lastP = "";
    const total = RUNTIME_SECONDS * FPS;
    return subscribe((d) => {
      if (d.act !== lastAct && slateRef.current) {
        const a = ACTS[Math.min(d.act, ACTS.length - 1)]!;
        slateRef.current.textContent = `${a.slate} · ${a.label}`;
        lastAct = d.act;
      }
      const frames = Math.round(d.progress * total);
      const s = frames / FPS;
      const tc = `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}:${pad(frames % FPS)}`;
      if (tc !== lastTc && tcRef.current) {
        tcRef.current.textContent = tc;
        lastTc = tc;
      }
      const p = d.progress.toFixed(3);
      if (p !== lastP) {
        stripRef.current?.style.setProperty("--p", p);
        lastP = p;
      }
    });
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end justify-between px-4 pb-3 sm:px-6 sm:pb-4"
      aria-hidden="true"
    >
      <div className="mono-label text-muted flex items-center gap-2">
        <span className="bg-error inline-block size-1.5 rounded-full" />
        <span ref={slateRef}>SC 00 · Cold open</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="filmstrip hidden sm:block" ref={stripRef}>
          <div className="filmstrip-fill" />
        </div>
        <span ref={tcRef} className="mono-label text-paper/80 tabular-nums">
          00:00:00:00
        </span>
      </div>
    </div>
  );
}
