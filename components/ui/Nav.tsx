"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { nav, person } from "@/content/site";
import { ACTS } from "@/lib/acts";
import { subscribe } from "@/lib/director";
import { projectorAudio } from "@/lib/audio";
import { Magnetic } from "./Magnetic";

const loadMenu = () => import("./MobileMenu");
const MobileMenu = dynamic(loadMenu, { ssr: false });

/** Which nav link is "current" for each act index. */
const ACT_TO_LINK: Record<string, string> = {
  problem: "#problem",
  build: "#problem",
  work: "#work",
  crew: "#crew",
  press: "#crew",
  contact: "#brief",
};

function SoundToggle() {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Turn projector sound off" : "Turn projector sound on"}
      data-cursor={on ? "Mute" : "Sound"}
      onClick={() => {
        const next = !on;
        setOn(next);
        void projectorAudio.toggle(next);
      }}
      className="group border-paper/15 text-muted hover:border-paper/40 hover:text-paper flex h-9 items-center gap-2 rounded-full border px-3 transition-colors"
    >
      <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
        {[0.5, 1, 0.7, 0.35].map((h, i) => (
          <span
            key={i}
            className="w-[2px] rounded-full bg-current transition-all duration-300"
            style={{
              height: `${(on ? h : h * 0.55) * 100}%`,
              opacity: on ? 1 : 0.6,
              animation: on ? `eq 0.${6 + i}s ease-in-out ${i * 0.08}s infinite alternate` : "none",
            }}
          />
        ))}
      </span>
      <span className="mono-label hidden lg:inline">{on ? "Sound on" : "Sound"}</span>
      <style>{`@keyframes eq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}`}</style>
    </button>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const linksRef = useRef<HTMLUListElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Highlight the current act without re-rendering on scroll.
  useEffect(() => {
    let last = "";
    return subscribe((d) => {
      const act = ACTS[Math.min(d.act, ACTS.length - 1)]!;
      const href = ACT_TO_LINK[act.id] ?? "";
      if (href === last || !linksRef.current) return;
      last = href;
      linksRef.current.querySelectorAll("a").forEach((a) => {
        if (a.getAttribute("href") === href) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40">
        <div
          className="from-ink via-ink/85 pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent"
          aria-hidden="true"
        />
        <nav
          aria-label="Primary"
          className="relative mx-auto flex h-[var(--nav-h)] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6"
        >
          <a href="#title" className="group flex items-center gap-3" data-cursor="Top">
            <span
              className="border-paper/30 font-display group-hover:border-amber relative grid size-9 place-items-center rounded-full border text-sm tracking-tight italic transition-colors"
              aria-hidden="true"
            >
              NS
              <span className="border-paper/10 absolute -inset-1.5 rounded-full border border-dashed" />
            </span>
            <span className="mono-label text-paper hidden sm:inline">{person.name}</span>
            <span className="sr-only sm:hidden">{person.name}, back to the top</span>
          </a>

          <ul ref={linksRef} className="hidden items-center gap-8 md:flex">
            {nav.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="mono-label text-muted hover:text-paper aria-[current=true]:text-paper aria-[current=true]:after:bg-amber relative py-2 transition-colors aria-[current=true]:after:absolute aria-[current=true]:after:inset-x-0 aria-[current=true]:after:-bottom-0.5 aria-[current=true]:after:h-px"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 sm:gap-3">
            <SoundToggle />
            <div className="hidden sm:block">
              <Magnetic>
                <a
                  href="#brief"
                  data-cursor="Roll"
                  className="mono-label bg-amber text-ink hover:bg-amber-hot flex h-9 items-center rounded-full px-4 transition-colors"
                >
                  Start your project
                </a>
              </Magnetic>
            </div>
            <button
              ref={menuButtonRef}
              type="button"
              className="mono-label border-paper/20 text-paper flex h-9 items-center rounded-full border px-3 md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onPointerEnter={() => void loadMenu()}
              onTouchStart={() => void loadMenu()}
              onFocus={() => void loadMenu()}
              onClick={() => {
                setMenuLoaded(true);
                setOpen((v) => !v);
              }}
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </nav>

        {menuLoaded && <MobileMenu open={open} onClose={() => setOpen(false)} />}
      </header>
    </>
  );
}
