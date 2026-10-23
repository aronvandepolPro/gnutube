/**
 * Gedetailleerde figuren voor de safariscène: bomen, gorilla, aap, dhow en de Kilimanjaro.
 * Zelfde conventie als animals.tsx: oorsprong onder de voet (midden), kijkt naar rechts.
 * Alleen vaste getallen (geen goniometrie), zodat server en browser exact hetzelfde tekenen.
 */

type Pos = { x: number; y: number; s?: number; flip?: boolean; className?: string; uid?: string };
const tf = ({ x, y, s = 1, flip }: Pos) => `translate(${x} ${y}) scale(${flip ? -s : s} ${s})`;

/* ─────────────── Schermacacia (Acacia tortilis) ─────────────── */
export function Acacia(p: Pos) {
  const bark = '#5B4632';
  const barkShade = '#46362A';
  return (
    <g transform={tf(p)}>
      {/* stam en vertakkingen */}
      <path d="M-7 0 C -5 -22 -7 -44 -3 -60 C 0 -68 3 -74 6 -80 L 12 -78 C 10 -70 8 -62 7 -54 C 5 -36 7 -16 9 0 Z" fill={bark} />
      <path d="M3 -60 C 5 -40 6 -18 9 0 L 2 0 C 1 -18 1 -40 0 -58 Z" fill={barkShade} />
      <path d="M-3 -58 C -16 -70 -32 -82 -46 -100 L -40 -103 C -28 -88 -14 -76 0 -66 Z" fill={bark} />
      <path d="M-30 -86 C -42 -92 -58 -96 -72 -104 L -68 -107 C -54 -100 -40 -96 -28 -90 Z" fill={bark} />
      <path d="M6 -76 C 18 -88 30 -96 44 -106 L 49 -102 C 36 -92 24 -84 12 -72 Z" fill={bark} />
      <path d="M30 -94 C 46 -98 62 -100 78 -108 L 80 -103 C 66 -96 50 -94 34 -90 Z" fill={bark} />
      <path d="M8 -78 C 6 -90 8 -100 12 -110 L 17 -108 C 13 -98 12 -88 13 -78 Z" fill={bark} />
      {/* schaduwkant van de kroon */}
      <path d="M-112 -104 C -80 -96 70 -96 108 -106 C 100 -98 70 -94 0 -93 C -70 -94 -102 -97 -112 -104 Z" fill="#3E5A26" />
      {/* kroon in lagen */}
      <path
        d="M-112 -106 C -116 -118 -100 -125 -88 -122 C -84 -134 -62 -137 -52 -128 C -42 -141 -16 -141 -8 -130 C 2 -143 30 -141 36 -130 C 48 -139 74 -137 78 -126 C 94 -129 112 -120 108 -108 C 70 -101 -70 -100 -112 -106 Z"
        fill="#617F38"
      />
      <path d="M-96 -116 C -84 -128 -66 -130 -56 -124 C -46 -134 -24 -134 -14 -126 C -4 -136 22 -136 30 -126 C 44 -132 64 -130 70 -122 C 40 -116 -50 -114 -96 -116 Z" fill="#7A9A48" />
      <g fill="#93B35C">
        <ellipse cx="-70" cy="-128" rx="12" ry="4" />
        <ellipse cx="-30" cy="-134" rx="14" ry="4" />
        <ellipse cx="14" cy="-134" rx="13" ry="4" />
        <ellipse cx="56" cy="-130" rx="12" ry="4" />
      </g>
      <g fill="#4E6B2E">
        <circle cx="-86" cy="-110" r="3" />
        <circle cx="-44" cy="-112" r="2.6" />
        <circle cx="-4" cy="-110" r="3" />
        <circle cx="40" cy="-112" r="2.6" />
        <circle cx="82" cy="-110" r="3" />
      </g>
    </g>
  );
}

