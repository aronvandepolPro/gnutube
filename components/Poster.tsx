import type { Kind } from '@/lib/data';

/**
 * Reisaffiche in vintage stijl: plaatsvervanger zolang er geen echte foto of video is.
 * Overgenomen uit het prototype; elke plek krijgt een vaste variant op basis van zijn id.
 */
const PAL: Record<'safari' | 'beach' | 'nature' | 'culture', string[][]> = {
  safari: [
    ['#F1C98A', '#FBEBCB', '#E0A55C', '#C2773F', '#6B4128', '#2B1A10'],
    ['#E7A274', '#F8DCC0', '#C9724D', '#9B4E35', '#4E2A1E', '#1F120C'],
  ],
  beach: [
    ['#A9DCD6', '#FFF6DE', '#6CC0BA', '#2F8E95', '#EBD9B4', '#1E4E52'],
    ['#F2C7A8', '#FFF1DA', '#86C6C8', '#3C8C99', '#E8D3A9', '#23495A'],
  ],
  nature: [
    ['#C9DACE', '#F4EFDE', '#93B3A1', '#5E8571', '#35574A', '#18291F'],
    ['#B8C9D9', '#F1EEE4', '#8BA4B8', '#58758C', '#2F4757', '#152330'],
  ],
  culture: [
    ['#EED3B6', '#FAEEDF', '#D49A70', '#B06A45', '#743F29', '#2D1A11'],
    ['#E6C9C1', '#F8EDE8', '#C98C7E', '#A35F52', '#6B3A33', '#2A1714'],
  ],
};

export function hash(key: string) {
  let h = 0;
  for (let j = 0; j < key.length; j++) h = (h * 31 + key.charCodeAt(j)) % 9973;
  return h;
}

type Props = {
  id: string;
  kind: Kind;
  mountain?: boolean;
  hasWater?: boolean;
  className?: string;
};

/** Nieuwe soorten gebruiken de scène van de verwante soort (eiland/strand → zee, bergen → natuur, stad → cultuur). */
const SCENE: Record<Kind, 'safari' | 'beach' | 'nature' | 'culture'> = {
  safari: 'safari',
  island: 'beach',
  beach: 'beach',
  lake: 'nature',
  nature: 'nature',
  mountain: 'nature',
  culture: 'culture',
  city: 'culture',
};

export function Poster({ id, kind: rawKind, mountain, hasWater, className }: Props) {
  const kind = SCENE[rawKind];
  const h = hash(id);
  const [c0, c1, c2, c3, c4, c5] = PAL[kind][h % 2];
  const a = 18 + ((h * 7) % 40);
  const b = (h * 13) % 26;
  const sunX = 70 + ((h * 37) % 160);
  const silX = 60 + ((h * 53) % 180);
  // Meren: water op de voorgrond in plaats van een berg (tenzij de plek zelf bergachtig is)
  const isLake = rawKind === 'lake';
  const showMtn = (kind === 'nature' && !isLake) || mountain;
  const showSea = isLake || (kind !== 'beach' && hasWater);

  return (
    <svg
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="300" height="400" fill={c0} />
      <circle className="kt-sun" cx={sunX} cy="150" r="62" fill={c1} />
      <path d={`M0 250 Q 80 ${250 - a} 160 245 T 300 238 L300 400 L0 400 Z`} fill={c2} />
      {showMtn && (
        <g>
          <path d="M30 300 L150 112 L192 176 L218 154 L300 300 Z" fill={c3} />
          <path d="M129 145 L150 112 L173 148 L161 143 L150 154 L140 143 Z" fill={c1} />
        </g>
      )}
      <path d={`M0 292 Q 110 ${286 - b} 200 290 T 300 284 L300 400 L0 400 Z`} fill={c3} />
      {showSea && <rect y="300" width="300" height="20" fill={c2} />}
      <path d="M0 332 Q 130 320 220 332 T 300 328 L300 400 L0 400 Z" fill={c4} />
      <g transform={`translate(${silX} 0)`} fill={c5}>
        {kind === 'safari' && (
          <g>
            <rect x="-3" y="270" width="6" height="64" />
            <path d="M0 282 L-26 256 L-22 252 L0 276 Z" />
            <path d="M0 288 L24 252 L28 255 L2 292 Z" />
            <ellipse cx="0" cy="250" rx="66" ry="13" />
            <ellipse cx="-10" cy="241" rx="42" ry="9" />
          </g>
        )}
        {kind === 'beach' && (
          <g>
            <path d="M-3 334 Q 6 292 -1 244 L 5 244 Q 12 292 3 334 Z" />
            <path d="M2 244 Q -30 226 -64 244 Q -30 234 2 249 Z" />
            <path d="M2 244 Q 32 224 66 238 Q 32 232 2 249 Z" />
            <path d="M2 244 Q -14 212 -42 202 Q -12 220 0 247 Z" />
            <path d="M2 244 Q 18 212 48 206 Q 16 222 3 247 Z" />
          </g>
        )}
        {kind === 'culture' && (
          <g>
            <rect x="-70" y="282" width="28" height="52" />
            <rect x="-38" y="258" width="22" height="76" />
            <rect x="-12" y="290" width="34" height="44" />
            <path d="M28 334 V294 a16 16 0 0 1 32 0 V334 Z" />
            <rect x="66" y="248" width="8" height="86" />
          </g>
        )}
      </g>
      <rect x="10" y="10" width="280" height="380" fill="none" stroke={c1} strokeWidth="2" opacity="0.85" />
    </svg>
  );
}
