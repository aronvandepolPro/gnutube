/**
 * Dieren en planten voor de safariscène, in vlakke illustratiestijl met licht en schaduw.
 * Elk figuur: oorsprong onder de voeten (midden), kijkt naar rechts; `flip` spiegelt.
 * `uid` is nodig waar een clipPath gebruikt wordt (vacht-patronen), omdat figuren vaker voorkomen.
 * Animatieklassen staan op een binnenste groep: een CSS-transform zou anders de positie overschrijven.
 * Puur SVG zonder hooks.
 */

type Pos = { x: number; y: number; s?: number; flip?: boolean; className?: string; uid?: string };
const tf = ({ x, y, s = 1, flip }: Pos) => `translate(${x} ${y}) scale(${flip ? -s : s} ${s})`;

/* ─────────────── Afrikaanse olifant ─────────────── */
export function Elephant(p: Pos) {
  const base = '#9C9891';
  const shade = '#85817A';
  const deep = '#6E6A63';
  const light = '#B6B2AA';
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
      {/* verre poten */}
      <path d="M-80 -72 C -82 -42 -80 -18 -80 0 L -56 0 C -56 -24 -54 -48 -52 -74 Z" fill={deep} />
      <path d="M38 -74 C 38 -42 40 -18 40 0 L 64 0 C 64 -22 64 -48 66 -76 Z" fill={deep} />
      {/* lijf met holle rug */}
      <path
        d="M-118 -100 C -124 -142 -96 -166 -50 -170 C -22 -172 -2 -160 22 -166 C 56 -174 88 -160 96 -128 C 102 -104 98 -80 88 -64 C 62 -50 -60 -48 -96 -56 C -112 -62 -118 -80 -118 -100 Z"
        fill={base}
      />
      <path d="M-112 -72 C -80 -58 40 -56 88 -66 C 82 -56 60 -50 0 -50 C -60 -50 -98 -54 -112 -72 Z" fill={shade} />
      <path d="M-100 -150 C -70 -168 -30 -168 0 -160" stroke={light} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* staart */}
      <g className="kt-tail">
        <path d="M-116 -126 C -130 -108 -130 -88 -126 -70" stroke={deep} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M-130 -74 l 8 -2 l -2 14 Z" fill="#4E4A44" />
      </g>
      {/* nabije poten */}
      <path d="M-114 -94 C -124 -62 -112 -30 -108 -10 L -108 0 L -80 0 L -80 -12 C -78 -40 -74 -66 -66 -88 Z" fill={base} />
      <path d="M56 -92 C 58 -52 60 -22 58 0 L 86 0 C 86 -24 86 -58 90 -98 Z" fill={base} />
      <path d="M-106 -40 C -98 -36 -88 -36 -82 -40" stroke={shade} strokeWidth="2" fill="none" />
      <path d="M60 -36 C 68 -32 78 -32 84 -36" stroke={shade} strokeWidth="2" fill="none" />
      <g fill="#E4DED2">
        <ellipse cx="-101" cy="-3" rx="4" ry="2.5" />
        <ellipse cx="-89" cy="-3" rx="4" ry="2.5" />
        <ellipse cx="65" cy="-3" rx="4" ry="2.5" />
        <ellipse cx="77" cy="-3" rx="4" ry="2.5" />
      </g>
      {/* kop */}
      <path d="M72 -158 C 98 -180 142 -170 152 -134 C 158 -112 152 -94 140 -86 C 122 -78 100 -84 86 -100 C 76 -112 68 -138 72 -158 Z" fill={base} />
      {/* slurf */}
      <g className="kt-trunk">
      <path d="M142 -112 C 158 -94 160 -62 154 -38 C 150 -20 154 -8 166 -4 C 160 4 146 2 140 -8 C 132 -26 138 -58 126 -90 Z" fill={base} />
      <g stroke={shade} strokeWidth="2" strokeLinecap="round">
        <line x1="140" y1="-82" x2="152" y2="-84" />
        <line x1="142" y1="-68" x2="155" y2="-70" />
        <line x1="142" y1="-54" x2="155" y2="-55" />
        <line x1="141" y1="-40" x2="153" y2="-40" />
      </g>
      </g>
      {/* slagtand */}
      <path d="M134 -96 C 152 -88 164 -72 168 -56 C 158 -66 144 -78 128 -86 Z" fill="#F2ECDD" />
      {/* oor (groot, Afrikaans), wappert */}
      <g className="kt-ear">
      <path d="M88 -168 C 60 -186 22 -174 18 -136 C 14 -104 32 -78 58 -72 C 70 -70 80 -78 80 -90 C 94 -104 102 -148 88 -168 Z" fill={shade} />
      <path d="M84 -160 C 62 -172 32 -164 28 -136 C 26 -110 40 -88 60 -82" stroke={light} strokeWidth="3" fill="none" opacity="0.5" />
      </g>
      {/* oog */}
      <path d="M124 -142 C 128 -146 134 -146 138 -142" stroke={deep} strokeWidth="2" fill="none" />
      <circle cx="131" cy="-136" r="3" fill="#2A2A2A" />
      </g>
    </g>
  );
}

