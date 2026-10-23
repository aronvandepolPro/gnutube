'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Mode } from '@/lib/route';

type Geo = {
  africa: { id: string; rings: number[][] }[];
  lakes: { rings: number[][] }[];
};

export type MapStop = {
  lat: number;
  lon: number;
  label: string;
  n: number;
  /** Voor het kaartje bij klikken */
  info?: { image: ReactNode; sub: string; when: string; href: string; more: string };
};
export type MapAirport = { lat: number; lon: number; label: string };

type Props = {
  stops: MapStop[];
  arrive: MapAirport;
  depart: MapAirport;
  /** Vervoer per stuk, in volgorde: aankomst→stop 1, …, laatste stop→vertrek. */
  modes: Mode[];
  /** Tekst bij elk stuk, bv. '176 km · ± 5 u' (zelfde volgorde als modes). */
  legLabels?: string[];
  /** Bij een vlucht tussen twee plekken: het vertrek- en aankomstvliegveld (eerst rijden, dan vliegen, dan rijden). */
  via?: ({ from: MapAirport; to: MapAirport } | null)[];
  className?: string;
  labels: { title: string; road: string; flightBoat: string; enlarge: string; close: string; airport: string; stop: string; source: string };
  /** Korte samenvatting onder de kaart, bv. '± 640 km rijden · ± 18 u · 2 vluchten'. */
  summary?: string;
};

const W = 400;
const H = 440;

/**
 * Kaart van Tanzania met de route: genummerde stops, de vliegvelden (✈) en lijnen ertussen
 * (doorgetrokken = weg, gestippeld = vlucht of boot). Getekend in SVG uit public/geo/globe.json (Natural Earth).
 */
