/**
 * Gnoe-kop: de mascotte van Gnutube (zelf getekend, SVG), in een vlakke, vriendelijke stijl:
 * warmbruine vacht, grote U-vormige hoorns, grote oren, pluizige kuif en wangen, donkere bles naar de neus,
 * ronde ogen met grote lichtpuntjes. Kleuren passen bij de site (bruin/oranje).
 * Herbruikbaar (later bv. als logo). De class-namen kt-gnu-* zijn haakjes voor animaties (zie consent.css);
 * zonder die CSS staat hij gewoon stil.
 */
import type { ReactNode } from 'react';

type Props = {
  className?: string;
  /** Koekje in de bek (voor de cookie-vraag). */
  cookie?: boolean;
  /** Unieke naam voor de verlopen in de SVG, als hij vaker op één pagina staat. */
  id?: string;
  /**
   * Ook het lijf met pootjes tekenen (onder de kop). Gebruikt bij de sprong: na de landing valt het lijf
   * onder de schermrand en zie je alleen kop en schouders.
   */
  body?: boolean;
};

/** Hoogte van de tekening zonder en met lijf (viewBox-eenheden; breedte is 200). */
export const GNU_HEAD_H = 212;
export const GNU_BODY_H = 360;

/** Eén voorpoot (van voren gezien), draait vanaf de schouder bij het intrekken tijdens de sprong. */
function FrontLeg({ x, side }: { x: number; side: 'l' | 'r' }) {
  return (
    <g transform={`translate(${x} 282)`}>
      <g className={`kt-gnu-leg kt-gnu-leg-${side}`}>
        <path d="M-11 0 L11 0 L8.5 46 Q11 52 7.5 57 L6.5 66 L-6.5 66 L-7.5 57 Q-11 52 -8.5 46 Z" fill="#9C5427" />
        <ellipse cx="0" cy="51" rx="7.5" ry="4.5" fill="#B4672E" />
        <path d="M-7 64 L7 64 L8 74 L1 74 L0 70 L-1 74 L-8 74 Z" fill="#2B201D" />
      </g>
    </g>
  );
}

function Body() {
  return (
    <g className="kt-gnu-body">
      {/* Achterpoten (achter het lijf, iets donkerder) */}
      <g transform="translate(86 286)">
        <path d="M-8 0 L8 0 L6 58 L-6 58 Z" fill="#7A3F1C" />
        <path d="M-6 56 L6 56 L7 66 L-7 66 Z" fill="#241A17" />
      </g>
      <g transform="translate(114 286)">
        <path d="M-8 0 L8 0 L6 58 L-6 58 Z" fill="#7A3F1C" />
        <path d="M-6 56 L6 56 L7 66 L-7 66 Z" fill="#241A17" />
      </g>
      {/* Borst en schouders */}
      <path d="M36 232 C36 204 62 188 100 188 C138 188 164 204 164 232 C164 264 150 290 130 302 L70 302 C50 290 36 264 36 232 Z" fill="#8C4A21" />
      <path d="M66 228 C66 212 82 204 100 204 C118 204 134 212 134 228 C134 256 122 280 100 288 C78 280 66 256 66 228 Z" fill="#B4672E" opacity="0.6" />
      {/* Manen-plukjes langs de borst */}
      <path d="M92 212 L96 226 L100 214 L104 226 L108 212 L106 240 L100 232 L94 240 Z" fill="#6A3518" opacity="0.85" />
      <FrontLeg x={76} side="l" />
      <FrontLeg x={124} side="r" />
    </g>
  );
}

const COAT = '#B4672E';
const COAT_LIGHT = '#C98042';
const COAT_DARK = '#8C4A21';
const TUFT = '#6A3518';
const HORN = '#4B3934';
const HORN_LIGHT = '#7B6660';
const BLAZE = '#352927';
const NOSE = '#4A3631';
const INK = '#1C1513';

/** Linker helft van iets dat symmetrisch is; de rechter helft is gespiegeld. */
function Both({ children }: { children: ReactNode }) {
  return (
    <>
      <g>{children}</g>
      <g transform="translate(200 0) scale(-1 1)">{children}</g>
    </>
  );
}

