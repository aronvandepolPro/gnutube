import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getCountries, getPlaces, getRegions } from '@/lib/data';
import { coordText } from '@/lib/geo';
import { format } from '@/lib/i18n/format';
import { SkyHero } from '@/components/sky/SkyHero';
import { SearchResults } from './SearchResults';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.search.title };
}

/** Zoek en boek: oranje kop, daaronder filters, resultaten en de kaart. */
export default async function SearchPage() {
  const { locale, t } = await getDictionary();
  const places = getPlaces(locale).map((p) => ({ ...p, coords: coordText(p.lat, p.lon, t.compass, locale) }));

  return (
    <div className="pb-8">
      <SkyHero compact kicker={format(t.search.results, { n: places.length }, locale)} title={t.search.title} sub={t.search.heroSub} />
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <Suspense fallback={<p className="mt-8 text-subtle">…</p>}>
          <SearchResults
            locale={locale}
            places={places}
            regions={getRegions(locale)}
            countries={getCountries(locale)}
            t={{ search: t.search, kind: t.kind, advisory: t.advisory }}
          />
        </Suspense>
      </div>
    </div>
  );
}
