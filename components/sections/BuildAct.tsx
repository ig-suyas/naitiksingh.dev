"use client";

import { useEffect, useRef } from "react";
import { architecture, buildAct } from "@/content/site";
import { buildMorph } from "@/lib/acts";
import { subscribe } from "@/lib/director";
import { useGsap } from "@/lib/use-gsap";
import { Slate } from "@/components/ui/Slate";

/**
 * Act II: the hero 3D moment. The copy stays pinned while the canvas resolves
 * the tangle into a clean architecture; an assembly readout tracks progress.
 */
export function BuildAct() {
  const ref = useRef<HTMLElement>(null);
  const meterRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useGsap(ref, ({ q, gsap }) => {
    gsap.from(q("[data-head]"), {
      opacity: 0,
      y: 40,
      scrollTrigger: { trigger: ref.current, start: "top 70%", end: "top 20%", scrub: 0.6 },
    });
    gsap.from(q("[data-close]"), {
      opacity: 0,
      y: 30,
      scrollTrigger: { trigger: ref.current, start: "55% center", end: "68% center", scrub: 0.6 },
    });
  });

  useEffect(() => {
    let last = -1;
    return subscribe((d) => {
      const m = Math.round((d.reducedMotion ? (d.T >= 2 ? 1 : 0) : buildMorph(d.T)) * 100);
      if (m === last) return;
      last = m;
      if (meterRef.current) meterRef.current.textContent = `${String(m).padStart(3, "0")}%`;
      if (barRef.current) barRef.current.style.transform = `scaleX(${m / 100})`;
      if (statusRef.current) {
        statusRef.current.textContent =
          m >= 100 ? "System online" : m > 0 ? "Assembling" : "Standing by";
        statusRef.current.dataset.state = m >= 100 ? "online" : "busy";
      }
    });
  }, []);

  return (
    <section id="build" data-act aria-labelledby="build-heading" className="relative h-[420vh]">
      <div className="sticky top-0 h-svh">
        <div
          className="from-ink/80 via-ink/30 pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b to-transparent lg:inset-y-0 lg:right-auto lg:left-0 lg:h-full lg:w-[48%] lg:bg-gradient-to-r"
          aria-hidden="true"
        />
        <div className="relative mx-auto h-full w-full max-w-[1500px] px-5 sm:px-10">
          <div
            data-head
            className="max-w-md pt-[calc(var(--nav-h)+max(var(--lb-max),1rem)+1.5rem)] lg:absolute lg:top-1/2 lg:-translate-y-1/2 lg:pt-0"
          >
            <Slate act={buildAct.slate} scene="02" title={buildAct.title} />
            <h2
              id="build-heading"
              className="text-shadow-film font-display mt-6 text-[clamp(2.2rem,4.8vw,4.6rem)] leading-[1.02] font-light tracking-tight lg:mt-8"
            >
              {buildAct.heading}
            </h2>
            <p className="text-shadow-film text-paper/85 mt-5 max-w-[42ch] text-base sm:text-lg lg:mt-6">
              {buildAct.body}
            </p>
          </div>

          <ul className="sr-only" aria-label="The layers of a typical system I build">
            {architecture.nodes.map((n) => (
              <li key={n.id}>
                {n.label}: {n.stack}
              </li>
            ))}
            <li>
              {architecture.platform.label}: {architecture.platform.stack}
            </li>
          </ul>

          <div className="absolute inset-x-5 bottom-[calc(var(--lb-max)+3.5rem)] flex flex-col gap-4 sm:inset-x-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="mono-label text-muted flex items-center gap-3" aria-hidden="true">
              <span
                ref={statusRef}
                data-state="busy"
                className="text-amber data-[state=online]:text-teal"
              >
                Standing by
              </span>
              <span className="bg-paper/15 relative h-px w-24 overflow-hidden">
                <span ref={barRef} className="bg-amber absolute inset-0 origin-left scale-x-0" />
              </span>
              <span ref={meterRef} className="text-paper tabular-nums">
                000%
              </span>
            </div>
            <p
              data-close
              className="text-shadow-film font-display text-amber max-w-sm text-lg italic sm:text-xl lg:text-right"
            >
              {buildAct.close}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
