'use client';

import { useSyncExternalStore } from 'react';
import {
  Acacia, Baobab, Bush, Butterfly, Crocodile, DeadTree, Dhow, Egret, Elephant, FanPalm, Fern, Flamingo,
  Giraffe, Gorilla, Hippo, LilyPads, Lion, Meerkat, Monkey, Oryx, Palm, Papyrus, RainTree, Rocks,
  TermiteMound, Zebra,
} from './animals';
import { Dune, FarAcacia, FarPalm, Kilimanjaro, MistBand, Waves } from './detailed';

/**
 * Bewegende safariscène voor de homepage (op de plek van Prism's video), bij daglicht.
 * De camera volgt een safariauto door vijf biomen: savanne → moeras en rivier → woestijn →
 * regenwoud → kust, en dan naadloos weer de savanne in.
 *
 * Opbouw:
 * - Lucht met zon staat vast.
 * - Verre laag (bergen, duinen, vulkanen, lucht-tint) schuift op halve snelheid: diepte.
 * - Wereldlaag (heuvels, grond, rivier, zee, weg, dieren, voorgrond) schuift op volle snelheid.
 * - Landschap is doorlopend gegenereerd; kleuren en hoogtes lopen geleidelijk over tussen biomen.
 * Alleen eenvoudige rekenkunde en afronding, zodat server en browser exact hetzelfde tekenen.
 * Bij prefers-reduced-motion: stilstaand beeld.
 */

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const useMotion = () =>
  useSyncExternalStore(
    subscribe,
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );

// ── Rekenhulpen (zonder goniometrie) ──
const rnd = (i: number, salt = 1) => {
  let h = (Math.imul(i + 1, 374761393) + Math.imul(salt, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const r1 = (n: number) => Math.round(n * 10) / 10;
const ri = (n: number) => Math.round(n);
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Driehoeksgolf 0..1 met periode 2. */
const tri = (x: number) => 1 - Math.abs(mod(x, 2) - 1);
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Afgeronde heuvelgolf 0..1. */
const bump = (x: number) => smooth(tri(x));

// ── Wereld ──
const W = 1600;
export const BIOMES = ['savanna', 'wetland', 'desert', 'forest', 'coast'] as const;
export type Biome = (typeof BIOMES)[number];
const N = BIOMES.length;
const WORLD = W * N;
const SECONDS_PER_BIOME = 15;
const CYCLE = N * SECONDS_PER_BIOME;
const CAR_X = 640;
const ROAD_Y = 796;
/** Breedte van een overgang, als deel van een biome. */
const TZ = 0.3;

/** Mengverhouding op positie p (in biome-eenheden): [biome a, biome b, t]. */
function blendAt(p: number): [number, number, number] {
  const i = Math.floor(p);
  const f = p - i;
  const cur = mod(i, N);
  if (f < TZ / 2) return [mod(i - 1, N), cur, smooth(0.5 + f / TZ)];
  if (f > 1 - TZ / 2) return [cur, mod(i + 1, N), smooth((f - (1 - TZ / 2)) / TZ)];
  return [cur, cur, 0];
}
const mixN = (vals: number[], p: number) => {
  const [a, b, t] = blendAt(p);
  return vals[a] * (1 - t) + vals[b] * t;
};
/** Gewicht van één biome op positie p (0..1). */
const weightOf = (biome: number, p: number) => {
  const [a, b, t] = blendAt(p);
  return (a === biome ? 1 - t : 0) + (b === biome ? t : 0);
};

/** Kleurverloop over de breedte: vlakke kleur per biome, zachte overgang ertussen. */
function biomeStops(colors: string[], fromP: number, toP: number) {
  const stops: { o: number; c: string }[] = [];
  for (let i = Math.floor(fromP) - 1; i <= Math.ceil(toP) + 1; i++) {
    const c = colors[mod(i, N)];
    for (const f of [TZ / 2, 1 - TZ / 2]) {
      const o = (i + f - fromP) / (toP - fromP);
      if (o >= 0 && o <= 1) stops.push({ o: Math.round(o * 100000) / 100000, c });
    }
  }
  return stops;
}
function Grad({ id, colors, x1, x2, unit, shift = 0 }: { id: string; colors: string[]; x1: number; x2: number; unit: number; shift?: number }) {
  const stops = biomeStops(colors, (x1 - shift) / unit, (x2 - shift) / unit);
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1="0" x2={x2} y2="0">
      {stops.map((s, i) => (
        <stop key={i} offset={s.o} stopColor={s.c} />
      ))}
    </linearGradient>
  );
}

/** Pad van een horizonlijn (bovenrand) tot de onderkant. */
function ridge(from: number, to: number, step: number, y: (x: number) => number, bottom = 900) {
  let d = `M${from} ${bottom}`;
  for (let x = from; x <= to; x += step) d += ` L${x} ${ri(y(x))}`;
  return d + ` L${to} ${bottom} Z`;
}
/** Band tussen twee lijnen (boven heen, onder terug). */
function band(from: number, to: number, step: number, top: (x: number) => number, bot: (x: number) => number) {
  let d = '';
  for (let x = from; x <= to; x += step) d += `${d ? ' L' : 'M'}${x} ${r1(top(x))}`;
  for (let x = to; x >= from; x -= step) d += ` L${x} ${r1(bot(x))}`;
  return d + ' Z';
}

// ── Verre laag (halve snelheid). Positie u; biome p = (u − 400) / 800. ──
const FAR_FROM = -800;
const FAR_TO = 6400;
const farP = (u: number) => (u - 400) / 800;
const FAR_COLORS = ['#AFC4A6', '#A9C7A6', '#E4A86C', '#93B39C', '#AACBCB'];
const SKY_TINT = ['#AFD6EC', '#B5DCE8', '#F4DBB4', '#D6E6DA', '#A2D9EC'];
const farY = (u: number) =>
  mixN(
    [
      590 - 26 * bump(u / 520),
      598 - 8 * bump(u / 160),
      596 - 120 * Math.pow(tri(u / 360), 1.6),
      590 - 150 * bump(u / 620),
      604 - 10 * bump(u / 900),
    ],
    farP(u),
  );

// ── Wereldlaag (volle snelheid). Positie x; biome p = x / 1600. ──
const WORLD_FROM = -400;
const WORLD_TO = WORLD + W + 400;
const wp = (x: number) => x / W;
const HILL_COLORS = ['#C6C47E', '#97BC68', '#ECC488', '#739E5F', '#EEDDB2'];
const GROUND_COLORS = ['#BBBC6E', '#8CB35C', '#E9CA92', '#5F8B4D', '#F0DEB2'];
const TUFT_COLORS = ['#9E9A4C', '#6E9A44', '#C9A46A', '#4A7438', '#C9C07A'];
const hillY = (x: number) =>
  mixN(
    [
      638 - 16 * bump(x / 700),
      644 - 4 * bump(x / 260),
      634 - 40 * Math.pow(tri(x / 300), 1.4),
      632 - 26 * bump(x / 360),
      652,
    ],
    wp(x),
  );
const riverHalf = (x: number) => 34 * weightOf(1, wp(x));
const riverMid = (x: number) => 704 + 8 * tri(x / 260);
const seaDepth = (x: number) => 112 * weightOf(4, wp(x));

/** Voorgrond per biome, met menging in de overgangen. */
const FORE: string[][] = [
  ['#B9A24E', '#D2B66A', '#A8903F', '#C9AE5A', '#8E9A44'],
  ['#5E8A3A', '#6F9E44', '#4E7A32', '#7FAF4A', '#8DB85A'],
  ['#C9A46A', '#B48A52', '#D8B47A'],
  ['#3E6A34', '#4E7A3E', '#2F5A2A', '#5E8A44'],
  ['#A9B36A', '#C9C47A', '#93A05A'],
];
const DENSITY = [48, 54, 12, 50, 20];

function Foreground({ slot }: { slot: number }) {
  const blades: React.ReactNode[] = [];
  for (let i = 0; i < 70; i++) {
    const lx = rnd(i, slot * 7 + 3) * (W + 80) - 40;
    const x = slot * W + lx;
    const [a, b, t] = blendAt(wp(x));
    const bi = rnd(i, slot * 7 + 4) < t ? b : a;
    if (rnd(i, slot * 7 + 5) * 70 > DENSITY[bi]) continue;
    const short = bi === 2 || bi === 4;
    const h = (short ? 22 : 40) + rnd(i, slot * 7 + 6) * (bi === 3 ? 70 : short ? 40 : 90);
    const lean = (rnd(i, slot * 7 + 8) - 0.5) * 40;
    const c = FORE[bi][Math.floor(rnd(i, slot * 7 + 9) * FORE[bi].length)];
    const tipX = r1(lx + lean);
    const tipY = r1(905 - h);
    blades.push(
      <g key={i}>
        <path d={`M${r1(lx)} 905 Q ${r1(lx + lean * 0.2)} ${r1(905 - h * 0.6)} ${tipX} ${tipY}`} stroke={c} strokeWidth={r1(2.5 + rnd(i, slot * 7 + 10) * 3)} fill="none" strokeLinecap="round" />
        {bi === 0 && rnd(i, slot * 7 + 11) > 0.72 && <ellipse cx={tipX} cy={r1(tipY - 5)} rx="4" ry="11" fill="#EBDDAE" />}
      </g>,
    );
  }
  return <g transform={`translate(${slot * W} 0)`}>{blades}</g>;
}

/** Kleine graspollen en steentjes op de grond, voor textuur. */
function Tufts({ slot }: { slot: number }) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 56; i++) {
    const lx = rnd(i, slot * 13 + 1) * W;
    const x = slot * W + lx;
    const y = 668 + rnd(i, slot * 13 + 2) * 104;
    const [a, b, t] = blendAt(wp(x));
    const bi = rnd(i, slot * 13 + 3) < t ? b : a;
    if (bi === 1 && Math.abs(y - riverMid(x)) < riverHalf(x) + 6) continue; // niet in de rivier
    if (bi === 4 && y < 600 + seaDepth(x) + 4) continue; // niet in de zee
    const c = TUFT_COLORS[bi];
    out.push(
      <path key={i} d={`M${r1(lx - 6)} ${r1(y)} l 4 -9 l 2 9 l 3 -11 l 2 11 l 4 -7`} stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    );
  }
  return <g transform={`translate(${slot * W} 0)`}>{out}</g>;
}

