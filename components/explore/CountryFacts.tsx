'use client';

import data from '@/data/country-facts.json';
import { localeTag, type Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';
import type { Kind } from '@/lib/data';

type Facts = (typeof data.facts)[keyof typeof data.facts];
type CapitalNames = { en: string } & Partial<Record<Locale, string>>;

export type FactLabels = {
  eyebrow: string;
  capital: string;
  capitals: string;
  population: string;
  populationValue: string;
  populationNote: string;
  area: string;
  bigger: string;
  same: string;
  smaller: string;
  languages: string;
  currency: string;
  neighbours: string;
  island: string;
  landlocked: string;
  onSite: string;
  source: string;
};

/** Land waarmee we de oppervlakte vergelijken, per taal van de site (moet kloppen met de teksten in messages/*.json). */
const REF: Record<Locale, keyof typeof data.refs> = { nl: 'nl', en: 'gb', de: 'de', fr: 'fr', es: 'es', it: 'it', pt: 'pt', sw: 'tz' };

type Props = {
  id: string;
  name: string;
  locale: Locale;
  /** Landnamen in de huidige taal (voor buurlanden). */
  names: Record<string, string>;
  /** Plekken op de site in dit land, per soort reis. */
  kinds: { kind: Kind; label: string; count: number; color: string }[];
  total: string;
  labels: FactLabels;
};

/**
 * Paneel met feiten over het gekozen land, linksonder bij de wereldbol.
 * Alle feiten komen uit open data (data/country-facts.json, gemaakt met npm run facts:build).
 * Taal- en valutanamen vertaalt de browser zelf (Intl.DisplayNames).
 */
export function CountryFacts({ id, name, locale, names, kinds, total, labels }: Props) {
  const f = (data.facts as Record<string, Facts>)[id];
  if (!f) return null;
  const tag = localeTag[locale];
  const num = new Intl.NumberFormat(tag);
  const compact = new Intl.NumberFormat(tag, { notation: 'compact', maximumFractionDigits: 1 });
  const langNames = safeDisplayNames(tag, 'language');
  const curNames = safeDisplayNames(tag, 'currency');
  const regionNames = safeDisplayNames(tag, 'region');

  const capitals = (f.capitals as CapitalNames[]).map((c) => c[locale] ?? c.en).join(', ');
  const languages = f.languages
    .map((l) => {
      const n = langNames?.of(l.code);
      // Geeft de browser alleen een code terug (bv. 'nr' voor Zuid-Ndebele), dan de Engelse naam uit de dataset.
      return n && !/^[a-z]{2,3}$/.test(n) ? n : l.en;
    })
    .join(', ');
  const currency = f.currencies
    .map((c) => {
      const n = curNames?.of(c.code);
      return `${n && n !== c.code ? n : c.en} (${c.code})`;
    })
    .join(', ');
  const neighbours = f.borders.map((b) => names[b] ?? regionNames?.of(b.toUpperCase()) ?? b.toUpperCase()).join(', ');

  // Oppervlakte vergeleken met een bekend land voor de lezer (dat land staat per taal in de tekst zelf)
  const refId = REF[locale];
  const ratio = f.area / data.refs[refId];
  const compare =
    refId === id
      ? null
      : ratio >= 1.5
        ? format(labels.bigger, { n: roundRatio(ratio, tag) }, locale)
        : ratio > 1 / 1.5
          ? labels.same
          : format(labels.smaller, { n: roundRatio(1 / ratio, tag) }, locale);

  const island = f.borders.length === 0;

  return (
    <div className="kt-rise pointer-events-auto max-h-[40svh] w-full overflow-y-auto rounded-[22px] border border-white/15 bg-black/55 p-4 md:max-w-[330px] text-left text-white shadow-2xl backdrop-blur-xl">
      <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-white/55">{labels.eyebrow}</p>
      <h3 className="m-0 mt-0.5 flex items-center gap-2 font-display text-[24px] leading-tight md:text-[27px]">
        <span aria-hidden="true" className="text-[24px]">
          {f.flag}
        </span>
        {name}
      </h3>

      <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px] leading-snug">
        <Row term={f.capitals.length > 1 ? labels.capitals : labels.capital}>{capitals}</Row>
        {f.population && (
          <Row term={labels.population}>
            {format(labels.populationValue, { n: compact.format(f.population.n) }, locale)}{' '}
            <span className="text-white/50">({format(labels.populationNote, { year: String(f.population.year) }, locale)})</span>
          </Row>
        )}
        <Row term={labels.area}>
          {num.format(f.area)} km²
          {compare && <span className="block text-white/60">{compare}</span>}
        </Row>
        <Row term={labels.languages} wide>{languages}</Row>
        <Row term={labels.currency} wide>{currency}</Row>
        <Row term={labels.neighbours} wide>
          {island ? labels.island : neighbours}
          {f.landlocked && <span className="block text-white/60">{labels.landlocked}</span>}
        </Row>
        {kinds.length > 0 && (
          <Row term={labels.onSite} wide>
            {total}
            <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-white/70">
              {kinds.map((k) => (
                <span key={k.kind} className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: k.color }} aria-hidden="true" />
                  {k.label} {k.count}
                </span>
              ))}
            </span>
          </Row>
        )}
      </dl>
      <p className="m-0 mt-3 text-[10.5px] leading-snug text-white/40">{labels.source}</p>
    </div>
  );
}

/** Een regel in het paneel; `wide` = alleen op brede schermen (op een telefoon blijft het paneel kort). */
function Row({ term, children, wide }: { term: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <dt className={`text-white/55 ${wide ? 'hidden md:block' : ''}`}>{term}</dt>
      <dd className={`m-0 ${wide ? 'hidden md:block' : ''}`}>{children}</dd>
    </>
  );
}

function roundRatio(r: number, tag: string) {
  return new Intl.NumberFormat(tag, { maximumFractionDigits: r < 10 ? 1 : 0 }).format(r);
}

function safeDisplayNames(tag: string, type: 'language' | 'currency' | 'region') {
  try {
    return new Intl.DisplayNames([tag, 'en'], { type, fallback: 'code' });
  } catch {
    return null;
  }
}
