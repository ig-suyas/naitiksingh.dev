"use client";

import { AnimatePresence, LazyMotion, m } from "motion/react";
import { nav, person } from "@/content/site";
import { loadMotionFeatures } from "@/lib/load-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Full-screen phone menu. Loaded on first open, so motion stays out of first load. */
export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            key="menu"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="bg-ink/97 fixed inset-0 top-0 z-[-1] flex flex-col justify-between px-6 pt-28 pb-10 md:hidden"
          >
            <ul className="flex flex-col gap-2" onClick={onClose}>
              {nav.map((l, i) => (
                <m.li
                  key={l.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.06, duration: 0.5, ease: EASE }}
                >
                  <a href={l.href} className="font-display flex items-baseline gap-4 py-2 text-5xl">
                    <span className="mono-label text-amber">0{i + 1}</span>
                    {l.label}
                  </a>
                </m.li>
              ))}
            </ul>
            <div className="flex flex-col gap-4" onClick={onClose}>
              <p className="mono-label text-teal flex items-center gap-2">
                <span className="bg-teal size-2 rounded-full" aria-hidden="true" />
                {person.availability.label}
              </p>
              <a
                href="#brief"
                className="mono-label bg-amber text-ink flex h-12 items-center justify-center rounded-full"
              >
                Start your project
              </a>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
