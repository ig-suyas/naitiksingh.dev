import {
  crewAct,
  directorsNote,
  faq,
  faqIntro,
  person,
  schedule,
  scheduleIntro,
  services,
  servicesNote,
  skills,
  skillsIntro,
  type Tier,
} from "@/content/site";
import { delay } from "@/lib/reveal";
import { Slate } from "@/components/ui/Slate";

const TIER_LEVEL: Record<Tier, number> = { Core: 3, Comfortable: 2, Exploring: 1 };

function TierMeter({ tier }: { tier: Tier }) {
  const level = TIER_LEVEL[tier];
  return (
    <span className="flex items-center gap-[3px]" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-2.5 w-[5px] rounded-[1px] ${i <= level ? (level === 3 ? "bg-amber" : level === 2 ? "bg-paper/70" : "bg-teal/80") : "bg-paper/12"}`}
        />
      ))}
    </span>
  );
}

function SubHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div data-reveal className="max-w-2xl">
      <p className="mono-label text-amber">{eyebrow}</p>
      <h3 className="font-display mt-3 text-[clamp(2rem,4vw,3.4rem)] leading-[1.05] font-light tracking-tight">
        {title}
      </h3>
      {sub && <p className="text-paper/75 mt-4 text-lg">{sub}</p>}
    </div>
  );
}

/** Act IV: call sheet (services), director's note, equipment rack, schedule, FAQ. */
export function CrewAct() {
  return (
    <section id="crew" data-act aria-labelledby="crew-heading" className="relative">
      <div
        className="via-ink/55 to-ink/40 pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent"
        aria-hidden="true"
      />
      <div className="cv-children relative mx-auto w-full max-w-[1400px] space-y-36 px-5 pt-[28vh] pb-[18vh] sm:space-y-44 sm:px-10">
        {/* Call sheet */}
        <div>
          <div data-reveal>
            <Slate act={crewAct.slate} scene="04" title={crewAct.title} />
            <h2
              id="crew-heading"
              className="text-shadow-film font-display mt-8 text-[clamp(3rem,8vw,7.5rem)] leading-[0.95] font-light tracking-tight"
            >
              {crewAct.heading}
            </h2>
            <p className="text-paper/80 mt-6 max-w-[44ch] text-lg">{crewAct.sub}</p>
          </div>

          <div className="mt-14">
            <div
              className="mono-label border-paper/15 text-dim hidden grid-cols-12 gap-6 border-b pb-3 lg:grid"
              aria-hidden="true"
            >
              <span className="col-span-1">No.</span>
              <span className="col-span-4">Offer</span>
              <span className="col-span-4">What you get</span>
              <span className="col-span-3">Includes</span>
            </div>
            <ol>
              {services.map((s, i) => (
                <li
                  key={s.title}
                  data-reveal="x"
                  className="group border-paper/10 hover:bg-paper/[0.025] grid grid-cols-1 gap-3 border-b py-7 transition-colors lg:grid-cols-12 lg:gap-6"
                >
                  <span className="mono-label text-amber lg:col-span-1 lg:pt-2">0{i + 1}</span>
                  <div className="lg:col-span-4">
                    <h3 className="font-display text-2xl leading-tight sm:text-3xl">{s.title}</h3>
                    <p className="mono-label mt-3">
                      <span className="text-amber">{s.price}</span>
                      <span className="text-muted"> · {s.terms}</span>
                    </p>
                  </div>
                  <p className="text-paper/80 lg:col-span-4 lg:pt-1.5">{s.pitch}</p>
                  <ul
                    className="flex flex-wrap gap-1.5 lg:col-span-3 lg:pt-1"
                    aria-label="Includes"
                  >
                    {s.deliverables.map((d) => (
                      <li key={d} className="chip">
                        {d}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <p data-reveal className="text-paper/70 mt-8">
              {servicesNote}
            </p>
          </div>
        </div>

        {/* About me */}
        <div className="grid gap-10 lg:grid-cols-12">
          <div data-reveal className="lg:col-span-4">
            <p className="mono-label text-amber">{directorsNote.title}</p>
            <p className="font-display text-paper/90 mt-4 text-4xl italic">{person.firstName}.</p>
            <ul className="mono-label text-muted mt-8 space-y-3">
              <li>Self-taught, hands-on</li>
              <li>Backend first: Java · Spring Boot</li>
              <li>Solo builds, end to end</li>
              <li className="text-teal flex items-center gap-2">
                <span className="bg-teal size-1.5 rounded-full" aria-hidden="true" />
                {person.availability.label}
              </li>
            </ul>
          </div>
          <div className="space-y-6 lg:col-span-8">
            {person.bio.map((para, i) => (
              <p
                key={i}
                data-reveal
                style={delay(i * 120)}
                className="font-display text-paper/90 text-[clamp(1.35rem,2.2vw,2rem)] leading-snug font-light"
              >
                {para}
              </p>
            ))}
          </div>
        </div>

        {/* Equipment rack */}
        <div>
          <SubHead eyebrow="The kit" title={skillsIntro.title} sub={skillsIntro.sub} />
          <dl data-reveal className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            {(Object.keys(skillsIntro.tiers) as Tier[]).map((t) => (
              <div key={t} className="flex items-center gap-3">
                <TierMeter tier={t} />
                <dt className="mono-label text-paper">{t}</dt>
                <dd className="text-muted text-sm">{skillsIntro.tiers[t]}</dd>
              </div>
            ))}
          </dl>
          <div className="border-paper/10 bg-paper/10 mt-12 grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((g, i) => (
              <div
                key={g.group}
                data-reveal
                style={delay((i % 3) * 90)}
                className="bg-ink-2/95 p-6 sm:p-7"
              >
                <h4 className="mono-label text-muted flex items-center justify-between">
                  {g.group}
                  <span className="text-dim">{String(g.items.length).padStart(2, "0")}</span>
                </h4>
                <ul className="mt-5 space-y-3">
                  {g.items.map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-4">
                      <span className="text-paper/90">{s.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="sr-only">{s.tier}</span>
                        <TierMeter tier={s.tier} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Production schedule */}
        <div>
          <SubHead eyebrow="How I work" title={scheduleIntro.title} sub={scheduleIntro.sub} />
          <ol className="relative mt-14 grid gap-10 lg:grid-cols-5 lg:gap-6">
            <span
              className="from-amber/70 via-paper/15 absolute top-2 left-[11px] h-[calc(100%-1rem)] w-px bg-gradient-to-b to-transparent lg:top-[11px] lg:left-0 lg:h-px lg:w-full lg:bg-gradient-to-r"
              aria-hidden="true"
            />
            {schedule.map((s, i) => (
              <li
                key={s.reel}
                data-reveal
                style={delay(i * 90)}
                className="relative pl-10 lg:pt-10 lg:pl-0"
              >
                <span
                  className="border-amber/70 bg-ink absolute top-0 left-0 grid size-6 place-items-center rounded-full border"
                  aria-hidden="true"
                >
                  <span className="bg-amber size-1.5 rounded-full" />
                </span>
                <p className="mono-label text-dim">Reel {s.reel}</p>
                <h4 className="font-display mt-2 text-2xl leading-tight">{s.title}</h4>
                <p className="mono-label text-amber mt-2">{s.film}</p>
                <p className="text-paper/75 mt-3 text-[0.95rem] leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* FAQ */}
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SubHead eyebrow="Fine print" title={faqIntro.title} />
          </div>
          <div className="faq lg:col-span-8">
            {faq.map((f) => (
              <details key={f.q} data-reveal className="group border-paper/12 border-b py-1">
                <summary className="font-display hover:text-amber flex items-center justify-between gap-6 py-5 text-left text-xl transition-colors sm:text-2xl">
                  {f.q}
                  <span
                    className="faq-plus relative size-4 shrink-0 transition-transform duration-300"
                    aria-hidden="true"
                  >
                    <span className="absolute top-1/2 left-0 h-px w-4 bg-current" />
                    <span className="absolute top-0 left-1/2 h-4 w-px bg-current" />
                  </span>
                </summary>
                <p className="text-paper/75 max-w-[60ch] pb-6 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
