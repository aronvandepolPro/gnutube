import data from '@/data/best-time.json';
import { localeTag, type Locale } from '@/lib/i18n/config';

type Translated = Partial<Record<Locale, string>> & { en: string };
type Entry = {
  /** Beste maanden (1 = januari). */
  months: number[];
  why: Translated;
  /** Tweede goede periode, met eigen maanden (bv. kalveren in de Serengeti). */
  also?: { months: number[]; text: Translated } | null;
  /** Waar je rekening mee moet houden (bv. de lange regens). */
  avoid?: Translated | null;
  source: { name: string; url: string; checked: string };
};

export type BestTime = {
  months: number[];
  /** Leeg = het hele jaar. */
  label: string;
  why: string;
  also: { label: string; text: string } | null;
  /** Maanden van de tweede goede periode (voor de balk). */
  alsoMonths: number[];
  avoid: string | null;
  source: { name: string; url: string };
  /** Korte maandnamen (jan … dec) voor de balk. */
  monthNames: string[];
};

const entries = data as unknown as Record<string, Entry | string>;

const pick = (t: Translated, locale: Locale) => t[locale] ?? t.en;

/** Maanden als periodes: [6,7,8,9,10] → "juni – oktober"; [12,1,2] → "december – februari"; losse stukken met komma's. */
export function monthRanges(months: number[], locale: Locale): string {
  const set = new Set(months);
  // Hele jaar: de pagina toont dan zelf 'het hele jaar'
  if (set.size === 12) return '';
  const name = (m: number) => new Intl.DateTimeFormat(localeTag[locale], { month: 'long' }).format(new Date(2024, m - 1, 1));
  // Begin bij een maand die niet direct na een andere gekozen maand komt (zodat dec–feb één periode wordt)
  const starts = [...set].filter((m) => !set.has(m === 1 ? 12 : m - 1)).sort((a, b) => a - b);
  return starts
    .map((s) => {
      let e = s;
      while (set.has(e === 12 ? 1 : e + 1) && (e === 12 ? 1 : e + 1) !== s) e = e === 12 ? 1 : e + 1;
      return e === s ? name(s) : `${name(s)} – ${name(e)}`;
    })
    .join(', ');
}

/** Beste reistijd van een plek, met reden en bron; null = nog geen bron gevonden. */
export function getBestTime(id: string, locale: Locale): BestTime | null {
  const e = entries[id];
  if (!e || typeof e === 'string' || !e.months?.length) return null;
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(localeTag[locale], { month: 'short' }).format(new Date(2024, i, 1)).replace('.', ''),
  );
  return {
    months: e.months,
    label: monthRanges(e.months, locale),
    why: pick(e.why, locale),
    also: e.also?.months?.length ? { label: monthRanges(e.also.months, locale), text: pick(e.also.text, locale) } : null,
    alsoMonths: e.also?.months ?? [],
    avoid: e.avoid ? pick(e.avoid, locale) : null,
    source: { name: e.source.name, url: e.source.url },
    monthNames,
  };
}
