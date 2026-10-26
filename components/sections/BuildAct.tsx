"use client";

import { useEffect, useRef } from "react";
import { architecture, buildAct } from "@/content/site";
import { buildMorph } from "@/lib/acts";
import { subscribe } from "@/lib/director";
import { useGsap } from "@/lib/use-gsap";
import { Slate } from "@/components/ui/Slate";
import { archFrame } from "@/components/canvas/registry";

/**
 * Act II: the hero 3D moment. The copy stays pinned while the canvas resolves
 * the tangle into a clean architecture; an assembly readout tracks progress.
 */
export function BuildAct() {
  const ref = useRef<HTMLElement>(null);
  const meterRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Measure the space the diagram may use (resize only, never on scroll): right
  // of the copy on desktop, between the copy and the readout below that. The
  // System set frames the diagram and its label columns inside it.
  useEffect(() => {
    const sticky = stickyRef.current;
    const section = sticky?.parentElement;
    const head = headRef.current;
    const foot = footRef.current;
    const list = listRef.current;
    if (!section || !sticky || !head || !foot || !list) return;
    const measure = () => {
      const vw = window.innerWidth;
      const s = sticky.getBoundingClientRect();
      const h = head.getBoundingClientRect();
      const f = foot.getBoundingClientRect();
      const pad = vw >= 640 ? 40 : 20;
      const nav =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 64;
      const lb = document.querySelector<HTMLElement>(".letterbox-bar.top")?.offsetHeight ?? 0;
      const bottom = f.top - s.top - 16;
      if (vw >= 1024) {
        // Start beside the copy's text itself, not its max-width box.
        let textRight = h.left;
        const range = document.createRange();
        const texts = document.createTreeWalker(head, NodeFilter.SHOW_TEXT);
        for (let t = texts.nextNode(); t; t = texts.nextNode()) {
          range.selectNodeContents(t);
          for (const q of range.getClientRects()) textRight = Math.max(textRight, q.right);
        }
        Object.assign(archFrame, {
          left: textRight + 24,
          right: vw - pad,
          top: Math.max(nav, lb) + 16,
          // Below it there is only the status readout, under the copy on the
          // left: the diagram may come down to the bottom letterbox bar.
          bottom: s.height - lb - 24,
          columns: true,
        });
      } else {
        const top = h.bottom - s.top + 16;
        const columns = vw >= 640;
        // Phones: the list sits under the diagram, just above the readout.
        const listTop = columns ? bottom : bottom - list.offsetHeight;
        Object.assign(archFrame, {
          left: pad,
          right: vw - pad,
          top,
          // Phones: room for the floor grid below the blocks, clear of the list.
          bottom: columns ? bottom : listTop - 44,
          columns,
        });
        list.style.top = `${listTop}px`;
      }
      archFrame.sectionBottom = section.getBoundingClientRect().bottom + window.scrollY;
      archFrame.ready = true;
    };
    measure();
    const ro = new ResizeObserver(measure);
    [section, head, foot].forEach((el) => ro.observe(el));
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      archFrame.ready = false;
    };
  }, []);

  useGsap(ref, ({ q, gsap }) => {
    gsap.from(q("[data-head]"), {
      opacity: 0,
      y: 40,
      scrollTrigger: { trigger: ref.current, start: "top 70%", end: "top 20%", scrub: 0.6 },
    });
  });

  useEffect(() => {
    let last = -1;
    return subscribe((d) => {
      const m = Math.round((d.reducedMotion ? (d.T >= 2 ? 1 : 0) : buildMorph(d.T)) * 100);
      if (m === last) return;
      last = m;
      if (meterRef.current) meterRef.current.textContent = `${m}%`;
      if (barRef.current) barRef.current.style.transform = `scaleX(${m / 100})`;
      if (listRef.current) listRef.current.dataset.on = m >= 85 ? "1" : "0";
      if (statusRef.current) {
        statusRef.current.textContent =
          m >= 100 ? "System online" : m > 0 ? "Assembling" : "Standing by";
        statusRef.current.dataset.state = m >= 100 ? "online" : "busy";
      }
    });
  }, []);

  return (
    <section id="build" data-act aria-labelledby="build-heading" className="relative h-[420vh]">
      <div ref={stickyRef} className="sticky top-0 h-svh">
        <div
          className="from-ink/80 via-ink/30 pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b to-transparent lg:inset-y-0 lg:right-auto lg:left-0 lg:h-full lg:w-[48%] lg:bg-gradient-to-r"
          aria-hidden="true"
        />
        <div className="relative mx-auto h-full w-full max-w-[1500px] px-5 sm:px-10">
          <div
            ref={headRef}
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

          {/* Phones: the diagram's labels as a plain list under it. */}
          <ul
            ref={listRef}
            data-arch-list
            data-on="0"
            aria-hidden="true"
            className="absolute inset-x-5 grid grid-cols-2 gap-x-4 gap-y-1.5 opacity-0 transition-opacity duration-700 data-[on=1]:opacity-100 sm:hidden"
          >
            {architecture.nodes.map((n) => (
              <li
                key={n.id}
                className="mono-label text-paper/85 border-amber/60 border-l pl-2.5 text-[0.6rem] tracking-[0.14em]"
              >
                {n.label}
              </li>
            ))}
            <li className="mono-label text-paper/85 border-teal/60 border-l pl-2.5 text-[0.6rem] tracking-[0.14em]">
              {architecture.platform.label}
            </li>
          </ul>

          <div
            ref={footRef}
            className="absolute inset-x-5 bottom-[calc(var(--lb-max)+3.5rem)] flex flex-col gap-4 sm:inset-x-10 lg:flex-row lg:items-end lg:justify-between"
          >
            <div className="mono-label text-muted flex items-center gap-3" aria-hidden="true">
              <span
                ref={statusRef}
                data-state="busy"
                className="text-amber data-[state=online]:text-teal"
              >
                Standing by
              </span>{" "}
              <span className="bg-paper/15 relative h-px w-24 overflow-hidden">
                <span ref={barRef} className="bg-amber absolute inset-0 origin-left scale-x-0" />
              </span>{" "}
              <span ref={meterRef} className="text-paper w-[4ch] text-right tabular-nums">
                0%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
