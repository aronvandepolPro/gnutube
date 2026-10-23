// Bouwt data/country-facts.json: feiten per Afrikaans land voor het paneel bij de wereldbol.
// Alles komt uit open data, niets met de hand ingevuld:
// - mledoze/countries (npm world-countries 5.1.0, licentie ODbL: bronvermelding verplicht):
//   hoofdstad, oppervlakte, officiële talen, munteenheid, buurlanden, ingesloten door land;
// - Natural Earth 1:50m (publiek domein): inwoners (schatting + jaar) en vertaalde namen van hoofdsteden.
//
// Gebruik: node scripts/build-country-facts.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const seed = JSON.parse(fs.readFileSync(path.join(root, 'data/seed.json'), 'utf8'));
const ids = seed.countries.map((c) => c.id);
const countries = require('world-countries/countries.json');
const byCca3 = new Map(countries.map((c) => [c.cca3, c]));

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
  return JSON.parse(fs.readFileSync(file, 'utf8')).features;
}
const admin = await ne('ne_50m_admin_0_countries');
const places = await ne('ne_50m_populated_places');

const LANGS = ['nl', 'de', 'fr', 'es', 'it', 'pt'];
/** Vertaalde naam van een hoofdstad uit Natural Earth; anders de naam uit de dataset. */
function capitalNames(iso2, name) {
  const p = places.find(
    (f) => f.properties.ISO_A2 === iso2 && [f.properties.NAME, f.properties.NAME_EN, f.properties.NAMEASCII, f.properties.NAMEALT].includes(name),
  )?.properties;
  const out = { en: p?.NAME_EN || name };
  for (const l of LANGS) if (p?.[`NAME_${l.toUpperCase()}`] && p[`NAME_${l.toUpperCase()}`] !== out.en) out[l] = p[`NAME_${l.toUpperCase()}`];
  return out;
}

const facts = {};
for (const id of ids) {
  const c = countries.find((x) => x.cca2.toLowerCase() === id);
  if (!c) throw new Error(`Niet in world-countries: ${id}`);
  const a = admin.find((f) => f.properties.ISO_A2 === c.cca2 || f.properties.ISO_A2_EH === c.cca2)?.properties;
  facts[id] = {
    flag: c.flag,
    capitals: c.capital.map((n) => capitalNames(c.cca2, n)),
    population: a?.POP_EST ? { n: a.POP_EST, year: a.POP_YEAR } : null,
    area: c.area,
    landlocked: c.landlocked,
    borders: c.borders.map((b) => byCca3.get(b)?.cca2.toLowerCase()).filter(Boolean),
    languages: Object.entries(c.languages).map(([code, en]) => ({ code, en })),
    currencies: Object.entries(c.currencies ?? {}).map(([code, v]) => ({ code, en: v.name, symbol: v.symbol })),
  };
}
// Vergelijkingslanden per taal ("zo groot als ..."), uit dezelfde bron.
const refs = {};
for (const iso of ['nl', 'gb', 'de', 'fr', 'es', 'it', 'pt', 'tz']) refs[iso] = countries.find((x) => x.cca2.toLowerCase() === iso).area;

const out = {
  _bron: 'mledoze/countries via world-countries 5.1.0 (ODbL) en Natural Earth 1:50m (publiek domein).',
  refs,
  facts,
};
const file = path.join(root, 'data/country-facts.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
const noPop = ids.filter((id) => !facts[id].population);
console.log(`${ids.length} landen → ${file}${noPop.length ? ` (geen inwonertal: ${noPop.join(', ')})` : ''}`);
