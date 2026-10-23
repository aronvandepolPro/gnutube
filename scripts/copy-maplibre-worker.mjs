// MapLibre laadt zijn worker via import.meta.url; dat werkt niet onder Turbopack.
// Daarom kopiëren we de worker naar public/ en zetten we de URL expliciet (zie MapView.tsx).
import fs from 'node:fs';
fs.mkdirSync('public/maplibre', { recursive: true });
fs.copyFileSync('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', 'public/maplibre/maplibre-gl-worker.mjs');
