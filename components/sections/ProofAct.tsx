import Image from "next/image";
import { projects, proofAct, type Project } from "@/content/site";
import { delay } from "@/lib/reveal";
import { Slate } from "@/components/ui/Slate";
import { Magnetic } from "@/components/ui/Magnetic";

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 11L11 3M11 3H4.5M11 3V9.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function Feature({ project: p, index }: { project: Project; index: number }) {
  const right = index % 2 === 0;

  return (
    <article
      data-beat={`work:${index}`}
      aria-labelledby={`feature-${p.slug}`}
      className="relative flex min-h-[150vh] items-center py-[18vh]"
    >
      <div className="cv mx-auto grid w-full max-w-[1500px] px-5 sm:px-10 lg:grid-cols-12">
        <div className={`lg:col-span-5 ${right ? "lg:col-start-8" : "lg:col-start-1"}`}>
          <div className="panel overflow-hidden rounded-2xl">
            {/* Poster still, framed like a strip of film. */}
            <div className="relative bg-black">
              <div className="perforations h-3 opacity-70" aria-hidden="true" />
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={p.poster}
                  alt={p.posterAlt}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover object-top opacity-90"
                />
                <div
                  className="from-ink/70 absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
                  aria-hidden="true"
                />
                <p className="mono-label text-paper/90 absolute bottom-3 left-4">
                  Feature 0{index + 1} · {p.year}
                </p>
              </div>
              <div className="perforations h-3 opacity-70" aria-hidden="true" />
            </div>

            <div className="p-6 sm:p-8">
              <p data-reveal style={{ ...delay(0), color: p.tint }} className="mono-label">
                Now screening
              </p>
              <h3
                id={`feature-${p.slug}`}
                data-reveal
                style={delay(60)}
                className="font-display mt-3 text-[clamp(2.8rem,5vw,4.5rem)] leading-none font-light tracking-tight"
              >
                {p.title}
              </h3>
              <p
                data-reveal
                style={delay(120)}
                className="font-display text-paper/90 mt-4 text-xl italic"
              >
                {p.logline}
              </p>

              <dl className="border-paper/10 mt-8 grid gap-5 border-t pt-6 text-[0.95rem] leading-relaxed">
                <div data-reveal style={delay(240)}>
                  <dt className="mono-label text-dim">The problem</dt>
                  <dd className="text-paper/85 mt-1.5">{p.problem}</dd>
                </div>
                <div data-reveal style={delay(300)}>
                  <dt className="mono-label text-dim">The solution</dt>
                  <dd className="text-paper/85 mt-1.5">{p.solution}</dd>
                </div>
                <div data-reveal style={delay(360)}>
                  <dt className="mono-label text-dim">The outcome</dt>
                  <dd className="mt-2">
                    <ul className="space-y-2.5">
                      {p.outcomes.map((o, i) => (
                        <li key={i} className="text-paper/85 flex gap-3">
                          <span className="mono-label text-amber mt-1 shrink-0">0{i + 1}</span>
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div data-reveal style={delay(420)}>
                  <dt className="mono-label text-dim">Role</dt>
                  <dd className="text-paper/85 mt-1.5">{p.role}</dd>
                </div>
              </dl>

              <ul
                data-reveal
                style={delay(480)}
                className="mt-6 flex flex-wrap gap-1.5"
                aria-label="Stack"
              >
                {p.stack.map((s) => (
                  <li key={s} className="chip">
                    {s}
                  </li>
                ))}
              </ul>

              <div
                data-reveal
                style={delay(540)}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Magnetic>
                  <a
                    href={p.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="Watch"
                    className="mono-label bg-paper text-ink hover:bg-amber flex h-11 items-center gap-2 rounded-full px-5 transition-colors"
                  >
                    View live site <Arrow />
                    <span className="sr-only"> (opens {p.title} in a new tab)</span>
                  </a>
                </Magnetic>
                {p.repos.map((r) => (
                  <a
                    key={r.href}
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="Code"
                    className="mono-label border-paper/20 text-paper/85 hover:border-paper/50 hover:text-paper flex h-11 items-center gap-2 rounded-full border px-4 transition-colors"
                  >
                    {r.label} <Arrow />
                    <span className="sr-only"> on GitHub (new tab)</span>
                  </a>
                ))}
              </div>
              {p.note && (
                <p data-reveal style={delay(600)} className="text-dim mt-5 text-sm">
                  {p.note}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Act III: the screening room. Each feature gets a poster, a trailer and a live link. */
export function ProofAct() {
  return (
    <section id="work" data-act aria-labelledby="work-heading" className="relative">
      <header className="mx-auto flex min-h-[95vh] w-full max-w-[1500px] items-center px-5 sm:px-10">
        <div className="max-w-2xl">
          <Slate act={proofAct.slate} scene="03" title={proofAct.title} />
          <h2
            id="work-heading"
            className="text-shadow-film font-display mt-8 text-[clamp(3rem,8vw,7.5rem)] leading-[0.95] font-light tracking-tight"
          >
            {proofAct.heading}
          </h2>
          <p className="text-shadow-film text-paper/85 mt-6 max-w-[44ch] text-lg">{proofAct.sub}</p>
        </div>
      </header>
      {projects.map((p, i) => (
        <Feature key={p.slug} project={p} index={i} />
      ))}
      <div className="h-[35vh]" aria-hidden="true" />
    </section>
  );
}