/** Bewoners en planten per biome (lokale coördinaten binnen een biome van 1600 breed). */
function Life({ biome, slot }: { biome: number; slot: number }) {
  const u = (s: string) => `${s}-${slot}`;
  return (
    <g transform={`translate(${slot * W} 0)`}>
      {biome === 0 && (
        <>
          <Acacia x={260} y={660} s={1.05} />
          <Baobab x={1190} y={662} s={0.95} />
          <Acacia x={1420} y={650} s={0.7} flip />
          <TermiteMound x={760} y={690} s={0.8} />
          <Giraffe x={360} y={690} s={0.42} uid={u('g1')} className="kt-sway-slow" />
          <Giraffe x={450} y={698} s={0.34} flip uid={u('g2')} />
          <Elephant x={900} y={738} s={0.58} />
          <Elephant x={1030} y={742} s={0.36} />
          <Zebra x={1300} y={730} s={0.42} uid={u('z1')} />
          <Zebra x={1370} y={736} s={0.38} flip uid={u('z2')} />
          <Lion x={560} y={776} s={0.42} />
          <Lion x={660} y={779} s={0.38} mane={false} />
          <Bush x={120} y={712} s={0.9} color="#8E9A4C" />
          <Bush x={1520} y={716} s={0.7} color="#8E9A4C" />
          {/* overgang naar moeras: waaierpalmen */}
          <FanPalm x={1560} y={686} s={0.75} />
        </>
      )}
      {biome === 1 && (
        <>
          <FanPalm x={150} y={680} s={0.85} />
          <FanPalm x={1250} y={674} s={0.7} />
          <Papyrus x={330} y={676} s={0.95} />
          <Papyrus x={900} y={672} s={0.85} />
          <Papyrus x={1420} y={678} s={1} />
          <LilyPads x={600} y={712} s={1.1} />
          <LilyPads x={1110} y={698} s={0.9} />
          <Hippo x={460} y={716} s={0.5} className="kt-bob" />
          <Hippo x={560} y={726} s={0.38} flip className="kt-bob kt-bob-2" />
          <Hippo x={1000} y={712} s={0.46} className="kt-bob kt-bob-3" />
          <Crocodile x={760} y={770} s={0.42} />
          <Egret x={260} y={774} s={0.62} />
          <Egret x={1300} y={772} s={0.7} />
          <Egret x={1340} y={770} s={0.55} flip />
          {/* overgang naar woestijn: droge acacia en rotsen */}
          <Acacia x={1560} y={668} s={0.6} flip />
          <Rocks x={1500} y={720} s={0.8} color="#B49A74" />
        </>
      )}
      {biome === 2 && (
        <>
          <Dune x={20} y={712} w={460} h={58} />
          <Dune x={860} y={706} w={560} h={76} />
          <Rocks x={140} y={716} s={0.9} color="#C29A68" />
          <DeadTree x={330} y={732} s={0.9} />
          <DeadTree x={1240} y={724} s={0.75} flip />
          <Oryx x={640} y={738} s={0.5} uid={u('o1')} />
          <Oryx x={780} y={744} s={0.44} flip uid={u('o2')} />
          <Oryx x={1060} y={734} s={0.4} uid={u('o3')} />
          <g className="kt-peek">
            <Meerkat x={470} y={782} s={0.9} />
            <Meerkat x={492} y={784} s={0.8} />
            <Meerkat x={514} y={782} s={0.85} flip />
          </g>
          {/* overgang naar regenwoud: rotsen en eerste struiken */}
          <Rocks x={1450} y={712} s={1.1} color="#9C8C76" />
          <Bush x={1560} y={720} s={0.8} color="#6F9A50" />
        </>
      )}
      {biome === 3 && (
        <>
          <RainTree x={110} y={720} s={0.82} />
          <RainTree x={420} y={706} s={0.62} />
          <RainTree x={1020} y={722} s={0.88} />
          <RainTree x={1380} y={712} s={0.7} />
          <Monkey x={1078} y={536} s={0.85} />
          <Gorilla x={760} y={782} s={0.52} />
          <Fern x={280} y={760} s={1} />
          <Fern x={590} y={764} s={0.9} flip />
          <Fern x={1220} y={762} s={1.1} />
          <Butterfly x={320} y={580} s={1.2} color="#F2A43A" className="kt-flutter" />
          <Butterfly x={640} y={540} s={1} color="#4FA3E0" className="kt-flutter kt-flutter-2" />
          <Butterfly x={1240} y={600} s={1.1} color="#E25A8C" className="kt-flutter kt-flutter-3" />
          <Bush x={860} y={748} s={1.1} color="#3E6A34" />
          {/* overgang naar kust: eerste palmen */}
          <Palm x={1540} y={760} s={0.8} />
        </>
      )}
      {biome === 4 && (
        <>
          <Palm x={120} y={770} s={1} />
          <Palm x={240} y={776} s={0.8} flip />
          <Waves x={120} y={612} w={1360} />
          <Dhow x={860} y={652} s={0.5} className="kt-bob" />
          <Flamingo x={460} y={706} s={0.62} />
          <Flamingo x={500} y={709} s={0.56} flip />
          <Flamingo x={540} y={705} s={0.6} />
          <Rocks x={700} y={712} s={0.7} color="#A8998A" />
          <Palm x={1300} y={772} s={1} flip />
          {/* overgang naar savanne: struiken */}
          <Bush x={1520} y={716} s={0.8} color="#9AA25A" />
        </>
      )}
    </g>
  );
}