/* ─────────────── Baobab ─────────────── */
export function Baobab(p: Pos) {
  const bark = '#A28C77';
  const shade = '#887260';
  const line = '#8C7662';
  return (
    <g transform={tf(p)}>
      {/* takken (dik, knoestig, als wortels in de lucht) */}
      <g fill={bark}>
        <path d="M-28 -146 C -40 -160 -54 -166 -66 -180 L -58 -186 C -46 -172 -34 -166 -20 -154 Z" />
        <path d="M-58 -178 C -70 -184 -80 -186 -90 -194 L -86 -199 C -76 -192 -66 -190 -54 -184 Z" />
        <path d="M-60 -182 C -62 -194 -60 -204 -54 -214 L -48 -211 C -53 -202 -55 -194 -53 -184 Z" />
        <path d="M-10 -150 C -14 -168 -12 -184 -6 -200 L 2 -198 C -4 -182 -4 -168 -2 -152 Z" />
        <path d="M-6 -194 C -14 -204 -22 -210 -30 -220 L -24 -224 C -16 -214 -8 -208 0 -198 Z" />
        <path d="M14 -150 C 20 -170 30 -184 42 -196 L 48 -190 C 38 -178 28 -164 22 -148 Z" />
        <path d="M40 -192 C 42 -204 48 -214 56 -222 L 61 -217 C 54 -210 49 -202 47 -190 Z" />
        <path d="M28 -146 C 44 -154 60 -158 76 -168 L 80 -162 C 64 -152 48 -148 34 -140 Z" />
      </g>
      {/* stam */}
      <path d="M-48 0 C -56 -32 -52 -84 -42 -122 C -38 -138 -32 -148 -26 -152 L 30 -152 C 38 -142 44 -128 48 -112 C 56 -78 58 -32 52 0 Z" fill={bark} />
      <path d="M14 -152 L 30 -152 C 38 -142 44 -128 48 -112 C 56 -78 58 -32 52 0 L 28 0 C 34 -40 32 -90 14 -152 Z" fill={shade} />
      <path d="M-56 0 C -50 -8 -44 -10 -40 -12 L 44 -12 C 50 -10 56 -6 62 0 Z" fill={shade} />
      {/* bastnerven */}
      <g stroke={line} strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M-34 -20 C -38 -60 -34 -100 -26 -140" />
        <path d="M-20 -10 C -22 -60 -18 -110 -12 -146" />
        <path d="M-4 -14 C -6 -60 -2 -110 2 -148" />
        <path d="M10 -16 C 10 -60 12 -100 16 -144" />
        <path d="M-40 -70 C -34 -66 -28 -66 -22 -70" />
        <path d="M-12 -96 C -6 -92 0 -92 6 -96" />
      </g>
      {/* blad en vruchten */}
      <g fill="#7E9A52">
        <ellipse cx="-90" cy="-198" rx="16" ry="7" />
        <ellipse cx="-52" cy="-218" rx="14" ry="7" />
        <ellipse cx="-30" cy="-226" rx="14" ry="6" />
        <ellipse cx="58" cy="-226" rx="15" ry="7" />
        <ellipse cx="82" cy="-170" rx="16" ry="7" />
      </g>
      <g fill="#92AE62">
        <ellipse cx="-88" cy="-201" rx="8" ry="3.5" />
        <ellipse cx="60" cy="-229" rx="8" ry="3.5" />
      </g>
      <g stroke="#6E5A46" strokeWidth="1.2">
        <line x1="-66" y1="-180" x2="-66" y2="-168" />
        <line x1="70" y1="-166" x2="70" y2="-154" />
        <line x1="44" y1="-196" x2="44" y2="-184" />
      </g>
      <g fill="#C2B796">
        <ellipse cx="-66" cy="-163" rx="5" ry="8" />
        <ellipse cx="70" cy="-149" rx="5" ry="8" />
        <ellipse cx="44" cy="-179" rx="4.5" ry="7" />
      </g>
    </g>
  );
}

