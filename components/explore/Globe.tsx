'use client';

import { useEffect, useRef } from 'react';
import type { Locale } from '@/lib/i18n/config';

export type GlobePoint = { lat: number; lon: number; color: string; on: boolean; name: string };

type Props = {
  points: GlobePoint[];
  /** Is er een selectie actief (land, regio of soort reis)? Dan worden plekken buiten de selectie gedimd. */
  filtered: boolean;
  /** Landcodes (iso2, kleine letters) waar de bol naartoe draait en op inzoomt. */
  selected: string[];
  /** Landnamen in de huidige taal. */
  names: Record<string, string>;
  locale: Locale;
  /** Kader [west, zuid, oost, noord] om naartoe te draaien en op in te zoomen, bv. een gebied binnen een land. Gaat vóór `selected`. */
  focusBox?: [number, number, number, number] | null;
  /** Ruimte links (in px) die vrij moet blijven, bv. voor het feitenpaneel. */
  padLeft?: number;
  /** 'stage' = achter de zoekbalk op de homepage (bol laag in beeld); 'panel' = in een eigen kader, gecentreerd. */
  frame?: 'stage' | 'panel';
  className?: string;
};

type Names = Partial<Record<Locale, string>> & { en: string };
/** Uit public/geo/globe.json (gemaakt door scripts/build-globe-geo.mjs uit Natural Earth). */
type Geo = {
  africa: { id: string; rings: number[][]; label: [number, number]; bbox: [number, number, number, number] }[];
  world: number[][];
  lakes: { name: Names; rings: number[][]; label: [number, number]; area: number }[];
  rivers: { rank: number; lines: number[][] }[];
};

let geoCache: Promise<Geo> | null = null;
const loadGeo = () => (geoCache ??= fetch('/geo/globe.json').then((r) => r.json() as Promise<Geo>));

const D = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const MAX_ZOOM = 16;

/**
 * Lichte benadering van de grote landschappen, alleen gebruikt als kleurtint binnen de echte landgrenzen
 * (lengte, breedte, straal in graden, kleur).
 */
const TINT: [number, number, number, string][] = [
  [8, 24, 22, '#D9BC86'], // Sahara
  [24, 24, 14, '#DEC290'],
  [30, 22, 8, '#D4B47E'],
  [5, 14, 14, '#B8A86A'], // Sahel
  [24, 13, 12, '#AFA265'],
  [22, 0, 13, '#3D6B3E'], // Kongobekken
  [12, 3, 7, '#447346'],
  [36, 0, 8, '#6F8F55'], // Oost-Afrikaanse hoogvlakte
  [39, 9, 6, '#7F8556'], // Ethiopische hooglanden
  [21, -23, 10, '#BE9D6C'], // Kalahari
  [15, -24, 6, '#C99D6D'], // Namib
  [28, -14, 10, '#788F57'], // miombo
  [-4, 32, 5, '#9C8A62'], // Atlas
];

/** Eilandstaten die op de hele bol te klein zijn om te zien zonder ringetje. */
const ISLANDS = new Set(['km', 'cv', 'sc', 'mu', 'st']);

/**
 * Draaiende wereldbol met alle Afrikaanse landen en hun grenzen (Natural Earth), getekend op canvas.
 * Kies je een land of regio, dan draait de bol ernaartoe en zoomt in. Ingezoomd verschijnen meren, rivieren
 * en de namen van de plekken en buurlanden.
 */
