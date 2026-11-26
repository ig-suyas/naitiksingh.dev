import { openSource } from "@/content/site";
import { delay } from "@/lib/reveal";

function Arrow() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:transform-none"
    >
      <path d="M3 11L11 3M11 3H4.5M11 3V9.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/**
 * Opens Act III, right under "Selected work": a compact list of merged upstream
 * pull requests. Kept to a single panel so it reads as a preface to the
 * features, not another one.
 */
export function OpenSource() {
  return (
    <section aria-labelledby="oss-heading" className="relative z-10 w-full px-5 sm:px-0">
      {/* Denser than the shared panel: this strip spans the screens behind it.
          From tablet up it takes 92% of the viewport, capped at 1400px. */}
      <div
        className="panel mx-auto rounded-2xl px-5 py-6 sm:w-[92vw] sm:max-w-[1400px] sm:px-7 sm:py-5"
        style={{ background: "linear-gradient(180deg, rgb(11 11 17 / 0.93), rgb(6 6 10 / 0.95))" }}
      >
        <div data-reveal style={delay(0)}>
          <p className="mono-label text-muted flex flex-wrap gap-x-3 gap-y-1">
            <span className="text-amber">{openSource.label}</span>
            <span aria-hidden="true">·</span>
            <span>{openSource.kicker}</span>
          </p>
          <h3
            id="oss-heading"
            className="font-display mt-3 text-[clamp(1.5rem,2vw,1.65rem)] leading-[1.1] font-light tracking-tight text-balance"
          >
            {openSource.heading}
          </h3>
        </div>

        <ul className="border-paper/10 mt-5 border-t sm:mt-4">
          {openSource.items.map((item, i) => (
            <li
              key={item.name}
              data-reveal
              style={delay(80 + i * 60)}
              className="border-paper/10 grid gap-x-8 gap-y-2 border-b py-3.5 last:border-b-0 last:pb-0 sm:gap-y-3 sm:py-3 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_17rem] lg:items-center"
            >
              <div>
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-display text-paper text-lg leading-tight">{item.name}</span>
                  <span className="mono-label text-muted text-[0.64rem]">{item.lang}</span>
                </p>
                <p className="text-dim mt-1 text-sm leading-snug text-pretty">{item.about}</p>
              </div>
              <p className="text-paper/85 text-[0.95rem] leading-relaxed text-pretty">{item.fix}</p>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {item.prs.map((pr) => (
                  <a
                    key={pr.href}
                    href={pr.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="Code"
                    className="group mono-label border-paper/20 text-paper/85 hover:border-paper/50 hover:text-paper flex h-11 w-[8.25rem] shrink-0 items-center justify-center gap-2 rounded-full border px-3 whitespace-nowrap transition-colors"
                  >
                    PR #{pr.number} <Arrow />
                    <span className="sr-only"> for {item.name} on GitHub (opens in a new tab)</span>
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