/* ─────────────── Regenwoudreus met plankwortels en lianen ─────────────── */
export function RainTree(p: Pos) {
  return (
    <g transform={tf(p)}>
      {/* stam */}
      <path d="M-11 0 C -9 -80 -9 -160 -7 -236 L 9 -236 C 11 -160 11 -80 13 0 Z" fill="#6E5D47" />
      <path d="M4 -236 L 9 -236 C 11 -160 11 -80 13 0 L 4 0 Z" fill="#5A4B39" />
      <g stroke="#5A4B39" strokeWidth="1.6" fill="none">
        <path d="M-6 -20 C -6 -80 -4 -150 -4 -220" />
        <path d="M2 -40 C 3 -100 3 -160 2 -210" />
      </g>
      {/* plankwortels */}
      <path d="M-10 -56 C -22 -36 -38 -14 -58 0 L -10 0 Z" fill="#665540" />
      <path d="M12 -60 C 26 -38 42 -16 62 0 L 12 0 Z" fill="#5E4E3B" />
      <path d="M0 -40 C -4 -24 -10 -10 -18 0 L 4 0 Z" fill="#776550" />
      {/* zijtak */}
      <path d="M-4 -150 C -26 -168 -48 -180 -72 -198 L -66 -204 C -42 -186 -20 -174 0 -158 Z" fill="#6E5D47" />
      <path d="M6 -176 C 26 -190 44 -198 66 -212 L 70 -206 C 50 -192 30 -184 10 -168 Z" fill="#6E5D47" />
      {/* epifyt op de stam */}
      <g fill="#5E8A44">
        <path d="M-10 -110 C -24 -118 -30 -128 -28 -136 C -20 -128 -14 -122 -8 -116 Z" />
        <path d="M-8 -112 C -14 -126 -12 -136 -6 -142 C -4 -132 -4 -122 -6 -114 Z" />
      </g>
      {/* kroon in drie lagen */}
      <path d="M-120 -232 C -126 -262 -96 -284 -60 -278 C -46 -304 -6 -312 20 -296 C 44 -314 90 -308 106 -282 C 134 -284 150 -258 138 -236 C 132 -218 100 -212 60 -216 C 20 -210 -30 -212 -70 -216 C -100 -216 -118 -222 -120 -232 Z" fill="#5E8C58" />
      <path d="M-98 -246 C -100 -266 -74 -278 -50 -272 C -36 -292 -4 -296 16 -284 C 40 -298 78 -292 90 -274 C 110 -274 122 -258 114 -244 C 80 -236 -40 -234 -98 -246 Z" fill="#72A26A" />
      <g fill="#8BBC80">
        <ellipse cx="-58" cy="-270" rx="20" ry="7" />
        <ellipse cx="0" cy="-288" rx="24" ry="7" />
        <ellipse cx="60" cy="-282" rx="20" ry="7" />
        <ellipse cx="100" cy="-262" rx="14" ry="5" />
      </g>
      <path d="M-110 -228 C -60 -220 60 -218 132 -232 C 116 -214 70 -208 20 -208 C -40 -208 -90 -212 -110 -228 Z" fill="#4A7444" />
      {/* lianen en hangend mos */}
      <g stroke="#4E7A44" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M-84 -214 C -88 -180 -80 -150 -86 -118" />
        <path d="M-40 -210 C -44 -184 -38 -164 -42 -140" />
        <path d="M76 -212 C 80 -184 74 -160 80 -132" />
        <path d="M110 -220 C 114 -196 108 -176 112 -156" />
      </g>
      <g fill="#7FA470">
        <ellipse cx="-86" cy="-118" rx="3" ry="6" />
        <ellipse cx="80" cy="-132" rx="3" ry="6" />
        <ellipse cx="-42" cy="-140" rx="2.6" ry="5" />
      </g>
    </g>
  );
}

/* ─────────────── Kokospalm ─────────────── */
export function Palm(p: Pos) {
  // Een blad: middennerf (kwadratische boog) met blaadjes die eraan hangen.
  const frond = (x2: number, y2: number, cx: number, cy: number, droop: number, key: string) => {
    const leaflets = [];
    for (let i = 1; i <= 9; i++) {
      const t = i / 10;
      const px = (1 - t) * (1 - t) * 40 + 2 * (1 - t) * t * cx + t * t * x2;
      const py = (1 - t) * (1 - t) * -176 + 2 * (1 - t) * t * cy + t * t * y2;
      const len = 26 * (1 - t * 0.6);
      leaflets.push(
        <path key={i} d={`M${Math.round(px)} ${Math.round(py)} l ${Math.round(-len * 0.3)} ${Math.round(len * droop)} M ${Math.round(px)} ${Math.round(py)} l ${Math.round(len * 0.3)} ${Math.round(len * droop)}`} />,
      );
    }
    return (
      <g key={key}>
        <path d={`M40 -176 Q ${cx} ${cy} ${x2} ${y2}`} stroke="#3F7438" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <g stroke="#4E8A44" strokeWidth="4" strokeLinecap="round">{leaflets}</g>
      </g>
    );
  };
  return (
    <g transform={tf(p)}>
      {/* stam met ringen */}
      <path d="M-7 0 C -1 -70 14 -130 35 -176 L 46 -172 C 26 -128 13 -68 9 0 Z" fill="#9C7C54" />
      <path d="M3 0 C 6 -68 18 -128 40 -174 L 46 -172 C 26 -128 13 -68 9 0 Z" fill="#856844" />
      <g stroke="#7A5E3E" strokeWidth="2.2" strokeLinecap="round">
        {[
          [-6, -12, 9, -14],
          [-4, -34, 11, -36],
          [-1, -56, 14, -58],
          [3, -78, 18, -79],
          [8, -100, 22, -100],
          [14, -122, 28, -121],
          [21, -144, 34, -142],
        ].map(([a, b, c, d]) => (
          <line key={b} x1={a} y1={b} x2={c} y2={d} />
        ))}
      </g>
      {frond(132, -138, 96, -206, 0.9, 'f1')}
      {frond(-56, -150, -6, -214, 0.9, 'f2')}
      {frond(116, -226, 78, -232, 0.6, 'f3')}
      {frond(-30, -232, 10, -238, 0.6, 'f4')}
      {frond(100, -96, 86, -150, 1, 'f5')}
      {frond(-38, -110, -4, -160, 1, 'f6')}
      <g>
        <circle cx="34" cy="-168" r="7.5" fill="#6A4A2A" />
        <circle cx="46" cy="-166" r="7.5" fill="#7A5634" />
        <circle cx="40" cy="-158" r="7" fill="#5E4024" />
      </g>
    </g>
  );
}

