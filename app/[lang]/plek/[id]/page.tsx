import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format } from '@/lib/i18n/format';
import { getPlace, getPlaceIds, getPlaces, getStays, nearby } from '@/lib/data';
import { euro } from '@/lib/budget';
import { coordText } from '@/lib/geo';
import { Poster } from '@/components/Poster';
import { PlaceImage } from '@/components/PlaceImage';
import { PosterCard } from '@/components/PosterCard';
import { AdvisoryNotice } from '@/components/AdvisoryBadge';
import { ShareButton } from '@/components/ShareButton';
import { PlaceVideos } from './PlaceVideos';
import { getVideos } from '@/lib/videos';
import { PlaceTabs } from './PlaceTabs';
import { getBestTime } from '@/lib/best-time';
import { SkyHero } from '@/components/sky/SkyHero';

export async function generateStaticParams() {
  return getPlaceIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/plek/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const { locale } = await getDictionary();
  const place = getPlace(id, locale);
  return place ? { title: place.name, description: place.tagline } : {};
}

export default function PlacePage({ params }: PageProps<'/[lang]/plek/[id]'>) {
  return (
    <Suspense fallback={<div className="min-h-[80vh]" />}>
      <PlaceContent params={params} />
    </Suspense>
  );
}

async function PlaceContent({ params }: { params: PageProps<'/[lang]/plek/[id]'>['params'] }) {
  const { id } = await params;
  const { locale, t } = await getDictionary();
  const place = getPlace(id, locale);
  if (!place) notFound();

  const coords = coordText(place.lat, place.lon, t.compass, locale);
  const near = nearby(place, getPlaces(locale).filter((p) => !p.advisory || place.advisory), 3);

  return (
    <>
    <SkyHero time="day" kicker={`${t.kind[place.kind]} · ${coords}`} title={place.name} sub={place.tagline} />
    <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-8">
      <Link href={`/${locale}/zoeken`} className="btn btn-ghost min-h-11">
        ← {t.place.back}
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="kt-poster panel self-start p-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] md:aspect-[3/4]">
            <PlaceImage id={place.id} kind={place.kind} mountain={place.mountain} hasWater={place.hasWater} sizes="(min-width: 768px) 40vw, 100vw" priority />
            {/* Tekst op de foto, met een donkere verloop onderaan zodat hij altijd leesbaar is */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" aria-hidden="true" />
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[13px] font-semibold text-ink">{t.kind[place.kind]}</span>
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-5 pb-10 text-white sm:p-6 sm:pb-10">
              <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white/85">
                {place.country} · {place.region}
              </span>
              <span className="font-display text-[clamp(30px,3.4vw,46px)] leading-[1.05] drop-shadow">{place.name}</span>
              <span className="max-w-[46ch] text-[16px] leading-snug text-white/90">{place.tagline}</span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {place.advisory && <AdvisoryNotice t={t.advisory} />}

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${locale}/kijken?plek=${place.id}`}
              className="btn btn-primary"
            >
              {t.place.watch}
            </Link>
            <Link
              href={`/${locale}/kaart?plek=${place.id}`}
              className="btn btn-ghost"
            >
              {t.place.onMap}
            </Link>
            <ShareButton title={place.name} t={{ ...t.share, label: t.place.share }} />
          </div>

          <PlaceTabs
            t={t.place}
            activities={place.activities}
            nightsLabel={format(t.place.nights, { n: place.defaultNights }, locale)}
            bestTime={getBestTime(place.id, locale)}
            placeId={place.id}
            locale={locale}
            stays={getStays(place.id).map((s) => ({
              id: s.id,
              name: s.name,
              price:
                s.priceFrom !== null && s.currency === 'EUR'
                  ? format(t.place.perNight, { price: euro(s.priceFrom, locale) }, locale)
                  : t.place.priceUnknownShort,
            }))}
          />

          <p className="m-0 text-[13px] text-ink/45">{t.place.unverified}</p>
        </div>
      </div>

      <PlaceVideos
        placeId={place.id}
        report={t.report}
        placeName={place.name}
        videos={getVideos(place.id)}
        watchHref={`/${locale}/kijken?plek=${place.id}`}
        poster={<Poster id={place.id} kind={place.kind} mountain={place.mountain} hasWater={place.hasWater} className="h-full w-full" />}
        labels={{
          title: t.place.videos,
          all: t.place.allVideos,
          videoBy: t.watch.videoBy,
          follow: t.watch.follow,
          prev: t.watch.prev,
          next: t.watch.next,
          consentTitle: format(t.watch.consentTitle, { provider: 'TikTok' }),
          consentText: format(t.watch.consentText, { provider: 'TikTok' }),
          consentButton: t.watch.consentButton,
          consentAlways: t.watch.consentAlways,
        }}
      />

      {/* Zelf geweest? Deel je eigen video van deze plek */}
      <section className="mt-16 flex flex-wrap items-center gap-5 rounded-3xl bg-brand p-6 text-[#2A1F17] sm:p-8" aria-labelledby="post-cta">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-[26px]" aria-hidden="true">🎬</span>
        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <h2 id="post-cta" className="m-0 text-[22px] font-semibold">{format(t.post.ctaTitle, { place: place.name }, locale)}</h2>
          <p className="m-0 text-[15px] text-[#2A1F17]/85">{t.post.ctaText}</p>
        </div>
        <Link href={`/${locale}/delen?plek=${place.id}`} className="btn btn-primary">
          ＋ {t.post.ctaButton}
        </Link>
      </section>

      <section className="mt-24" aria-labelledby="nearby">
        <h2 id="nearby" className="m-0 font-display text-[clamp(40px,5vw,72px)] font-normal leading-none">
          {t.place.nearby}
        </h2>
        <ul className="m-0 mt-6 grid list-none grid-cols-2 gap-6 p-0 md:grid-cols-3">
          {near.map(({ place: p, km }) => (
            <li key={p.id} className="flex flex-col gap-2">
              <PosterCard place={p} href={`/${locale}/plek/${p.id}`} coords={coordText(p.lat, p.lon, t.compass, locale)} size="sm" />
              <span className="px-1 text-[13px] text-ink/50">{format(t.place.distance, { km }, locale)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
    </>
  );
}
