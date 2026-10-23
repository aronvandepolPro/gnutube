'use client';

import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';
import { kinds, type Kind } from '@/lib/data';
import { CountryFacts, type FactLabels } from './CountryFacts';
import { Globe, type GlobePoint } from './Globe';
import { KIND_COLOR as DOT } from '@/lib/kind-colors';

export type StagePlace = { name: string; lat: number; lon: number; kind: Kind; regionId: string; countryId: string };


type Props = {
  locale: Locale;
  places: StagePlace[];
  regions: { id: string; name: string }[];
  countries: { id: string; regionId: string; name: string }[];
  labels: { anywhere: string; places: string; kind: Record<Kind, string>; facts: FactLabels };
  children: ReactNode;
};

/**
 * Zoeksectie van de homepage met een levende achtergrond:
 * - "Heel Afrika" en "Alles": draaiende wereldbol met alle plekken als lichtpuntjes.
 * - Regio of land gekozen: de bol draait ernaartoe en zoomt in, met meren, rivieren en plaatsnamen.
 * - Soort reis gekozen: alleen de plekken van die soort lichten op, de rest wordt gedimd.
 * Luistert naar de keuzelijsten in de zoekbalk (change-events borrelen op naar deze sectie).
 */
export function ExploreStage({ locale, places, regions, countries, labels, children }: Props) {
  const [where, setWhere] = useState('');
  const [kind, setKind] = useState<Kind | ''>('');

  const onChange = (e: ChangeEvent<HTMLElement>) => {
    const el = e.target as HTMLSelectElement;
    if (el.name === 'waar') setWhere(el.value);
    if (el.name === 'soort') {
      setKind((kinds as string[]).includes(el.value) ? (el.value as Kind) : '');
    }
  };

  const match = useMemo(() => {
    if (where.startsWith('r:')) return (p: StagePlace) => p.regionId === where.slice(2);
    if (where.startsWith('c:')) return (p: StagePlace) => p.countryId === where.slice(2);
    return null;
  }, [where]);

  const points: GlobePoint[] = useMemo(
    () => places.map((p) => ({ name: p.name, lat: p.lat, lon: p.lon, color: DOT[p.kind], on: (!match || match(p)) && (!kind || p.kind === kind) })),
    [places, match, kind],
  );


  // Toont de site maar één land (nu Tanzania), dan is dat land standaard gekozen.
  const single = countries.length === 1 ? countries[0].id : null;
  // Landen die op de bol oplichten: het gekozen land, of alle landen van de gekozen regio.
  const selected = useMemo(() => {
    if (where.startsWith('c:')) return [where.slice(2)];
    if (where.startsWith('r:')) {
      const inRegion = countries.filter((c) => c.regionId === where.slice(2)).map((c) => c.id);
      if (inRegion.length) return inRegion;
    }
    return single ? [single] : [];
  }, [where, countries, single]);
  // Gebied binnen het land gekozen: inzoomen op het kader rond de plekken van dat gebied
  const focusBox = useMemo((): [number, number, number, number] | null => {
    if (!where.startsWith('r:') || !single) return null;
    const sel = places.filter((p) => p.regionId === where.slice(2));
    if (!sel.length) return null;
    const pad = 0.8;
    return [
      Math.min(...sel.map((p) => p.lon)) - pad,
      Math.min(...sel.map((p) => p.lat)) - pad,
      Math.max(...sel.map((p) => p.lon)) + pad,
      Math.max(...sel.map((p) => p.lat)) + pad,
    ];
  }, [where, places, single]);
  const names = useMemo(() => Object.fromEntries(countries.map((c) => [c.id, c.name])), [countries]);

  const count = places.filter((p) => (!match || match(p)) && (!kind || p.kind === kind)).length;
  const whereName = where.startsWith('r:')
    ? regions.find((r) => r.id === where.slice(2))?.name
    : where.startsWith('c:')
      ? countries.find((c) => c.id === where.slice(2))?.name
      : labels.anywhere;
  // Feitenpaneel voor een gekozen land
  const countryId = where.startsWith('c:') ? where.slice(2) : single;
  const countryKinds = countryId
    ? kinds
        .map((k) => ({ kind: k, label: labels.kind[k], color: DOT[k], count: places.filter((p) => p.countryId === countryId && p.kind === k).length }))
        .filter((k) => k.count > 0)
    : [];
  const countryTotal = format(labels.places, { n: countryKinds.reduce((a, k) => a + k.count, 0) }, locale);

  const caption = [whereName, kind ? labels.kind[kind] : null, format(labels.places, { n: count }, locale)].filter(Boolean).join(' · ');

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-black" onChange={onChange}>
      {/* Wereldbol */}
      <div className="absolute inset-0">
        <Stars />
        <Globe points={points} filtered={!!match || !!kind} selected={selected} focusBox={focusBox} names={names} locale={locale} padLeft={countryId ? 380 : 0} className="absolute inset-0 h-full w-full" />
      </div>
      {/* Donkere laag bovenin voor leesbare tekst */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-black/80 via-black/45 to-transparent opacity-60" />

      {/* Feiten over het gekozen land: linksonder, op een telefoon onderin boven het bijschrift */}
      {countryId && (
        <div className="pointer-events-none absolute inset-x-4 bottom-20 flex md:inset-x-auto md:bottom-8 md:left-8">
          <CountryFacts
            key={countryId}
            id={countryId}
            name={names[countryId] ?? countryId}
            locale={locale}
            names={names}
            kinds={countryKinds}
            total={countryTotal}
            labels={labels.facts}
          />
        </div>
      )}

      <div className="relative">{children}</div>

      {/* Bijschrift van de huidige selectie */}
      <p
        className={`pointer-events-none absolute bottom-8 left-1/2 m-0 -translate-x-1/2 whitespace-nowrap rounded-full ${countryId ? 'md:left-[calc(50%+190px)]' : ''} border border-white/20 bg-black/45 px-5 py-2 text-[14px] text-white backdrop-blur-md`}
        aria-live="polite"
      >
        {caption}
      </p>
    </section>
  );
}

/** Statische sterrenhemel achter de bol (vaste posities). */
function Stars() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {Array.from({ length: 110 }, (_, i) => (
        <circle key={i} cx={(i * 467) % 1600} cy={(i * 283) % 900} r={0.6 + (i % 4) * 0.35} fill="#FFFFFF" opacity={0.25 + (i % 5) * 0.12} className={i % 3 === 0 ? 'kt-twinkle' : undefined} />
      ))}
    </svg>
  );
}