/* ─────────────── Waaierpalm (Hyphaene) ─────────────── */
// Eenheidsvectoren voor een waaier van 150° (vaste waarden, geen goniometrie bij het tekenen).
const FAN_DIRS: [number, number][] = [
  [-0.966, -0.259], [-0.906, -0.423], [-0.819, -0.574], [-0.707, -0.707], [-0.574, -0.819],
  [-0.423, -0.906], [-0.259, -0.966], [-0.087, -0.996], [0.087, -0.996], [0.259, -0.966],
  [0.423, -0.906], [0.574, -0.819], [0.707, -0.707], [0.819, -0.574], [0.906, -0.423], [0.966, -0.259],
];
export function FanPalm(p: Pos) {
  const fan = (cx: number, cy: number, r: number, from: number, to: number, tilt: number, key: string) => {
    const dirs = FAN_DIRS.slice(from, to + 1);
    const tip = (d: [number, number], k: number) => [Math.round(cx + (d[0] + tilt) * r * k), Math.round(cy + d[1] * r * k)];
    // gekartelde rand: punten om en om iets korter
    const edge = dirs.map((d, i) => tip(d, i % 2 ? 0.88 : 1).join(' '));
    return (
      <g key={key}>
        <path d={`M${cx} ${cy} L ${edge.join(' L ')} Z`} fill="#6E9A48" />
        <path d={`M${cx} ${cy} L ${dirs.slice(Math.floor(dirs.length / 2)).map((d, i) => tip(d, i % 2 ? 0.88 : 1).join(' ')).join(' L ')} Z`} fill="#5E8A3C" />
        <g stroke="#4E7832" strokeWidth="1.2">
          {dirs.map((d, i) => {
            const [ex, ey] = tip(d, 0.95);
            return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} />;
          })}
        </g>
      </g>
    );
  };
  return (
    <g transform={tf(p)}>
      <path d="M-5 0 C -3 -50 1 -100 3 -146 L 11 -146 C 10 -100 9 -50 9 0 Z" fill="#8C765A" />
      <path d="M5 0 C 6 -50 7 -100 8 -146 L 11 -146 C 10 -100 9 -50 9 0 Z" fill="#76624A" />
      <g stroke="#76624A" strokeWidth="1.6">
        <line x1="-4" y1="-40" x2="9" y2="-42" />
        <line x1="-2" y1="-80" x2="10" y2="-82" />
        <line x1="0" y1="-118" x2="11" y2="-120" />
      </g>
      {/* hangende oude bladeren */}
      <path d="M2 -144 C -10 -136 -18 -124 -20 -110 L -14 -112 C -12 -124 -6 -134 4 -140 Z" fill="#9C8A5E" />
      {fan(-10, -150, 46, 0, 7, -0.2, 'a')}
      {fan(24, -150, 46, 8, 15, 0.2, 'b')}
      {fan(7, -158, 54, 3, 12, 0, 'c')}
      <g fill="#5E4A30">
        <circle cx="2" cy="-148" r="4" />
        <circle cx="10" cy="-146" r="4" />
        <circle cx="6" cy="-141" r="3.6" />
      </g>
    </g>
  );
}

