import airstripData from '@/data/airstrips.json';
/**
 * Automatische reisroute langs de gekozen plekken (in de browser, zonder server).
 * - Volgorde: dichtstbijzijnde plek eerst vanaf het aankomstvliegveld, daarna verbeterd met 2-opt
 *   (kruisende stukken rechtgezet), met vaste begin- en eindpunten (aankomst- en vertrekvliegveld).
 * - Vervoer per stuk is een SCHATTING op basis van hemelsbrede afstand en eilanden, geen dienstregeling.
 */

export type AirportCode = 'JRO' | 'DAR' | 'ZNZ';

/** Internationale vliegvelden in Tanzania (coördinaten afgerond). */
export const AIRPORTS: Record<AirportCode, { name: string; lat: number; lon: number; island?: boolean }> = {
  JRO: { name: 'Kilimanjaro (JRO)', lat: -3.43, lon: 37.07 },
  DAR: { name: 'Dar es Salaam (DAR)', lat: -6.88, lon: 39.2 },
  ZNZ: { name: 'Zanzibar (ZNZ)', lat: -6.22, lon: 39.22, island: true },
};

export type Stop = { id: string; lat: number; lon: number; island: boolean };
export type Mode = 'road' | 'flight' | 'boat';

export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

/** Schatting van het vervoer: eiland erbij = vlucht (ver) of boot (dichtbij); ver over land = binnenlandse vlucht. */
export function modeBetween(a: { island?: boolean; lat: number; lon: number }, b: { island?: boolean; lat: number; lon: number }): Mode {
  const d = km(a, b);
  // Beide op een eiland en dichtbij: zelfde eiland, dus over de weg (bv. Stone Town naar het vliegveld van Zanzibar)
  if (a.island && b.island && d < 60) return 'road';
  if (a.island || b.island) return d > 120 ? 'flight' : 'boat';
  return d > 450 ? 'flight' : 'road';
}

/** Kies het vliegveld dat het dichtst bij een plek ligt. */
export function nearestAirport(p: { lat: number; lon: number }): AirportCode {
  return (Object.keys(AIRPORTS) as AirportCode[]).sort((a, b) => km(p, AIRPORTS[a]) - km(p, AIRPORTS[b]))[0];
}

/** Volgorde van de stops tussen aankomst en vertrek, zo kort mogelijk (benadering). */
export function planOrder(stops: Stop[], arrive: AirportCode, depart: AirportCode): string[] {
  if (stops.length <= 1) return stops.map((s) => s.id);
  const start = AIRPORTS[arrive];
  const end = AIRPORTS[depart];
  // 1. Dichtstbijzijnde eerst
  const left = [...stops];
  const order: Stop[] = [];
  let at: { lat: number; lon: number } = start;
  while (left.length) {
    left.sort((a, b) => km(at, a) - km(at, b));
    const next = left.shift()!;
    order.push(next);
    at = next;
  }
  // 2. 2-opt: stukken omdraaien zolang de route korter wordt
  const pts = [start, ...order, end];
  const len = (p: typeof pts) => p.slice(1).reduce((s, q, i) => s + km(p[i], q), 0);
  let best = len(pts);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < pts.length - 2; i++) {
      for (let j = i + 1; j < pts.length - 1; j++) {
        const cand = [...pts.slice(0, i), ...pts.slice(i, j + 1).reverse(), ...pts.slice(j + 1)];
        const l = len(cand);
        if (l < best - 0.5) {
          pts.splice(0, pts.length, ...cand);
          best = l;
          improved = true;
        }
      }
    }
  }
  return (pts.slice(1, -1) as Stop[]).map((s) => s.id);
}

/** Beste plek om een nieuwe stop in een bestaande (handmatige) volgorde te zetten. */
export function insertAt(order: Stop[], s: Stop, arrive: AirportCode, depart: AirportCode): number {
  const pts = [AIRPORTS[arrive], ...order, AIRPORTS[depart]];
  let bestI = order.length;
  let bestCost = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cost = km(pts[i], s) + km(s, pts[i + 1]) - km(pts[i], pts[i + 1]);
    if (cost < bestCost) {
      bestCost = cost;
      bestI = i;
    }
  }
  return bestI;
}

