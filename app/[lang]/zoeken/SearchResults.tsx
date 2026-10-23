'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { format } from '@/lib/i18n/format';
import { kinds, type Kind, type Place } from '@/lib/data';
import { PlaceImage } from '@/components/PlaceImage';
import { AdvisoryBadge } from '@/components/AdvisoryBadge';
import { euro, fitsBudget, parseBudgetFor, parseMode, parsePeople } from '@/lib/budget';
import { PeopleStepper } from '@/components/PeopleStepper';
import { updateRoute } from '@/lib/trip-store';
import { BudgetSlider } from '@/components/BudgetSlider';
import { ResultsMap } from '@/components/ResultsMap';
import { KIND_COLOR, KIND_INK } from '@/lib/kind-colors';
import { KindIcon } from '@/components/KindIcon';

type Props = {
  locale: Locale;
  places: (Place & { coords: string })[];
  regions: { id: string; name: string }[];
  countries: { id: string; regionId: string; name: string }[];
  t: Pick<Dictionary, 'search' | 'kind' | 'advisory'>;
};

const PAGE = 24;

export function SearchResults({ locale, places, regions, t }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [shown, setShown] = useState(PAGE);

  const waar = params.get('waar') ?? '';
  // Eén of meer gebieden: uit de zoekbalk (?waar=r:north,r:coast) of van deze pagina (?regio=north,coast)
  const waarList = waar.split(',').filter(Boolean);
  const regionIds = new Set(regions.map((r) => r.id));
  const chosenRegions = [
    ...waarList.filter((w) => w.startsWith('r:')).map((w) => w.slice(2)),
    ...(params.get('regio') ?? '').split(','),
  ].filter((r, i, a) => regionIds.has(r) && a.indexOf(r) === i);
  // Nu alleen Tanzania: geen landkeuze (komt terug als er meer landen bij komen)
  const country = '';
  const inChosenRegions = (id: string) => !chosenRegions.length || chosenRegions.includes(id);
  // Eén of meer soorten reis, bv. ?soort=safari,beach (plekken die bij minstens één ervan horen)
  const chosen = (params.get('soort') ?? '')
    .split(',')
    .filter((k): k is Kind => (kinds as string[]).includes(k));
  const sort = params.get('sorteer') === 'top' ? 'top' : 'az';
  const budgetMode = parseMode(params.get('budgetsoort'));
  const budget = parseBudgetFor(params.get('budget'), budgetMode);
  const people = parsePeople(params.get('personen'));

  // Reizigers en budget meenemen naar Mijn reis (daar rekent de planner ermee)
  useEffect(() => {
    updateRoute({ people, budget: { mode: budgetMode, amount: budget, currency: 'EUR' } });
  }, [people, budgetMode, budget]);


  const update = (next: Record<string, string>) => {
    const q = new URLSearchParams(params.toString());
    q.delete('waar');
    if (!('regio' in next) && chosenRegions.length) q.set('regio', chosenRegions.join(','));
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    setShown(PAGE);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };

  const { results, unknown } = (() => {
    const list = places
      .filter(
        (p) =>
          (!chosen.length || p.kinds.some((k) => chosen.includes(k))) &&
          inChosenRegions(p.regionId) &&
          (!country || p.countryId === country),
      )
      // Er zijn nog geen echte beoordelingen: "best beoordeeld" valt terug op naam.
      .sort((a, b) => a.name.localeCompare(b.name, locale));
    if (budget === null) return { results: list, unknown: [] as typeof list };
    // Met een budget: een plek telt mee als het goedkoopste verblijf binnen het maximum valt.
    // Volgorde: goedkoopste eerst. Plekken zonder prijs vallen niet weg maar komen apart onderaan.
    return {
      results: list
        .filter((p) => p.priceFrom !== null && fitsBudget(p.priceFrom, budget, budgetMode, p.defaultNights, people))
        .sort((a, b) => a.priceFrom! - b.priceFrom!),
      unknown: list.filter((p) => p.priceFrom === null),
    };
  })();

  // Aantal plekken per soort reis binnen de gekozen regio/land (voor de tegels)
  const kindCount = (k: Kind | '') =>
    places.filter((p) => (!k || p.kinds.includes(k)) && inChosenRegions(p.regionId) && (!country || p.countryId === country)).length;

  const resultIds = new Set(results.map((p) => p.id));
  const points = places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, color: KIND_COLOR[p.kind], on: resultIds.has(p.id) }));

  const row = (p: (typeof places)[number]) => (
    <li key={p.id} className="kt-card kt-reveal panel flex flex-col overflow-hidden p-0">
      {/* Ansichtkaart: affiche met stempel en coördinaten */}
      <Link href={`/${locale}/plek/${p.id}`} className="kt-poster relative block aspect-[4/3] overflow-hidden" tabIndex={-1} aria-hidden="true">
        <PlaceImage id={p.id} kind={p.kind} mountain={p.mountain} hasWater={p.hasWater} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" />
        <Stamp label={t.kind[p.kind]} color={KIND_INK[p.kind]} />
        <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[10.5px] tracking-wide text-white/85 backdrop-blur-sm">
          {p.coords}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4 sm:p-5">
        <span className="text-[13px] text-ink/50">{p.country} · {p.region}</span>
        <h2 className="m-0 text-[21px] font-semibold leading-tight">
          <Link href={`/${locale}/plek/${p.id}`} className="after:absolute after:inset-0 hover:underline">{p.name}</Link>
        </h2>
        <p className="m-0 line-clamp-2 text-[15px] text-ink/75">{p.tagline}</p>
        {p.activities.length > 0 && (
          <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
            {p.activities.slice(0, 3).map((a) => (
              <li key={a} className="rounded-full bg-sand px-2.5 py-0.5 text-[12px] text-muted">{a}</li>
            ))}
          </ul>
        )}
        {p.advisory && <span className="mt-1"><AdvisoryBadge t={t.advisory} /></span>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-[14px] text-ink/70">
            {p.priceFrom !== null
              ? format(t.search.fromPrice, { price: euro(p.priceFrom, locale) }, locale)
              : t.search.priceUnknown}
          </span>
          <span className="btn btn-ghost pointer-events-none !min-h-9 !px-4 !text-[14px]" aria-hidden="true">
            {t.search.view} →
          </span>
        </div>
      </div>
    </li>
  );

  const selectCls = 'field cursor-pointer';

  return (
    <div className="pt-4">
      {/* Filters */}
      {/* Filters: kaarten voor soort reis, daaronder regio, en onderaan reizigers · budget · sorteren op één nette regel */}
      <div className="panel flex flex-col gap-4 p-4 sm:px-6 sm:py-5">
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="eyebrow mb-2">{t.kind.label}</legend>
          <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-5 xl:grid-cols-9">
            {(['', ...kinds] as (Kind | '')[]).map((k) => {
              // Bij het openen staat niets aan (dan zie je alle plekken). Een soort aanklikken zet hem aan of weer uit.
              // 'Alles' zet alle soorten aan (bruin); nog een keer klikken zet alles weer uit.
              const allOn = chosen.length === kinds.length;
              const active = k ? chosen.includes(k) : allOn;
              const next = k ? (chosen.includes(k) ? chosen.filter((x) => x !== k) : [...chosen, k]) : allOn ? [] : [...kinds];
              return (
                <button
                  key={k || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ soort: kinds.filter((x) => next.includes(x)).join(',') })}
                  className={`group flex min-w-[112px] flex-col items-start gap-1.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors sm:min-w-0 ${
                    active ? 'border-brand-dark bg-brand-dark text-white' : 'border-rule bg-white text-ink hover:border-brand-dark'
                  }`}
                >
                  <KindIcon kind={k} color={active ? '#FFFFFF' : '#5A4030'} size={20} />
                  <span className="flex w-full items-baseline justify-between gap-2">
                    <span className="text-[15px] font-medium">{k ? t.kind[k] : t.kind.all}</span>
                    <span className="font-mono text-[12px] opacity-60">{kindCount(k)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {/* Gebieden: eerst staat niets aan (alle gebieden); klik om een gebied aan of uit te zetten. 'Alle regio's' zet alles aan of weer uit */}
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="eyebrow mb-2">{t.search.region}</legend>
          <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
            {(() => {
              const all = regions.map((r) => r.id);
              const on = chosenRegions;
              const set = (ids: string[]) => update({ regio: all.filter((x) => ids.includes(x)).join(','), waar: '', land: '' });
              return [
                <button key="all" type="button" className="chip shrink-0" aria-pressed={on.length === all.length} onClick={() => set(on.length === all.length ? [] : all)}>
                  {t.search.allRegions}
                </button>,
                ...regions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="chip shrink-0"
                    aria-pressed={on.includes(r.id)}
                    onClick={() => set(on.includes(r.id) ? on.filter((x) => x !== r.id) : [...on, r.id])}
                  >
                    {r.name}
                  </button>
                )),
              ];
            })()}
          </div>
        </fieldset>
        <div className="grid gap-5 rounded-2xl bg-sand/70 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-0">
          <div className="sm:pr-6">
            <PeopleStepper locale={locale} value={people} t={t.search} onChange={(n) => update({ personen: n === 2 ? '' : String(n) })} />
          </div>
          <div className="sm:max-w-sm sm:border-l sm:border-rule sm:px-6">
            <BudgetSlider
              locale={locale}
              value={budget}
              mode={budgetMode}
              t={t.search}
              onCommit={(v, m) => update({ budget: v === null ? '' : String(v), budgetsoort: m === 'trip' ? 'totaal' : '' })}
            />
          </div>
          <label className="flex flex-col gap-1 sm:border-l sm:border-rule sm:pl-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">{t.search.sort}</span>
            <select className={selectCls} value={sort} onChange={(e) => update({ sorteer: e.target.value === 'top' ? 'top' : '' })}>
              <option value="az">{t.search.sortAz}</option>
              <option value="top">{t.search.sortTop}</option>
            </select>
          </label>
        </div>
        {sort === 'top' && <p className="m-0 text-[14px] text-ink/50">{t.search.sortTopNote}</p>}
      </div>

      <p className="eyebrow m-0 py-6" aria-live="polite">
        {format(budget !== null ? t.search.budgetResults : t.search.results, { n: results.length }, locale)}
      </p>

      {/* Gesponsorde rij: altijd gemarkeerd, staat los van de volgorde van de resultaten. */}
      <aside className="panel mb-4 flex flex-wrap items-center gap-4 px-5 py-4" aria-label={t.search.sponsored}>
        <span className="rounded-full bg-dolly px-3 py-1 text-[12px] font-medium text-white">{t.search.sponsored}</span>
        <span className="text-[15px] text-ink/60">{t.search.sponsoredSlot}</span>
      </aside>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {results.length === 0 ? (
            <p className="py-12 text-center text-[16px] text-ink/60">{budget !== null ? t.search.budgetEmpty : t.search.noResults}</p>
          ) : (
            <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">{results.slice(0, shown).map(row)}</ul>
          )}

          {results.length > shown && (
            <div className="flex justify-center py-8">
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="btn btn-ghost">
                {t.search.showMore}
              </button>
            </div>
          )}
        </div>

        {/* Meelopende lichte kaart met de resultaten (alleen op brede schermen) */}
        <aside className="hidden lg:block">
          <div className="panel sticky top-24 overflow-hidden p-0">
            <p className="m-0 px-5 pt-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">{t.search.onMap}</p>
            <div className="relative mt-3 h-[min(560px,calc(100svh-10rem))]">
              <ResultsMap points={points} locale={locale} label={t.search.onMap} />
            </div>
          </div>
        </aside>
      </div>

      {unknown.length > 0 && (
        <details className="mt-12 border-t border-rule pt-6">
          <summary className="min-h-11 cursor-pointer py-2 text-[24px] font-semibold leading-tight">
            {format(t.search.unknownTitle, { n: unknown.length }, locale)}
          </summary>
          <p className="m-0 mb-4 text-[15px] text-ink/60">{t.search.unknownNote}</p>
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">{unknown.map(row)}</ul>
        </details>
      )}
    </div>
  );
}

/** Poststempel op de ansichtkaart, in de kleur van de soort reis. */
function Stamp({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="absolute right-3 top-3 grid h-[74px] w-[74px] rotate-[-12deg] place-items-center rounded-full border-2 border-dashed p-2 text-center font-mono text-[9.5px] font-medium uppercase leading-tight tracking-wider backdrop-blur-[2px]"
      style={{ borderColor: color, color, background: 'rgba(255,255,255,0.85)' }}
    >
      <span className="line-clamp-3">{label}</span>
    </span>
  );
}

