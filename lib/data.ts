/**
 * Datalaag. Leest nu uit data/seed.json; in stap 1b wordt dit vervangen door Supabase-queries
 * met dezelfde functienamen, zodat pagina's niet hoeven te veranderen.
 */
import seed from '@/data/seed.json';
import tanzania from '@/data/tanzania.json';
import staysData from '@/data/stays.json';
import kindsData from '@/data/kinds.json';
import activityPlans from '@/data/activity-plans.json';
import roadNotes from '@/data/road-notes.json';
import { fallbackLocale, type Locale } from '@/lib/i18n/config';

export type Kind = 'safari' | 'island' | 'beach' | 'lake' | 'nature' | 'mountain' | 'culture' | 'city';
export const kinds: Kind[] = ['safari', 'island', 'beach', 'lake', 'nature', 'mountain', 'culture', 'city'];
/** Soorten per plek (data/kinds.json): eerste = hoofdsoort. Plekken zonder regel houden hun oude soort. */
const kindsOf = new Map(
  Object.entries(kindsData).filter(([k]) => !k.startsWith('_')).map(([id, ks]) => [id, ks as Kind[]]),
);
/** Vertaalde tekst. Engels is verplicht; andere talen vallen erop terug als ze ontbreken. */
export type Translated = Partial<Record<Locale, string>> & { en: string };
export const tr = (t: Translated, locale: Locale): string => t[locale] || t[fallbackLocale] || t.en;

export type Region = { id: string; name: Translated };
export type Country = {
  id: string;
  regionId: string;
  name: Translated;
  airport: string | null;
  /** 'avoid' = negatief reisadvies voor het hele land. Voorlopig, nog niet geverifieerd. */
  advisory: 'avoid' | null;
};
export type Destination = {
  id: string;
  countryId: string;
  name: string;
  kind: Kind;
  tagline: Translated;
  lat: number;
  lon: number;
  defaultNights: number;
  canFly: boolean;
  hasWater: boolean;
  mountain: boolean;
  advisory: 'avoid' | null;
};
export type Activity = { id: string; name: Translated };

/** Verblijf van een partner. Prijs per persoon per nacht. Wordt in fase 2 door partners zelf ingevuld. */
export type StayType = 'camp' | 'lodge' | 'luxe' | 'hotel' | 'bungalow' | 'resort' | 'villa';
export type Stay = {
  id: string;
  destinationId: string;
  partnerId: string | null;
  type: StayType;
  name: string;
  priceFrom: number | null;
  currency: string;
  /** Aanrader van Gnutube (redactie of lokale partner). */
  recommended?: boolean;
  /** Echte beoordeling met bron, bv. 8.7 volgens een reviewsite; null = onbekend. Nooit verzinnen. */
  rating?: number | null;
  ratingSource?: string | null;
  /** Korte omschrijving per taal: waarom dit verblijf fijn is. */
  highlight?: Translated | null;
};

/** Verblijf zoals de reisplanner het gebruikt (vertaald). */
export type TripStay = {
  id: string;
  name: string;
  type: StayType;
  priceFrom: number | null;
  currency: string;
  recommended: boolean;
  rating: number | null;
  ratingSource: string | null;
  highlight: string | null;
  /** Website of boekingspagina van het verblijf. */
  url?: string | null;
};

/**
 * Welke landen de site nu toont. null = heel Afrika.
 * Voor een realistische eerste versie gaat de site alleen over Tanzania; de andere landen blijven in de data
 * staan en komen terug door dit op null te zetten (of meer landen toe te voegen).
 */
export const SCOPE: string[] | null = ['tz'];

type ExtraPlace = Destination & { area: string; activities: string[] };
const extra = tanzania.places as ExtraPlace[];

/** Gebieden binnen Tanzania. Zolang de site alleen Tanzania toont, zijn dit de 'regio's'. */
const areas = tanzania.areas as Region[];
const areaOf = new Map<string, string>([
  ...Object.entries(tanzania.areaOf as Record<string, string>),
  ...extra.map((p) => [p.id, p.area] as [string, string]),
]);
const tanzaniaOnly = SCOPE !== null && SCOPE.length === 1 && SCOPE[0] === 'tz';