/** Kenmerkende verre vormen per biome (verre laag, lokale coördinaten binnen 800 breed). */
function FarFeature({ biome, slot }: { biome: number; slot: number }) {
  const x0 = slot * 800 + 400;
  return (
    <g transform={`translate(${x0} 0)`}>
      {biome === 0 && (
        <g>
          <Kilimanjaro x={430} y={604} s={0.95} className="kt-drift" />
          <FarAcacia x={40} y={592} s={1} />
          <FarAcacia x={110} y={590} s={0.8} />
          <FarAcacia x={720} y={591} s={0.9} />
          <FarAcacia x={790} y={593} s={0.7} />
        </g>
      )}
      {biome === 1 && (
        <g>
          {[60, 140, 260, 420, 560, 700].map((px, i) => (
            <FarPalm key={px} x={px} y={598} s={0.7 + (i % 3) * 0.15} />
          ))}
        </g>
      )}
      {biome === 2 && (
        // tafelberg in de verte
        <path d="M120 600 L 170 520 L 330 516 L 380 600 Z" fill="#D9A274" opacity="0.8" />
      )}
      {biome === 3 && (
        <g>
          {/* rookpluim van een vulkaan en mistbanken */}
          <g fill="#FFFFFF" opacity="0.55">
            <ellipse cx="410" cy="420" rx="40" ry="16" />
            <ellipse cx="440" cy="396" rx="34" ry="14" />
            <ellipse cx="470" cy="372" rx="28" ry="12" />
          </g>
          <MistBand x={0} y={500} w={800} className="kt-drift" />
          <MistBand x={-200} y={560} w={900} />
        </g>
      )}
      {biome === 4 && (
        // eilandjes met palmen
        <g>
          <g fill="#8FB09A">
            <path d="M260 604 C 300 580 360 578 400 604 Z" />
            <path d="M560 606 C 580 594 610 592 630 606 Z" />
          </g>
          <path d="M290 596 C 300 586 320 584 330 590 C 340 582 360 584 368 596 Z" fill="#7E9E86" />
        </g>
      )}
    </g>
  );
}

