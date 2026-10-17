"use client";

import { useRef } from "react";
import { problemAct } from "@/content/site";
import { useGsap } from "@/lib/use-gsap";
import { Slate } from "@/components/ui/Slate";

/** Act I: the tangle. Pain points arrive like error logs as the camera dollies in. */
export function ProblemAct() {
  const ref = useRef<HTMLElement>(null);

  useGsap(ref, ({ q, gsap }) => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ref.current, start: "top 60%", end: "bottom bottom", scrub: 0.6 },
    });
    tl.from(q("[data-head]"), { opacity: 0, y: 40, duration: 0.5 })
      .from(
        q("[data-beat-line]"),
        { opacity: 0.08, x: -24, stagger: 0.45, duration: 0.5 },
        "+=0.15",
      )
      .from(q("[data-close]"), { opacity: 0, y: 24, duration: 0.5 }, "+=0.3")
      .to({}, { duration: 0.6 });
  });

  return (
    <section id="problem" data-act aria-labelledby="problem-heading" className="relative h-[240vh]">
      <div className="sticky top-0 flex h-svh items-center">
        <div
          className="from-ink/70 via-ink/20 md:from-ink/80 md:via-ink/30 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent md:bg-gradient-to-r md:to-transparent"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-[1500px] px-5 sm:px-10">
          <div className="max-w-xl">
            <div data-head>
              <Slate act={problemAct.slate} scene="01" title={problemAct.title} />
              <h2
                id="problem-heading"
                className="text-shadow-film font-display mt-8 text-[clamp(2.4rem,5.4vw,5rem)] leading-[1.02] font-light tracking-tight"
              >
                {problemAct.heading}
              </h2>
            </div>
            <ul className="mt-10 space-y-4">
              {problemAct.beats.map((b, i) => (
                <li
                  key={b}
                  data-beat-line
                  className="text-shadow-film text-paper/90 flex items-baseline gap-4 text-lg sm:text-xl"
                >
                  <span className="mono-label text-error shrink-0">ERR 0{i + 1}</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p
              data-close
              className="text-shadow-film border-amber/60 font-display text-amber mt-10 border-l pl-5 text-xl italic sm:text-2xl"
            >
              {problemAct.close}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