/* ─────────────── Giraffe (netpatroon) ─────────────── */
export function Giraffe(p: Pos) {
  const id = `gir-${p.uid ?? `${p.x}-${p.y}`}`;
  const cream = '#F1DDB0';
  const patch = '#B4692E';
  const legShade = '#DCC08C';
  const body =
    'M-74 -210 C -82 -236 -44 -254 -4 -258 C 34 -264 66 -270 84 -250 C 98 -234 92 -210 76 -202 C 40 -194 -40 -190 -62 -196 C -70 -198 -74 -204 -74 -210 Z';
  const neck = 'M58 -252 C 80 -300 104 -352 122 -394 L 148 -386 C 132 -340 112 -282 92 -230 Z';
  const patches: [number, number, number, number][] = [];
  for (let r = 0; r < 14; r++) {
    for (let c = 0; c < 9; c++) {
      patches.push([-90 + c * 22 + (r % 2) * 11, -420 + r * 22, 18, 18]);
    }
  }
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
      <defs>
        <clipPath id={id}>
          <path d={body} />
          <path d={neck} />
        </clipPath>
      </defs>
      {/* verre poten */}
      <path d="M-50 -200 C -52 -150 -48 -100 -50 -50 C -52 -24 -50 -8 -50 0 L -40 0 C -38 -24 -36 -60 -34 -100 C -32 -150 -32 -180 -30 -200 Z" fill={legShade} />
      <path d="M48 -202 C 50 -150 54 -100 52 -50 C 50 -24 52 -8 52 0 L 62 0 C 64 -26 64 -60 66 -100 C 68 -150 68 -184 68 -202 Z" fill={legShade} />
      {/* lijf en nek met netpatroon */}
      <path d={body} fill={cream} />
      <path d={neck} fill={cream} />
      <g clipPath={`url(#${id})`} fill={patch}>
        {patches.map(([px, py, w, h], i) => (
          <rect key={i} x={px} y={py} width={w} height={h} rx="5" />
        ))}
      </g>
      <path d="M-70 -200 C -40 -192 40 -196 76 -204" stroke="#C99A5A" strokeWidth="4" fill="none" opacity="0.5" />
      {/* manen */}
      <path d="M62 -254 C 84 -302 104 -350 120 -392" stroke="#7A4422" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* staart */}
      <g className="kt-tail">
        <path d="M-72 -214 C -84 -190 -84 -160 -80 -140" stroke="#B4692E" strokeWidth="3" fill="none" />
        <path d="M-84 -144 l 8 0 l -3 16 Z" fill="#3A2614" />
      </g>
      {/* nabije poten met knieën */}
      <path d="M-66 -200 C -68 -150 -64 -110 -62 -80 C -66 -72 -66 -60 -62 -52 C -64 -30 -62 -10 -62 0 L -50 0 C -50 -18 -50 -36 -48 -54 C -44 -62 -44 -74 -48 -82 C -46 -120 -46 -170 -44 -200 Z" fill={cream} />
      <path d="M66 -204 C 68 -150 72 -110 70 -80 C 66 -72 66 -60 70 -52 C 68 -30 70 -10 70 0 L 82 0 C 82 -18 82 -36 84 -54 C 88 -62 88 -74 84 -82 C 86 -120 86 -170 86 -204 Z" fill={cream} />
      <g fill="#4A3220">
        <rect x="-63" y="-8" width="14" height="8" rx="2" />
        <rect x="69" y="-8" width="14" height="8" rx="2" />
      </g>
      {/* kop */}
      <path d="M116 -398 C 132 -416 168 -412 184 -392 C 190 -384 186 -374 176 -372 L 140 -370 C 126 -372 116 -384 116 -398 Z" fill={cream} />
      <path d="M160 -380 C 170 -380 180 -380 184 -386" stroke="#C99A5A" strokeWidth="3" fill="none" />
      <path d="M122 -402 L 104 -410 L 118 -394 Z" fill={cream} />
      <circle cx="148" cy="-396" r="3" fill="#2A2A2A" />
      <g stroke="#7A4422" strokeWidth="4" strokeLinecap="round">
        <line x1="132" y1="-408" x2="128" y2="-428" />
        <line x1="142" y1="-410" x2="142" y2="-430" />
      </g>
      <circle cx="128" cy="-430" r="4.5" fill="#3A2614" />
      <circle cx="142" cy="-432" r="4.5" fill="#3A2614" />
      </g>
    </g>
  );
}

