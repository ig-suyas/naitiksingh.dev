import { pressAct, testimonials } from "@/content/site";
import { Slate } from "@/components/ui/Slate";

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 96"
      className={`text-amber/70 h-24 w-10 shrink-0 sm:h-28 ${flip ? "-scale-x-100" : ""}`}
      fill="none"
      aria-hidden="true"
    >
      <path d="M30 92C14 78 8 56 12 30 14 18 20 9 27 3" stroke="currentColor" strokeWidth="1.2" />
      {[14, 26, 38, 50, 62, 74].map((y, i) => (
        <g key={y} transform={`translate(${12 + i * 1.4} ${y})`}>
          <ellipse
            cx="-4"
            cy="0"
            rx="6"
            ry="2.4"
            transform="rotate(-35)"
            fill="currentColor"
            opacity="0.8"
          />
          <ellipse
            cx="5"
            cy="3"
            rx="6"
            ry="2.4"
            transform="rotate(30)"
            fill="currentColor"
            opacity="0.55"
          />
        </g>
      ))}
    </svg>
  );
}

/** Act V: press. Real review quotes only; until then, a seat reserved. */
export function PressAct() {
  const hasQuotes = testimonials.length > 0;
  if (!hasQuotes && !pressAct.reserved) return null;

  return (
    <section
      id="press"
      data-act
      aria-labelledby="press-heading"
      className="relative flex min-h-[95vh] items-center"
    >
      <div className="mx-auto w-full max-w-[1400px] px-5 py-[16vh] sm:px-10">
        <Slate act={pressAct.slate} scene="05" title={pressAct.title} id="press-heading" />

        {hasQuotes ? (
          <ul className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <li key={t.name} className="panel flex flex-col justify-between rounded-2xl p-7">
                <blockquote className="font-display text-xl leading-snug italic">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <p className="mono-label text-muted mt-6">
                  {t.name} · {t.role}
                  {t.outlet ? ` · ${t.outlet}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-14 flex flex-col items-center text-center">
            <div className="flex items-center gap-4 sm:gap-8">
              <Laurel />
              <div>
                <p className="mono-label text-amber">Official selection</p>
                <p className="font-display mt-3 text-[clamp(2rem,5vw,4rem)] leading-tight font-light italic">
                  {pressAct.reserved}
                </p>
                <p className="text-paper/25 mt-3 tracking-[0.5em]" aria-hidden="true">
                  ☆☆☆☆☆
                </p>
              </div>
              <Laurel flip />
            </div>
            <p className="text-paper/70 mt-8 max-w-[42ch]">{pressAct.reservedSub}</p>
            <a
              href="#brief"
              data-cursor="Seat"
              className="mono-label border-amber/60 text-amber hover:text-amber-hot mt-6 border-b pb-1 transition-colors"
            >
              Take the seat →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
