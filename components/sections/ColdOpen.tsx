"use client";

import { useRef } from "react";
import { coldOpen, person } from "@/content/site";
import { useGsap } from "@/lib/use-gsap";

/** Cold open: black frame, one light strikes, the title card, a slow push-in. */
export function ColdOpen() {
  const ref = useRef<HTMLElement>(null);

  useGsap(ref, ({ q, gsap }) => {
    const st = { trigger: ref.current, start: "top top", end: "bottom top", scrub: true };
    gsap.to(q("[data-push]"), { scale: 1.16, ease: "none", scrollTrigger: st });
    gsap.to(q("[data-push]"), {
      opacity: 0,
      filter: "blur(6px)",
      ease: "power1.in",
      scrollTrigger: { ...st, start: "30% top", end: "62% top" },
    });
    gsap.to(q("[data-cue]"), {
      opacity: 0,
      y: 30,
      ease: "none",
      scrollTrigger: { ...st, start: "top top", end: "12% top" },
    });
  });

  const [first, ...rest] = person.name.split(" ");

  return (
    <section id="title" data-act aria-labelledby="title-heading" className="relative h-[175vh]">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden px-5 text-center">
        <div data-push className="will-change-transform">
          <div className="title-card flex flex-col items-center">
            <p className="mono-label text-muted">{coldOpen.presents}</p>
            <h1
              id="title-heading"
              className="text-shadow-film font-display mt-6 text-[clamp(3.6rem,17vw,6rem)] leading-[0.92] font-light tracking-[0.04em] uppercase sm:mt-8 sm:text-[clamp(4rem,10.5vw,11.5rem)] sm:tracking-[0.06em]"
            >
              <span className="block sm:inline">{first}</span>{" "}
              <span className="block sm:inline">{rest.join(" ")}</span>
            </h1>
            <div className="mt-6 flex items-center gap-4 sm:mt-8" aria-hidden="true">
              <span className="bg-amber/60 h-px w-10 sm:w-16" />
              <span className="bg-amber size-1 rounded-full" />
              <span className="bg-amber/60 h-px w-10 sm:w-16" />
            </div>
            <p className="text-shadow-film text-paper/90 mt-6 max-w-[34ch] text-lg sm:text-xl">
              {person.subtitle}
            </p>
            <p className="text-shadow-film font-display text-amber mt-3 max-w-[36ch] text-lg italic sm:text-2xl">
              &ldquo;{person.tagline}&rdquo;
            </p>
          </div>
        </div>

        <div
          data-cue
          className="absolute bottom-[calc(var(--lb-max)+3.25rem)] flex flex-col items-center gap-3"
        >
          <span className="mono-label text-muted">{coldOpen.scrollCue}</span>
          <span className="scroll-cue-line" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