/* ─────────────── Leeuw en leeuwin ─────────────── */
export function Lion({ mane = true, ...p }: Pos & { mane?: boolean }) {
  const coat = '#D7A35B';
  const shade = '#BC8742';
  const light = '#EBC487';
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
      {/* verre poten */}
      <g className="kt-walk-legs-alt">
        <path d="M-60 -64 C -66 -40 -60 -18 -58 -6 L -60 0 L -46 0 C -44 -6 -46 -10 -48 -12 C -50 -34 -44 -52 -40 -66 Z" fill={shade} />
        <path d="M44 -64 C 46 -40 46 -18 46 0 L 60 0 C 62 -4 60 -8 56 -8 C 56 -30 56 -50 58 -66 Z" fill={shade} />
      </g>
      {/* lijf */}
      <path d="M-92 -72 C -98 -98 -62 -110 -12 -106 C 28 -104 58 -108 76 -98 C 92 -88 90 -66 78 -58 C 52 -50 -48 -48 -76 -52 C -88 -56 -92 -64 -92 -72 Z" fill={coat} />
      <path d="M-84 -60 C -40 -50 40 -52 78 -60 C 66 -50 30 -48 -10 -48 C -50 -48 -76 -52 -84 -60 Z" fill={light} opacity="0.8" />
      {/* staart */}
      <g className="kt-tail">
        <path d="M-90 -80 C -118 -74 -124 -48 -116 -28" stroke={coat} strokeWidth="5" fill="none" strokeLinecap="round" />
        <ellipse cx="-116" cy="-24" rx="6" ry="9" fill="#5A3518" />
      </g>
      {/* nabije poten */}
      <g className="kt-walk-legs">
        <path d="M-82 -82 C -98 -60 -90 -30 -84 -12 L -86 0 L -66 0 C -62 -6 -64 -12 -68 -14 C -70 -36 -58 -56 -52 -78 Z" fill={coat} />
        <path d="M54 -72 C 56 -42 58 -18 56 0 L 76 0 C 80 -4 78 -10 72 -10 C 72 -32 72 -56 74 -78 Z" fill={coat} />
      </g>
      {mane && (
        <>
          <path d="M60 -132 C 80 -152 116 -146 118 -120 C 122 -94 108 -62 88 -50 C 70 -44 54 -60 52 -84 C 50 -108 50 -122 60 -132 Z" fill="#7E4A20" />
          <g stroke="#5E3414" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M64 -118 C 60 -100 62 -80 70 -64" />
            <path d="M76 -132 C 70 -110 72 -84 82 -60" />
            <path d="M92 -136 C 98 -120 102 -100 100 -78" />
          </g>
        </>
      )}
      {/* kop */}
      <path d="M82 -116 C 100 -128 128 -120 134 -100 C 138 -86 134 -76 122 -74 L 98 -72 C 86 -78 78 -98 82 -116 Z" fill={coat} />
      <path d="M112 -92 C 124 -94 136 -92 136 -84 C 134 -76 120 -74 110 -78 Z" fill={light} />
      <path d="M130 -96 l 7 2 l -5 5 Z" fill="#4A2C16" />
      <path d="M126 -80 C 122 -76 116 -76 112 -78" stroke="#4A2C16" strokeWidth="1.6" fill="none" />
      <circle cx="114" cy="-104" r="2.8" fill="#2A2A2A" />
      <path d="M92 -118 C 90 -128 100 -130 102 -122 Z" fill={mane ? '#7E4A20' : shade} />
      {!mane && <path d="M84 -100 C 86 -84 94 -74 104 -72" stroke={light} strokeWidth="6" fill="none" opacity="0.8" />}
      </g>
    </g>
  );
}

