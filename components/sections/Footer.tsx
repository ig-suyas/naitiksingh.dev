import { contactAct, person, site } from "@/content/site";

/** "Fin." and the closing credits line. */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 px-5 pt-[10vh] pb-16 text-center sm:px-10">
      <p className="font-display text-paper/95 text-[clamp(4rem,14vw,11rem)] leading-none font-light italic">
        {contactAct.fin}
      </p>
      <div className="border-paper/10 text-dim mx-auto mt-14 flex max-w-[1400px] flex-col items-center justify-between gap-4 border-t pt-8 text-sm md:flex-row">
        <p>
          © {year} {person.name}. All rights reserved.
        </p>
        <p className="mono-label">
          Shaders in this film:{" "}
          <a
            href={site.shaderCredit.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-paper/80 decoration-paper/30 hover:text-amber underline underline-offset-4"
          >
            {site.shaderCredit.label}
          </a>
        </p>
        <a href="#title" className="mono-label text-muted hover:text-paper">
          Rewind ↑
        </a>
      </div>
    </footer>
  );
}