/* ─────────────── Berggorilla (zilverrug op knokkels) ─────────────── */
export function Gorilla(p: Pos) {
  const fur = '#2D2D33';
  const shade = '#1F1F24';
  const hi = '#43434C';
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
        {/* verre arm en been */}
        <path d="M30 -116 C 46 -92 52 -52 50 -14 L 48 0 L 70 0 C 74 -4 72 -10 66 -12 C 66 -50 62 -92 52 -122 Z" fill={shade} />
        <path d="M-72 -66 C -78 -42 -76 -18 -74 0 L -54 0 C -56 -18 -56 -40 -52 -62 Z" fill={shade} />
        {/* romp, ademt */}
        <g className="kt-breathe">
          <path d="M-98 -70 C -106 -106 -78 -140 -28 -150 C 14 -160 54 -154 74 -130 C 88 -114 90 -88 80 -72 C 62 -58 -60 -50 -86 -56 C -94 -60 -98 -64 -98 -70 Z" fill={fur} />
          {/* zilveren zadel op onderrug en heupen */}
          <path d="M-96 -86 C -94 -118 -66 -138 -30 -142 C -14 -144 -4 -140 0 -134 C -14 -120 -30 -100 -40 -76 C -56 -64 -86 -64 -96 -86 Z" fill="#A3A3AD" />
          <g stroke="#C4C4CC" strokeWidth="1.8" strokeLinecap="round" opacity="0.8">
            <line x1="-80" y1="-110" x2="-70" y2="-118" />
            <line x1="-66" y1="-96" x2="-56" y2="-106" />
            <line x1="-52" y1="-122" x2="-42" y2="-130" />
            <line x1="-84" y1="-88" x2="-76" y2="-94" />
          </g>
          <g stroke="#7E7E88" strokeWidth="1.6" strokeLinecap="round" opacity="0.7">
            <line x1="-44" y1="-86" x2="-36" y2="-94" />
            <line x1="-24" y1="-118" x2="-16" y2="-126" />
          </g>
          <g stroke={hi} strokeWidth="2" strokeLinecap="round">
            <line x1="-90" y1="-80" x2="-96" y2="-86" />
            <line x1="-84" y1="-70" x2="-92" y2="-72" />
            <line x1="60" y1="-140" x2="66" y2="-146" />
            <line x1="76" y1="-118" x2="84" y2="-120" />
          </g>
        </g>
        {/* nabij been */}
        <path d="M-94 -66 C -102 -40 -98 -16 -94 0 L -70 0 C -72 -18 -72 -40 -66 -62 Z" fill={fur} />
        <path d="M-98 0 C -98 -4 -92 -6 -86 -6 L -66 -6 C -62 -4 -62 0 -62 0 Z" fill={shade} />
        {/* nabije arm met knokkels */}
        <path d="M44 -128 C 66 -102 76 -62 78 -18 L 76 0 L 102 0 C 106 -6 102 -12 96 -12 C 96 -54 90 -98 72 -136 Z" fill={fur} />
        <path d="M66 -112 C 78 -84 84 -50 86 -16" stroke={hi} strokeWidth="2.4" fill="none" opacity="0.7" />
        <g fill={shade}>
          <circle cx="84" cy="-4" r="3.4" />
          <circle cx="92" cy="-4" r="3.4" />
          <circle cx="99" cy="-5" r="3" />
        </g>
        {/* kop met kam */}
        <path d="M70 -134 C 72 -152 86 -168 102 -166 C 118 -164 130 -150 128 -130 C 126 -114 114 -104 100 -104 C 86 -106 72 -118 70 -134 Z" fill={fur} />
        <path d="M80 -160 C 88 -176 104 -178 112 -164 C 104 -170 92 -170 80 -160 Z" fill={fur} />
        {/* gezicht */}
        <path d="M100 -144 C 114 -148 128 -140 129 -126 C 129 -114 118 -106 106 -108 C 98 -114 96 -132 100 -144 Z" fill="#1A1A1E" />
        <path d="M98 -144 C 108 -152 122 -150 130 -142" stroke="#0E0E10" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="116" cy="-139" r="2.2" fill="#7A5634" />
        <path d="M118 -128 C 122 -126 126 -126 128 -124" stroke="#3A3A42" strokeWidth="2" fill="none" />
        <circle cx="122" cy="-125" r="1.4" fill="#0E0E10" />
        <circle cx="126" cy="-125" r="1.4" fill="#0E0E10" />
        <path d="M110 -114 C 116 -112 122 -112 126 -116" stroke="#3A3A42" strokeWidth="1.6" fill="none" />
      </g>
    </g>
  );
}

