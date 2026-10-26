"use client";

import { useEffect, useRef } from "react";
import { architecture } from "@/content/site";
import { LABEL_SIDE, labelEls, labelHeights, leaderEls } from "./registry";

/**
 * Real DOM labels for the 3D architecture, placed in two columns beside the
 * diagram with leader lines to their blocks (positioned by the System set).
 * Decorative here; BuildAct carries the same list for screen readers.
 */
export function NodeLabels() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>("[data-node]").forEach((n) =>
      labelEls.set(n.dataset.node!, n),
    );
    el.querySelectorAll<HTMLElement>("[data-leader]").forEach((n) =>
      leaderEls.set(n.dataset.leader!, n),
    );
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.node!;
        labelHeights.set(id, e.borderBoxSize[0]?.blockSize ?? e.contentRect.height);
      }
    });
    labelEls.forEach((n) => ro.observe(n));
    return () => {
      ro.disconnect();
      labelEls.clear();
      leaderEls.clear();
      labelHeights.clear();
    };
  }, []);

  return (
    <div ref={root} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {architecture.nodes.map((n) => (
        <div key={n.id} data-leader={n.id} className="node-leader" />
      ))}
      {architecture.nodes.map((n) => (
        <div key={n.id} data-node={n.id} data-side={LABEL_SIDE[n.id]} className="node-label">
          <span className="mono-label text-paper text-[0.62rem]">{n.label}</span>
          <span className="text-amber/90 font-mono text-[0.66rem]">{n.stack}</span>
        </div>
      ))}
      <div data-node="platform" data-side="right" className="node-label node-label-platform">
        <span className="mono-label text-paper text-[0.62rem]">{architecture.platform.label}</span>
        <span className="text-teal font-mono text-[0.66rem]">{architecture.platform.stack}</span>
      </div>
    </div>
  );
}
