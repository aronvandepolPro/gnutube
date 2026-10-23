/**
 * Tanzania verdeeld in gebieden: elk stukje land hoort bij de dichtstbijzijnde Gnutube-plek (Voronoi-indeling,
 * bijgesneden op de landsgrens). Zo kleurt 'Mijn kaart' per bezochte plek een heel gebied groen, en ben je
 * overal geweest, dan is heel Tanzania groen.
 * De gebieden zijn geen officiële regio's; ze volgen alleen uit waar de plekken liggen.
 */
type Pt = [number, number];

/** Veelhoek bijsnijden met een halfvlak a·x + b·y ≤ c (Sutherland–Hodgman). */
function clip(poly: Pt[], a: number, b: number, c: number): Pt[] {
  const out: Pt[] = [];
  const inside = (p: Pt) => a * p[0] + b * p[1] <= c + 1e-12;
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const ci = inside(cur);
    const pi = inside(prev);
    if (ci !== pi) {
      const dx = cur[0] - prev[0];
      const dy = cur[1] - prev[1];
      const t = (c - a * prev[0] - b * prev[1]) / (a * dx + b * dy);
      out.push([prev[0] + t * dx, prev[1] + t * dy]);
    }
    if (ci) out.push(cur);
  }
  return out;
}

/** Gebied per plek als GeoJSON (één feature per plek; id = volgnummer voor feature-state). */
export function buildAreas(sites: { id: string; lon: number; lat: number }[], rings: Pt[][]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = sites.map((s, i) => {
    const polys: Pt[][] = [];
    for (const ring of rings) {
      let poly = ring.slice();
      // Ring zonder dubbel eindpunt
      if (poly.length > 1 && poly[0][0] === poly[poly.length - 1][0] && poly[0][1] === poly[poly.length - 1][1]) poly.pop();
      for (const o of sites) {
        if (o === s || !poly.length) continue;
        // Dichter bij s dan bij o:  (o - s)·x ≤ (|o|² - |s|²) / 2
        const a = o.lon - s.lon;
        const b = o.lat - s.lat;
        const c = (o.lon * o.lon + o.lat * o.lat - s.lon * s.lon - s.lat * s.lat) / 2;
        poly = clip(poly, a, b, c);
      }
      if (poly.length >= 3) polys.push([...poly, poly[0]]);
    }
    // Oppervlakte (bij benadering): lengtegraden smaller naar de polen toe, dus × cos(breedtegraad)
    const k = Math.cos((s.lat * Math.PI) / 180);
    const area = polys.reduce((sum, p) => {
      let a = 0;
      for (let j = 0; j < p.length - 1; j++) a += p[j][0] * p[j + 1][1] - p[j + 1][0] * p[j][1];
      return sum + Math.abs(a / 2) * k;
    }, 0);
    return {
      type: 'Feature',
      id: i,
      properties: { pid: s.id, area },
      geometry: { type: 'MultiPolygon', coordinates: polys.map((p) => [p]) },
    };
  });
  return { type: 'FeatureCollection', features: features.filter((f) => (f.geometry as GeoJSON.MultiPolygon).coordinates.length) };
}
