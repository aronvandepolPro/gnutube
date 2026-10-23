// Eenmalig: haalt bestemmingen, landen, activiteiten en vertalingen uit het prototype.
// Gebruik: node scripts/extract-prototype.mjs prototype/Knoetube.dc.html data/prototype-extract.json
import fs from 'node:fs';
import vm from 'node:vm';

const [src, out] = process.argv.slice(2);
const html = fs.readFileSync(src, 'utf8');
const js = html.slice(html.indexOf('data-dc-script'));
const start = js.indexOf('const L = {');
const end = js.indexOf('const mix =');
const body = js.slice(start, end);

const code = `const s = { lang: 'nl' };\n${body}\n;({ L, NEW, langs, A, PA, regions, EXTRA, GEO })`;
const res = vm.runInNewContext(code, {}, { timeout: 2000 });
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log('keys', Object.keys(res), 'regions', res.regions.length,
  'countries', res.regions.reduce((n, r) => n + r.countries.length, 0));