/* ─────────────── Zebra ─────────────── */
export function Zebra(p: Pos) {
  const id = `zeb-${p.uid ?? `${p.x}-${p.y}`}`;
  const body = 'M-76 -94 C -80 -120 -48 -130 -6 -128 C 34 -126 60 -126 72 -110 C 82 -96 78 -76 66 -70 C 40 -62 -46 -62 -64 -68 C -74 -72 -76 -84 -76 -94 Z';
  const neck = 'M52 -120 C 66 -146 84 -168 102 -178 L 116 -164 C 102 -150 88 -128 74 -100 Z';
  const head = 'M94 -184 C 108 -198 130 -190 142 -160 C 148 -146 144 -134 132 -134 C 120 -134 108 -146 98 -160 Z';
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
      <defs>
        <clipPath id={id}>
          <path d={body} />
          <path d={neck} />
          <path d={head} />
        </clipPath>
      </defs>
      {/* poten */}
      {[
        [-60, '#E6E3DC'],
        [-42, '#F7F5F0'],
        [44, '#E6E3DC'],
        [60, '#F7F5F0'],
      ].map(([lx, col]) => (
        <g key={lx as number}>
          <path d={`M${(lx as number) - 6} -76 C ${(lx as number) - 7} -50 ${(lx as number) - 5} -24 ${(lx as number) - 5} 0 L ${(lx as number) + 5} 0 C ${(lx as number) + 5} -24 ${(lx as number) + 6} -50 ${(lx as number) + 6} -76 Z`} fill={col as string} stroke="#CFCAC0" strokeWidth="1.5" />
          <g fill="#1E1E1E">
            {[-62, -50, -38, -26].map((yy) => (
              <rect key={yy} x={(lx as number) - 6} y={yy} width="12" height="4" />
            ))}
            <rect x={(lx as number) - 6} y="-7" width="12" height="7" rx="2" />
          </g>
        </g>
      ))}
      <path d={body} fill="#F7F5F0" stroke="#CFCAC0" strokeWidth="2" />
      <path d={neck} fill="#F7F5F0" stroke="#CFCAC0" strokeWidth="2" />
      <path d={head} fill="#F7F5F0" stroke="#CFCAC0" strokeWidth="2" />
      <g clipPath={`url(#${id})`} stroke="#1E1E1E" strokeWidth="7" fill="none" strokeLinecap="round">
        {[-62, -46, -30, -14, 2, 18, 34].map((sx) => (
          <path key={sx} d={`M${sx} -132 C ${sx - 8} -110 ${sx - 2} -90 ${sx - 8} -62`} />
        ))}
        <path d="M-80 -110 C -66 -100 -66 -84 -80 -74" />
        <path d="M-80 -92 C -70 -88 -70 -80 -78 -72" />
        <path d="M50 -116 C 60 -106 70 -100 84 -98" />
        <path d="M60 -134 C 72 -126 82 -120 96 -120" />
        <path d="M72 -152 C 84 -146 94 -140 106 -142" />
        <path d="M86 -168 C 96 -164 104 -160 114 -162" />
        <path d="M108 -176 C 116 -172 120 -166 124 -164" />
      </g>
      <path d="M124 -150 C 134 -156 146 -150 146 -142 C 146 -134 136 -130 126 -134 Z" fill="#2A2A2A" />
      <circle cx="116" cy="-170" r="2.6" fill="#1E1E1E" />
      <path d="M104 -184 L 98 -198 L 110 -186 Z" fill="#F7F5F0" />
      {/* staande manen */}
      <path d="M54 -124 C 68 -150 86 -172 100 -184" stroke="#1E1E1E" strokeWidth="7" strokeLinecap="round" fill="none" />
      <g className="kt-tail">
        <path d="M-74 -100 C -86 -86 -86 -66 -82 -52" stroke="#2A2A2A" strokeWidth="3" fill="none" />
        <path d="M-86 -56 l 8 0 l -3 12 Z" fill="#1E1E1E" />
      </g>
      </g>
    </g>
  );
}