export function Globe({ points, filtered, selected, names, locale, focusBox = null, padLeft = 0, frame = 'stage', className }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ lon: 18, lat: 2, z: 1, pad: 0, points, filtered, selected, names, locale, focusBox, padLeft, frame });

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const font = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
    let raf = 0;
    let visible = true;
    let alive = true;
    let geo: Geo | null = null;
    let w = 0;
    let h = 0;
    let start = -1;

    loadGeo()
      .then((g) => {
        if (!alive) return;
        geo = g;
        redraw();
      })
      .catch(() => {
        /* zonder kaartdata blijft het een kale bol met lichtpuntjes */
      });

    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };
    const redraw = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      redraw();
    });
    io.observe(cv);
    cv.addEventListener('kt-redraw', redraw);

    const baseR = () => (state.current.frame === 'panel' ? Math.min(w * 0.42, h * 0.42) : Math.min(w * 0.46, h * 0.44));

    /** Waar naartoe draaien en hoe ver inzoomen: het kader om de gekozen landen. */
    function view() {
      const st = state.current;
      if (!geo || (!st.selected.length && !st.focusBox)) return null;
      let b = [180, 90, -180, -90];
      if (st.focusBox) b = [...st.focusBox];
      else
        for (const c of geo.africa) {
          if (!st.selected.includes(c.id)) continue;
          b = [Math.min(b[0], c.bbox[0]), Math.min(b[1], c.bbox[1]), Math.max(b[2], c.bbox[2]), Math.max(b[3], c.bbox[3])];
        }
      if (b[0] > b[2]) return null;
      const lon = (b[0] + b[2]) / 2;
      const lat = (b[1] + b[3]) / 2;
      const spanX = Math.max(0.6, (b[2] - b[0]) * Math.cos(lat * D)) * D * baseR();
      const spanY = Math.max(0.6, b[3] - b[1]) * D * baseR();
      // Het land moet passen in het vrije stuk onder de zoekbalk.
      const z = clamp(Math.min(((w - (w >= 768 ? st.padLeft : 0)) * 0.84) / spanX, (h * (st.frame === 'panel' ? 0.8 : 0.42)) / spanY), 1, MAX_ZOOM);
      return { lon, lat, z };
    }

    function frame(now: number) {
      raf = 0;
      // Verborgen kader (bv. display:none op een smal scherm): niets te tekenen, en geen deling door nul.
      if (w < 2 || h < 2) return;
      if (start < 0) start = now;
      const st = state.current;
      const t = Math.max(0, (now - start) / 1000);
      const v = view();
      const targetLon = v ? v.lon : 18 + (reduce ? 0 : 16 * Math.sin((t / 40) * 2 * Math.PI));
      const targetLat = v ? v.lat : 2 + (reduce ? 0 : 5 * Math.sin((t / 55) * 2 * Math.PI));
      const targetZ = v ? v.z : 1;
      const k = reduce ? 1 : 0.045;
      st.lon += (targetLon - st.lon) * k;
      st.lat += (targetLat - st.lat) * k;
      // Ruimte links alleen op brede schermen; op een telefoon staat het paneel onderin.
      st.pad += ((v && w >= 768 ? st.padLeft : 0) - st.pad) * k;
      st.z = Math.exp(Math.log(st.z) + (Math.log(targetZ) - Math.log(st.z)) * k);
      draw(t);
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    }

    function draw(t: number) {
      const st = state.current;
      ctx!.clearRect(0, 0, w, h);
      const z = st.z;
      /** 0 = hele bol, 1 = ingezoomd: hiermee komen details en labels in beeld. */
      const zf = clamp((z - 1.4) / 1.6, 0, 1);
      const R = baseR() * z;
      const cx = (w + st.pad) / 2;
      // Ingezoomd schuift het middelpunt omlaag, naar het vrije stuk onder de zoekbalk.
      const cy = st.frame === 'panel' ? h * 0.5 : h * (0.6 + 0.14 * zf);
      const lon0 = st.lon * D;
      const lat0 = st.lat * D;
      const sinLat0 = Math.sin(lat0);
      const cosLat0 = Math.cos(lat0);

      /** Orthografisch; punten aan de achterkant worden naar de rand geduwd zodat vlakken netjes afsluiten. */
      const proj = (lon: number, lat: number): [number, number, boolean, number] => {
        const l = lon * D - lon0;
        const p = lat * D;
        const cosc = sinLat0 * Math.sin(p) + cosLat0 * Math.cos(p) * Math.cos(l);
        let x = R * Math.cos(p) * Math.sin(l);
        let y = -R * (cosLat0 * Math.sin(p) - sinLat0 * Math.cos(p) * Math.cos(l));
        if (cosc <= 0) {
          const m = Math.hypot(x, y) || 1;
          x = (x / m) * R;
          y = (y / m) * R;
        }
        return [cx + x, cy + y, cosc > 0, cosc];
      };
      const onScreen = (x: number, y: number, m = 40) => x > -m && x < w + m && y > -m && y < h + m;

      /** Vlak uit platte ringen; null als het nergens zichtbaar is. */
      const ringPath = (rings: number[][], into = new Path2D()) => {
        let any = false;
        for (const r of rings) {
          let seen = false;
          const pts: [number, number][] = [];
          for (let i = 0; i < r.length; i += 2) {
            const [x, y, vis] = proj(r[i], r[i + 1]);
            if (vis) seen = true;
            pts.push([x, y]);
          }
          if (!seen) continue;
          any = true;
          into.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) into.lineTo(pts[i][0], pts[i][1]);
          into.closePath();
        }
        return any ? into : null;
      };
      /** Lijn langs punten (platte reeks), onderbroken waar hij achter de bol verdwijnt. */
      const flatLine = (r: number[]) => {
        ctx!.beginPath();
        let pen = false;
        for (let i = 0; i < r.length; i += 2) {
          const [x, y, vis] = proj(r[i], r[i + 1]);
          if (!vis) {
            pen = false;
            continue;
          }
          if (!pen) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
          pen = true;
        }
        ctx!.stroke();
      };

      // Baan van het vliegtuigje (alleen op de hele bol; ingezoomd vervaagt hij).
      const orbitAlpha = 1 - zf;
      const orbit = { rx: baseR() * 1.22, ry: baseR() * 0.34, tilt: -0.28 };
      const orbitPt = (a: number) => {
        const ex = orbit.rx * Math.cos(a);
        const ey = orbit.ry * Math.sin(a);
        return [cx + ex * Math.cos(orbit.tilt) - ey * Math.sin(orbit.tilt), cy + ex * Math.sin(orbit.tilt) + ey * Math.cos(orbit.tilt)];
      };
      const drawOrbit = (from: number, to: number) => {
        if (orbitAlpha <= 0) return;
        ctx!.strokeStyle = `rgba(255,255,255,${0.16 * orbitAlpha})`;
        ctx!.lineWidth = 1.2;
        ctx!.setLineDash([3, 6]);
        ctx!.beginPath();
        for (let a = from; a <= to + 0.001; a += 0.05) {
          const [x, y] = orbitPt(a);
          if (a === from) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.stroke();
        ctx!.setLineDash([]);
      };
      const planeA = (t * 0.32) % (Math.PI * 2);
      const planeBehind = Math.sin(planeA) < 0;
      const placePlane = () => {
        if (orbitAlpha <= 0) return;
        const [x, y] = orbitPt(planeA);
        const [x2, y2] = orbitPt(planeA + 0.02);
        const depth = 0.75 + 0.25 * Math.sin(planeA);
        drawPlane(ctx!, x, y, Math.atan2(y2 - y, x2 - x), (baseR() / 240) * depth, (planeBehind ? 0.5 : 1) * orbitAlpha);
      };
      drawOrbit(Math.PI, Math.PI * 2);
      if (planeBehind) placePlane();

      // Atmosfeer
      const atm = ctx!.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.2);
      atm.addColorStop(0, 'rgba(120,190,255,0.35)');
      atm.addColorStop(0.4, 'rgba(70,140,220,0.12)');
      atm.addColorStop(1, 'rgba(40,90,180,0)');
      ctx!.fillStyle = atm;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R * 1.2, 0, Math.PI * 2);
      ctx!.fill();

      // Oceaan
      const sea = ctx!.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      sea.addColorStop(0, '#1F5F80');
      sea.addColorStop(0.6, '#0C3B57');
      sea.addColorStop(1, '#051E30');
      ctx!.fillStyle = sea;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.clip();

      // Lengte- en breedtegraden (ingezoomd fijner)
      const step = z > 6 ? 5 : 15;
      ctx!.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx!.lineWidth = 1;
      for (let lon = -180; lon < 180; lon += step) graticule(Array.from({ length: 181 }, (_, i) => [lon, -90 + i]));
      for (let lat = -75; lat <= 75; lat += step) graticule(Array.from({ length: 361 }, (_, i) => [-180 + i, lat]));

      // Labels die niet over elkaar heen mogen vallen
      const taken: [number, number, number, number][] = [];
      const free = (x0: number, y0: number, x1: number, y1: number) => {
        if (taken.some(([a, b, c, d]) => x0 < c && x1 > a && y0 < d && y1 > b)) return false;
        taken.push([x0, y0, x1, y1]);
        return true;
      };
      type Label = { text: string; x: number; y: number; size: number; weight: number; color: string; italic?: boolean; spacing?: number; dx?: number; flip?: boolean; alpha: number };
      const labels: Label[] = [];

      if (geo) {
        // Rest van de wereld, gedempt
        const rest = ringPath(geo.world);
        if (rest) {
          ctx!.fillStyle = 'rgba(122,136,112,0.55)';
          ctx!.fill(rest);
        }

        // Afrika: alle landen als één vlak met landschapstinten
        const land = new Path2D();
        const shapes = new Map<string, Path2D>();
        for (const c of geo.africa) {
          const p = ringPath(c.rings);
          if (!p) continue;
          shapes.set(c.id, p);
          land.addPath(p);
        }
        ctx!.save();
        ctx!.clip(land);
        ctx!.fillStyle = '#7C9058';
        ctx!.fillRect(0, 0, w, h);
        for (const [lo, la, rad, col] of TINT) {
          const [x, y, vis] = proj(lo, la);
          if (!vis) continue;
          const r = R * rad * D * 1.2;
          const g = ctx!.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, col);
          g.addColorStop(0.55, col + 'CC');
          g.addColorStop(1, col + '00');
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.arc(x, y, r, 0, Math.PI * 2);
          ctx!.fill();
        }

        // Gekozen landen lichten op
        for (const id of st.selected) {
          const p = shapes.get(id);
          if (!p) continue;
          ctx!.fillStyle = `rgba(255,240,200,${0.24 - 0.12 * zf})`;
          ctx!.fill(p);
        }
        ctx!.restore();

        // Rivieren en meren
        ctx!.lineJoin = 'round';
        ctx!.lineCap = 'round';
        for (const rv of geo.rivers) {
          if (rv.rank > 4 + zf * 6) continue;
          ctx!.strokeStyle = `rgba(110,185,225,${0.45 + 0.4 * zf})`;
          ctx!.lineWidth = (rv.rank <= 3 ? 1.1 : 0.7) * (1 + zf * 0.8);
          for (const l of rv.lines) flatLine(l);
        }
        ctx!.fillStyle = '#2C7AA3';
        ctx!.strokeStyle = 'rgba(160,215,240,0.6)';
        ctx!.lineWidth = 0.6;
        for (const lk of geo.lakes) {
          const p = ringPath(lk.rings);
          if (!p) continue;
          ctx!.fill(p);
          if (zf > 0) ctx!.stroke(p);
        }

        // Landsgrenzen en kustlijn
        ctx!.strokeStyle = `rgba(255,255,255,${0.32 + 0.1 * zf})`;
        ctx!.lineWidth = 0.7 + 0.5 * zf;
        for (const p of shapes.values()) ctx!.stroke(p);
        for (const id of st.selected) {
          const p = shapes.get(id);
          if (!p) continue;
          ctx!.strokeStyle = 'rgba(255,236,190,0.95)';
          ctx!.lineWidth = 1.6 + zf;
          ctx!.stroke(p);
        }

        // Kleine eilandstaten: een dun ringetje, alleen op de hele bol
        if (zf < 1) {
          for (const c of geo.africa) {
            if (!ISLANDS.has(c.id)) continue;
            const [x, y, vis, cosc] = proj(c.label[0], c.label[1]);
            if (!vis) continue;
            const on = st.selected.includes(c.id);
            ctx!.strokeStyle = on ? `rgba(255,236,190,${0.95 * (1 - zf)})` : `rgba(255,255,255,${0.35 * Math.min(1, cosc * 2) * (1 - zf)})`;
            ctx!.lineWidth = on ? 1.4 : 0.8;
            ctx!.beginPath();
            ctx!.arc(x, y, Math.max(6, baseR() * 0.028), 0, Math.PI * 2);
            ctx!.stroke();
          }
        }

        // ---- Labels verzamelen (in volgorde van belangrijkheid) ----
        const loc = st.locale;
        // Gekozen landen
        for (const id of st.selected) {
          const c = geo.africa.find((a) => a.id === id);
          const name = st.names[id];
          if (!c || !name) continue;
          const [x, y, vis] = proj(c.label[0], c.label[1]);
          if (!vis) continue;
          const ly = ISLANDS.has(id) && zf < 0.5 ? y - Math.max(6, baseR() * 0.028) - 12 : y;
          labels.push({ text: zf > 0.3 ? name.toUpperCase() : name, x, y: ly, size: 13 + 3 * zf, weight: 600, color: '#FFF4DC', spacing: zf * 2.5, alpha: 1 });
        }
        if (zf > 0) {
          // Bovenin staan de kop en de zoekbalk: daar geen detaillabels.
          const minY = st.frame === 'panel' ? 0 : h * 0.56;
          // Plekken van de site
          for (const p of st.points) {
            if (!p.on) continue;
            const [x, y, vis] = proj(p.lon, p.lat);
            if (!vis || !onScreen(x, y, 0) || y < minY) continue;
            labels.push({ text: p.name, x, y, size: 12.5, weight: 500, color: '#FFFFFF', dx: 9, flip: true, alpha: zf });
          }
          // Meren
          for (const lk of geo.lakes) {
            const [x, y, vis] = proj(lk.label[0], lk.label[1]);
            if (!vis || !onScreen(x, y, 0) || y < minY) continue;
            if (lk.area * (z * z) < 4) continue; // te klein om een naam te dragen
            labels.push({ text: lk.name[loc] ?? lk.name.en, x, y, size: 11.5, weight: 500, color: '#BDE6FA', italic: true, alpha: zf });
          }
          // Buurlanden
          for (const c of geo.africa) {
            if (st.selected.includes(c.id) || !st.names[c.id]) continue;
            const [x, y, vis] = proj(c.label[0], c.label[1]);
            if (!vis || !onScreen(x, y, 0) || y < minY) continue;
            labels.push({ text: st.names[c.id].toUpperCase(), x, y, size: 11, weight: 600, color: 'rgba(255,255,255,0.7)', spacing: 2, alpha: zf * 0.85 });
          }
        }
      }

      // Lichtval: donkerder naar de rand (ingezoomd nauwelijks)
      const shade = ctx!.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.2, cx, cy, R * 1.02);
      shade.addColorStop(0, `rgba(255,255,255,${0.08 * (1 - zf)})`);
      shade.addColorStop(0.6, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx!.fillStyle = shade;
      ctx!.fillRect(cx - R, cy - R, R * 2, R * 2);

      // Plekken als lichtpuntjes
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      for (const p of st.points) {
        const [x, y, vis] = proj(p.lon, p.lat);
        if (!vis || !onScreen(x, y)) continue;
        const dim = st.filtered && !p.on;
        const r = (dim ? 1.4 : st.filtered ? 3.2 : 2.2) + (dim ? 0 : zf * 1.2);
        ctx!.globalAlpha = dim ? 0.22 : 1;
        if (!dim) {
          const gr = r * (st.filtered ? 4 + pulse * 2 : 3.5);
          const glow = ctx!.createRadialGradient(x, y, 0, x, y, gr);
          glow.addColorStop(0, p.color + 'AA');
          glow.addColorStop(1, p.color + '00');
          ctx!.fillStyle = glow;
          ctx!.beginPath();
          ctx!.arc(x, y, gr, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.fillStyle = dim ? '#FFFFFF' : p.color;
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fill();
        if (!dim && zf > 0) {
          ctx!.strokeStyle = `rgba(255,255,255,${0.9 * zf})`;
          ctx!.lineWidth = 1.2;
          ctx!.stroke();
        }
      }
      ctx!.globalAlpha = 1;

      // Labels tekenen, zonder overlap
      ctx!.textBaseline = 'middle';
      for (const lb of labels) {
        ctx!.font = `${lb.italic ? 'italic ' : ''}${lb.weight} ${lb.size}px ${font}`;
        ctx!.letterSpacing = `${lb.spacing ?? 0}px`;
        const tw = ctx!.measureText(lb.text).width;
        // Plekken om te proberen: rechts van het punt, links ervan, of erboven.
        const tries: [number, number][] = lb.dx
          ? [
              [lb.x + lb.dx, lb.y],
              ...(lb.flip
                ? ([
                    [lb.x - lb.dx - tw, lb.y],
                    [lb.x - tw / 2, lb.y - lb.size - 10],
                    [lb.x - tw / 2, lb.y + lb.size + 6],
                  ] as [number, number][])
                : []),
            ]
          : [[lb.x - tw / 2, lb.y]];
        const spot = tries.find(([l, y]) => {
          const top = y - lb.size * 0.65;
          return (!lb.dx || (l >= 4 && l + tw <= w - 4)) && free(l - 3, top - 2, l + tw + 3, top + lb.size * 1.3 + 2);
        });
        if (!spot) continue;
        const [left, ly] = spot;
        ctx!.textAlign = 'left';
        ctx!.globalAlpha = lb.alpha;
        ctx!.lineWidth = 3;
        ctx!.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx!.strokeText(lb.text, left, ly);
        ctx!.fillStyle = lb.color;
        ctx!.fillText(lb.text, left, ly);
      }
      ctx!.globalAlpha = 1;
      ctx!.letterSpacing = '0px';
      ctx!.restore();

      // Glansrand
      ctx!.strokeStyle = 'rgba(170,225,255,0.3)';
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.stroke();

      // Voorste helft van de baan en het vliegtuigje
      drawOrbit(0, Math.PI);
      if (!planeBehind) placePlane();

      function graticule(pts: number[][]) {
        ctx!.beginPath();
        let pen = false;
        for (const [lo, la] of pts) {
          const [x, y, vis] = proj(lo, la);
          if (!vis) {
            pen = false;
            continue;
          }
          if (!pen) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
          pen = true;
        }
        ctx!.stroke();
      }
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      cv.removeEventListener('kt-redraw', redraw);
    };
  }, []);

  // Nieuwe selectie doorgeven aan de tekenlus (en bij stilstaande bol één keer opnieuw tekenen).
  useEffect(() => {
    Object.assign(state.current, { points, filtered, selected, names, locale, focusBox, padLeft });
    canvas.current?.dispatchEvent(new Event('kt-redraw'));
  }, [filtered, points, selected, names, locale, focusBox, padLeft]);

  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}

/** Klein wit vliegtuigje met rode staart, met de neus in de vliegrichting. */
function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, s: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.quadraticCurveTo(10, -2, 4, -2);
  ctx.lineTo(-1, -11);
  ctx.lineTo(-4, -11);
  ctx.lineTo(-1, -2);
  ctx.lineTo(-8, -2);
  ctx.lineTo(-11, -6);
  ctx.lineTo(-13, -6);
  ctx.lineTo(-11, 0);
  ctx.lineTo(-13, 6);
  ctx.lineTo(-11, 6);
  ctx.lineTo(-8, 2);
  ctx.lineTo(-1, 2);
  ctx.lineTo(-4, 11);
  ctx.lineTo(-1, 11);
  ctx.lineTo(4, 2);
  ctx.quadraticCurveTo(10, 2, 12, 0);
  ctx.fill();
  ctx.fillStyle = '#E2554A';
  ctx.fillRect(-12.5, -1, 3, 2);
  ctx.restore();
}