export function RouteMap({ stops, arrive, depart, modes, legLabels = [], via = [], className = '', labels, summary }: Props) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [big, setBig] = useState(false);
  // Esc sluit de grote kaart
  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setBig(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [big]);
  useEffect(() => {
    let alive = true;
    fetch('/geo/globe.json')
      .then((r) => r.json())
      .then((g: Geo) => alive && setGeo(g))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Kader: rond alle punten (inzoomen als de reis klein is), minstens ±4 graden breed, plus marge
  const viaAirports = via.flatMap((v) => (v ? [v.from, v.to] : []));
  const pts = [arrive, depart, ...stops, ...viaAirports];
  const cLon = (Math.min(...pts.map((p) => p.lon)) + Math.max(...pts.map((p) => p.lon))) / 2;
  const cLat = (Math.min(...pts.map((p) => p.lat)) + Math.max(...pts.map((p) => p.lat))) / 2;
  const halfLon = Math.max(2, (Math.max(...pts.map((p) => p.lon)) - Math.min(...pts.map((p) => p.lon))) / 2 + 1.1);
  const halfLat = Math.max(2, (Math.max(...pts.map((p) => p.lat)) - Math.min(...pts.map((p) => p.lat))) / 2 + 0.9);
  let minLon = cLon - halfLon;
  let maxLon = cLon + halfLon;
  let minLat = cLat - halfLat;
  let maxLat = cLat + halfLat;
  const k = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  // Verhouding aanpassen aan W/H
  const spanX = (maxLon - minLon) * k;
  const spanY = maxLat - minLat;
  if (spanX / spanY > W / H) {
    const need = (spanX * H) / W - spanY;
    minLat -= need / 2;
    maxLat += need / 2;
  } else {
    const need = ((spanY * W) / H - spanX) / k;
    minLon -= need / 2;
    maxLon += need / 2;
  }
  const x = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * W;
  const y = (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * H;
  const path = (ring: number[]) => {
    let d = '';
    for (let i = 0; i < ring.length; i += 2) d += `${i ? 'L' : 'M'}${x(ring[i]).toFixed(1)} ${y(ring[i + 1]).toFixed(1)}`;
    return d + 'Z';
  };

  const chain = [arrive, ...stops, depart];

  // Namen plaatsen zonder overlap: probeer rechts, links, boven, onder de stip; kies de eerste vrije plek
  type Box = { x1: number; y1: number; x2: number; y2: number };
  const hit = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
  const taken: Box[] = [
    ...chain.map((p) => ({ x1: x(p.lon) - 13, y1: y(p.lat) - 13, x2: x(p.lon) + 13, y2: y(p.lat) + 13 })),
  ];
  const place = stops.map((st) => {
    const px = x(st.lon);
    const py = y(st.lat);
    const w = st.label.length * 7 + 4;
    const opts = [
      { dx: 16, dy: 4, anchor: 'start' as const, box: { x1: px + 14, y1: py - 8, x2: px + 16 + w, y2: py + 8 } },
      { dx: -16, dy: 4, anchor: 'end' as const, box: { x1: px - 16 - w, y1: py - 8, x2: px - 14, y2: py + 8 } },
      { dx: 0, dy: -18, anchor: 'middle' as const, box: { x1: px - w / 2, y1: py - 30, x2: px + w / 2, y2: py - 14 } },
      { dx: 0, dy: 28, anchor: 'middle' as const, box: { x1: px - w / 2, y1: py + 14, x2: px + w / 2, y2: py + 30 } },
    ];
    const inside = (b: Box) => b.x1 >= 2 && b.x2 <= W - 2 && b.y1 >= 2 && b.y2 <= H - 2;
    const best = opts.find((o) => inside(o.box) && !taken.some((t) => hit(t, o.box))) ?? opts.find((o) => inside(o.box)) ?? opts[0];
    taken.push(best.box);
    return best;
  });

  const figure = (large: boolean) => (
    <figure className={`relative m-0 overflow-hidden rounded-3xl border border-rule bg-[#CFE6F2] ${large ? '' : className}`}>
      <div className="relative">
      <button
        type="button"
        onClick={() => setBig(!large)}
        className="absolute right-3 top-3 z-10 flex min-h-10 items-center gap-1.5 rounded-full bg-white/95 px-3 text-[13px] font-semibold text-ink shadow"
      >
        {large ? `✕ ${labels.close}` : `⤢ ${labels.enlarge}`}
      </button>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={labels.title}>
        {/* Landen: buurlanden licht, Tanzania warm */}
        {geo?.africa.map((c) =>
          c.rings.map((r, i) => (
            <path key={`${c.id}-${i}`} d={path(r)} fill={c.id === 'tz' ? '#F6E7CF' : '#E9E3D6'} stroke="#FFFFFF" strokeWidth={c.id === 'tz' ? 1.5 : 0.8} />
          )),
        )}
        {geo?.lakes.map((l, i) => l.rings.map((r, j) => <path key={`l${i}-${j}`} d={path(r)} fill="#9CCBE3" />))}

        {/* Route */}
        {chain.slice(1).map((p, i) => {
          const a = chain[i];
          const m = modes[i] ?? 'road';
          const v = via[i];
          // Vlucht tussen twee plekken: rijden naar het vliegveld, vliegen, rijden naar de plek
          if (v) {
            const seg = (f: { lat: number; lon: number }, t: { lat: number; lon: number }, dash?: string, k?: string) => (
              <line key={k} x1={x(f.lon)} y1={y(f.lat)} x2={x(t.lon)} y2={y(t.lat)} stroke="#5A4030" strokeWidth={2.5} strokeLinecap="round" strokeDasharray={dash} />
            );
            return (
              <g key={`leg${i}`}>
                {seg(a, v.from, undefined, 'a')}
                {seg(v.from, v.to, '2 6', 'b')}
                {seg(v.to, p, undefined, 'c')}
              </g>
            );
          }
          return (
            <line
              key={`leg${i}`}
              x1={x(a.lon)}
              y1={y(a.lat)}
              x2={x(p.lon)}
              y2={y(p.lat)}
              stroke="#5A4030"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={m === 'road' ? undefined : '2 6'}
            />
          );
        })}

        {/* Afstand en tijd per stuk */}
        {legLabels.length > 0 &&
          chain.slice(1).map((p, i) => {
            const a = chain[i];
            const text = legLabels[i];
            if (!text) return null;
            const mx = (x(a.lon) + x(p.lon)) / 2;
            const my = (y(a.lat) + y(p.lat)) / 2;
            const len = Math.hypot(x(a.lon) - x(p.lon), y(a.lat) - y(p.lat));
            if (len < 46) return null; // te kort om leesbaar te labelen
            return (
              <text key={`ll${i}`} x={mx} y={my - 6} textAnchor="middle" fontSize="9.5" fontWeight={600} fill="#7A4A12" stroke="#FFFFFF" strokeWidth={3} paintOrder="stroke">
                {text}
              </text>
            );
          })}

        {/* Vliegvelden: klein vliegtuigje, code eronder (niet over de namen van de stops heen) */}
        {[arrive, depart, ...viaAirports]
          .filter((a, i, arr) => arr.findIndex((b) => b.label === a.label) === i)
          .map((a) => (
            <g key={a.label} transform={`translate(${x(a.lon)} ${y(a.lat)})`}>
              <circle r={9} fill="#F07F1E" stroke="#FFFFFF" strokeWidth={2} />
              <text textAnchor="middle" dy="3.5" fontSize="10" fill="#FFFFFF">✈</text>
              <text textAnchor="middle" y={22} fontSize="10" fontWeight={700} fill="#7A4A12" stroke="#FFFFFF" strokeWidth={3} paintOrder="stroke">
                {a.label}
              </text>
            </g>
          ))}

        {/* Stops */}
        {stops.map((s, i) => (
          <g
            key={s.n}
            transform={`translate(${x(s.lon)} ${y(s.lat)})`}
            className="cursor-pointer"
            onClick={() => setOpen(open === s.n ? null : s.n)}
            role="button"
            tabIndex={0}
            aria-label={`${s.n}. ${s.label}`}
            aria-expanded={open === s.n}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(open === s.n ? null : s.n);
              }
            }}
          >
            {open === s.n && <circle r={18} fill="#F07F1E" opacity={0.35} />}
            <circle r={12} fill={open === s.n ? '#F07F1E' : '#5A4030'} stroke="#FFFFFF" strokeWidth={2} />
            <text textAnchor="middle" dy="4" fontSize="12" fontWeight={700} fill="#FFFFFF">{s.n}</text>
            <text
              x={place[i].dx}
              textAnchor={place[i].anchor}
              dy={place[i].dy}
              fontSize="12"
              fontWeight={600}
              fill="#2A1F17"
              stroke="#FFFFFF"
              strokeWidth={3.5}
              paintOrder="stroke"
            >
              {s.label}
            </text>
          </g>
        ))}
      </svg>
      {/* Kaartje van de aangeklikte stop */}
      {(() => {
        const st = stops.find((q) => q.n === open);
        if (!st?.info) return null;
        const left = (x(st.lon) / W) * 100;
        const top = (y(st.lat) / H) * 100;
        const below = top < 45;
        return (
          <div
            className="absolute z-10 w-[230px] -translate-x-1/2 overflow-hidden rounded-2xl border border-rule bg-white shadow-xl"
            style={{
              left: `clamp(120px, ${left}%, calc(100% - 120px))`,
              ...(below ? { top: `calc(${top}% + 22px)` } : { bottom: `calc(${100 - top}% + 22px)` }),
            }}
            role="dialog"
            aria-label={st.label}
          >
            <div className="relative h-28 w-full">{st.info.image}</div>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[14px] shadow"
              aria-label="✕"
            >
              ✕
            </button>
            <div className="flex flex-col gap-0.5 p-3">
              <span className="text-[16px] font-semibold text-ink">
                {st.n}. {st.label}
              </span>
              <span className="text-[13px] text-muted">{st.info.sub}</span>
              <span className="text-[13px] text-subtle">{st.info.when}</span>
              <Link href={st.info.href} className="mt-1 text-[14px] font-semibold text-brand-dark hover:underline">
                {st.info.more} →
              </Link>
            </div>
          </div>
        );
      })()}
      </div>
      <figcaption className="flex flex-col gap-2 bg-white px-4 py-3 text-[12.5px] text-muted">
        {/* Legenda met echte voorbeelden van de lijnen en tekens op de kaart */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            <svg width="26" height="8" aria-hidden="true"><line x1="1" y1="4" x2="25" y2="4" stroke="#5A4030" strokeWidth="2.5" strokeLinecap="round" /></svg>
            {labels.road}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="26" height="8" aria-hidden="true"><line x1="1" y1="4" x2="25" y2="4" stroke="#5A4030" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 6" /></svg>
            {labels.flightBoat}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#F07F1E" stroke="#fff" strokeWidth="1.5" /><text x="8" y="11" textAnchor="middle" fontSize="8" fill="#fff">✈</text></svg>
            {labels.airport}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#5A4030" /><text x="8" y="11" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">1</text></svg>
            {labels.stop}
          </span>
        </div>
        {summary && <p className="m-0 font-semibold text-ink">{summary}</p>}
        <p className="m-0 text-[11.5px] text-subtle">{labels.source}</p>
      </figcaption>
    </figure>
  );

  return (
    <>
      {figure(false)}
      {big &&
        createPortal(
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setBig(false)}>
          <div className="w-[min(92vw,calc(88vh*0.88))] max-w-[900px]" role="dialog" aria-label={labels.title}>
            {figure(true)}
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
