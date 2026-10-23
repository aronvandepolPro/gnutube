// Bouwt public/geo/globe.json voor de wereldbol in de zoeksectie, uit Natural Earth (via world-atlas):
// - alle 54 Afrikaanse landen uit data/seed.json (plus Westelijke Sahara en Somaliland als apart gebied),
//   op 1:50m-schaal zodat ook kleine eilandstaten (Comoren, Kaapverdië, Seychellen, Mauritius) erop staan;
// - de rest van de wereld als achtergrondland op 1:110m-schaal;
// - voor het inzoomen: meren en rivieren (1:50m) binnen Afrika,
//   rechtstreeks van Natural Earth (github.com/nvkelso/natural-earth-vector), met namen in meerdere talen.
// Coördinaten worden vereenvoudigd (Douglas-Peucker) en afgerond om het bestand klein te houden.
//
// Gebruik: node scripts/build-globe-geo.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import countries from 'i18n-iso-countries';

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const seed = JSON.parse(fs.readFileSync(path.join(root, 'data/seed.json'), 'utf8'));
const african = new Set(seed.countries.map((c) => c.id));

const topo50 = require('world-atlas/countries-50m.json');
const land110 = require('world-atlas/land-110m.json');

// Extra gebieden op het Afrikaanse continent die geen land uit de lijst zijn.
const EXTRA = { 'W. Sahara': 'eh', Somaliland: 'somaliland' };

const TOL = 0.04; // graden
const round = (v) => Math.round(v * 100) / 100;

function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  // Gesloten ring: begin en eind vallen samen, dus splitsen op het verste punt en beide helften apart doen.
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  if (sx === ex && sy === ey) {
    let far = 1;
    let fd = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.hypot(pts[i][0] - sx, pts[i][1] - sy);
      if (d > fd) {
        fd = d;
        far = i;
      }
    }
    return [...simplify(pts.slice(0, far + 1), tol).slice(0, -1), ...simplify(pts.slice(far), tol)];
  }
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-9;
    let max = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Ring → platte reeks [lon, lat, lon, lat, …], vereenvoudigd en afgerond. */
function flat(ring, tol) {
  const s = ring.length > 12 ? simplify(ring, tol) : ring;
  const out = [];
  for (const [lo, la] of s) {
    const x = round(lo);
    const y = round(la);
    if (out.length && out[out.length - 2] === x && out[out.length - 1] === y) continue;
    out.push(x, y);
  }
  return out.length >= 6 ? out : null;
}

const polys = (geom) => (geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []);

/** Oppervlak en zwaartepunt van een ring (vlak benaderd, prima voor een labelpunt). */
function centroid(ring) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f;
    cx += (ring[j][0] + ring[i][0]) * f;
    cy += (ring[j][1] + ring[i][1]) * f;
  }
  a /= 2;
  return a ? { area: Math.abs(a), lon: round(cx / (6 * a)), lat: round(cy / (6 * a)) } : { area: 0, lon: ring[0][0], lat: ring[0][1] };
}

const africa = [];
const found = new Set();
const rawAfrica = []; // onvereenvoudigde buitenringen, voor 'ligt dit punt in Afrika?'
for (const f of feature(topo50, topo50.objects.countries).features) {
  const name = f.properties?.name;
  const id = EXTRA[name] ?? countries.numericToAlpha2(String(f.id).padStart(3, '0'))?.toLowerCase();
  if (!id || !(african.has(id) || Object.values(EXTRA).includes(id))) continue;
  found.add(id);
  const rings = [];
  let best = { area: -1, lon: 0, lat: 0 };
  const parts = [];
  for (const poly of polys(f.geometry)) {
    const outer = poly[0];
    rawAfrica.push(outer);
    const c = centroid(outer);
    parts.push({ outer, area: c.area });
    if (c.area > best.area) best = c;
    // Kleine eilandjes niet te veel vereenvoudigen, anders verdwijnen ze.
    const r = flat(outer, c.area < 1 ? TOL / 4 : TOL);
    if (r) rings.push(r);
  }
  // Kader om in te zoomen: alleen delen van minstens 10% van het grootste deel, zodat verre eilandjes
  // (zoals de Prins Edwardeilanden bij Zuid-Afrika) het kader niet opblazen.
  const biggest = Math.max(...parts.map((q) => q.area));
  let bbox = [180, 90, -180, -90];
  for (const q of parts) {
    if (q.area < biggest * 0.1) continue;
    for (const [lo, la] of q.outer) bbox = [Math.min(bbox[0], lo), Math.min(bbox[1], la), Math.max(bbox[2], lo), Math.max(bbox[3], la)];
  }
  africa.push({ id, rings, label: [best.lon, best.lat], bbox: bbox.map(round) });
}
const missing = [...african].filter((id) => !found.has(id));
if (missing.length) console.warn('Niet gevonden in Natural Earth:', missing.join(', '));