/* ─────────────── Groene meerkat op een tak ─────────────── */
export function Monkey(p: Pos) {
  const fur = '#8E8A74';
  const shade = '#75715D';
  return (
    <g transform={tf(p)}>
      {/* tak */}
      <path d="M-70 4 C -30 0 20 2 70 -4 L 72 4 C 22 10 -30 10 -70 12 Z" fill="#5E4E3A" />
      <path d="M40 -2 C 52 -14 60 -20 72 -24" stroke="#5E4E3A" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g fill="#6E9A60">
        <ellipse cx="74" cy="-26" rx="8" ry="4" />
        <ellipse cx="-66" cy="2" rx="7" ry="3" />
      </g>
      <g className={p.className}>
        {/* staart hangt omlaag en zwaait */}
        <g className="kt-tail">
          <path d="M-12 0 C -26 14 -28 48 -20 80 C -16 94 -8 98 -4 92" stroke={shade} strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
        {/* lijf in zit-houding */}
        <path d="M-18 2 C -26 -26 -16 -52 4 -58 C 22 -62 30 -44 28 -24 C 26 -8 20 2 8 4 Z" fill={fur} />
        <path d="M8 -42 C 16 -38 20 -22 16 -6 C 10 -2 6 -12 6 -24 Z" fill="#E2DCC8" />
        <ellipse cx="-8" cy="-6" rx="14" ry="9" fill={shade} />
        <path d="M-4 0 C 2 2 8 2 12 0" stroke="#3A3A30" strokeWidth="3" strokeLinecap="round" />
        {/* arm naar de tak */}
        <path d="M14 -40 C 24 -30 28 -16 26 -2" stroke={fur} strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* kop */}
        <circle cx="16" cy="-66" r="13" fill={fur} />
        <path d="M14 -72 C 22 -78 32 -72 32 -62 C 32 -54 26 -50 20 -52 C 14 -56 12 -64 14 -72 Z" fill="#2A2A28" />
        <path d="M12 -74 C 18 -80 30 -78 33 -70" stroke="#EDE8DA" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="23" cy="-66" r="1.8" fill="#C9A24A" />
        <circle cx="28" cy="-66" r="1.8" fill="#C9A24A" />
        <ellipse cx="4" cy="-68" rx="4" ry="5" fill={shade} />
        <path d="M2 -60 C 6 -54 10 -52 14 -54" stroke="#EDE8DA" strokeWidth="2.4" fill="none" />
      </g>
    </g>
  );
}

