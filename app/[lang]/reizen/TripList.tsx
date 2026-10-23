'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AuctionStart } from '@/components/AuctionStart';
import { toTripStay, useDbStays } from '@/lib/stays-db';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';
import type { Kind, PlaceActivity, RoadNote, TripStay } from '@/lib/data';
import { clearTrip, readList, readRoute, remove, restoreTrip, serverList, serverRoute, subscribe, updateRoute, type TripSnapshot } from '@/lib/trip-store';
import { DoneTrips, type DoneTripsLabels } from '@/components/DoneTrips';
import { TripSetup, type TripSetupLabels } from '@/components/TripSetup';
import { RouteMap } from '@/components/RouteMap';
import { AIRPORTS, driveAdvice, insertAt, km, modeOptions, nearestAirport, nearestStrip, planOrder, recommendedMode, roadHours, STRIP_OF, stopoversFor, stripByKey, type AirportCode, type Mode, type Stop } from '@/lib/route';

export type TripPlace = {
  id: string;
  name: string;
  kind: Kind;
  region: string;
  tagline: string;
  nights: number;
  lat: number;
  lon: number;
  island: boolean;
  image: ReactNode;
  /** Beste reistijd (maanden 1–12) met bron op de plekpagina; null = nog onbekend. Leeg label = het hele jaar. */
  season?: { best: number[]; also: number[]; label: string } | null;
  /** tiktokId's van video's van deze plek (om 'leuk gevonden' te koppelen) */
  videoIds: string[];
  /** Activiteiten die bij de plek horen, met duur en prijs als die bekend zijn. */
  activities: PlaceActivity[];
  /** Bekende verblijven (uit data/stays.json); prijs p.p.p.n. of null = onbekend. */
  stays: TripStay[];
};

type T = Dictionary['swipe'] & Dictionary['route'] & { kind: Dictionary['kind']; setup: TripSetupLabels; done: DoneTripsLabels; auction: Dictionary['auction']; account: Dictionary['account'] };
const CODES = Object.keys(AIRPORTS) as AirportCode[];
const isCode = (c: string | null): c is AirportCode => !!c && c in AIRPORTS;

/** Kies aankomst- en vertrekvliegveld waarbij de route het kortst is. */
function bestAirports(stops: Stop[]): { arrive: AirportCode; depart: AirportCode } {
  let best = { arrive: 'JRO' as AirportCode, depart: 'JRO' as AirportCode, len: Infinity };
  for (const a of CODES)
    for (const d of CODES) {
      const order = planOrder(stops, a, d).map((id) => stops.find((s) => s.id === id)!);
      const pts = [AIRPORTS[a], ...order, AIRPORTS[d]];
      const len = pts.slice(1).reduce((s, q, i) => s + km(pts[i], q), 0);
      if (len < best.len) best = { arrive: a, depart: d, len };
    }
  return best;
}

/** Valuta's om een budget in op te geven. Verblijven in een andere valuta worden niet vergeleken (geen koersbron). */
const BUDGET_CURRENCIES = ['EUR', 'USD', 'GBP', 'TZS'];

const ICON: Record<Mode, string> = { road: '🚙', flight: '✈️', boat: '⛴️' };

/**
 * Mijn reis: een automatische route langs de plekken die je in de video's naar rechts veegde, die je zelf kunt
 * aanpassen (volgorde, nachten, startdatum, vliegvelden). Daaronder de vluchten die bij de reis passen (zoeken
 * komt zodra er een vluchtdienst is gekozen) en wat je leuk vond. Alles staat in de opslag van de browser.
 */