/**
 * Safariauto in zijaanzicht (rijdt naar rechts), getekend naar het type Land Cruiser-safariwagen:
 * lange kakikleurige carrosserie met donkergroene band onderlangs, donkergroene dakrand en raamlijsten,
 * opklapdak op schuine steunen, snorkel langs de voorruitstijl, bullbar, antenne, reservewiel achterop
 * en lichte stalen velgen. Zonder merknamen, logo's of inzittenden.
 * Getekend in een eigen assenstelsel (≈ 880 breed); de buitenste groep zet de onderkant van de
 * wielen op y = 0 en het midden op x = 0.
 */
function SafariCar({ motion }: { motion: boolean }) {
  const tan = '#D6B47C';
  const tanShade = '#BF9C62';
  const tanLight = '#E6CB95';
  const green = '#1F3A2E';
  const black = '#1A1A1A';
  const glass = '#4A5A58';

  const wheel = (cx: number) => (
    <g transform={`translate(${cx} 375)`}>
      <circle r="53" fill="#141414" />
      <circle r="47" fill="none" stroke="#2C2C2C" strokeWidth="7" strokeDasharray="5 5" />
      <circle r="31" fill="#ECEAE3" />
      <g>
        <circle r="23" fill="none" stroke="#C9C5BA" strokeWidth="2" />
        {[[15, 0], [7.5, 13], [-7.5, 13], [-15, 0], [-7.5, -13], [7.5, -13]].map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r="3.4" fill="#9A968C" />
        ))}
        <circle r="7" fill="#BDB8AC" />
        {motion && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.9s" repeatCount="indefinite" />}
      </g>
    </g>
  );

  return (
    <g transform="translate(-515 -428)">
      {/* Stof achter de auto */}
      <g fill="#E3CFA6">
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={40 - i * 70} cy={395 - i * 14} r={26 + i * 16} opacity={r1(0.5 - i * 0.08)}>
            {motion && (
              <>
                <animate attributeName="r" values={`${20 + i * 12};${42 + i * 22};${20 + i * 12}`} dur={`${1.3 + i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values={`${r1(0.5 - i * 0.08)};${r1(0.18 - i * 0.03)};${r1(0.5 - i * 0.08)}`} dur={`${1.3 + i * 0.3}s`} repeatCount="indefinite" />
              </>
            )}
          </circle>
        ))}
      </g>

      {/* Reservewiel op de achterdeur, van opzij gezien: een smalle, hoge band (zoals op de foto) */}
      <rect x="120" y="226" width="20" height="116" rx="4" fill="#3A3A3A" />
      <rect x="96" y="222" width="34" height="124" rx="15" fill="#141414" />
      <g stroke="#2E2E2E" strokeWidth="3">
        {[236, 250, 264, 278, 292, 306, 320, 334].map((yy) => (
          <line key={yy} x1="99" y1={yy} x2="127" y2={yy} />
        ))}
      </g>
      <rect x="126" y="270" width="12" height="26" rx="3" fill="#2A2A2A" />

      {/* Opklapdak op schuine steunen */}
      <g stroke={green} strokeWidth="7" strokeLinecap="round">
        <line x1="300" y1="134" x2="322" y2="74" />
        <line x1="352" y1="134" x2="330" y2="74" />
        <line x1="512" y1="134" x2="548" y2="74" />
        <line x1="560" y1="134" x2="556" y2="74" />
      </g>
      <rect x="278" y="54" width="324" height="18" rx="5" fill={tan} />
      <rect x="278" y="68" width="324" height="5" fill={tanShade} />

      {/* Carrosserie met wielkasten */}
      <path
        d="M135 146 Q 135 138 143 138 L 668 138 L 688 150 L 766 260 L 898 262 Q 912 264 912 278 L 912 362 L 888 362 A 58 58 0 0 0 772 362 L 393 362 A 58 58 0 0 0 277 362 L 135 362 Z"
        fill={tan}
      />
      {/* Licht en schaduw */}
      <path d="M140 150 L 664 150 L 672 158 L 140 158 Z" fill={tanLight} opacity="0.7" />
      <rect x="135" y="318" width="777" height="17" fill={tanShade} opacity="0.55" />
      <path d="M770 262 L 898 264 L 900 272 L 774 270 Z" fill={tanLight} opacity="0.6" />

      {/* Donkergroene band onderlangs en wielkastranden */}
      <path d="M135 335 L 912 335 L 912 362 L 888 362 A 58 58 0 0 0 772 362 L 393 362 A 58 58 0 0 0 277 362 L 135 362 Z" fill={green} />
      <path d="M888 362 A 58 58 0 0 0 772 362" fill="none" stroke={green} strokeWidth="10" />
      <path d="M393 362 A 58 58 0 0 0 277 362" fill="none" stroke={green} strokeWidth="10" />

      {/* Dakrand en rek boven de voorruit */}
      <path d="M135 146 Q 135 136 145 136 L 668 136 L 690 150 L 135 150 Z" fill={green} />
      <rect x="610" y="128" width="84" height="8" rx="2" fill={black} />
      <rect x="270" y="130" width="340" height="6" fill={green} />

      {/* Ramen met donkergroene lijsten */}
      <rect x="165" y="160" width="250" height="104" rx="7" fill={green} />
      <rect x="173" y="168" width="234" height="88" rx="4" fill={glass} />
      <rect x="288" y="168" width="5" height="88" fill={green} />
      <rect x="435" y="164" width="110" height="100" rx="7" fill={green} />
      <rect x="443" y="172" width="94" height="84" rx="4" fill={glass} />
      <path d="M582 166 L 682 166 L 742 256 L 582 256 Z" fill={green} />
      <path d="M590 174 L 676 174 L 728 248 L 590 248 Z" fill={glass} />
      <rect x="640" y="174" width="4" height="74" fill={green} />
      {/* Weerspiegeling */}
      <g fill="#FFFFFF" opacity="0.16">
        <path d="M180 168 L 218 168 L 180 230 Z" />
        <path d="M300 168 L 330 168 L 300 218 Z" />
        <path d="M450 172 L 478 172 L 450 214 Z" />
        <path d="M598 174 L 624 174 L 598 212 Z" />
      </g>

      {/* Deurnaden, handgrepen, scharnieren */}
      <g stroke={tanShade} strokeWidth="2.5" fill="none">
        <line x1="425" y1="152" x2="425" y2="335" />
        <line x1="572" y1="152" x2="572" y2="335" />
        <path d="M748 262 L 760 335" />
      </g>
      <rect x="448" y="280" width="20" height="6" rx="3" fill={black} />
      <rect x="596" y="280" width="20" height="6" rx="3" fill={black} />
      <rect x="431" y="190" width="6" height="14" fill={tanShade} />
      <rect x="431" y="290" width="6" height="14" fill={tanShade} />

      {/* Spiegel */}
      <path d="M730 248 L 752 248 L 752 268 L 736 268 Z" fill={black} />
      <line x1="742" y1="258" x2="754" y2="262" stroke={black} strokeWidth="3" />

      {/* Snorkel langs de voorruitstijl */}
      <path d="M842 304 L 842 270 L 704 166" stroke={black} strokeWidth="13" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="688" y="150" width="22" height="20" rx="4" fill={black} />

      {/* Voorkant: grille, koplamp, bullbar, bumper, antenne */}
      <rect x="902" y="268" width="10" height="64" fill="#2A2A2A" />
      <circle cx="904" cy="290" r="11" fill={black} />
      <circle cx="904" cy="290" r="7" fill="#F4EBC8" />
      <g stroke={black} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M912 268 L 940 268 L 950 360" />
        <line x1="914" y1="304" x2="944" y2="304" />
      </g>
      <rect x="896" y="350" width="60" height="20" rx="4" fill={black} />
      <line x1="926" y1="268" x2="938" y2="140" stroke="#333333" strokeWidth="2.5" />

      {/* Achterbumper, achterlicht, treeplank */}
      <rect x="124" y="348" width="24" height="18" rx="3" fill={black} />
      <rect x="135" y="292" width="7" height="22" fill="#C8382A" />
      <rect x="400" y="366" width="372" height="9" rx="3" fill="#232323" />

      {wheel(335)}
      {wheel(830)}
    </g>
  );
}


type Labels = Record<Biome, string>;

/** Vertraging (negatief) zodat het label van biome i zichtbaar is terwijl de auto erdoor rijdt. */
function labelDelay(i: number) {
  const start = (i * W - CAR_X) / WORLD;
  const frac = ((start % 1) + 1) % 1;
  return -(1 - frac) * CYCLE;
}

export function SafariScene({ labels, className = 'absolute inset-0 h-full w-full' }: { labels?: Labels; className?: string }) {
  const motion = useMotion();
  const worldSlots = motion ? [-1, 0, 1, 2, 3, 4, 5] : [-1, 0, 1];
  const farSlots = [-2, -1, 0, 1, 2, 3, 4, 5, 6];

  return (
    <>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="kt-day-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9FCDE8" />
            <stop offset="0.65" stopColor="#D9ECF3" />
            <stop offset="1" stopColor="#F3F2E6" />
          </linearGradient>
          <linearGradient id="kt-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="kt-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFFBEA" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#FFF4CF" stopOpacity="0.5" />
            <stop offset="1" stopColor="#FFF4CF" stopOpacity="0" />
          </radialGradient>
          <Grad id="kt-sky-tint" colors={SKY_TINT} x1={FAR_FROM} x2={FAR_TO} unit={800} shift={400} />
          <Grad id="kt-far" colors={FAR_COLORS} x1={FAR_FROM} x2={FAR_TO} unit={800} shift={400} />
          <Grad id="kt-hill" colors={HILL_COLORS} x1={WORLD_FROM} x2={WORLD_TO} unit={W} />
          <Grad id="kt-ground" colors={GROUND_COLORS} x1={WORLD_FROM} x2={WORLD_TO} unit={W} />
        </defs>

        {/* Vaste lucht met zon */}
        <rect width="1600" height="900" fill="url(#kt-day-sky)" />
        <circle cx="1270" cy="150" r="220" fill="url(#kt-sun)" />

        {/* Verre laag: halve snelheid */}
        <g className={motion ? 'kt-far' : undefined} style={motion ? { animationDuration: `${CYCLE}s` } : undefined}>
          <rect x={FAR_FROM} y={0} width={FAR_TO - FAR_FROM} height={640} fill="url(#kt-sky-tint)" opacity="0.6" />
          {farSlots.map((sl) => (
            <FarFeature key={sl} biome={mod(sl, N)} slot={sl} />
          ))}
          <path d={ridge(FAR_FROM, FAR_TO, 16, farY)} fill="url(#kt-far)" />
          <rect x={FAR_FROM} y={420} width={FAR_TO - FAR_FROM} height={220} fill="url(#kt-haze)" />
        </g>

        {/* Wereldlaag: volle snelheid */}
        <g className={motion ? 'kt-world' : undefined} style={motion ? { animationDuration: `${CYCLE}s` } : undefined}>
          <path d={ridge(WORLD_FROM, WORLD_TO, 20, hillY)} fill="url(#kt-hill)" />
          <rect x={WORLD_FROM} y={668} width={WORLD_TO - WORLD_FROM} height={232} fill="url(#kt-ground)" />
          {/* Zee aan de kust: komt geleidelijk op en verdwijnt weer */}
          <path d={band(WORLD_FROM, WORLD_TO, 20, () => 600, (x) => 600 + seaDepth(x))} fill="#4DBFC9" />
          <path d={band(WORLD_FROM, WORLD_TO, 20, (x) => 600 + seaDepth(x) * 0.72, (x) => 600 + seaDepth(x))} fill="#8FDCD5" />
          <path d={band(WORLD_FROM, WORLD_TO, 20, (x) => 600 + Math.max(0, seaDepth(x) - 2), (x) => 600 + seaDepth(x) + (seaDepth(x) > 2 ? 3 : 0))} fill="#F4FBFA" />
          {/* Rivier in het moeras: begint als stroompje, wordt breed, en wordt weer smal */}
          <path d={band(WORLD_FROM, WORLD_TO, 20, (x) => riverMid(x) - riverHalf(x) - (riverHalf(x) > 0.5 ? 4 : 0), (x) => riverMid(x) + riverHalf(x) + (riverHalf(x) > 0.5 ? 4 : 0))} fill="#7FA35A" />
          <path d={band(WORLD_FROM, WORLD_TO, 20, (x) => riverMid(x) - riverHalf(x), (x) => riverMid(x) + riverHalf(x))} fill="#72B8C5" />
          <path d={band(WORLD_FROM, WORLD_TO, 20, (x) => riverMid(x) - riverHalf(x) * 0.25, (x) => riverMid(x) + riverHalf(x) * 0.05)} fill="#9AD0DA" opacity="0.7" />
          {worldSlots.map((sl) => (
            <Tufts key={`t${sl}`} slot={sl} />
          ))}
          {worldSlots.map((sl) => (
            <Life key={`l${sl}`} biome={mod(sl, N)} slot={sl} />
          ))}
          {/* Zandweg met bandensporen */}
          <rect x={WORLD_FROM} y={ROAD_Y - 18} width={WORLD_TO - WORLD_FROM} height={36} fill="#D8BE8C" />
          <rect x={WORLD_FROM} y={ROAD_Y - 18} width={WORLD_TO - WORLD_FROM} height={4} fill="#C9AE7C" />
          <g stroke="#C4A672" strokeWidth="3" strokeDasharray="26 30" opacity="0.8">
            <line x1={WORLD_FROM} y1={ROAD_Y - 6} x2={WORLD_TO} y2={ROAD_Y - 6} />
            <line x1={WORLD_FROM} y1={ROAD_Y + 9} x2={WORLD_TO} y2={ROAD_Y + 9} />
          </g>
          {worldSlots.map((sl) => (
            <Foreground key={`f${sl}`} slot={sl} />
          ))}
        </g>

        {/* De auto blijft in beeld; de camera volgt hem */}
        <g transform={`translate(${CAR_X} ${ROAD_Y + 2}) scale(0.36)`}>
          <g className={motion ? 'kt-bounce' : undefined}>
            <SafariCar motion={motion} />
          </g>
        </g>
      </svg>

      {/* Naam van het biome waar de auto doorheen rijdt */}
      {labels && (
        <div className="pointer-events-none absolute bottom-8 left-4 sm:left-8" aria-hidden="true">
          {(motion ? BIOMES : (['savanna'] as const)).map((b, i) => (
            <span
              key={b}
              className={`absolute bottom-0 left-0 flex items-center gap-2 whitespace-nowrap rounded-full border border-white/40 bg-white/55 px-4 py-2 text-[13px] font-medium text-black backdrop-blur-md ${motion ? 'kt-biome-label' : ''}`}
              style={motion ? { animationDuration: `${CYCLE}s`, animationDelay: `${labelDelay(i)}s` } : undefined}
            >
              <span className="text-black/45">{String(i + 1).padStart(2, '0')}</span>
              {labels[b]}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
