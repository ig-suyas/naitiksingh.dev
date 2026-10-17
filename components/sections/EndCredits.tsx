import { contactAct, credits, person } from "@/content/site";
import { delay } from "@/lib/reveal";
import { CopyEmail } from "./CopyEmail";
import { LazyContactForm } from "./LazyContactForm";
import { Magnetic } from "@/components/ui/Magnetic";

/** End credits roll, then the brief: "Now showing: your project." */
export function EndCredits() {
  const socials = [
    { label: "GitHub", href: person.github },
    { label: "LinkedIn", href: person.linkedin },
    ...person.otherSocials,
  ].filter((s) => s.href);

  return (
    <section id="contact" data-act aria-labelledby="contact-heading" className="relative">
      <div
        className="cv mx-auto max-w-xl px-5 pt-[30vh] pb-[22vh] text-center"
        style={{ "--cis": "2200px" } as React.CSSProperties}
      >
        <p data-reveal className="mono-label text-amber">
          {contactAct.slate}
        </p>
        <p data-reveal className="font-display mt-6 text-4xl font-light italic sm:text-5xl">
          The Final Cut
        </p>
        <dl className="mt-24 space-y-14">
          {credits.map((c) => (
            <div key={c.role} data-reveal>
              <dt className="mono-label text-muted">{c.role}</dt>
              {c.names.map((n) => (
                <dd key={n} className="font-display mt-2 text-2xl sm:text-3xl">
                  {n}
                </dd>
              ))}
            </div>
          ))}
        </dl>
      </div>

      <div
        id="brief"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-[1400px] gap-14 px-5 pt-[8vh] pb-[14vh] outline-none sm:px-10 lg:grid-cols-12 lg:gap-10"
      >
        <div className="lg:col-span-5">
          <p data-reveal style={delay(0)} className="mono-label text-amber">
            {contactAct.nowShowing}
          </p>
          <h2
            id="contact-heading"
            data-reveal
            style={delay(100)}
            className="text-shadow-film font-display mt-4 text-[clamp(3.2rem,8vw,7.5rem)] leading-[0.92] font-light tracking-tight"
          >
            {contactAct.heading}
          </h2>
          <p data-reveal style={delay(200)} className="text-paper/80 mt-6 max-w-[38ch] text-lg">
            {contactAct.sub}
          </p>

          <div data-reveal style={delay(300)} className="mt-10 space-y-6">
            <p className="mono-label border-teal/40 bg-teal/5 text-teal inline-flex items-center gap-3 rounded-full border px-4 py-2">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="bg-teal relative inline-flex size-2 rounded-full" />
              </span>
              {person.availability.label}: {person.availability.detail}
            </p>

            <div>
              <p className="mono-label text-dim">Direct line</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Magnetic strength={0.2}>
                  <a
                    href={`mailto:${person.email}`}
                    data-cursor="Write"
                    className="font-display text-paper decoration-amber/50 hover:text-amber text-xl underline decoration-1 underline-offset-[6px] transition-colors sm:text-2xl"
                  >
                    {person.email}
                  </a>
                </Magnetic>
                <CopyEmail />
              </div>
            </div>

            {socials.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {socials.map((s) => (
                  <li key={s.href}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono-label border-paper/20 text-paper/85 hover:border-paper/50 hover:text-paper flex h-10 items-center rounded-full border px-4 transition-colors"
                    >
                      {s.label} ↗<span className="sr-only"> (new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {(person.location || person.timezone) && (
              <p className="mono-label text-dim">
                {[person.location, person.timezone].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <LazyContactForm />
        </div>
      </div>
    </section>
  );
}