export function TripList({ locale, places: placesIn, roadNotes = {}, t }: { locale: Locale; places: TripPlace[]; roadNotes?: Record<string, RoadNote>; t: T }) {
  // Verblijven die beheer in de database zette, erbij (met bron); zonder database alleen de vaste lijst
  const dbStays = useDbStays();
  const places = useMemo(
    () =>
      dbStays.length
        ? placesIn.map((p) => ({ ...p, stays: [...p.stays, ...dbStays.filter((s) => s.place_id === p.id).map(toTripStay)] }))
        : placesIn,
    [placesIn, dbStays],
  );
  const trip = useSyncExternalStore(subscribe, () => readList('trip'), serverList);
  /** Reis leegmaken: eerst vragen; daarna even "ongedaan maken" aanbieden. */
  const [askClear, setAskClear] = useState(false);
  const [undo, setUndo] = useState<TripSnapshot | null>(null);
  /** 'Je reis' aanpassen (naam, wanneer, reizigers). */
  const [editing, setEditing] = useState(false);
  const liked = useSyncExternalStore(subscribe, () => readList('liked'), serverList);
  const route = useSyncExternalStore(subscribe, readRoute, serverRoute);

  const byId = new Map(places.map((p) => [p.id, p]));
  const chosen = trip.map((id) => byId.get(id)).filter((p): p is TripPlace => !!p);
  const stops: Stop[] = chosen.map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, island: p.island }));

  // Vliegvelden: zelf gekozen, anders de kortste combinatie
  // Met een eigen volgorde: het vliegveld dat het dichtst bij de eerste en de laatste stop ligt
  let auto = bestAirports(stops);
  if (route.order) {
    const firstId = route.order.find((id) => trip.includes(id));
    const lastId = [...route.order].reverse().find((id) => trip.includes(id));
    const first = stops.find((x) => x.id === firstId);
    const last = stops.find((x) => x.id === lastId);
    if (first && last) auto = { arrive: nearestAirport(first), depart: nearestAirport(last) };
  }
  const arrive = isCode(route.arrive) ? route.arrive : auto.arrive;
  const depart = isCode(route.depart) ? route.depart : auto.depart;

  // Volgorde: zelf aangepast (nieuwe plekken op de beste plek ertussen), anders automatisch
  let orderIds: string[];
  if (route.order) {
    const kept = route.order.filter((id) => trip.includes(id));
    const ordered = kept.map((id) => stops.find((s) => s.id === id)!);
    for (const s of stops.filter((x) => !kept.includes(x.id))) ordered.splice(insertAt(ordered, s, arrive, depart), 0, s);
    orderIds = ordered.map((s) => s.id);
  } else orderIds = planOrder(stops, arrive, depart);
  const ordered = orderIds.map((id) => byId.get(id)!).filter(Boolean);
  const manual = !!(route.order || route.arrive || route.depart);
  /** Beste route: automatische volgorde en vliegvelden, aangeraden vervoer, beste verblijf, nachten volgens plek en activiteiten. */
  const isBest = !manual && !Object.keys(route.legModes).length && !Object.keys(route.stays).length && !Object.keys(route.nights).length;
  const bestRoute = () => updateRoute({ order: null, arrive: null, depart: null, legModes: {}, stays: {}, nights: {} });
  /** Reizigers op een plek: de hele groep, tenzij je daar minder opgaf. */
  const peopleAt = (p: { id: string }) => Math.max(1, Math.min(route.people, route.peopleAt?.[p.id] ?? route.people));
  const setPeopleAt = (id: string, n: number) => {
    const next = { ...(route.peopleAt ?? {}) };
    if (n >= route.people) delete next[id];
    else next[id] = Math.max(1, n);
    updateRoute({ peopleAt: next });
  };
  /**
   * Laat alles regelen: de reis zo praktisch mogelijk maken (volgorde, vervoer, verblijven binnen budget, nachten
   * volgens plek en activiteiten). Met een eigen vlucht blijven je vliegvelden staan en passen de nachten precies
   * tussen aankomst en vertrek. Daarna naar de aanvraag.
   */
  const pendingArrange = useRef(false);
  const [arranged, setArranged] = useState(0);
  const arrangeAll = () => {
    updateRoute({ order: null, legModes: {}, stays: {}, nights: {}, ...(route.flightMode === 'own' ? {} : { arrive: null, depart: null }) });
    pendingArrange.current = true;
    setArranged(Date.now());
    window.setTimeout(() => setArranged(0), 7000);
  };

  // Gekozen activiteiten per plek; een activiteit met een bekende duur bepaalt minstens zoveel nachten
  const actsOf = (p: TripPlace) => p.activities.filter((a) => (route.acts[p.id] ?? []).includes(a.id));
  const actNights = (p: TripPlace) => actsOf(p).reduce((n, a) => n + (a.nights ?? 0), 0);
  const nightsOf = (p: TripPlace) => Math.max(1, route.nights[p.id] ?? Math.max(p.nights, actNights(p) ? actNights(p) + 1 : 0));
  const toggleAct = (p: TripPlace, id: string) => {
    const cur = route.acts[p.id] ?? [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    // Eigen aantal nachten loslaten, zodat de duur van de activiteit meetelt
    const nights = { ...route.nights };
    delete nights[p.id];
    updateRoute({ acts: { ...route.acts, [p.id]: next }, nights });
  };
  const nameOf = (id: string) => byId.get(id)?.name ?? (isCode(id) ? AIRPORTS[id].name : id);
  const placeNights = ordered.reduce((n, p) => n + nightsOf(p), 0);

  // Alle stukken van de reis, met het gekozen of automatische vervoer
  type Pt = { lat: number; lon: number; island?: boolean };
  const nodes: { id: string; pt: Pt }[] = [
    { id: arrive, pt: AIRPORTS[arrive] },
    ...ordered.map((p) => ({ id: p.id, pt: p as Pt })),
    { id: depart, pt: AIRPORTS[depart] },
  ];
  const legs = nodes.slice(1).map((to, i) => {
    const from = nodes[i];
    const key = `${from.id}>${to.id}`;
    const options = modeOptions(from.pt, to.pt);
    const chosenMode = route.legModes[key];
    const mode = chosenMode && options.includes(chosenMode) ? chosenMode : recommendedMode(from.pt, to.pt);
    const dist = km(from.pt, to.pt);
    const hours = roadHours(dist);
    // Rijden (ook rijden + boot): te lang voor één dag = overnachting(en) onderweg
    const driving = mode === 'road' || (mode === 'boat' && dist > 120);
    // Vliegen: eerst naar het dichtstbijzijnde vliegveld of de landingsbaan met lijnvluchten, na de vlucht naar de plek
    const ground = (id: string, pt: Pt) => {
      if (isCode(id)) return { strip: stripByKey(STRIP_OF[id]), km: 0, hours: 0, mode: 'road' as Mode };
      const strip = nearestStrip(pt);
      const d = km(pt, strip);
      return { strip, km: d, hours: roadHours(d), mode: (pt.island && !strip.island && d > 30 ? 'boat' : 'road') as Mode };
    };
    const fly = mode === 'flight' ? { a: ground(from.id, from.pt), b: ground(to.id, to.pt) } : null;
    return { key, from, to, options, mode, dist, hours, driving, stopovers: driving ? stopoversFor(hours) : 0, fly };
  });
  const stopNights = legs.reduce((n, l) => n + l.stopovers, 0);
  const totalNights = placeNights + stopNights;
  /** Dag (vanaf 0) waarop je bij stop i aankomt: nachten van de stops ervoor plus overnachtingen onderweg. */
  const startOf = (i: number) =>
    ordered.slice(0, i).reduce((n, q) => n + nightsOf(q), 0) + legs.slice(0, i + 1).reduce((n, l) => n + l.stopovers, 0);

  // Budget omgerekend naar per persoon per nacht (zelfde valuta als het budget)
  const budget = route.budget;
  const budgetNight =
    budget.amount === null ? null : budget.mode === 'night' ? budget.amount : budget.amount / Math.max(1, route.people * totalNights);
  /** Past een verblijf in het budget? null = onbekend (geen budget, geen prijs of andere valuta). */
  const fits = (st: TripStay) =>
    budgetNight === null || st.priceFrom === null || st.currency !== budget.currency ? null : st.priceFrom <= budgetNight;
  /** Aanraders eerst: past in budget, aanrader van Gnutube, beoordeling, prijs. */
  const ranked = (p: TripPlace) => {
    const fitScore = (st: TripStay) => (fits(st) === true ? 0 : fits(st) === null ? 1 : 2);
    return [...p.stays].sort(
      (a, b) =>
        fitScore(a) - fitScore(b) ||
        Number(b.recommended) - Number(a.recommended) ||
        (b.rating ?? -1) - (a.rating ?? -1) ||
        (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity),
    );
  };
  // Verblijf per stop: zelf gekozen, anders de beste aanrader
  const stayOf = (p: TripPlace) => p.stays.find((st) => st.id === route.stays[p.id]) ?? ranked(p)[0] ?? null;
  // Kosten: alleen echte prijzen optellen (per valuta), de rest als 'nog geen prijs' tonen
  const costByCurrency = new Map<string, number>();
  const unpriced: string[] = [];
  for (const p of ordered) {
    const st = stayOf(p);
    if (st && st.priceFrom !== null) costByCurrency.set(st.currency, (costByCurrency.get(st.currency) ?? 0) + st.priceFrom * nightsOf(p) * peopleAt(p));
    else unpriced.push(p.name);
  }
  if (stopNights) unpriced.push(format(t.stopoverCost, { n: stopNights }, locale));
  const actCost = new Map<string, number>();
  const actUnpriced: string[] = [];
  for (const p of ordered)
    for (const a of actsOf(p)) {
      if (a.price !== null) actCost.set(a.currency, (actCost.get(a.currency) ?? 0) + a.price * peopleAt(p));
      else actUnpriced.push(`${a.name} (${p.name})`);
    }
  const money = (n: number, cur: string) => n.toLocaleString(locale, { style: 'currency', currency: cur, maximumFractionDigits: 0 });

  // Datums
  const start = route.start ? new Date(`${route.start}T12:00:00`) : null;
  const fmt = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  const dayAt = (offset: number) => {
    if (!start) return null;
    const d = new Date(start);
    d.setDate(d.getDate() + offset);
    return d;
  };
  const endDate = dayAt(totalNights);

  // Seizoen: hoe goed past elke maand bij de plekken in je reis (2 = beste tijd, 1 = ook goed)
  const withSeason = ordered.filter((p) => p.season);
  const fitOf = (p: TripPlace, m: number) => (!p.season ? 0 : p.season.best.includes(m) ? 2 : p.season.also.includes(m) ? 1 : 0);
  const monthScore = Array.from({ length: 12 }, (_, i) => withSeason.reduce((n, p) => n + fitOf(p, i + 1), 0));
  const monthGood = Array.from({ length: 12 }, (_, i) => withSeason.filter((p) => fitOf(p, i + 1) === 2).length);
  const topScore = Math.max(0, ...monthScore);
  const travelMonth = start ? start.getMonth() + 1 : null;
  const monthName = (m: number, style: 'long' | 'short' = 'long') =>
    new Date(2024, m - 1, 1).toLocaleDateString(locale, { month: style }).replace('.', '');
  /** Maand kiezen: vertrek op de eerstvolgende 1e van die maand (deze maand zelf: over twee weken). */
  const pickMonth = (m: number) => {
    const now = new Date();
    let d: Date;
    if (m === now.getMonth() + 1) {
      d = new Date(now);
      d.setDate(d.getDate() + 14);
    } else d = new Date(m > now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1, m - 1, 1, 12);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    updateRoute({ start: iso });
  };

  // Eigen vlucht: past de route tussen aankomst en vertrek?
  const own = route.flightMode === 'own';
  const flightEnd = own && route.end ? new Date(`${route.end}T12:00:00`) : null;
  const avail = start && flightEnd ? Math.round((flightEnd.getTime() - start.getTime()) / 86400000) : null;
  /** Verdeel de beschikbare nachten over de stops, naar verhouding van de huidige verdeling (minstens 1). */
  const fitNights = () => {
    if (avail === null || avail - stopNights < ordered.length) return;
    const room = avail - stopNights;
    const cur = ordered.map((p) => nightsOf(p));
    const sum = cur.reduce((a, b) => a + b, 0);
    const raw = cur.map((n) => (n / sum) * room);
    const out = raw.map((x) => Math.max(1, Math.floor(x)));
    let rest = room - out.reduce((a, b) => a + b, 0);
    const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
    for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) out[order[k][1]]++;
    while (rest < 0) {
      const i = out.indexOf(Math.max(...out));
      out[i]--;
      rest++;
    }
    updateRoute({ nights: { ...route.nights, ...Object.fromEntries(ordered.map((p, i) => [p.id, out[i]])) } });
  };
  // Na 'Laat alles regelen' (zodra de nieuwe route er staat): nachten passend maken en naar de aanvraag
  useEffect(() => {
    if (!pendingArrange.current) return;
    pendingArrange.current = false;
    if (own && avail !== null && avail !== totalNights) fitNights();
    document.getElementById('regelen')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Dag voor dag: aankomst, reisdagen, dagen op een plek (met aanraders), vertrek
  type Day = { n: number; date: Date | null; place: TripPlace | null; what: string[]; sleep: string | null };
  const plan: Day[] = [];
  {
    let day = 0;
    ordered.forEach((p, i) => {
      const n = nightsOf(p);
      const st = stayOf(p);
      // Eerst de gekozen activiteiten (met hun duur), daarna aanraders, daarna vrije tijd
      const slots: string[] = [];
      for (const a of actsOf(p)) {
        const len = a.nights ?? 1;
        for (let d = 0; d < len; d++) slots.push(len > 1 ? format(t.actDay, { activity: a.name, d: d + 1, n: len }, locale) : format(t.planned, { activity: a.name }, locale));
      }
      const tips = p.activities.filter((a) => !actsOf(p).includes(a)).map((a) => format(t.suggested, { activity: a.name }, locale));
      // Overnachtingen onderweg naar deze plek
      for (let k = 0; k < legs[i].stopovers; k++) {
        plan.push({ n: day + 1, date: dayAt(day), place: null, what: [format(t.stopoverDay, { to: p.name }, locale)], sleep: t.sleepStopover });
        day++;
      }
      for (let k = 0; k < n; k++) {
        const what: string[] = [];
        if (k === 0) what.push(i === 0 ? format(t.arriveDay, { airport: AIRPORTS[arrive].name, place: p.name }, locale) : format(t.travelDay, { place: p.name }, locale));
        // Op de aankomstdag alleen iets inplannen als je er maar één nacht bent
        const slot = n === 1 || k > 0 ? (slots.shift() ?? (k > 0 || n === 1 ? tips.shift() : undefined)) : undefined;
        if (slot) what.push(slot);
        else if (k > 0) what.push(format(t.leisure, { place: p.name }, locale));
        plan.push({
          n: day + 1,
          date: dayAt(day),
          place: p,
          what,
          sleep: st ? format(t.sleepAt, { stay: st.name }, locale) : format(t.sleepTbd, { place: p.name }, locale),
        });
        day++;
      }
    });
    const lastLeg = legs[legs.length - 1];
    for (let k = 0; ordered.length && k < lastLeg.stopovers; k++) {
      plan.push({ n: day + 1, date: dayAt(day), place: null, what: [format(t.stopoverDay, { to: AIRPORTS[depart].name }, locale)], sleep: t.sleepStopover });
      day++;
    }
    if (ordered.length) plan.push({ n: day + 1, date: dayAt(day), place: null, what: [format(t.departDay, { airport: AIRPORTS[depart].name }, locale)], sleep: null });
  }

  const move = (i: number, dir: -1 | 1) => {
    const ids = [...orderIds];
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    updateRoute({ order: ids });
  };
  const setNights = (id: string, n: number) => updateRoute({ nights: { ...route.nights, [id]: Math.max(1, Math.min(21, n)) } });

  const legInfo = (l: (typeof legs)[number]) =>
    l.mode === 'road'
      ? `${l.dist} km · ± ${format(t.hours, { n: l.hours }, locale)}`
      : l.mode === 'boat' && l.dist > 120
        ? `🚙+⛴ ± ${format(t.hours, { n: l.hours }, locale)}`
        : `${l.mode === 'flight' ? '✈' : '⛴'} ${l.dist} km`;

  const leg = (i: number) => {
    const l = legs[i];
    return (
      <li key={l.key} className="ml-[52px] flex flex-wrap items-center gap-2 border-l-2 border-dashed border-rule py-2 pl-5 text-[13px] text-subtle">
        {/* Zelf kiezen: rijden, vliegen of boot (alleen wat kan) */}
        {l.options.length > 1 ? (
          <span className="inline-flex rounded-full border border-rule bg-white p-0.5" role="group" aria-label={t.transportLabel}>
            {l.options.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={l.mode === m}
                onClick={() => updateRoute({ legModes: { ...route.legModes, [l.key]: m } })}
                className="rounded-full px-2.5 py-1 text-[12px] font-medium text-muted transition-colors aria-pressed:bg-brand-dark aria-pressed:text-white"
              >
                {ICON[m]} {m === 'boat' && l.dist > 120 ? t.roadBoat : t[m]}
              </button>
            ))}
          </span>
        ) : (
          <span>
            {ICON[l.mode]} {t[l.mode]}
          </span>
        )}
        <span>
          ± {l.dist} km
          {(l.mode === 'road' || (l.mode === 'boat' && l.dist > 120)) && ` · ± ${format(t.hours, { n: l.hours }, locale)}`}
          {/* Bij vliegen: laat ook zien hoe lang rijden zou duren (als dat kan) */}
          {l.mode === 'flight' && l.options.includes('road') && ` · ${format(t.driveInstead, { n: format(t.hours, { n: l.hours }, locale) }, locale)}`}
        </span>
        {/* Vlucht: hoe je bij het vliegveld komt en weer weg */}
        {l.fly && (
          <span className="flex w-full flex-col gap-1 rounded-xl bg-white/70 p-2.5 text-[12.5px] text-muted">
            {l.fly.a.km > 0 && (
              <span>
                {ICON[l.fly.a.mode]} {format(t.toAirport, { airport: l.fly.a.strip.name }, locale)} · ± {l.fly.a.km} km · ± {format(t.hours, { n: l.fly.a.hours }, locale)}
              </span>
            )}
            {l.fly.a.strip.key === l.fly.b.strip.key ? (
              <span className="font-semibold text-[#8A5A12]">⚠️ {t.sameAirport}</span>
            ) : (
              <span className="font-semibold text-ink">
                ✈️ {format(t.flyBetween, { from: l.fly.a.strip.name, to: l.fly.b.strip.name }, locale)} · ± {km(l.fly.a.strip, l.fly.b.strip)} km
              </span>
            )}
            {l.fly.b.km > 0 && (
              <span>
                {ICON[l.fly.b.mode]} {format(t.fromAirport, { airport: l.fly.b.strip.name }, locale)} · ± {l.fly.b.km} km · ± {format(t.hours, { n: l.fly.b.hours }, locale)}
              </span>
            )}
            {(() => {
              // Maatschappijen die beide landingsbanen in hun dienstregeling hebben
              const both = l.fly.a.strip.airlines.filter((a) => l.fly!.b.strip.airlines.includes(a));
              return both.length ? <span className="text-[12px]">{format(t.flyAirlines, { airlines: both.join(', ') }, locale)}</span> : null;
            })()}
            {l.fly.a.hours + l.fly.b.hours >= 4 && (
              <span className="font-semibold text-[#8A5A12]">⚠️ {format(t.flyStillDrive, { n: format(t.hours, { n: l.fly.a.hours + l.fly.b.hours }, locale) }, locale)}</span>
            )}
            <span className="text-[11.5px] text-subtle">{t.airstripNote}</span>
          </span>
        )}
        {/* Advies: rijden of vliegen, en wat lokale partners over dit stuk weten */}
        {(l.options.includes('road') || (l.options.includes('boat') && l.dist > 120) || roadNotes[l.key]) && (() => {
          const advice = driveAdvice(l.hours);
          const note = roadNotes[l.key];
          const canDrive = l.options.includes('road') || (l.options.includes('boat') && l.dist > 120);
          const driving = l.driving;
          return (
            <span className="flex w-full flex-col gap-0.5 text-[12.5px]">
              {canDrive && !(l.fly && !l.driving && l.fly.a.hours + l.fly.b.hours >= 4) && (
                <span
                  className={
                    advice === 'good' ? 'text-[#2F6B2A]' : advice === 'long' ? 'text-[#8A5A12]' : driving ? 'font-semibold text-[#A33]' : 'text-[#8A5A12]'
                  }
                >
                  {advice === 'good'
                    ? `✅ ${t.adviceGood}`
                    : advice === 'long'
                      ? `⚠️ ${t.adviceLong}`
                      : `${driving ? '🛏️' : '✈️'} ${driving ? format(t.adviceFlyWarn, { n: l.stopovers }, locale) : t.adviceFly}`}
                </span>
              )}
              {note?.scenic && <span className="text-[#2F6B2A]">🌄 {note.scenic}</span>}
              {note?.caution && <span className="text-[#8A5A12]">⚠️ {note.caution}</span>}
              {note && <span className="text-subtle">{format(t.noteSource, { source: note.source, date: note.checked }, locale)}</span>}
            </span>
          );
        })()}
      </li>
    );
  };

  const likedPlaces = places.filter((p) => !trip.includes(p.id) && (liked.includes(p.id) || p.videoIds.some((v) => liked.includes(v))));
  const selectCls = 'field cursor-pointer !min-h-11';

  const map = ordered.length > 0 && (
    <RouteMap
      stops={ordered.map((p, i) => {
        const before = startOf(i);
        const n = nightsOf(p);
        const d1 = dayAt(before);
        const d2 = dayAt(before + n);
        return {
          lat: p.lat,
          lon: p.lon,
          label: p.name,
          n: i + 1,
          info: {
            image: p.image,
            sub: `${t.kind[p.kind]} · ${p.tagline}`,
            when: `${format(t.nights, { n }, locale)} · ${d1 && d2 ? `${fmt(d1)} – ${fmt(d2)}` : format(t.days, { from: before + 1, to: before + n + 1 }, locale)}`,
            href: `/${locale}/plek/${p.id}`,
            more: t.morePlace,
          },
        };
      })}
      arrive={{ ...AIRPORTS[arrive], label: arrive }}
      depart={{ ...AIRPORTS[depart], label: depart }}
      modes={legs.map((l) => l.mode)}
      legLabels={legs.map(legInfo)}
      via={legs.map((l) =>
        l.fly && l.fly.a.strip.key !== l.fly.b.strip.key && (l.fly.a.km > 0 || l.fly.b.km > 0)
          ? { from: { lat: l.fly.a.strip.lat, lon: l.fly.a.strip.lon, label: l.fly.a.strip.label }, to: { lat: l.fly.b.strip.lat, lon: l.fly.b.strip.lon, label: l.fly.b.strip.label } }
          : null,
      )}
      labels={{ title: t.routeTitle, road: t.road, flightBoat: `${t.flight} / ${t.boat}`, enlarge: t.enlarge, close: t.close, airport: t.mapAirport, stop: t.mapStop, source: t.mapSource }}
      summary={(() => {
        // Rijden: stukken over de weg (ook rijden + boot) en het rijden naar en van vliegvelden
        let driveKm = 0;
        let driveH = 0;
        for (const l of legs) {
          if (l.driving) {
            driveKm += l.dist;
            driveH += l.hours;
          }
          if (l.fly) {
            driveKm += l.fly.a.km + l.fly.b.km;
            driveH += l.fly.a.hours + l.fly.b.hours;
          }
        }
        const flights = legs.filter((l) => l.mode === 'flight').length;
        const boats = legs.filter((l) => l.mode === 'boat' && l.dist <= 120).length;
        return format(t.mapSummary, { km: Math.round(driveKm), hours: format(t.hours, { n: driveH }, locale), flights, boats }, locale);
      })()}
    />
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      {/* Kaart: rechts en meescrollend op een groot scherm, bovenaan op de telefoon */}
      {map && <aside className="lg:sticky lg:top-24 lg:order-2">{map}</aside>}
      <div className="flex min-w-0 flex-col gap-12 lg:order-1">
      {/* Je reis: naam, wanneer, met hoeveel; aanmaken, aanpassen, afvinken als gemaakt */}
      {(() => {
        const needsSetup = !route.setupDone && ordered.length === 0;
        const whenText = start
          ? route.start?.endsWith('-01') && !own
            ? start.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
            : `${fmt(start)}${endDate ? ` – ${fmt(endDate)}` : ''} ${start.getFullYear()}`
          : t.whenUnknownShort;
        return (
          <section className="panel flex flex-col gap-4 p-5" aria-labelledby="your-trip">
            {editing || needsSetup ? (
              <>
                <div>
                  <h2 id="your-trip" className="m-0 text-[22px] font-semibold text-ink">🧳 {t.setup.title}</h2>
                  <p className="m-0 mt-1 text-[14px] text-muted">{needsSetup ? t.setupPrompt : t.setup.sub}</p>
                </div>
                <TripSetup key={editing ? 'edit' : 'new'} locale={locale} t={t.setup} onDone={() => setEditing(false)} showSkip={!editing} />
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="eyebrow">{t.yourTrip}</span>
                    <h2 id="your-trip" className="m-0 truncate text-[24px] font-semibold text-ink">{route.name || t.tripUnnamed}</h2>
                    <span className="text-[14px] text-muted">
                      🗓️ {whenText} · 👥 {format(t.requestPeople, { n: route.people }, locale)}
                    </span>
                  </div>
                  <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost !min-h-10">✏️ {t.editTrip}</button>
                </div>
              </>
            )}
          </section>
        );
      })()}

      <section aria-labelledby="route-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="route-title" className="m-0 text-[26px] font-semibold text-ink">{t.routeTitle}</h2>
          {ordered.length > 0 && (
            <span className="flex flex-wrap items-center gap-3 text-[15px] text-muted">
              {format(t.summary, { stops: ordered.length, nights: totalNights }, locale)}
              {start && endDate && ` · ${fmt(start)} – ${fmt(endDate)}`}
              <button
                type="button"
                onClick={() => setAskClear(true)}
                aria-expanded={askClear}
                className="min-h-9 rounded-full border border-rule px-3 text-[14px] font-semibold text-ink hover:border-[#B3412E] hover:text-[#B3412E]"
              >
                🗑️ {t.clearTrip}
              </button>
            </span>
          )}
        </div>

        {askClear && ordered.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[#B3412E]/30 bg-[#FBEDEA] px-4 py-3" role="alertdialog" aria-label={t.clearTripAsk}>
            <span className="flex-1 text-[15px] font-semibold text-ink">{t.clearTripAsk}</span>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setUndo(clearTrip());
                setAskClear(false);
              }}
              className="btn !min-h-10 !bg-[#B3412E] !text-white"
            >
              {t.clearTripYes}
            </button>
            <button type="button" onClick={() => setAskClear(false)} className="btn btn-ghost !min-h-10">
              {t.clearTripNo}
            </button>
          </div>
        )}
        {undo && trip.length === 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-sand px-4 py-3" role="status">
            <span className="flex-1 text-[15px] text-ink">{t.clearTripDone}</span>
            <button
              type="button"
              onClick={() => {
                restoreTrip(undo);
                setUndo(null);
              }}
              className="btn btn-ghost !min-h-10"
            >
              ↩ {t.clearTripUndo}
            </button>
          </div>
        )}

        {/* Beste route: Gnutube stippelt alles zelf uit */}
        {ordered.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-3xl bg-brand-soft p-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-[22px] text-white" aria-hidden="true">✨</span>
            <div className="flex min-w-[220px] flex-1 flex-col">
              <span className="text-[18px] font-semibold text-ink">{t.bestRouteTitle}</span>
              <span className="text-[14px] text-muted">{isBest ? t.bestRouteOn : t.bestRouteSub}</span>
            </div>
            {isBest ? (
              <span className="rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-[#2F6B2A]">✓ {t.bestRouteActive}</span>
            ) : (
              <button type="button" className="btn btn-primary" onClick={bestRoute}>
                ✨ {t.bestRouteButton}
              </button>
            )}
            <button type="button" onClick={arrangeAll} className="btn !bg-[#2A1F17] !text-white">🔨 {t.requestCta}</button>
            {arranged > 0 && (
              <p className="m-0 w-full rounded-xl bg-white px-3 py-2 text-[14px] font-semibold text-[#2F6B2A]" role="status">
                ✓ {own ? t.arrangedOwn : t.arrangedNew}
              </p>
            )}
          </div>
        )}

        {ordered.length === 0 ? (
          <div className="panel mt-4 flex flex-col items-start gap-4 p-6">
            <p className="m-0 text-[16px] text-muted">{t.tripEmpty}</p>
            <Link href={`/${locale}/kijken`} className="btn btn-primary">▶ {t.tripStart}</Link>
          </div>
        ) : (
          <>
            {/* Wanneer ga je? Per maand: hoeveel van je plekken dan op hun best zijn */}
            {withSeason.length > 0 && (
              <div className="panel mt-4 flex flex-col gap-3 p-5" aria-labelledby="when-title">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 id="when-title" className="m-0 text-[18px] font-semibold text-ink">🗓️ {t.whenTitle}</h3>
                  {topScore > 0 && (
                    <span className="text-[14px] text-muted">
                      ⭐ {t.bestForTrip}:{' '}
                      <strong className="text-ink">
                        {monthScore.map((v, i) => (v === topScore ? monthName(i + 1) : null)).filter(Boolean).join(', ')}
                      </strong>
                    </span>
                  )}
                </div>
                <p className="m-0 text-[14px] text-muted">{t.whenSub}</p>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12" role="group" aria-label={t.whenTitle}>
                  {monthScore.map((v, i) => {
                    const m = i + 1;
                    const share = topScore ? v / (withSeason.length * 2) : 0;
                    const chosen = travelMonth === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => pickMonth(m)}
                        title={format(t.monthFit, { good: monthGood[i], n: withSeason.length, month: monthName(m) }, locale)}
                        className={`relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[12px] font-semibold transition-colors ${
                          chosen ? 'border-brand-dark bg-brand-dark text-white' : 'border-rule bg-white text-ink hover:border-brand-dark'
                        }`}
                      >
                        {v === topScore && topScore > 0 && <span className="absolute -top-2 right-0.5 text-[12px]" aria-hidden="true">⭐</span>}
                        <span>{monthName(m, 'short')}</span>
                        <span className="h-1.5 w-full overflow-hidden rounded-full bg-rule/70" aria-hidden="true">
                          <span className="block h-full rounded-full bg-[#2F6B2A]" style={{ width: `${Math.round(share * 100)}%` }} />
                        </span>
                        <span className={`text-[11px] font-normal ${chosen ? 'text-white/80' : 'text-subtle'}`}>
                          {monthGood[i]}/{withSeason.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {travelMonth && (
                  <p className="m-0 text-[14px] text-ink" role="status">
                    {format(t.monthFit, { good: monthGood[travelMonth - 1], n: withSeason.length, month: monthName(travelMonth) }, locale)}
                  </p>
                )}
              </div>
            )}

            {/* Instellingen: vlucht, datums, vliegvelden */}
            <div className="panel mt-4 flex flex-col gap-4 p-5">
              <div className="flex flex-wrap gap-2" role="group" aria-label={t.flightsTitle}>
                {(['arrange', 'own'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="chip"
                    aria-pressed={route.flightMode === m}
                    onClick={() => updateRoute({ flightMode: m })}
                  >
                    ✈️ {m === 'own' ? t.haveFlight : t.arrangeFlight}
                  </button>
                ))}
              </div>
              {own && <p className="m-0 -mt-1 text-[13px] text-subtle">{t.haveFlightSub}</p>}
              <div className="flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-1">
                  <span className="eyebrow">{own ? t.arriveDate : t.startDate}</span>
                  <input type="date" className="field !min-h-11" value={route.start ?? ''} onChange={(e) => updateRoute({ start: e.target.value || null })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="eyebrow">{t.arrive}</span>
                  <select className={selectCls} value={arrive} onChange={(e) => updateRoute({ arrive: e.target.value })}>
                    {CODES.map((c) => <option key={c} value={c}>{AIRPORTS[c].name}</option>)}
                  </select>
                </label>
                {own && (
                  <label className="flex flex-col gap-1">
                    <span className="eyebrow">{t.departDate}</span>
                    <input type="date" className="field !min-h-11" value={route.end ?? ''} min={route.start ?? undefined} onChange={(e) => updateRoute({ end: e.target.value || null })} />
                  </label>
                )}
                <label className="flex flex-col gap-1">
                  <span className="eyebrow">{t.depart}</span>
                  <select className={selectCls} value={depart} onChange={(e) => updateRoute({ depart: e.target.value })}>
                    {CODES.map((c) => <option key={c} value={c}>{AIRPORTS[c].name}</option>)}
                  </select>
                </label>
                {manual && (
                  <button type="button" onClick={() => updateRoute({ order: null, arrive: null, depart: null })} className="btn btn-ghost !min-h-11">
                    ↺ {t.autoRoute}
                  </button>
                )}
              </div>
              {/* Reizigers en budget voor de overnachtingen */}
              <div className="flex flex-col gap-2 border-t border-rule pt-4">
                <span className="text-[15px] font-semibold text-ink">💰 {t.budgetTitle}</span>
                <div className="flex flex-wrap items-end gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="eyebrow">{t.people}</span>
                    <input
                      type="number"
                      min={1}
                      className="field !min-h-11 w-24"
                      value={route.people}
                      onChange={(e) => updateRoute({ people: Math.max(1, Math.round(Number(e.target.value)) || 1) })}
                    />
                  </label>
                  {route.people >= 7 && <p className="m-0 w-full text-[13px] text-muted">{format(t.bigGroup, { n: route.people }, locale)}</p>}
                  <div className="flex flex-col gap-1">
                    <span className="eyebrow">{t.budgetFor}</span>
                    <div className="flex flex-wrap gap-2" role="group" aria-label={t.budgetFor}>
                      {(['night', 'trip'] as const).map((m) => (
                        <button key={m} type="button" className="chip" aria-pressed={budget.mode === m} onClick={() => updateRoute({ budget: { ...budget, mode: m } })}>
                          {m === 'night' ? t.budgetNight : t.budgetTrip}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="eyebrow">{t.budgetMax}</span>
                    <span className="flex gap-2">
                      <select
                        className={`${selectCls} w-24`}
                        value={budget.currency}
                        onChange={(e) => updateRoute({ budget: { ...budget, currency: e.target.value } })}
                        aria-label={t.budgetCurrency}
                      >
                        {BUDGET_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        className="field !min-h-11 w-36"
                        placeholder={t.budgetNone}
                        value={budget.amount ?? ''}
                        onChange={(e) => updateRoute({ budget: { ...budget, amount: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) } })}
                      />
                    </span>
                  </label>
                </div>
                <p className="m-0 text-[13px] text-subtle">
                  {budget.amount === null
                    ? t.budgetHint
                    : budget.mode === 'trip' && budgetNight !== null
                      ? format(t.budgetPerNight, { price: money(budgetNight, budget.currency) }, locale)
                      : t.budgetNightNote}
                </p>
              </div>
              {own && avail !== null && (
                avail === totalNights ? (
                  <p className="m-0 text-[14px] font-medium text-[#2F6B2A]">✓ {t.fitOk}</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#FFF4E5] p-3 text-[14px] text-[#7A4A12]">
                    <span>⚠️ {format(t.fitMismatch, { route: totalNights, avail }, locale)}</span>
                    {avail - stopNights >= ordered.length && (
                      <button type="button" onClick={fitNights} className="btn btn-primary !min-h-10 !px-4 !text-[14px]">{t.fitButton}</button>
                    )}
                  </div>
                )
              )}
            </div>
            <p className="m-0 mt-2 text-[13px] text-subtle">{manual ? t.manualNote : t.autoNote}</p>

            {/* Route */}
            <ol className="m-0 mt-6 list-none p-0">
              <li className="flex items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-[18px] text-white" aria-hidden="true">✈️</span>
                <span className="flex flex-col">
                  <span className="text-[16px] font-semibold text-ink">{format(t.arrival, { airport: AIRPORTS[arrive].name })}</span>
                  <span className="text-[13px] text-subtle">{start ? fmt(start) : t.day1}</span>
                </span>
              </li>
              {ordered.map((p, i) => {
                const before = startOf(i);
                const n = nightsOf(p);
                const d1 = dayAt(before);
                const d2 = dayAt(before + n);
                return [
                  leg(i),
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-rule bg-white p-3 sm:gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-dark text-[14px] font-bold text-white">{i + 1}</span>
                    <Link href={`/${locale}/plek/${p.id}`} className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-xl sm:block">
                      {p.image}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link href={`/${locale}/plek/${p.id}`} className="truncate text-[17px] font-semibold text-ink hover:text-brand-dark hover:underline">
                        {p.name}
                      </Link>
                      <span className="text-[13px] text-subtle">
                        {d1 && d2 ? `${fmt(d1)} – ${fmt(d2)}` : format(t.days, { from: before + 1, to: before + n + 1 }, locale)} · {p.region}
                      </span>
                      {/* Seizoen op deze plek in de maand dat je er bent */}
                      {p.season && d1 && (() => {
                        const f = fitOf(p, d1.getMonth() + 1);
                        return (
                          <a
                            href={`/${locale}/plek/${p.id}`}
                            className={`mt-1 w-fit rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                              f === 2 ? 'bg-[#E3F1E0] text-[#2F6B2A]' : f === 1 ? 'bg-[#EEF6EC] text-[#4E7A49]' : 'bg-[#FDF0E1] text-[#9A5B12]'
                            }`}
                          >
                            {f === 2 ? `☀️ ${t.seasonBest}` : f === 1 ? `🙂 ${t.seasonAlso}` : `⚠️ ${format(t.seasonOff, { best: p.season.label || t.seasonAllYear }, locale)}`}
                          </a>
                        );
                      })()}
                      {/* Verblijf (kiezen in 'Overnachtingen') */}
                      <a href={`#stay-${p.id}`} className="mt-1 truncate text-[13px] text-muted hover:text-brand-dark hover:underline">
                        🛏️ {stayOf(p) ? stayOf(p)!.name : t.stayTbdShort}
                      </a>
                      {/* Reizigers op deze plek (als niet iedereen meegaat) */}
                      {route.people > 1 && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted" role="group" aria-label={t.peopleHere}>
                          <span>👥 {t.peopleHere}:</span>
                          <button type="button" onClick={() => setPeopleAt(p.id, peopleAt(p) - 1)} disabled={peopleAt(p) <= 1} className="grid h-7 w-7 place-items-center rounded-full border border-rule disabled:opacity-30" aria-label={t.fewerHere}>−</button>
                          <span className="min-w-[44px] text-center font-semibold text-ink">{format(t.ofGroup, { n: peopleAt(p), total: route.people }, locale)}</span>
                          <button type="button" onClick={() => setPeopleAt(p.id, peopleAt(p) + 1)} disabled={peopleAt(p) >= route.people} className="grid h-7 w-7 place-items-center rounded-full border border-rule disabled:opacity-30" aria-label={t.moreHere}>+</button>
                        </div>
                      )}
                      {/* Activiteiten kiezen */}
                      {p.activities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`${t.activitiesLabel}: ${p.name}`}>
                          {p.activities.map((a) => {
                            const on = (route.acts[p.id] ?? []).includes(a.id);
                            return (
                              <button
                                key={a.id}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggleAct(p, a.id)}
                                className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
                                  on ? 'border-brand-dark bg-brand-dark text-white' : 'border-rule bg-white text-muted hover:border-brand-dark'
                                }`}
                              >
                                {on ? '✓ ' : '+ '}
                                {a.name}
                                {a.nights ? ` · ${format(t.nights, { n: a.nights }, locale)}${a.checked ? '' : '*'}` : ''}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {/* Nachten */}
                    <div className="flex items-center gap-1" role="group" aria-label={t.nightsLabel}>
                      <button type="button" onClick={() => setNights(p.id, n - 1)} disabled={n <= 1} className="grid h-9 w-9 place-items-center rounded-full border border-rule text-[18px] disabled:opacity-30" aria-label={t.lessNights}>−</button>
                      <span className="min-w-[64px] text-center text-[14px] font-medium">{format(t.nights, { n }, locale)}</span>
                      <button type="button" onClick={() => setNights(p.id, n + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-rule text-[18px]" aria-label={t.moreNights}>+</button>
                    </div>
                    {/* Volgorde en verwijderen */}
                    <div className="flex flex-col">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid h-7 w-9 place-items-center rounded-lg text-[14px] hover:bg-sand disabled:opacity-25" aria-label={t.moveUp}>▲</button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === ordered.length - 1} className="grid h-7 w-9 place-items-center rounded-lg text-[14px] hover:bg-sand disabled:opacity-25" aria-label={t.moveDown}>▼</button>
                    </div>
                    <button type="button" onClick={() => remove('trip', p.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[16px] text-subtle hover:bg-sand hover:text-ink" aria-label={`${t.remove}: ${p.name}`}>
                      ✕
                    </button>
                  </li>,
                ];
              })}
              {leg(legs.length - 1)}
              <li className="flex items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-[18px] text-white" aria-hidden="true">✈️</span>
                <span className="flex flex-col">
                  <span className="text-[16px] font-semibold text-ink">{format(t.departure, { airport: AIRPORTS[depart].name })}</span>
                  <span className="text-[13px] text-subtle">{endDate ? fmt(endDate) : format(t.dayN, { n: totalNights + 1 }, locale)}</span>
                </span>
              </li>
            </ol>
            <p className="m-0 mt-3 text-[13px] text-subtle">{t.legNote} {t.hoursNote}</p>
            <p className="m-0 mt-2 rounded-xl bg-sand px-3 py-2 text-[13px] text-muted">🚙 {t.driveTip}</p>
            {ordered.some((p) => p.activities.some((a) => a.nights && !a.checked)) && (
              <p className="m-0 mt-1 text-[13px] text-subtle">* {t.durationNote}</p>
            )}
          </>
        )}
      </section>

      {/* Overnachtingen: waar en wanneer je slaapt, met aanraders */}
      {ordered.length > 0 && (
        <section aria-labelledby="stays-title">
          <h2 id="stays-title" className="m-0 text-[24px] font-semibold text-ink">🛏️ {t.staysTitle}</h2>
          <p className="m-0 mt-1 text-[15px] text-muted">{format(t.staysSub, { n: totalNights }, locale)}</p>
          <ol className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
            {[...ordered.map((p, i) => ({ p, i })), { p: null, i: ordered.length }].flatMap(({ p, i }) => {
              const l = legs[i];
              const out: ReactNode[] = [];
              // Overnachting onderweg (rit te lang voor één dag)
              if (l.stopovers > 0) {
                const d = dayAt(startOf(i) - l.stopovers);
                out.push(
                  <li key={`stop-${l.key}`} className="rounded-2xl border border-dashed border-[#D9B98F] bg-[#FFF8EE] p-4">
                    <p className="m-0 text-[15px] font-semibold text-ink">
                      🚙 {format(t.stopoverTitle, { from: nameOf(l.from.id), to: nameOf(l.to.id), n: l.stopovers }, locale)}
                    </p>
                    <p className="m-0 mt-1 text-[13px] text-muted">
                      {d ? `${fmt(d)} · ` : ''}
                      {format(t.stopoverSub, { hours: format(t.hours, { n: l.hours }, locale) }, locale)}
                    </p>
                    {l.options.includes('flight') && (
                      <button type="button" className="btn btn-ghost mt-2 !min-h-9 !px-3 !text-[13px]" onClick={() => updateRoute({ legModes: { ...route.legModes, [l.key]: 'flight' } })}>
                        ✈️ {t.stopoverFly}
                      </button>
                    )}
                  </li>,
                );
              }
              if (!p) return out;
              const n = nightsOf(p);
              const d1 = dayAt(startOf(i));
              const d2 = dayAt(startOf(i) + n);
              const list = ranked(p);
              const current = stayOf(p);
              out.push(
                <li key={p.id} id={`stay-${p.id}`} className="scroll-mt-28 rounded-2xl border border-rule bg-white p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[17px] font-semibold text-ink">
                      {i + 1}. {p.name}
                    </span>
                    <span className="text-[13px] text-subtle">
                      {format(t.nights, { n }, locale)}
                      {d1 && d2 ? ` · ${fmt(d1)} – ${fmt(d2)}` : ` · ${format(t.days, { from: startOf(i) + 1, to: startOf(i) + n + 1 }, locale)}`}
                    </span>
                  </div>
                  {list.length === 0 ? (
                    <p className="m-0 mt-2 text-[14px] text-subtle">
                      {t.noStaysYet} <a href="#regelen" className="font-semibold text-brand-dark underline underline-offset-2">{t.noStaysAsk}</a>
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-2" role="radiogroup" aria-label={`${t.chooseStay}: ${p.name}`}>
                      {list.map((st, k) => {
                        const on = current?.id === st.id;
                        const fit = fits(st);
                        return (
                          <button
                            key={st.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => updateRoute({ stays: { ...route.stays, [p.id]: st.id } })}
                            className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border p-3 text-left transition-colors ${
                              on ? 'border-brand-dark bg-brand-soft' : 'border-rule bg-white hover:border-brand-dark'
                            }`}
                          >
                            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-brand-dark' : 'border-rule'}`} aria-hidden="true">
                              {on && <span className="h-2.5 w-2.5 rounded-full bg-brand-dark" />}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold text-ink">
                                {st.name}
                                {k === 0 && list.length > 1 && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{t.bestChoice}</span>}
                                {st.recommended && <span className="rounded-full bg-[#E6F2E3] px-2 py-0.5 text-[11px] font-semibold text-[#2F6B2A]">⭐ {t.recommended}</span>}
                              </span>
                              <span className="text-[13px] text-subtle">
                                {t.stayTypes[st.type]}
                                {st.rating !== null && ` · ${format(t.ratingBy, { rating: st.rating.toLocaleString(locale), source: st.ratingSource ?? '?' }, locale)}`}
                              </span>
                              {st.highlight && <span className="text-[13px] text-muted">{st.highlight}</span>}
                              {st.url && (
                                <a href={st.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="self-start text-[13px] font-semibold text-brand-dark underline underline-offset-2">
                                  {t.stayWebsite} ↗
                                </a>
                              )}
                            </span>
                            <span className="flex flex-col items-end text-right">
                              {st.priceFrom !== null ? (
                                <>
                                  <span className="text-[15px] font-semibold text-ink">{format(t.perNight, { price: money(st.priceFrom, st.currency) }, locale)}</span>
                                  <span className="text-[12px] text-subtle">
                                    {format(t.stayTotal, { price: money(st.priceFrom * n * peopleAt(p), st.currency), people: peopleAt(p), n }, locale)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[13px] text-subtle">{t.priceOnRequest}</span>
                              )}
                              {fit !== null && (
                                <span className={`text-[12px] font-semibold ${fit ? 'text-[#2F6B2A]' : 'text-[#A33]'}`}>{fit ? `✓ ${t.inBudget}` : t.overBudget}</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>,
              );
              return out;
            })}
          </ol>
          <p className="m-0 mt-2 text-[13px] text-subtle">{t.staysNote}</p>
        </section>
      )}

      {/* Dag voor dag */}
      {ordered.length > 0 && (
        <section aria-labelledby="plan-title">
          <h2 id="plan-title" className="m-0 text-[24px] font-semibold text-ink">🗓️ {t.planTitle}</h2>
          <p className="m-0 mt-1 text-[15px] text-muted">{t.planSub}</p>
          <ol className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
            {plan.map((d) => (
              <li key={d.n} className="grid grid-cols-[88px_1fr] gap-3 rounded-2xl border border-rule bg-white p-3 sm:grid-cols-[120px_1fr]">
                <div className="flex flex-col">
                  <span className="text-[15px] font-semibold text-brand-dark">{format(t.dayLabel, { n: d.n }, locale)}</span>
                  {d.date && <span className="text-[12px] text-subtle">{d.date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5 text-[14px]">
                  {d.place && <span className="font-semibold text-ink">{d.place.name}</span>}
                  {d.what.map((w) => <span key={w} className="text-muted">{w}</span>)}
                  {d.sleep && <span className="text-subtle">🛏️ {d.sleep}</span>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Kosten */}
      {ordered.length > 0 && (
        <section aria-labelledby="cost-title" className="panel p-6 sm:p-8">
          <h2 id="cost-title" className="m-0 text-[24px] font-semibold text-ink">💶 {t.costTitle}</h2>
          <p className="m-0 mt-1 text-[15px] text-muted">{format(t.costSub, { people: route.people }, locale)}</p>
          <dl className="m-0 mt-5 grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-[1fr_auto]">
            <dt className="text-muted">
              {t.costStays} · {format(t.staysNeeded, { n: ordered.length + stopNights }, locale)} · {format(t.nights, { n: totalNights }, locale)}
            </dt>
            <dd className="m-0 font-semibold text-ink sm:text-right">
              {costByCurrency.size ? [...costByCurrency].map(([cur, n]) => money(n, cur)).join(' + ') : t.unknown}
            </dd>
            <dt className="text-muted">{t.costActivities}</dt>
            <dd className="m-0 font-semibold text-ink sm:text-right">
              {actCost.size ? [...actCost].map(([cur, n]) => money(n, cur)).join(' + ') : ordered.some((p) => actsOf(p).length) ? t.unknown : '–'}
            </dd>
            <dt className="text-muted">{t.costTransport}</dt>
            <dd className="m-0 font-semibold text-ink sm:text-right">{t.unknown}</dd>
            {route.people >= 7 && (
              <dd className="m-0 text-[13px] text-muted sm:col-span-2">{format(t.bigGroup, { n: route.people }, locale)}</dd>
            )}
            {!own && (
              <>
                <dt className="text-muted">{t.costFlights}</dt>
                <dd className="m-0 font-semibold text-ink sm:text-right">{t.unknown}</dd>
              </>
            )}
          </dl>
          {budget.amount !== null && (
            <p className="m-0 mt-4 text-[14px] text-muted">
              💰 {format(t.budgetLine, { price: money(budget.amount, budget.currency), mode: budget.mode === 'night' ? t.budgetNight : t.budgetTrip }, locale)}
              {budget.mode === 'trip' && costByCurrency.size === 1 && costByCurrency.has(budget.currency) && unpriced.length === 0 && (
                <strong className={costByCurrency.get(budget.currency)! <= budget.amount ? 'text-[#2F6B2A]' : 'text-[#A33]'}>
                  {' '}· {costByCurrency.get(budget.currency)! <= budget.amount ? t.inBudget : t.overBudget}
                </strong>
              )}
            </p>
          )}
          {unpriced.length > 0 && (
            <p className="m-0 mt-4 text-[14px] text-muted">{format(t.costUnknown, { places: unpriced.join(', ') }, locale)}</p>
          )}
          {actUnpriced.length > 0 && (
            <p className="m-0 mt-1 text-[14px] text-muted">{format(t.costUnknown, { places: actUnpriced.join(', ') }, locale)}</p>
          )}
          <p className="m-0 mt-2 text-[13px] text-subtle">{t.costNote}</p>
        </section>
      )}

      {/* De hele reis in de veiling: goedgekeurde bedrijven bieden */}
      {ordered.length > 0 && (
        <AuctionStart
          t={t.auction}
          account={t.account}
          locale={locale}
          people={route.people}
          start={route.start}
          nights={totalNights}
          budget={budget.mode === 'trip' && budget.currency === 'USD' ? budget.amount : null}
          summary={[
            format(t.summary, { stops: ordered.length, nights: totalNights }, locale) + (start && endDate ? ` · ${fmt(start)} – ${fmt(endDate)}` : ''),
            format(t.requestPeople, { n: route.people }, locale),
            ordered.map((p) => p.name).join(' → '),
            own ? t.haveFlight : t.arrangeFlight,
          ]}
          trip={{
            people: route.people,
            budget: route.budget,
            flightMode: route.flightMode,
            home: route.home,
            start: route.start,
            end: route.end,
            arrive,
            depart,
            totalNights,
            stops: ordered.map((p, i) => ({
              id: p.id,
              name: p.name,
              nights: nightsOf(p),
              fromDay: startOf(i) + 1,
              stay: stayOf(p)?.name ?? null,
              activities: actsOf(p).map((a) => a.name),
              people: peopleAt(p),
            })),
            legs: legs.map((l) => ({ from: nameOf(l.from.id), to: nameOf(l.to.id), mode: l.mode, km: l.dist, hours: l.hours, stopovers: l.stopovers })),
          }}
        />
      )}

      {/* Vluchten (alleen als Gnutube de vlucht regelt) */}
      {ordered.length > 0 && !own && (
        <section aria-labelledby="flights-title" className="rounded-3xl bg-sand p-6 sm:p-8">
          <h2 id="flights-title" className="m-0 text-[24px] font-semibold text-ink">✈️ {t.flightsTitle}</h2>
          <p className="m-0 mt-1 text-[15px] text-muted">{t.flightsSub}</p>
          <div className="mt-5 flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1">
              <span className="eyebrow">{t.fromLabel}</span>
              <input
                className="field !min-h-11"
                placeholder={t.fromPlaceholder}
                value={route.home}
                onChange={(e) => updateRoute({ home: e.target.value })}
              />
            </label>
          </div>
          <ul className="m-0 mt-5 grid list-none gap-3 p-0 sm:grid-cols-2">
            <li className="rounded-2xl bg-white p-4">
              <span className="eyebrow">{t.outbound}</span>
              <p className="m-0 mt-1 text-[16px] font-semibold text-ink">{route.home || t.fromPlaceholder} → {AIRPORTS[arrive].name}</p>
              <p className="m-0 text-[14px] text-muted">{start ? fmt(start) : t.pickDate}</p>
            </li>
            <li className="rounded-2xl bg-white p-4">
              <span className="eyebrow">{t.inbound}</span>
              <p className="m-0 mt-1 text-[16px] font-semibold text-ink">{AIRPORTS[depart].name} → {route.home || t.fromPlaceholder}</p>
              <p className="m-0 text-[14px] text-muted">{endDate ? fmt(endDate) : t.pickDate}</p>
            </li>
          </ul>
          <button type="button" disabled className="btn btn-primary mt-5 cursor-not-allowed opacity-60">
            {t.searchFlights}
          </button>
          <p className="m-0 mt-2 text-[13px] text-subtle">{t.flightsSoon}</p>
        </section>
      )}

      {/* Gemaakte reizen: uit je boekingen (betaald, bevestigd, voorbij), met recensie */}
      <DoneTrips locale={locale} t={t.done} placeNames={Object.fromEntries(places.map((p) => [p.id, p.name]))} />

      {likedPlaces.length > 0 && (
        <section aria-labelledby="liked-list">
          <h2 id="liked-list" className="m-0 text-[24px] font-semibold text-ink">
            {t.likedTitle} <span className="text-subtle">({likedPlaces.length})</span>
          </h2>
          <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
            {likedPlaces.map((p) => (
              <li key={p.id} className="flex items-center gap-4 rounded-2xl border border-rule bg-white p-3">
                <Link href={`/${locale}/plek/${p.id}`} className="relative block h-16 w-24 shrink-0 overflow-hidden rounded-xl">{p.image}</Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[17px] font-semibold text-ink">{p.name}</span>
                  <span className="text-[13px] text-subtle">{t.kind[p.kind]} · {p.region}</span>
                </div>
                <Link href={`/${locale}/kijken?plek=${p.id}`} className="btn btn-ghost !min-h-10 !px-4 !text-[14px]">▶</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      </div>
    </div>
  );
}