/* ─────────────── Nijlpaard (in het water) ─────────────── */
export function Hippo(p: Pos) {
  const base = '#8A7381';
  const shade = '#735E6B';
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
      <path d="M-90 4 C -88 -36 -46 -52 0 -52 C 40 -52 62 -40 72 -26 C 84 -42 116 -44 132 -28 C 142 -16 140 0 138 6 Z" fill={base} />
      <path d="M-70 -28 C -40 -46 10 -48 50 -38" stroke="#A48D9A" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M100 -24 C 116 -26 132 -22 138 -10 L 136 4 L 96 4 Z" fill="#B88A92" />
      <circle cx="122" cy="-24" r="2.6" fill="#4A3A44" />
      <circle cx="132" cy="-20" r="2.4" fill="#4A3A44" />
      <ellipse cx="84" cy="-44" rx="8" ry="6" fill={shade} />
      <circle cx="84" cy="-46" r="3" fill="#2A2A2A" />
      <g className="kt-twitch">
        <ellipse cx="74" cy="-54" rx="5" ry="7" fill={shade} />
      </g>
      {/* waterlijn met rimpels */}
      <rect x="-104" y="0" width="256" height="14" fill="#76BCC8" />
      <g stroke="#C9EBF0" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M-100 2 C -80 -2 -60 6 -40 2" />
        <path d="M30 2 C 50 -2 70 6 90 2" />
        <path d="M110 2 C 124 -2 136 6 150 2" />
      </g>
      </g>
    </g>
  );
}

/* ─────────────── Nijlkrokodil ─────────────── */
export function Crocodile(p: Pos) {
  const skin = '#5F6E3B';
  const shade = '#4B5830';
  const belly = '#A7A86A';
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
      {/* verre poten */}
      <path d="M-58 -6 C -70 2 -76 6 -82 6 L -60 6 Z" fill={shade} />
      <path d="M48 -8 C 40 2 34 6 28 6 L 50 6 Z" fill={shade} />
      <path
        d="M-200 -2 C -150 -10 -100 -20 -40 -24 C 20 -28 70 -24 110 -18 C 140 -16 170 -14 196 -10 C 202 -8 202 -2 196 0 C 170 2 140 4 110 4 C 60 6 -10 6 -60 4 C -120 2 -170 2 -200 -2 Z"
        fill={skin}
      />
      <path d="M-180 0 C -120 2 -40 6 60 4 C 120 4 170 2 196 0 C 170 4 110 8 40 8 C -40 8 -120 6 -180 0 Z" fill={belly} opacity="0.8" />
      <g fill={shade}>
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={`M${-170 + i * 18} ${-10 - Math.min(i, 8)} l 6 -8 l 6 8 Z`} />
        ))}
      </g>
      {/* nabije poten */}
      <path d="M-40 -4 C -50 6 -58 10 -66 12 L -34 12 C -32 6 -34 0 -36 -4 Z" fill={skin} />
      <path d="M70 -6 C 64 6 58 10 50 12 L 80 12 C 80 6 78 0 76 -6 Z" fill={skin} />
      <ellipse cx="128" cy="-20" rx="7" ry="5" fill={skin} />
      <circle cx="129" cy="-22" r="2.4" fill="#E8D36A" />
      <path d="M138 -8 l 6 4 l 6 -4 l 6 4 l 6 -4 l 6 4 l 6 -4 l 6 4" stroke="#F4F0E0" strokeWidth="1.6" fill="none" />
      <circle cx="192" cy="-10" r="2" fill="#2A2A2A" />
      </g>
    </g>
  );
}

