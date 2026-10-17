"use client";

import { useEffect, useRef } from "react";
import { architecture } from "@/content/site";
import { labelEls } from "./registry";

/**
 * Real DOM labels for the 3D architecture (positioned by the System set).
 * Decorative here; BuildAct carries the same list for screen readers.
 */
export function NodeLabels() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>("[data-node]") ?? [];
    els.forEach((el) => labelEls.set(el.dataset.node!, el));
    return () => labelEls.clear();
  }, []);

  return (
    <div ref={root} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {architecture.nodes.map((n) => (
        <div key={n.id} data-node={n.id} className="node-label">
          <span className="mono-label text-paper text-[0.62rem]">{n.label}</span>
          <span className="text-amber/90 hidden font-mono text-[0.66rem] sm:block">{n.stack}</span>
        </div>
      ))}
      <div
        data-node="platform"
        className="node-label border-r-teal/60 border-r border-l-0 pr-2.5 pl-0 text-right"
      >
        <span className="mono-label text-paper text-[0.62rem]">{architecture.platform.label}</span>
        <span className="text-teal hidden font-mono text-[0.66rem] sm:block">
          {architecture.platform.stack}
        </span>
      </div>
    </div>
  );
}
