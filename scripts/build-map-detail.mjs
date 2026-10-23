// Bouwt public/geo/tz-detail.json voor de kaartpagina: hoofdwegen, plaatsen en bergtoppen in en rond Tanzania,
// uit Natural Earth (publiek domein, github.com/nvkelso/natural-earth-vector, schaal 1:10m).
//
// Gebruik: node scripts/build-map-detail.mjs            (downloadt de bronbestanden, ± 55 MB, niet bewaard)
//          node scripts/build-map-detail.mjs --from=map  (gebruikt al gedownloade .geojson-bestanden in die map)
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const from = process.argv.find((a) => a.startsWith('--from='))?.slice(7);

// Kader: Tanzania met een rand eromheen (lengte, breedte)
const BOX = { w: 28.5, e: 41.5, s: -12.5, n: 0.5 };
const inBox = ([x, y]) => x >= BOX.w && x <= BOX.e && y >= BOX.s && y <= BOX.n;
const round = (v) => Math.round(v * 1000) / 1000;

async function load(name) {
  if (from) return JSON.parse(fs.readFileSync(path.join(from, `${name}.geojson`), 'utf8'));
  const url = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/${name}.geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

// Douglas-Peucker, voor lijnen
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  let far = 0;
  let fd = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const d = Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / (Math.hypot(by - ay, bx - ax) || 1);
    if (d > fd) {
      fd = d;
      far = i;
    }
  }
  if (fd <= tol) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, far + 1), tol).slice(0, -1), ...simplify(pts.slice(far), tol)];
}

// ---- Wegen: alleen hoofdwegen en gewone wegen, stukken binnen het kader ----
const roads = [];
for (const f of (await load('ne_10m_roads')).features) {
  const type = f.properties.type;
  if (type !== 'Major Highway' && type !== 'Road') continue;
  const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [];
  for (const line of lines) {
    // Opknippen waar de weg het kader verlaat
    let cur = [];
    for (const p of line) {
      if (inBox(p)) cur.push(p);
      else if (cur.length) {
        if (cur.length > 1) roads.push({ major: type === 'Major Highway' ? 1 : 0, line: cur });
        cur = [];
      }
    }
    if (cur.length > 1) roads.push({ major: type === 'Major Highway' ? 1 : 0, line: cur });
  }
}
const roadsOut = roads.map((r) => ({ major: r.major, line: simplify(r.line, 0.01).flatMap(([x, y]) => [round(x), round(y)]) }));

// ---- Plaatsen in Tanzania (de belangrijkste eerst) ----
const places = (await load('ne_10m_populated_places_simple')).features
  .filter((f) => f.properties.adm0_a3 === 'TZA' && f.properties.scalerank <= 7)
  .map((f) => ({
    name: f.properties.name,
    rank: f.properties.scalerank,
    capital: f.properties.adm0cap ? 1 : 0,
    at: [round(f.geometry.coordinates[0]), round(f.geometry.coordinates[1])],
  }))
  .sort((a, b) => a.rank - b.rank);

// ---- Bergtoppen in Tanzania (met hoogte uit Natural Earth), alleen de hoge (vanaf 2500 m) ----
const peaks = (await load('ne_10m_geography_regions_elevation_points')).features
  .filter((f) => f.properties.name && f.properties.elevation >= 2500 && inBox(f.geometry.coordinates) && f.geometry.coordinates[1] < -1 && f.geometry.coordinates[0] > 29.6)
  .map((f) => ({ name: f.properties.name, elevation: f.properties.elevation, at: f.geometry.coordinates.slice(0, 2).map(round) }));

const out = {
  _bron: 'Natural Earth 1:10m (publiek domein): ne_10m_roads, ne_10m_populated_places_simple, ne_10m_geography_regions_elevation_points. Gebouwd met scripts/build-map-detail.mjs.',
  roads: roadsOut,
  places,
  peaks,
};
const file = path.join(root, 'public/geo/tz-detail.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log(`${file}: ${roadsOut.length} wegstukken, ${places.length} plaatsen, ${peaks.length} toppen, ${(fs.statSync(file).size / 1024).toFixed(0)} kB`);