export function GnuHead({ className, cookie = false, id = 'gnu', body = false }: Props) {
  return (
    <svg viewBox={`0 0 200 ${body ? GNU_BODY_H : GNU_HEAD_H}`} preserveAspectRatio="xMidYMax meet" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-horn`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A4640" />
          <stop offset="1" stopColor={HORN} />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.5" cy="0.3" r="0.7">
          <stop offset="0" stopColor={COAT_LIGHT} />
          <stop offset="0.7" stopColor={COAT} />
          <stop offset="1" stopColor={COAT_DARK} />
        </radialGradient>
        <radialGradient id={`${id}-cookie`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#E3A863" />
          <stop offset="1" stopColor="#B87334" />
        </radialGradient>
      </defs>

      {body && <Body />}

      {/* Hals tot de onderrand (bij het lijf loopt hij over in de schouders) */}
      <path d="M44 216 C50 194 66 178 84 168 L116 168 C134 178 150 194 156 216 Z" fill={COAT_DARK} />
      <path d="M70 216 C74 200 82 188 92 180 L108 180 C118 188 126 200 130 216 Z" fill={COAT} opacity="0.55" />

      <g className="kt-gnu-head">
        {/* Hoorns: breed uit de kop, opzij en dan omhoog met de punt naar binnen */}
        <Both>
          <path
            d="M82 66 C56 74 24 72 13 48 C7 33 19 16 38 10 C47 7 57 6 66 8 C59 12 47 17 39 25 C31 34 33 46 47 51 C60 55 72 53 86 50 Z"
            fill={`url(#${id}-horn)`}
          />
          <path d="M20 44 C17 31 27 19 44 13" stroke={HORN_LIGHT} strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.65" />
        </Both>

        {/* Oren: groot, opzij, lichte binnenkant met plukjes */}
        <g className="kt-gnu-ear kt-gnu-ear-l">
          <path d="M64 86 C50 69 22 69 4 80 C12 101 38 110 64 103 Z" fill={COAT_LIGHT} />
          <path d="M58 88 C48 78 28 78 16 85 C22 98 40 103 58 99 Z" fill="#DE9A5E" />
          <path d="M52 92 L44 88 L46 93 L36 90 L40 95 L30 93 L36 98 C44 99 50 97 52 92 Z" fill={COAT_DARK} />
        </g>
        <g className="kt-gnu-ear kt-gnu-ear-r">
          <path d="M136 86 C150 69 178 69 196 80 C188 101 162 110 136 103 Z" fill={COAT_LIGHT} />
          <path d="M142 88 C152 78 172 78 184 85 C178 98 160 103 142 99 Z" fill="#DE9A5E" />
          <path d="M148 92 L156 88 L154 93 L164 90 L160 95 L170 93 L164 98 C156 99 150 97 148 92 Z" fill={COAT_DARK} />
        </g>

        {/* Pluizige wangen (achter de kop) */}
        <Both>
          <path d="M60 106 L49 112 L59 117 L50 125 L61 129 L53 138 L65 140 L60 148 L72 148 Z" fill={COAT} />
        </Both>

        {/* Kop: breed bovenaan, smaller naar de neus */}
        <path
          d="M54 80 C54 59 76 47 100 47 C124 47 146 59 146 80 C146 104 138 124 130 140 C125 152 126 162 124 170 L76 170 C74 162 75 152 70 140 C62 124 54 104 54 80 Z"
          fill={`url(#${id}-face)`}
        />
        {/* Vachtvlakjes voor wat diepte */}
        <Both>
          <path d="M70 84 C74 76 82 72 90 72 C84 78 80 86 78 96 Z" fill={COAT_LIGHT} opacity="0.7" />
          <path d="M72 132 C76 142 78 152 78 160 L74 160 C72 150 70 140 72 132 Z" fill={COAT_DARK} opacity="0.5" />
        </Both>

        {/* Donkere bles: V-punt op het voorhoofd, breed naar de neus */}
        <path
          d="M91 80 L96 92 L100 84 L104 92 L109 80 C111 102 115 124 123 148 L77 148 C85 124 89 102 91 80 Z"
          fill={BLAZE}
        />
        <path d="M100 86 L97 98 L100 95 L103 98 Z" fill={COAT} opacity="0.85" />

        {/* Kuif */}
        <path
          d="M72 62 L68 50 L78 53 L76 38 L87 47 L91 30 L98 43 L104 27 L108 42 L117 31 L118 46 L129 40 L125 52 L134 53 L124 64 C108 57 90 57 72 62 Z"
          fill={TUFT}
        />
        <path d="M86 52 L90 40 M100 50 L103 36 M112 52 L117 41" stroke="#8C4F28" strokeWidth="2" strokeLinecap="round" />

        {/* Ogen: rond, met grote lichtpuntjes; wenkbrauwen; ooglid om te knipperen */}
        <g className="kt-gnu-eyes">
          <path d="M56 84 Q68 77 82 83" stroke={TUFT} strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <path d="M144 84 Q132 77 118 83" stroke={TUFT} strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <ellipse cx="70" cy="102" rx="12.5" ry="13.5" fill="#FFFFFF" stroke={INK} strokeWidth="2.6" />
          <ellipse cx="130" cy="102" rx="12.5" ry="13.5" fill="#FFFFFF" stroke={INK} strokeWidth="2.6" />
          <ellipse cx="72" cy="104" rx="7.5" ry="8.5" fill="#141A22" />
          <ellipse cx="128" cy="104" rx="7.5" ry="8.5" fill="#141A22" />
          <circle cx="75" cy="99.5" r="3.2" fill="#FFFFFF" />
          <circle cx="131" cy="99.5" r="3.2" fill="#FFFFFF" />
          <circle cx="69.5" cy="108" r="1.2" fill="#FFFFFF" opacity="0.8" />
          <circle cx="125.5" cy="108" r="1.2" fill="#FFFFFF" opacity="0.8" />
          <ellipse className="kt-gnu-lid" cx="70" cy="101" rx="13.8" ry="14.8" fill={COAT} />
          <ellipse className="kt-gnu-lid" cx="130" cy="101" rx="13.8" ry="14.8" fill={COAT} />
        </g>

        {/* Grote neus met glans en neusgaten */}
        <path d="M68 152 C68 137 83 130 100 130 C117 130 132 137 132 152 C132 170 119 182 100 182 C81 182 68 170 68 152 Z" fill={NOSE} />
        <ellipse cx="100" cy="139" rx="19" ry="5.5" fill="#6E5852" opacity="0.75" />
        <ellipse cx="85" cy="157" rx="7.5" ry="5.5" fill="#2A1D1A" transform="rotate(-18 85 157)" />
        <ellipse cx="115" cy="157" rx="7.5" ry="5.5" fill="#2A1D1A" transform="rotate(18 115 157)" />
        <path d="M90 174 Q100 179 110 174" stroke="#2A1D1A" strokeWidth="2.2" strokeLinecap="round" fill="none" />

        {/* Plukje baard onder de kin */}
        <g className="kt-gnu-beard">
          <path d="M82 178 L86 194 L92 185 L97 200 L100 188 L103 200 L108 185 L114 194 L118 178 C108 184 92 184 82 178 Z" fill={COAT_DARK} />
        </g>

        {/* Traantje (alleen bij 'Liever niet') */}
        <path
          className="kt-gnu-tear"
          d="M131 115 C128 121 126 125 128 129 C130 132.5 136 131 135.5 126 C135 122.5 133 119 131 115 Z"
          fill="#9AD8F5"
          stroke="#3E9BD0"
          strokeWidth="1.2"
        />

        {cookie && (
          <>
            <path className="kt-gnu-jaw" d="M90 177 Q100 186 110 177 Q107 188 100 188 Q93 188 90 177 Z" fill="#2E2220" />
            <g className="kt-gnu-cookie">
              <circle cx="124" cy="178" r="14.5" fill={`url(#${id}-cookie)`} stroke="#8E5424" strokeWidth="1.8" />
              <path d="M116 172 Q120 169 125 170" stroke="#F0C48A" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.8" />
              <circle cx="119" cy="176" r="2.2" fill={INK} />
              <circle cx="128" cy="175" r="2" fill={INK} />
              <circle cx="123" cy="184" r="1.9" fill={INK} />
              <circle cx="131" cy="183" r="1.5" fill={INK} />
            </g>
            <circle className="kt-gnu-crumb" cx="120" cy="197" r="2.2" fill="#B87334" />
            <circle className="kt-gnu-crumb kt-gnu-crumb-2" cx="128" cy="198" r="1.8" fill="#B87334" />
            <circle className="kt-gnu-crumb kt-gnu-crumb-3" cx="114" cy="196" r="1.9" fill="#9E5F28" />
          </>
        )}
      </g>
    </svg>
  );
}
