/**
 * Savannelandschap in reisaffichestijl, op een bepaald moment van de dag.
 * Vlakke kleurbanden (geen verlopen), sterren, maan, zon, heuvels in lagen en acacia's.
 * Puur SVG zonder hooks: werkt in server- en clientcomponenten.
 */

export type TimeOfDay = 'night' | 'dawn' | 'morning' | 'day' | 'dusk';

export type SkyState = {
  skyTop: string;
  skyLow: string;
  stars: number; // dekking 0–1
  moon: number; // dekking 0–1
  moonY: number;
  sunY: number;
  sunColor: string;
  hills: [string, string, string];
  drift: number; // parallax 0–1
};

/**
 * Vaste standen. In de Prism-stijl is alles zwart-wit (zoals een ontkleurde video):
 * de momenten verschillen alleen in licht, maan en sterren.
 */
export const TIMES: Record<TimeOfDay, SkyState & { ink: boolean }> = {
  night: { skyTop: '#000000', skyLow: '#050505', stars: 1, moon: 0.9, moonY: 170, sunY: 1100, sunColor: '#FFFFFF', hills: ['#1E1E1E', '#121212', '#070707'], drift: 0, ink: false },
  dawn: { skyTop: '#050505', skyLow: '#141414', stars: 0.35, moon: 0.5, moonY: 420, sunY: 1100, sunColor: '#FFFFFF', hills: ['#2A2A2A', '#171717', '#0A0A0A'], drift: 1, ink: false },
  morning: { skyTop: '#000000', skyLow: '#0A0A0A', stars: 0.7, moon: 0.7, moonY: 240, sunY: 1100, sunColor: '#FFFFFF', hills: ['#222222', '#141414', '#080808'], drift: 0.6, ink: false },
  day: { skyTop: '#030303', skyLow: '#0E0E0E', stars: 0.5, moon: 0.8, moonY: 300, sunY: 1100, sunColor: '#FFFFFF', hills: ['#262626', '#161616', '#090909'], drift: 0.8, ink: false },
  dusk: { skyTop: '#000000', skyLow: '#080808', stars: 0.85, moon: 0.6, moonY: 210, sunY: 1100, sunColor: '#FFFFFF', hills: ['#1C1C1C', '#111111', '#060606'], drift: 0.3, ink: false },
};

// Sterren op vaste plekken, zodat server en browser hetzelfde tekenen.
const STARS = Array.from({ length: 70 }, (_, i) => {
  const h = (i * 7919) % 9973;
  return { x: (h * 37) % 1600, y: (h * 13) % 470, r: 0.8 + (h % 3) * 0.6, d: (h % 50) / 10 };
});

const ACACIAS = [
  { x: 260, s: 1.3 },
  { x: 1340, s: 1 },
  { x: 760, s: 0.7 },
];

export function SkyScene({ s, className = 'absolute inset-0 h-full w-full' }: { s: SkyState; className?: string }) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true" focusable="false">
      <rect width="1600" height="900" fill={s.skyTop} />
      <rect y="420" width="1600" height="480" fill={s.skyLow} />
      {s.stars > 0 && (
        <g opacity={s.stars}>
          {STARS.map((st, i) => (
            <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#FBF9F4" className="kt-twinkle" style={{ animationDelay: `${st.d}s` }} />
          ))}
        </g>
      )}
      {s.moon > 0 && (
        <g opacity={s.moon}>
          <circle cx="330" cy={s.moonY} r="120" fill="#FFFFFF" opacity="0.05" />
          <circle cx="330" cy={s.moonY} r="70" fill="#FFFFFF" opacity="0.06" />
          <circle cx="330" cy={s.moonY} r="38" fill="#EDEDED" />
        </g>
      )}
      <circle cx="1120" cy={s.sunY} r="96" fill={s.sunColor} />
      <path d="M0 640 Q 260 560 520 620 T 1040 600 T 1600 590 L1600 900 L0 900 Z" fill={s.hills[0]} transform={`translate(0 ${s.drift * -18})`} />
      <path d="M0 720 Q 300 650 640 705 T 1240 690 T 1600 680 L1600 900 L0 900 Z" fill={s.hills[1]} transform={`translate(0 ${s.drift * -36})`} />
      <path d="M0 800 Q 420 760 900 800 T 1600 790 L1600 900 L0 900 Z" fill={s.hills[2]} />
      {ACACIAS.map((a) => (
        <g key={a.x} transform={`translate(${a.x} ${805 - 64 * a.s}) scale(${a.s})`} fill={s.hills[2]}>
          <rect x="-3" y="0" width="6" height="66" />
          <path d="M0 14 L-26 -12 L-22 -16 L0 8 Z" />
          <path d="M0 20 L24 -16 L28 -13 L2 24 Z" />
          <ellipse cx="0" cy="-18" rx="70" ry="13" />
          <ellipse cx="-10" cy="-27" rx="44" ry="9" />
        </g>
      ))}
    </svg>
  );
}

/** Mengt twee hexkleuren; t van 0 tot 1. */
function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/** Tussenstand tussen twee momenten (voor de zonsopkomst bij het scrollen). */
export function between(a: SkyState, b: SkyState, t: number): SkyState {
  const n = (x: number, y: number) => x + (y - x) * t;
  return {
    skyTop: mix(a.skyTop, b.skyTop, t),
    skyLow: mix(a.skyLow, b.skyLow, t),
    stars: Math.max(0, n(a.stars, b.stars) - t * 0.6),
    moon: n(a.moon, b.moon),
    moonY: n(a.moonY, b.moonY),
    sunY: n(a.sunY, b.sunY),
    sunColor: mix(a.sunColor, b.sunColor, t),
    hills: [mix(a.hills[0], b.hills[0], t), mix(a.hills[1], b.hills[1], t), mix(a.hills[2], b.hills[2], t)],
    drift: n(a.drift, b.drift),
  };
}