/**
 * GROVE schatting van de rijtijd in uren: hemelsbreed × 1,3 (wegen lopen niet recht) bij gemiddeld 45 km/u.
 * Vervangen door een routedienst (echte wegen en tijden) zodra die gekozen is.
 */
export function roadHours(kmStraight: number) {
  return Math.max(0.5, Math.round(((kmStraight * 1.3) / 45) * 2) / 2);
}

/** Welke vervoerswijzen kunnen tussen twee punten: over land rijden of vliegen; met water ertussen boot of vliegen. */
export function modeOptions(a: { island?: boolean; lat: number; lon: number }, b: { island?: boolean; lat: number; lon: number }): Mode[] {
  const d = km(a, b);
  if (a.island && b.island && d < 60) return ['road'];
  if (a.island || b.island) return ['boat', 'flight'];
  return ['road', 'flight'];
}

export type Advice = 'good' | 'long' | 'fly';
/** Advies voor een rit op basis van de (geschatte) rijtijd: tot 5 uur goed, 5–8 uur lang, meer dan 8 uur liever vliegen. */
export function driveAdvice(hours: number): Advice {
  if (hours > 8) return 'fly';
  if (hours >= 5) return 'long';
  return 'good';
}

/** Langste rit op één dag (uren). Daarboven is een overnachting onderweg nodig. Eigen keuze, geen officiële regel. */
export const MAX_DRIVE_DAY = 8;
/** Aantal overnachtingen onderweg voor een rit van zoveel uur. */
export function stopoversFor(hours: number) {
  return Math.max(0, Math.ceil(hours / MAX_DRIVE_DAY) - 1);
}

/**
 * Aangeraden vervoer: rijden zolang het in één dag kan (tot MAX_DRIVE_DAY uur), anders vliegen.
 * Met water ertussen: boot als het kort is, rijden + boot als dat in één dag kan, anders vliegen.
 */
export function recommendedMode(a: { island?: boolean; lat: number; lon: number }, b: { island?: boolean; lat: number; lon: number }): Mode {
  const options = modeOptions(a, b);
  if (options.length === 1) return options[0];
  const d = km(a, b);
  if (options.includes('boat')) return d <= 120 || roadHours(d) <= MAX_DRIVE_DAY ? 'boat' : 'flight';
  return roadHours(d) <= MAX_DRIVE_DAY ? 'road' : 'flight';
}

// ─── Vliegvelden en safari-landingsbanen (data/airstrips.json, bron: OurAirports) ───────────────────────

export type Strip = { key: string; name: string; label: string; lat: number; lon: number; island: boolean; airlines: string[] };
type RawStrip = { key: string; name: string; iata: string | null; icao: string | null; lat: number; lon: number; airlines: string[] };

/** Korte naam: zonder 'Airport', 'Airstrip' of de uitleg tussen haakjes. */
const shortName = (n: string) => n.replace(/\s*\(.*?\)/g, '').replace(/\b(International Airport|Airport|Airstrip|Aerodrome)\b/g, '').trim();
export const STRIPS: Strip[] = (airstripData.airfields as RawStrip[]).map((s) => ({
  key: s.key,
  name: shortName(s.name),
  label: s.iata ?? shortName(s.name),
  lat: s.lat,
  lon: s.lon,
  island: s.key === 'zanzibar',
  airlines: s.airlines,
}));
/** De grote vliegvelden als landingsbaan (aankomst en vertrek). */
export const STRIP_OF: Record<AirportCode, string> = { JRO: 'kilimanjaro', DAR: 'dar', ZNZ: 'zanzibar' };
export const stripByKey = (k: string) => STRIPS.find((s) => s.key === k)!;

/**
 * Dichtstbijzijnde vliegveld of landingsbaan met lijnvluchten (volgens de dienstregelingen die we lazen).
 * Zonder lijnvluchten in de buurt: de dichtstbijzijnde met een bron.
 */
export function nearestStrip(p: { lat: number; lon: number }): Strip {
  const withFlights = STRIPS.filter((s) => s.airlines.length);
  const pool = withFlights.length ? withFlights : STRIPS;
  return [...pool].sort((a, b) => km(p, a) - km(p, b))[0];
}
