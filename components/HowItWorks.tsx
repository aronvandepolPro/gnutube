import Link from 'next/link';
import './how-it-works.css';

type Step = { title: string; text: string; href: string; cta: string };

type Props = { title: string; steps: [Step, Step, Step, Step] };

/** Kleur per stap (dezelfde vier kleuren als de soorten reis). */
const COLORS = ['#F2B44F', '#4FD1DC', '#8EE08A', '#E7C9FF'];

/**
 * "Zo werkt het" als reisroute: vier stappen met een eigen illustratie, verbonden door een stippellijn
 * waar een vliegtuigje overheen vliegt. Op een telefoon een verticale tijdlijn.
 */
export function HowItWorks({ title, steps }: Props) {
  return (
    <section className="mx-auto max-w-[1320px] px-4 pt-28 sm:px-8" aria-labelledby="how">
      <h2 id="how" className="m-0 text-center font-display text-[clamp(44px,6vw,88px)] font-normal leading-[0.95]">
        {title}
      </h2>

      <div className="relative mt-16">
        {/* Route tussen de stappen: horizontaal op brede schermen, verticaal op de telefoon */}
        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[52px] hidden h-px lg:block" aria-hidden="true">
          <div className="h-px w-full" style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0 8px, transparent 8px 16px)' }} />
          <Plane className="kt-route-plane absolute -top-[11px] -translate-x-1/2" />
        </div>
        <div className="pointer-events-none absolute bottom-10 left-[39px] top-10 w-px lg:hidden" aria-hidden="true">
          <div className="h-full w-px" style={{ background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.35) 0 8px, transparent 8px 16px)' }} />
          <Plane className="kt-route-plane-v absolute -left-[11px] -translate-y-1/2 rotate-90" />
        </div>

        <ol className="relative m-0 grid list-none gap-5 p-0 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="kt-reveal group relative flex gap-5 lg:flex-col lg:items-center lg:text-center">
              {/* Illustratie in een ronde badge op de route */}
              <span
                className="relative z-10 grid h-[80px] w-[80px] shrink-0 place-items-center rounded-full border bg-black transition-transform duration-300 group-hover:-translate-y-1 lg:h-[104px] lg:w-[104px]"
                style={{ borderColor: `${COLORS[i]}66`, boxShadow: `0 0 40px -8px ${COLORS[i]}66, inset 0 0 24px ${COLORS[i]}22` }}
              >
                <Illustration i={i} color={COLORS[i]} />
              </span>

              <div className="panel relative flex-1 overflow-hidden p-6 transition-colors group-hover:bg-white/[0.07] lg:mt-6 lg:w-full lg:p-7">
                {/* Groot nummer op de achtergrond */}
                <span
                  className="pointer-events-none absolute -right-2 -top-6 font-display text-[130px] italic leading-none"
                  style={{ color: `${COLORS[i]}1F` }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="relative text-[12px] font-medium uppercase tracking-[0.14em]" style={{ color: COLORS[i] }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="relative m-0 mt-2 font-display text-[32px] font-normal leading-tight">{s.title}</h3>
                <p className="relative m-0 mt-3 text-[15px] leading-relaxed text-ink/65">{s.text}</p>
                <Link
                  href={s.href}
                  className="relative mt-5 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium transition-[gap] hover:gap-3"
                  style={{ color: COLORS[i] }}
                >
                  {s.cta} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Plane({ className }: { className: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className={`text-white ${className}`} aria-hidden="true">
      <g transform="rotate(90 12 12)">
        <path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
      </g>
    </svg>
  );
}

/** Lijnillustraties per stap: verrekijker, stempel, kaart met route, tent. */
function Illustration({ i, color }: { i: number; color: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true">
      {i === 0 && (
        // verrekijker
        <g {...p}>
          <circle cx="14" cy="31" r="8" />
          <circle cx="34" cy="31" r="8" />
          <path d="M20 26l2-12h4l2 12" />
          <path d="M9 25l4-11h5M39 25l-4-11h-5" />
          <path d="M22 30h4" />
          <circle cx="14" cy="31" r="3.5" fill={color} fillOpacity="0.25" />
          <circle cx="34" cy="31" r="3.5" fill={color} fillOpacity="0.25" />
        </g>
      )}
      {i === 1 && (
        // stempel in een paspoort
        <g {...p}>
          <rect x="9" y="7" width="26" height="34" rx="3" />
          <path d="M9 13h26" strokeOpacity="0.5" />
          <circle cx="29" cy="30" r="10" strokeDasharray="3 2.5" fill={color} fillOpacity="0.12" />
          <path d="M29 24.5l1.6 3.4 3.7.4-2.8 2.5.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.8-2.5 3.7-.4z" fill={color} fillOpacity="0.4" />
        </g>
      )}
      {i === 2 && (
        // kaart met route en speld
        <g {...p}>
          <path d="M6 12l11-4 14 4 11-4v28l-11 4-14-4-11 4z" />
          <path d="M17 8v28M31 12v28" strokeOpacity="0.4" />
          <path d="M11 30c4-2 6-8 11-7s6 6 10 3" strokeDasharray="2.5 2.5" />
          <path d="M35 14c-2.5 0-4.5 2-4.5 4.4 0 3.4 4.5 7.6 4.5 7.6s4.5-4.2 4.5-7.6C39.5 16 37.5 14 35 14z" fill={color} fillOpacity="0.35" />
          <circle cx="35" cy="18.5" r="1.4" fill={color} />
        </g>
      )}
      {i === 3 && (
        // safaritent met vlaggetje
        <g {...p}>
          <path d="M5 38L24 12l19 26z" fill={color} fillOpacity="0.12" />
          <path d="M24 12v26M17 38l7-10 7 10" />
          <path d="M24 12V5l7 2.5-7 2.5" fill={color} fillOpacity="0.4" />
          <path d="M3 38h42" />
        </g>
      )}
    </svg>
  );
}