/* ─────────────── Zilverreiger ─────────────── */
export function Egret(p: Pos) {
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
      <g stroke="#2E2E2E" strokeWidth="2.4" strokeLinecap="round">
        <line x1="-4" y1="-30" x2="-8" y2="0" />
        <line x1="4" y1="-30" x2="6" y2="0" />
      </g>
      <path d="M-26 -40 C -20 -52 4 -54 14 -42 C 18 -34 10 -28 -4 -28 C -16 -28 -24 -32 -26 -40 Z" fill="#FFFFFF" />
      <path d="M-24 -38 C -34 -36 -40 -32 -42 -28" stroke="#E8E8E8" strokeWidth="3" fill="none" />
      <g className="kt-nod">
        <path d="M10 -44 C 22 -54 14 -66 10 -72 C 6 -80 12 -88 22 -88" stroke="#FFFFFF" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M22 -90 L 42 -86 L 22 -84 Z" fill="#E8B83A" />
        <circle cx="22" cy="-89" r="1.6" fill="#2A2A2A" />
      </g>
      </g>
    </g>
  );
}

/* ─────────────── Oryx (gemsbok) ─────────────── */
export function Oryx(p: Pos) {
  const coat = '#D9C3A0';
  const shade = '#C2AB86';
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
      {[
        [-44, shade],
        [40, shade],
      ].map(([lx, c]) => (
        <path key={lx as number} d={`M${(lx as number) - 5} -74 C ${(lx as number) - 6} -50 ${(lx as number) - 4} -24 ${(lx as number) - 4} 0 L ${(lx as number) + 5} 0 C ${(lx as number) + 5} -24 ${(lx as number) + 6} -50 ${(lx as number) + 7} -74 Z`} fill={c as string} />
      ))}
      <path d="M-70 -96 C -72 -120 -40 -128 0 -126 C 36 -124 58 -126 68 -110 C 76 -96 72 -78 60 -72 C 34 -66 -44 -66 -60 -70 C -68 -74 -70 -84 -70 -96 Z" fill={coat} />
      <path d="M-66 -84 C -30 -74 30 -74 66 -82" stroke="#2E2A26" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M-62 -76 C -30 -68 30 -68 60 -74 C 40 -66 -40 -66 -62 -76 Z" fill="#F2EBDD" />
      {[
        [-58, coat],
        [54, coat],
      ].map(([lx, c]) => (
        <g key={lx as number}>
          <path d={`M${(lx as number) - 6} -76 C ${(lx as number) - 7} -50 ${(lx as number) - 5} -24 ${(lx as number) - 5} 0 L ${(lx as number) + 5} 0 C ${(lx as number) + 5} -24 ${(lx as number) + 6} -50 ${(lx as number) + 7} -76 Z`} fill={c as string} />
          <rect x={(lx as number) - 6} y="-52" width="12" height="12" fill="#2E2A26" />
        </g>
      ))}
      <path d="M48 -116 C 60 -134 72 -150 82 -158 L 96 -146 C 86 -136 76 -122 66 -104 Z" fill={coat} />
      <path d="M78 -162 C 92 -170 110 -162 116 -144 C 118 -136 112 -132 104 -134 L 84 -144 Z" fill="#F2EBDD" />
      <path d="M86 -160 C 92 -152 98 -144 106 -140 M 98 -166 C 102 -158 108 -150 114 -148" stroke="#2E2A26" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="98" cy="-154" r="2.4" fill="#1E1E1E" />
      <g stroke="#3A3026" strokeWidth="3.6" strokeLinecap="round">
        <line x1="86" y1="-166" x2="34" y2="-236" />
        <line x1="92" y1="-168" x2="44" y2="-240" />
      </g>
      <g className="kt-tail">
        <path d="M-68 -104 C -80 -88 -80 -66 -76 -48" stroke="#2E2A26" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      </g>
    </g>
  );
}