const regions = (tanzaniaOnly ? areas : seed.regions) as Region[];
const countries = (seed.countries as Country[]).filter((c) => !SCOPE || SCOPE.includes(c.id));
const destinations = [
  ...(seed.destinations as Destination[]),
  ...extra.map((p): Destination => ({
    id: p.id, countryId: p.countryId, name: p.name, kind: p.kind, tagline: p.tagline, lat: p.lat, lon: p.lon,
    defaultNights: p.defaultNights, canFly: p.canFly, hasWater: p.hasWater, mountain: p.mountain, advisory: p.advisory,
  })),
].filter((d) => !SCOPE || SCOPE.includes(d.countryId));
const activities = seed.activities as Activity[];
const stays = staysData as Stay[];
const links = [
  ...(seed.destinationActivities as { destinationId: string; activityId: string; seasonal: boolean }[]),
  ...extra.flatMap((p) => p.activities.map((a) => ({ destinationId: p.id, activityId: a, seasonal: false }))),
];

const countryById = new Map(countries.map((c) => [c.id, c]));
const regionById = new Map([...(seed.regions as Region[]), ...areas].map((r) => [r.id, r]));
const activityById = new Map(activities.map((a) => [a.id, a]));

/** Platte, vertaalde weergave van een bestemming: klaar voor kaarten, lijsten en de kaart. */
export type Place = {
  id: string;
  name: string;
  /** Hoofdsoort: bepaalt kleur, affiche en label. */
  kind: Kind;
  /** Alle soorten waaronder de plek gevonden wordt (hoofdsoort eerst). */
  kinds: Kind[];
  tagline: string;
  lat: number;
  lon: number;
  countryId: string;
  country: string;
  regionId: string;
  region: string;
  advisory: boolean;
  mountain: boolean;
  hasWater: boolean;
  defaultNights: number;
  activities: string[];
  /** Laagste prijs p.p.p.n. in euro over alle verblijven; null = nog onbekend. */
  priceFrom: number | null;
};

/**
 * Laagste bekende prijs in euro. Prijzen in een andere valuta tellen (nog) niet mee:
 * omrekenen vraagt een koersbron, en die is nog niet gekozen.
 */
function eurPrices(destinationId: string): number[] {
  return stays
    .filter((s) => s.destinationId === destinationId && s.currency === 'EUR' && typeof s.priceFrom === 'number')
    .map((s) => s.priceFrom as number)
    .sort((a, b) => a - b);
}

export function getStays(destinationId: string): Stay[] {
  return stays
    .filter((s) => s.destinationId === destinationId)
    .sort((a, b) => (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity));
}

function toPlace(d: Destination, locale: Locale): Place {
  const c = countryById.get(d.countryId)!;
  // Alleen Tanzania: de 'regio' van een plek is het gebied binnen Tanzania
  const r = regionById.get(tanzaniaOnly ? (areaOf.get(d.id) ?? 'north') : c.regionId)!;
  return {
    id: d.id,
    name: d.name,
    kind: (kindsOf.get(d.id) ?? [d.kind])[0],
    kinds: kindsOf.get(d.id) ?? [d.kind],
    tagline: tr(d.tagline, locale),
    lat: d.lat,
    lon: d.lon,
    countryId: c.id,
    country: tr(c.name, locale),
    regionId: r.id,
    region: tr(r.name, locale),
    advisory: d.advisory === 'avoid' || c.advisory === 'avoid',
    mountain: d.mountain,
    hasWater: d.hasWater,
    defaultNights: d.defaultNights,
    activities: links
      .filter((l) => l.destinationId === d.id)
      .map((l) => { const a = activityById.get(l.activityId); return a ? tr(a.name, locale) : undefined; })
      .filter((x): x is string => !!x),
    priceFrom: eurPrices(d.id)[0] ?? null,
  };
}