/* ─────────────── Dhow (Zanzibar) ─────────────── */
export function Dhow({ x, y, s = 1, className }: Pos) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={className}>
        {/* kielzog */}
        <g stroke="#E8FAF8" strokeWidth="3" strokeLinecap="round" opacity="0.8">
          <path d="M-130 6 C -150 4 -170 8 -190 4" />
          <path d="M-126 12 C -146 14 -164 18 -182 16" />
        </g>
        {/* romp met planken */}
        <path d="M-122 -16 C -114 6 -60 20 0 20 C 62 20 106 8 132 -34 L 116 -30 C 92 -16 52 -12 0 -12 L -114 -16 Z" fill="#7A5232" />
        <path d="M-120 -10 C -100 2 -50 10 0 10 C 56 10 96 2 122 -22" stroke="#644228" strokeWidth="2.2" fill="none" />
        <path d="M-114 -2 C -90 8 -40 14 10 14 C 60 14 94 6 116 -12" stroke="#644228" strokeWidth="2" fill="none" />
        <path d="M-118 -18 L 118 -32 L 116 -26 L -116 -12 Z" fill="#5A3A22" />
        {/* achtersteven-opbouw */}
        <path d="M-122 -16 L -124 -36 L -86 -34 L -84 -14 Z" fill="#8A5E3A" />
        <rect x="-118" y="-32" width="8" height="8" fill="#5A3A22" />
        <rect x="-104" y="-32" width="8" height="8" fill="#5A3A22" />
        {/* mast (helt naar voren) en ra */}
        <path d="M-6 -14 L 10 -196" stroke="#5A3C24" strokeWidth="5" strokeLinecap="round" />
        <path d="M-110 -70 L 124 -214" stroke="#5A3C24" strokeWidth="4" strokeLinecap="round" />
        {/* latijnzeil met naden */}
        <path d="M-104 -72 L 118 -208 C 110 -150 100 -86 92 -30 L -40 -26 C -60 -40 -84 -58 -104 -72 Z" fill="#F2E8D2" />
        <path d="M118 -208 C 110 -150 100 -86 92 -30 L 70 -30 C 80 -90 96 -150 118 -208 Z" fill="#DCCFB2" />
        <g stroke="#D6C8A8" strokeWidth="1.6">
          <line x1="-70" y1="-50" x2="96" y2="-150" />
          <line x1="-40" y1="-34" x2="98" y2="-104" />
          <line x1="0" y1="-28" x2="94" y2="-62" />
        </g>
        {/* tuigage */}
        <g stroke="#4A3220" strokeWidth="1.4">
          <line x1="10" y1="-196" x2="124" y2="-34" />
          <line x1="10" y1="-196" x2="-120" y2="-34" />
          <line x1="-104" y1="-72" x2="-118" y2="-36" />
        </g>
        {/* vlaggetje */}
        <path d="M124 -214 L 140 -220 L 136 -212 L 140 -204 L 124 -208 Z" fill="#C8382A" />
      </g>
    </g>
  );
}

/* ─────────────── Kilimanjaro (verre laag) ─────────────── */
export function Kilimanjaro({ x, y, s = 1, className }: Pos) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* Mawenzi: lagere, grillige piek links */}
      <path d="M-280 0 C -250 -36 -226 -58 -212 -80 L -204 -94 L -196 -86 L -188 -104 L -178 -90 L -166 -112 L -156 -98 C -142 -80 -128 -58 -110 0 Z" fill="#A2B5C2" />
      <path d="M-166 -112 L -156 -98 C -142 -80 -128 -58 -110 0 L -150 0 C -152 -40 -158 -80 -166 -112 Z" fill="#8FA4B3" />
      <path d="M-188 -104 L -184 -96 L -178 -90 L -174 -98 L -166 -112 L -170 -102 L -180 -94 Z" fill="#F2F6F8" />
      {/* Kibo: brede, afgeplatte hoofdtop */}
      <path d="M-170 0 C -120 -40 -80 -84 -46 -130 C -26 -156 -8 -168 16 -172 C 48 -176 80 -174 104 -164 C 140 -146 180 -100 230 -50 C 260 -22 290 -8 320 0 Z" fill="#A9BCC8" />
      {/* schaduwkant rechts */}
      <path d="M70 -174 C 92 -172 104 -164 104 -164 C 140 -146 180 -100 230 -50 C 260 -22 290 -8 320 0 L 150 0 C 130 -60 110 -120 70 -174 Z" fill="#93A8B7" />
      {/* bergruggen */}
      <g stroke="#BBCBD5" strokeWidth="2" fill="none" opacity="0.8">
        <path d="M-20 -160 C -40 -120 -70 -70 -110 -20" />
        <path d="M20 -170 C 10 -120 -10 -60 -30 -10" />
        <path d="M60 -170 C 70 -120 80 -70 90 -20" />
      </g>
      {/* gletsjers en sneeuwvelden op de top */}
      <path d="M-46 -132 C -28 -156 -8 -168 16 -172 C 48 -176 80 -174 104 -164 C 112 -160 118 -156 124 -150 C 110 -148 102 -152 94 -144 C 84 -152 74 -140 62 -148 C 50 -138 40 -150 28 -142 C 16 -150 6 -138 -6 -146 C -18 -136 -30 -142 -46 -132 Z" fill="#F7FAFB" />
      <g fill="#F7FAFB">
        <path d="M-30 -140 L -36 -118 L -26 -136 Z" />
        <path d="M30 -146 L 26 -122 L 36 -142 Z" />
        <path d="M80 -150 L 84 -128 L 90 -148 Z" />
        <path d="M110 -152 L 122 -132 L 120 -150 Z" />
      </g>
      <path d="M-46 -132 C -20 -150 30 -158 104 -160" stroke="#E2EAEF" strokeWidth="2" fill="none" />
      {/* bosgordel aan de voet */}
      <path d="M-280 0 C -250 -14 -220 -10 -190 -18 C -160 -24 -130 -16 -100 -22 C -60 -30 -20 -24 20 -28 C 60 -32 100 -22 140 -26 C 180 -30 220 -18 260 -20 C 290 -22 310 -10 320 0 Z" fill="#8DAE9C" />
      {/* wolkenkraag */}
      <g className={className} fill="#FFFFFF" opacity="0.7">
        <ellipse cx="-120" cy="-70" rx="60" ry="12" />
        <ellipse cx="-70" cy="-80" rx="40" ry="10" />
        <ellipse cx="170" cy="-76" rx="70" ry="12" />
        <ellipse cx="220" cy="-66" rx="40" ry="9" />
      </g>
    </g>
  );
}

