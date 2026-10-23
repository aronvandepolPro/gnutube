'use client';

/**
 * Wat de bezoeker in de videofeed kiest, bewaard in de opslag van zijn browser. Is hij ingelogd, dan zet
 * lib/account.ts dit ook in zijn account (zodat het op elk apparaat staat):
 *  - trip:  plekken die in de reis moeten (naar rechts geveegd)
 *  - liked: video's die hij leuk vindt (♥ of dubbel tikken)
 *  - nope:  plekken die niets voor hem zijn (naar links geveegd)
 */
type Key = 'trip' | 'liked' | 'nope';
const STORAGE: Record<Key, string> = { trip: 'kt-trip', liked: 'kt-liked', nope: 'kt-nope' };
const EVENT = 'kt-trip-change';
const EMPTY: string[] = [];
const cache: Partial<Record<Key, { raw: string | null; list: string[] }>> = {};

export function readList(key: Key): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE[key]);
  } catch {
    return EMPTY;
  }
  // Zelfde lijst-object teruggeven zolang er niets veranderde (nodig voor useSyncExternalStore)
  const c = cache[key];
  if (c && c.raw === raw) return c.list;
  let list: string[] = EMPTY;
  try {
    const v = JSON.parse(raw ?? '[]');
    if (Array.isArray(v)) list = v.filter((x) => typeof x === 'string');
  } catch {
    /* kapotte waarde: leeg */
  }
  cache[key] = { raw, list };
  return list;
}

function write(key: Key, list: string[]) {
  try {
    localStorage.setItem(STORAGE[key], JSON.stringify(list));
  } catch {
    /* geen opslag beschikbaar */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function add(key: Key, id: string) {
  const list = readList(key);
  if (!list.includes(id)) write(key, [...list, id]);
}
export function remove(key: Key, id: string) {
  write(key, readList(key).filter((x) => x !== id));
}
export function toggle(key: Key, id: string) {
  if (readList(key).includes(id)) remove(key, id);
  else add(key, id);
}

export function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
export const serverList = () => EMPTY;

/** Instellingen van de route (ook alleen in deze browser). null = automatisch. */
export type RouteSettings = {
  order: string[] | null;
  nights: Record<string, number>;
  start: string | null; // JJJJ-MM-DD
  arrive: string | null;
  depart: string | null;
  home: string;
  people: number;
  /** Gekozen verblijf per plek (stay-id). */
  stays: Record<string, string>;
  /** 'own' = bezoeker heeft al een vlucht (aankomst = start, vertrek = end); 'arrange' = Gnutube zoekt de vlucht. */
  flightMode: 'own' | 'arrange';
  /** Vertrekdatum bij een eigen vlucht (JJJJ-MM-DD). */
  end: string | null;
  /** Gekozen activiteiten per plek (activiteit-id's). */
  acts: Record<string, string[]>;
  /** Zelf gekozen vervoer per stuk, sleutel 'van>naar' (plek-id of vliegveldcode). */
  legModes: Record<string, 'road' | 'flight' | 'boat'>;
  /** Budget voor overnachtingen: per persoon per nacht, of voor alle overnachtingen samen. null = geen voorkeur. */
  budget: { mode: 'night' | 'trip'; amount: number | null; currency: string };
  /** Aantal reizigers per plek als dat afwijkt van de hele groep (bv. 2 van de 4 beklimmen de Kilimanjaro). */
  peopleAt: Record<string, number>;
  /** Naam van de reis (leeg = 'Mijn reis'). */
  name: string;
  /** De bezoeker heeft het venster 'Maak je reis' ingevuld of overgeslagen. */
  setupDone: boolean;
};
const ROUTE_KEY = 'kt-route';
const ROUTE_DEFAULT: RouteSettings = { order: null, nights: {}, start: null, arrive: null, depart: null, home: '', people: 2, stays: {}, flightMode: 'arrange', end: null, acts: {}, legModes: {}, budget: { mode: 'night', amount: null, currency: 'EUR' }, peopleAt: {}, name: '', setupDone: false };
let routeCache: { raw: string | null; value: RouteSettings } | null = null;

export function readRoute(): RouteSettings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(ROUTE_KEY);
  } catch {
    return ROUTE_DEFAULT;
  }
  if (routeCache && routeCache.raw === raw) return routeCache.value;
  let value = ROUTE_DEFAULT;
  try {
    value = { ...ROUTE_DEFAULT, ...(JSON.parse(raw ?? '{}') as Partial<RouteSettings>) };
  } catch {
    /* kapotte waarde: standaard */
  }
  routeCache = { raw, value };
  return value;
}
export function updateRoute(patch: Partial<RouteSettings>) {
  try {
    localStorage.setItem(ROUTE_KEY, JSON.stringify({ ...readRoute(), ...patch }));
  } catch {
    /* geen opslag */
  }
  window.dispatchEvent(new Event(EVENT));
}
export const serverRoute = () => ROUTE_DEFAULT;

/** Alles in één keer vervangen (bij het ophalen uit het account). */
export function replaceAll(data: { trip?: string[]; liked?: string[]; nope?: string[]; route?: Partial<RouteSettings> | null }) {
  try {
    if (data.trip) localStorage.setItem(STORAGE.trip, JSON.stringify(data.trip));
    if (data.liked) localStorage.setItem(STORAGE.liked, JSON.stringify(data.liked));
    if (data.nope) localStorage.setItem(STORAGE.nope, JSON.stringify(data.nope));
    if (data.route) localStorage.setItem(ROUTE_KEY, JSON.stringify({ ...ROUTE_DEFAULT, ...data.route }));
  } catch {
    /* geen opslag */
  }
  window.dispatchEvent(new Event(EVENT));
}
/** Alles wissen in deze browser (bij uitloggen, zodat een volgende gebruiker van dit apparaat het niet ziet). */
export function clearAll() {
  try {
    for (const k of Object.values(STORAGE)) localStorage.removeItem(k);
    localStorage.removeItem(ROUTE_KEY);
  } catch {
    /* geen opslag */
  }
  window.dispatchEvent(new Event(EVENT));
}
export const CHANGE_EVENT = EVENT;

/** Wat er nodig is om een leeggemaakte reis terug te zetten. */
export type TripSnapshot = { trip: string[]; route: RouteSettings };
/**
 * Alle plekken uit de reis halen, met wat er per plek bij hoort (volgorde, nachten, verblijven, activiteiten,
 * vervoer, reizigers per plek). Datums, vluchten, budget en het aantal reizigers blijven staan.
 * Geeft terug wat er stond, voor "ongedaan maken".
 */
export function clearTrip(): TripSnapshot {
  const snap = { trip: readList('trip'), route: readRoute() };
  write('trip', []);
  updateRoute({ order: null, nights: {}, stays: {}, acts: {}, legModes: {}, peopleAt: {} });
  return snap;
}
export function restoreTrip(snap: TripSnapshot) {
  replaceAll({ trip: snap.trip, route: snap.route });
}

