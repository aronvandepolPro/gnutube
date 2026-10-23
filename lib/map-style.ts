/**
 * Lichte kaartstijl van Gnutube uit eigen kaartgegevens (Natural Earth, public/geo): geen externe kaartdienst.
 * Gebruikt door de kaartpagina en de kaart naast de zoekresultaten.
 */
import type { StyleSpecification } from 'maplibre-gl';

export type Ring = number[]; // [lon, lat, lon, lat, …]
export type Detail = {
  roads: { major: number; line: Ring }[];
  places: { name: string; rank: number; capital: number; at: [number, number] }[];
  peaks: { name: string; elevation: number; at: [number, number] }[];
};
export type Geo = {
  africa: { id: string; rings: Ring[] }[];
  world: Ring[];
  lakes: { name: Record<string, string>; rings: Ring[]; label: [number, number]; area: number }[];
  rivers: { rank: number; lines: Ring[] }[];
};

export const toCoords = (r: Ring) => {
  const out: [number, number][] = [];
  for (let i = 0; i < r.length; i += 2) out.push([r[i], r[i + 1]]);
  return out;
};
const polys = (rings: Ring[], props: Record<string, unknown> = {}) =>
  rings.map((r) => ({ type: 'Feature' as const, properties: props, geometry: { type: 'Polygon' as const, coordinates: [toCoords(r)] } }));

/**
 * Eigen, lichte kaartstijl uit Natural Earth (public/geo/globe.json): geen externe kaartdienst nodig.
 * Tanzania wit en oranje omrand, buurlanden zandkleurig, meren en rivieren blauw.
 */
export function buildStyle(g: Geo, d: Detail): StyleSpecification {
  const fc = (features: unknown[]) => ({ type: 'geojson' as const, data: { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection });
  return {
    version: 8,
    // Wereldbol bij uitzoomen, platte kaart bij inzoomen (MapLibre gaat er vanzelf tussen over)
    projection: { type: 'globe' },
    // Zachte gloed rond de bol
    sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.5, 6, 0] },
    sources: {
      world: fc(polys(g.world)),
      africa: fc(g.africa.flatMap((c) => polys(c.rings, { id: c.id }))),
      lakes: fc(g.lakes.flatMap((l) => polys(l.rings))),
      roads: fc(
        d.roads.map((r) => ({ type: 'Feature', properties: { major: r.major }, geometry: { type: 'LineString', coordinates: toCoords(r.line) } })),
      ),
      rivers: fc(
        g.rivers.flatMap((r) =>
          r.lines.map((l) => ({ type: 'Feature', properties: { rank: r.rank }, geometry: { type: 'LineString', coordinates: toCoords(l) } })),
        ),
      ),
    },
    layers: [
      { id: 'sea', type: 'background', paint: { 'background-color': '#CFE8F3' } },
      { id: 'world', type: 'fill', source: 'world', paint: { 'fill-color': '#F2ECE3' } },
      {
        id: 'africa',
        type: 'fill',
        source: 'africa',
        paint: { 'fill-color': ['case', ['==', ['get', 'id'], 'tz'], '#FFFDF9', '#EFE5D6'] },
      },
      {
        id: 'tz-glow',
        type: 'line',
        source: 'africa',
        filter: ['==', ['get', 'id'], 'tz'],
        paint: { 'line-color': '#F07F1E', 'line-width': 10, 'line-opacity': 0.18, 'line-blur': 6 },
      },
      {
        id: 'borders',
        type: 'line',
        source: 'africa',
        paint: {
          'line-color': ['case', ['==', ['get', 'id'], 'tz'], '#E8954A', '#D6C6B1'],
          'line-width': ['case', ['==', ['get', 'id'], 'tz'], 1.8, 0.8],
        },
      },
      {
        id: 'rivers',
        type: 'line',
        source: 'rivers',
        paint: { 'line-color': '#8EC3DE', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 9, 2] },
      },
      { id: 'lakes', type: 'fill', source: 'lakes', paint: { 'fill-color': '#A6D4EA', 'fill-outline-color': '#8EC3DE' } },
      // Wegen: een lichte rand eronder en een warme kleur erop; kleine wegen pas bij inzoomen
      {
        id: 'roads-casing',
        type: 'line',
        source: 'roads',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        filter: ['==', ['get', 'major'], 1],
        paint: { 'line-color': '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2.2, 8, 5.5] },
      },
      {
        id: 'roads-minor',
        type: 'line',
        source: 'roads',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        filter: ['==', ['get', 'major'], 0],
        paint: { 'line-color': '#DDB78E', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.7, 6, 1.3, 8, 2.4] },
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'roads',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        filter: ['==', ['get', 'major'], 1],
        paint: { 'line-color': '#E7A970', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 8, 3] },
      },
    ],
  };
}


/** Kaartgegevens één keer ophalen (gedeeld door alle kaarten op de site). */
let cache: Promise<[Geo, Detail]> | null = null;
export function loadMapData() {
  cache ??= Promise.all([
    fetch('/geo/globe.json').then((r) => r.json() as Promise<Geo>),
    fetch('/geo/tz-detail.json').then((r) => r.json() as Promise<Detail>),
  ]);
  return cache;
}