/* ─────────────── Kleine silhouetten voor de verre laag ─────────────── */
export function FarAcacia({ x, y, s = 1, color = '#94AC8C' }: Pos & { color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={color}>
      <rect x="-1.5" y="-14" width="3" height="14" />
      <path d="M-20 -14 C -18 -20 -6 -22 0 -20 C 8 -22 18 -20 20 -14 Z" />
    </g>
  );
}

export function FarPalm({ x, y, s = 1, color = '#8FAE90' }: Pos & { color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={color}>
      <path d="M-1 0 L 1 -26 L 3 -26 L 2 0 Z" />
      <path d="M2 -26 C -6 -30 -12 -28 -16 -22 C -8 -26 -2 -26 2 -24 Z M 2 -26 C 10 -30 16 -28 20 -22 C 12 -26 6 -26 2 -24 Z M 2 -26 C 0 -34 2 -38 6 -40 C 4 -34 4 -30 3 -25 Z" />
    </g>
  );
}

export function MistBand({ x, y, w, className }: { x: number; y: number; w: number; className?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className} fill="#FFFFFF" opacity="0.45">
        <ellipse cx={w * 0.25} cy="0" rx={w * 0.3} ry="10" />
        <ellipse cx={w * 0.65} cy="6" rx={w * 0.32} ry="9" />
      </g>
    </g>
  );
}

/** Duin met licht- en schaduwkant en ribbels (woestijn, middengrond). */
export function Dune({ x, y, w = 360, h = 70 }: { x: number; y: number; w?: number; h?: number }) {
  const crest = w * 0.42;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M0 0 C ${w * 0.18} ${-h * 0.5} ${crest - 30} ${-h} ${crest} ${-h} C ${crest + 40} ${-h * 0.8} ${w * 0.8} ${-h * 0.3} ${w} 0 Z`} fill="#EDBE7E" />
      <path d={`M${crest} ${-h} C ${crest + 40} ${-h * 0.8} ${w * 0.8} ${-h * 0.3} ${w} 0 L ${crest + 20} 0 C ${crest + 10} ${-h * 0.4} ${crest + 4} ${-h * 0.7} ${crest} ${-h} Z`} fill="#D49A5E" />
      <g stroke="#E0AE6E" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d={`M${w * 0.12} ${-h * 0.22} C ${w * 0.2} ${-h * 0.32} ${w * 0.28} ${-h * 0.36} ${crest - 20} ${-h * 0.5}`} />
        <path d={`M${w * 0.08} ${-h * 0.1} C ${w * 0.18} ${-h * 0.18} ${w * 0.26} ${-h * 0.2} ${crest - 10} ${-h * 0.3}`} />
      </g>
      <path d={`M${crest} ${-h} C ${crest - 30} ${-h} ${w * 0.18} ${-h * 0.5} 0 0`} stroke="#F6D7A6" strokeWidth="2" fill="none" />
    </g>
  );
}

/** Kuifjes op zee (golfjes). */
export function Waves({ x, y, w }: { x: number; y: number; w: number }) {
  const out = [];
  for (let i = 0; i < 9; i++) {
    const px = Math.round((w * ((i * 37) % 100)) / 100);
    const py = (i * 13) % 50;
    out.push(<path key={i} d={`M${px} ${py} q 8 -5 16 0 q 8 -5 16 0`} />);
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <g stroke="#E6F8F7" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.85" className="kt-ripple">
        {out}
      </g>
    </g>
  );
}