export function getPlaces(locale: Locale): Place[] {
  return destinations.map((d) => toPlace(d, locale));
}

/** Activiteit bij een plek, met (indien bekend) duur in nachten en prijs per persoon. */
export type PlaceActivity = { id: string; name: string; nights: number | null; price: number | null; currency: string; checked: boolean };

/** Activiteiten van een plek, met de duur en prijs uit data/activity-plans.json (null = nog onbekend). */
export function getPlaceActivities(placeId: string, locale: Locale): PlaceActivity[] {
  const plans = activityPlans as Record<string, unknown>;
  return links
    .filter((l) => l.destinationId === placeId)
    .map((l) => {
      const a = activityById.get(l.activityId);
      if (!a) return null;
      const plan = plans[`${placeId}:${l.activityId}`] as
        | { nights: number | null; price: number | null; currency: string; checked: boolean }
        | undefined;
      return {
        id: l.activityId,
        name: tr(a.name, locale),
        nights: plan?.nights ?? null,
        price: plan?.price ?? null,
        currency: plan?.currency ?? 'EUR',
        checked: plan?.checked ?? false,
      };
    })
    .filter((x): x is PlaceActivity => !!x);
}

export function getPlace(id: string, locale: Locale): Place | null {
  const d = destinations.find((x) => x.id === id);
  return d ? toPlace(d, locale) : null;
}

export function getPlaceIds(): string[] {
  return destinations.map((d) => d.id);
}

export function getRegions(locale: Locale) {
  return regions.map((r) => ({ id: r.id, name: tr(r.name, locale) }));
}

export function getCountries(locale: Locale) {
  return countries
    .map((c) => ({ id: c.id, regionId: c.regionId, name: tr(c.name, locale), advisory: c.advisory === 'avoid' }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Haversine-afstand in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const dLa = (b.lat - a.lat) * r;
  const dLo = (b.lon - a.lon) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function nearby(place: Place, all: Place[], count = 3) {
  return all
    .filter((p) => p.id !== place.id)
    .map((p) => ({ place: p, km: Math.round(distanceKm(place, p)) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}

/** Kennis van een lokale partner over een traject (mooi / opletten), in beide richtingen; null = niets bekend. */
export type RoadNote = { scenic: string | null; caution: string | null; source: string; checked: string };
export function getRoadNotes(locale: Locale): Record<string, RoadNote> {
  const out: Record<string, RoadNote> = {};
  for (const [key, v] of Object.entries(roadNotes as Record<string, unknown>)) {
    if (key.startsWith('_') || !v || typeof v !== 'object') continue;
    const n = v as { scenic?: Translated | null; caution?: Translated | null; source?: string; checked?: string };
    const note = {
      scenic: n.scenic ? tr(n.scenic, locale) : null,
      caution: n.caution ? tr(n.caution, locale) : null,
      source: n.source ?? '',
      checked: n.checked ?? '',
    };
    const [a, b] = key.split('>');
    out[`${a}>${b}`] = note;
    out[`${b}>${a}`] = note;
  }
  return out;
}

export function getTripStays(destinationId: string, locale: Locale): TripStay[] {
  return getStays(destinationId).map((st) => ({
    id: st.id,
    name: st.name,
    type: st.type,
    priceFrom: st.priceFrom,
    currency: st.currency,
    recommended: !!st.recommended,
    rating: st.rating ?? null,
    ratingSource: st.ratingSource ?? null,
    highlight: st.highlight ? tr(st.highlight, locale) : null,
  }));
}

/** Namen van landen (ook buiten de getoonde selectie), bv. de buurlanden op de kaart. */
export function getCountryNames(ids: string[], locale: Locale): { id: string; name: string }[] {
  const all = seed.countries as { id: string; name: Translated }[];
  return ids.flatMap((id) => {
    const c = all.find((x) => x.id === id);
    return c ? [{ id, name: tr(c.name, locale) }] : [];
  });
}
