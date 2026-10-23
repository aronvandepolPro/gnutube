import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPlaces, nearby } from '@/lib/data';
import { coordText } from '@/lib/geo';
import { hash } from '@/components/Poster';
import { getVideos } from '@/lib/videos';
import { WatchFeed } from './WatchFeed';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.watch.title };
}

export default async function WatchPage() {
  const { locale, t } = await getDictionary();
  // Plekken met een negatief reisadvies komen niet in de kijkmodus.
  const safe = getPlaces(locale).filter((p) => !p.advisory);
  const items = [...safe]
    .sort((a, b) => hash(a.id) - hash(b.id))
    .map((p) => ({
      ...p,
      coords: coordText(p.lat, p.lon, t.compass, locale),
      near: nearby(p, safe, 3).map(({ place, km }) => ({ id: place.id, name: place.name, km })),
      videos: getVideos(p.id),
    }));

  return (
    <div className="bg-black text-white [--color-ink:#FFFFFF] [--color-subtle:#A8A29E] [--color-muted:#D6D3D1]">
      <h1 className="sr-only">{t.watch.title}</h1>
      <Suspense fallback={<div className="h-[calc(100dvh-73px)]" />}>
        <WatchFeed
          locale={locale}
          items={items}
          t={{ watch: t.watch, kind: t.kind, place: t.place, share: t.share, swipe: t.swipe, post: t.post, report: t.report, social: t.social, tripSetup: t.tripSetup, search: t.search }}
        />
      </Suspense>
    </div>
  );
}