const world = [];
for (const f of feature(land110, land110.objects.land).features) {
  for (const poly of polys(f.geometry)) {
    const outer = poly[0];
    if (outer.every(([, la]) => la < -55)) continue; // Antarctica valt buiten beeld en geeft rare vlakken
    const r = flat(outer, TOL * 2);
    if (r) world.push(r);
  }
}

// ---- Meren en rivieren (Natural Earth, gedownload en lokaal bewaard) ----
const cacheDir = path.join(os.tmpdir(), 'gnutube-natural-earth');
fs.mkdirSync(cacheDir, { recursive: true });
async function ne(name) {
  const file = path.join(cacheDir, `${name}.geojson`);
  if (!fs.existsSync(file)) {
    const url = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/${name}.geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')).features.filter((f) => f.geometry);
}

function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inAfrica = (pt) => rawAfrica.some((r) => inRing(pt, r));

const LANGS = ['nl', 'en', 'de', 'fr', 'es', 'it', 'pt'];
/** Namen per taal; alleen talen die afwijken van de Engelse naam. */
function names(p) {
  const en = p.name_en || p.name;
  const out = { en };
  for (const l of LANGS) if (p[`name_${l}`] && p[`name_${l}`] !== en) out[l] = p[`name_${l}`];
  return out;
}

const lakes = [];
for (const f of await ne('ne_50m_lakes')) {
  const ps = polys(f.geometry);
  const outer = ps[0]?.[0];
  if (!outer || !f.properties.name) continue;
  const c = centroid(outer);
  if (!inAfrica([c.lon, c.lat])) continue;
  const rings = ps.map((p) => flat(p[0], TOL / 2)).filter(Boolean);
  if (rings.length) lakes.push({ name: names(f.properties), rings, label: [c.lon, c.lat], area: round(c.area) });
}

const rivers = [];
for (const f of await ne('ne_50m_rivers_lake_centerlines')) {
  const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [];
  const mid = lines[0]?.[Math.floor(lines[0].length / 2)];
  if (!mid || !inAfrica(mid)) continue;
  const out = lines.map((l) => flat(l, TOL / 2)).filter(Boolean);
  if (out.length) rivers.push({ rank: f.properties.scalerank ?? 9, lines: out });
}

const out = {
  _bron:
    'Natural Earth: landen 1:50m (Afrika) en land 1:110m (wereld) via world-atlas 2.0.2; meren en rivieren 1:50m via natural-earth-vector. Publiek domein.',
  africa,
  world,
  lakes,
  rivers,
};
fs.mkdirSync(path.join(root, 'public/geo'), { recursive: true });
const file = path.join(root, 'public/geo/globe.json');
fs.writeFileSync(file, JSON.stringify(out));
const pts = africa.reduce((n, c) => n + c.rings.reduce((m, r) => m + r.length / 2, 0), 0);
console.log(`${lakes.length} meren, ${rivers.length} rivieren`);
console.log(`${africa.length} Afrikaanse gebieden (${pts} punten), ${world.length} wereldvlakken → ${file} (${Math.round(fs.statSync(file).size / 1024)} kB)`);
