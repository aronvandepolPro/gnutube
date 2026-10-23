import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPlaceActivities, getPlaces, getRoadNotes, getTripStays } from '@/lib/data';
import { getVideos } from '@/lib/videos';
import { SkyHero } from '@/components/sky/SkyHero';
import { PlaceImage } from '@/components/PlaceImage';
import { TripList } from './TripList';
import { getBestTime } from '@/lib/best-time';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.swipe.tripTitle };
}

/** Mijn reis: wat je in de videofeed koos (bewaard in je browser en in je account); onderaan zet je de reis in de veiling. */
export default async function TripsPage() {
  const { locale, t } = await getDictionary();
  const places = getPlaces(locale).map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    region: p.region,
    tagline: p.tagline,
    nights: p.defaultNights,
    lat: p.lat,
    lon: p.lon,
    island: p.kinds.includes('island'),
    videoIds: getVideos(p.id).map((v) => v.tiktokId),
    activities: getPlaceActivities(p.id, locale),
    stays: getTripStays(p.id, locale),
    season: (() => {
      const b = getBestTime(p.id, locale);
      return b ? { best: b.months, also: b.alsoMonths, label: b.label } : null;
    })(),
    image: <PlaceImage id={p.id} kind={p.kind} mountain={p.mountain} hasWater={p.hasWater} sizes="120px" />,
  }));
  return (
    <>
      <SkyHero title={t.swipe.tripTitle} sub={t.swipe.tripSub} />
      <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-8">
        <TripList locale={locale} places={places} roadNotes={getRoadNotes(locale)} t={{ ...t.swipe, ...t.route, kind: t.kind, setup: { ...t.search, ...t.tripSetup }, done: t.doneTrips, auction: t.auction, account: t.account }} />
      </div>
    </>
  );
}