/* ─────────────── Stokstaartje ─────────────── */
export function Meerkat(p: Pos) {
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
      <path d="M-6 0 C -14 -4 -22 0 -24 6" stroke="#A2805A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M-10 0 C -14 -24 -12 -42 -6 -52 C -2 -58 6 -58 8 -52 C 14 -42 14 -24 10 0 Z" fill="#C3A076" />
      <path d="M-4 -40 C 0 -28 2 -14 0 -2 C 6 -14 8 -28 6 -40 Z" fill="#DCC29C" />
      <path d="M-6 -56 C -6 -66 4 -70 10 -64 C 16 -60 16 -56 10 -54 Z" fill="#C3A076" />
      <circle cx="4" cy="-61" r="2.4" fill="#2A2A2A" />
      <path d="M-6 -44 C -2 -40 2 -40 4 -44" stroke="#A2805A" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}

/* ─────────────── Flamingo ─────────────── */
export function Flamingo(p: Pos) {
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
      <g stroke="#D96A86" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <line x1="-2" y1="-46" x2="-2" y2="0" />
        <path d="M4 -46 L 10 -26 L 2 -20" />
      </g>
      <path d="M-24 -54 C -18 -68 12 -70 22 -56 C 26 -48 18 -42 2 -42 C -12 -42 -22 -46 -24 -54 Z" fill="#F4A3B8" />
      <path d="M-22 -54 C -30 -52 -34 -46 -34 -42" stroke="#E27D98" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M-8 -60 C 0 -64 10 -62 16 -56" stroke="#E98AA3" strokeWidth="3" fill="none" />
      <g className="kt-nod">
        <path d="M18 -58 C 30 -74 18 -86 12 -94 C 6 -104 14 -114 24 -112" stroke="#F4A3B8" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M24 -116 C 32 -116 38 -110 36 -102 L 30 -106 C 28 -110 26 -112 24 -112 Z" fill="#F6E6EA" />
        <path d="M34 -104 L 38 -96 L 31 -100 Z" fill="#2A2A2A" />
        <circle cx="25" cy="-114" r="1.6" fill="#2A2A2A" />
      </g>
      </g>
    </g>
  );
}

export function Butterfly({ color = '#F2A43A', ...p }: Pos & { color?: string }) {
  return (
    <g transform={tf(p)}>
      <g className={p.className}>
      <path d="M0 -2 C -8 -18 -22 -14 -18 -2 C -16 4 -6 4 0 0 Z" fill={color} />
      <path d="M0 -2 C 8 -18 22 -14 18 -2 C 16 4 6 4 0 0 Z" fill={color} />
      <path d="M0 0 C -6 8 -14 12 -12 4 Z M 0 0 C 6 8 14 12 12 4 Z" fill={color} opacity="0.8" />
      <rect x="-1" y="-8" width="2" height="12" rx="1" fill="#2A2A2A" />
      </g>
    </g>
  );
}

/* ─────────────── Planten ─────────────── */

export function TermiteMound({ x, y, s = 1 }: Pos) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-26 0 C -22 -30 -12 -50 -4 -74 C 0 -82 6 -80 8 -70 C 12 -50 20 -30 28 0 Z" fill="#B97B4A" />
      <path d="M2 -76 C 6 -56 14 -30 22 0 L 28 0 C 20 -30 12 -50 8 -70 Z" fill="#9E663B" />
    </g>
  );
}

