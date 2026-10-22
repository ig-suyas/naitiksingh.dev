"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { contactAct, person } from "@/content/site";
import { CopyEmail } from "./CopyEmail";

/** Same footprint as the form, so nothing shifts when it arrives. */
function Placeholder() {
  return (
    <div className="panel rounded-2xl p-6 sm:p-9" aria-busy="true">
      <div className="mb-8 flex items-center justify-between">
        <p className="mono-label text-paper">{contactAct.formTitle}</p>
        <span className="mono-label text-dim">Take 1</span>
      </div>
      <div className="grid min-h-[560px] content-start gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-paper/10 bg-ink/40 h-[74px] rounded-[10px] border" />
        ))}
        <div className="text-dim flex flex-wrap items-center gap-3 text-sm">
          <span>Prefer email? Write to</span>
          <a href={`mailto:${person.email}`} className="text-paper/80 underline underline-offset-4">
            {person.email}
          </a>
          <CopyEmail />
        </div>
      </div>
    </div>
  );
}

const ContactForm = dynamic(() => import("./ContactForm").then((m) => m.ContactForm), {
  ssr: false,
  loading: Placeholder,
});

/** Loads the brief form (and motion) only as the end credits approach. */
export function LazyContactForm() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      const id = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "1500px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <div ref={ref}>{show ? <ContactForm /> : <Placeholder />}</div>;
}
