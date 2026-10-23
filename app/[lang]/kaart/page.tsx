import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getCountryNames, getPlaces } from '@/lib/data';
import { coordText } from '@/lib/geo';
import { MapView } from './MapView';
import { SkyHero } from '@/components/sky/SkyHero';
import { PlaceImage } from '@/components/PlaceImage';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.map.title };
}

export default async function MapPage() {
  const { locale, t } = await getDictionary();
  const places = getPlaces(locale).map((p) => ({ ...p, coords: coordText(p.lat, p.lon, t.compass, locale) }));
  const images = Object.fromEntries(
    places.map((p) => [p.id, <PlaceImage key={p.id} id={p.id} kind={p.kind} mountain={p.mountain} hasWater={p.hasWater} sizes="380px" />]),
  );

  return (
    <>
    <SkyHero time="dusk" title={t.map.title} sub={t.map.intro} />
    <div className="mx-auto max-w-[1240px] px-4 pt-4 sm:px-8">
      <Suspense fallback={<div className="mt-6 h-[64vh] rounded-[28px] border border-rule" />}>
        <MapView
          locale={locale}
          places={places}
          images={images}
          neighbours={getCountryNames(['ke', 'ug', 'rw', 'bi', 'cd', 'zm', 'mw', 'mz'], locale)}
          t={{ map: t.map, kind: t.kind, advisory: t.advisory, search: t.search }}
        />
      </Suspense>
    </div>
    </>
  );
}