export function Papyrus({ x, y, s = 1 }: Pos) {
  const heads = [-30, -16, -4, 10, 24, 34];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {heads.map((dx, i) => {
        const h = 92 + ((i * 37) % 54);
        return (
          <g key={dx}>
            <path d={`M${dx / 4} 0 Q ${dx / 2} ${-h / 2} ${dx} ${-h}`} stroke="#5E8A3A" strokeWidth="3" fill="none" />
            <g stroke="#88B552" strokeWidth="2" strokeLinecap="round">
              {[-26, -16, -6, 6, 16, 26].map((a) => (
                <line key={a} x1={dx} y1={-h} x2={dx + a} y2={-h - 20 + Math.abs(a) / 1.6} />
              ))}
            </g>
          </g>
        );
      })}
    </g>
  );
}

export function LilyPads({ x, y, s = 1 }: Pos) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="16" ry="5" fill="#5E8E46" />
      <ellipse cx="28" cy="4" rx="12" ry="4" fill="#6E9E50" />
      <ellipse cx="-24" cy="5" rx="11" ry="3.6" fill="#6E9E50" />
      <circle cx="4" cy="-3" r="4" fill="#F4E6EE" />
      <circle cx="4" cy="-4" r="1.6" fill="#E8C24A" />
    </g>
  );
}

export function DeadTree({ x, y, s = 1, flip }: Pos) {
  return (
    <g transform={tf({ x, y, s, flip })} stroke="#2E2018" strokeLinecap="round" fill="none">
      <path d="M0 0 C 4 -40 -2 -60 2 -96" strokeWidth="10" />
      <path d="M0 -50 C -20 -64 -34 -80 -44 -110" strokeWidth="7" />
      <path d="M1 -66 C 18 -80 30 -96 40 -106" strokeWidth="6" />
      <path d="M2 -96 C -2 -110 6 -124 12 -134" strokeWidth="4" />
      <path d="M-34 -90 L -54 -98 M -40 -104 L -46 -122 M 32 -100 L 48 -104" strokeWidth="3" />
    </g>
  );
}

export function Fern({ x, y, s = 1, flip }: Pos) {
  return (
    <g transform={tf({ x, y, s, flip })} stroke="#3E6E36" strokeWidth="3" fill="none" strokeLinecap="round">
      <path d="M0 0 C 10 -30 30 -50 56 -58" />
      <path d="M0 0 C -6 -34 -20 -56 -44 -66" />
      <path d="M0 0 C 2 -36 6 -60 14 -80" />
      {[0.25, 0.45, 0.65, 0.85].map((t) => (
        <g key={t}>
          <line x1={56 * t} y1={-58 * t - 10 * t} x2={56 * t + 6} y2={-58 * t - 18 * t - 6} />
          <line x1={-44 * t} y1={-66 * t} x2={-44 * t - 6} y2={-66 * t - 8} />
        </g>
      ))}
    </g>
  );
}

export function Bush({ x, y, s = 1, color = '#6F8F40' }: Pos & { color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-46 0 C -50 -16 -36 -28 -22 -24 C -18 -40 6 -44 14 -30 C 28 -38 46 -26 42 -12 C 50 -8 48 0 40 0 Z" fill={color} />
      <path d="M-36 -6 C -20 -14 10 -16 34 -8" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity="0.12" />
    </g>
  );
}

export function Rocks({ x, y, s = 1, color = '#8E8478' }: Pos & { color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-40 0 C -42 -14 -30 -26 -14 -24 C -6 -34 14 -32 20 -20 C 34 -22 44 -10 40 0 Z" fill={color} />
      <path d="M-10 -22 C 0 -18 6 -10 6 0 L 40 0 C 44 -10 34 -22 20 -20 Z" fill="#000000" opacity="0.12" />
    </g>
  );
}

export { Acacia, Baobab, Dhow, FanPalm, Gorilla, Monkey, Palm, RainTree } from './detailed';
