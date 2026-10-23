// Zet de prototype-extractie om naar seed-data volgens het datamodel uit BOUWOPDRACHT.md.
// Gebruik: node scripts/build-seed.mjs
// LET OP: alle bestemmingen, coördinaten, activiteiten en reisadviezen komen uit het prototype
// en zijn uit algemene kennis samengesteld. Ze moeten door mensen met lokale kennis worden gecontroleerd.
import fs from 'node:fs';

const x = JSON.parse(fs.readFileSync('data/prototype-extract.json', 'utf8'));

const regions = x.regions.map((r, i) => ({
  id: ['east', 'south', 'central', 'west', 'north'][i] ?? r.id ?? `r${i}`,
  name: r.name,
}));
// gebruik de echte id's uit het prototype als die bestaan
x.regions.forEach((r, i) => { if (r.id) regions[i].id = r.id; });

const countries = [];
const destinations = [];
const destinationActivities = [];

x.regions.forEach((r, ri) => {
  r.countries.forEach((c) => {
    countries.push({
      id: c.id,
      regionId: regions[ri].id,
      name: c.name,
      airport: c.airport ?? null,
      advisory: c.adv ? 'avoid' : null,
    });
    c.parks.forEach((p) => {
      const [lat, lon] = x.GEO[p.id];
      destinations.push({
        id: p.id,
        countryId: c.id,
        name: p.name,
        kind: p.sea ? 'beach' : (p.k ?? 'safari'),
        tagline: p.tag,
        lat, lon,
        defaultNights: p.nights ?? 1,
        canFly: !!p.fly,
        hasWater: !!(p.water || p.sea),
        mountain: !!p.mtn,
        advisory: p.adv ? 'avoid' : null,
      });
      (x.PA[p.id] ?? []).forEach((a) => destinationActivities.push({ destinationId: p.id, activityId: a, seasonal: false }));
    });
  });
});

const activities = Object.entries(x.A).map(([id, name]) => ({ id, name }));

// Extra talen: vertaalde inhoud uit data/content/<taal>.json (zie scripts en README).
// Ontbrekende vertalingen worden niet ingevuld: de site valt dan terug op Engels.
for (const file of fs.readdirSync('data/content').filter((f) => /^[a-z]{2}\.json$/.test(f))) {
  const lang = file.slice(0, 2);
  const c = JSON.parse(fs.readFileSync(`data/content/${file}`, 'utf8'));
  const put = (obj, value) => { if (typeof value === 'string' && value.trim()) obj[lang] = value.trim(); };
  regions.forEach((r) => put(r.name, c.regions?.[r.id]));
  countries.forEach((k) => put(k.name, c.countries?.[k.id]));
  activities.forEach((a) => put(a.name, c.activities?.[a.id]));
  destinations.forEach((d) => put(d.tagline, c.taglines?.[d.id]));
  console.log('vertaling samengevoegd:', lang);
}

const seed = {
  _note: 'Gegenereerd uit het prototype. Niet geverifieerd: laat controleren door mensen met lokale kennis. Reisadviezen zijn voorlopig en moeten worden getoetst aan een officiële bron.',
  regions, countries, destinations, activities, destinationActivities,
};
fs.writeFileSync('data/seed.json', JSON.stringify(seed, null, 1));
console.log({ regions: regions.length, countries: countries.length, destinations: destinations.length,
  activities: activities.length, links: destinationActivities.length,
  kinds: destinations.reduce((m, d) => (m[d.kind] = (m[d.kind] || 0) + 1, m), {}),
  regionIds: regions.map((r) => r.id) });

// ── SQL-seed voor Supabase ──
const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const j = (o) => `${q(JSON.stringify(o))}::jsonb`;
const sql = [
  '-- Gegenereerd door scripts/build-seed.mjs. Niet met de hand bewerken.',
  '-- NIET GEVERIFIEERD: bestemmingen, coördinaten, activiteiten en reisadviezen komen uit het prototype.',
  'begin;',
  ...regions.map((r) => `insert into regions (id, name) values (${q(r.id)}, ${j(r.name)});`),
  ...countries.map((c) => `insert into countries (id, region_id, name, airport) values (${q(c.id)}, ${q(c.regionId)}, ${j(c.name)}, ${q(c.airport)});`),
  ...destinations.map((d) => `insert into destinations (id, country_id, name, kind, tagline, lat, lon, default_nights, can_fly, has_water, mountain) values (${[q(d.id), q(d.countryId), q(d.name), q(d.kind), j(d.tagline), d.lat, d.lon, d.defaultNights, d.canFly, d.hasWater, d.mountain].join(', ')});`),
  ...activities.map((a) => `insert into activities (id, name) values (${q(a.id)}, ${j(a.name)});`),
  ...destinationActivities.map((l) => `insert into destination_activities (destination_id, activity_id, seasonal) values (${q(l.destinationId)}, ${q(l.activityId)}, ${l.seasonal});`),
  '-- Voorlopige reisadviezen: source_url en checked_at blijven leeg tot ze getoetst zijn.',
  ...countries.filter((c) => c.advisory).map((c) => `insert into travel_advisories (country_id, level, note) values (${q(c.id)}, 'avoid', 'voorlopig, uit prototype');`),
  ...destinations.filter((d) => d.advisory).map((d) => `insert into travel_advisories (country_id, destination_id, level, note) values (${q(d.countryId)}, ${q(d.id)}, 'avoid', 'voorlopig, uit prototype');`),
  'commit;',
  '',
];
fs.mkdirSync('supabase', { recursive: true });
fs.writeFileSync('supabase/seed.sql', sql.join('\n'));
console.log('supabase/seed.sql:', sql.length, 'regels');
