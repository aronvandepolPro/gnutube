import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format } from '@/lib/i18n/format';
import { getCountries, getPlaces, getRegions, kinds } from '@/lib/data';
import { KindIcon } from '@/components/KindIcon';
import { KIND_COLOR } from '@/lib/kind-colors';
import { KIND_PHOTO } from '@/lib/kind-photos';
import { hash, Poster } from '@/components/Poster';
import { SearchBar } from '@/components/SearchBar';
import { PlaceImage } from '@/components/PlaceImage';
import { HeroCollage, type CollagePhoto } from '@/components/HeroCollage';
import { getPlacePhoto } from '@/lib/place-photos';
import { SponsorBand } from '@/components/SponsorBand';
import { getVideos } from '@/lib/videos';
import { coordText } from '@/lib/geo';

/**
 * Homepage, eenvoudig en licht (richting Booking/Tripadvisor):
 * oranje kop met zoekbalk → sponsorrij → soorten reis → populaire plekken → video's → zo werkt het → partners.
 * Footer met de wereldbol komt uit de layout.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: { absolute: t.meta.title } };
}


export default async function HomePage() {
  const { locale, t } = await getDictionary();
  const places = getPlaces(locale);
  const safe = places.filter((p) => !p.advisory);
  const ticker = [...safe]
    .sort((a, b) => hash(a.id) - hash(b.id))
    .slice(0, 18)
    .map((p) => ({ name: p.name, coords: coordText(p.lat, p.lon, t.compass, locale) }));
  // Populair = de meeste video's; bij gelijk een vaste volgorde
  const popular = [...safe]
    .map((p) => ({ ...p, videos: getVideos(p.id).length }))
    .sort((a, b) => b.videos - a.videos || hash(a.id) - hash(b.id))
    .slice(0, 8);

  // Alle plekken met een eigen foto; Zanzibar, Kilimanjaro en Serengeti eerst (die staan er bij het openen)
  const first = ['tz-zanzibar', 'tz-kilimanjaro', 'tz-serengeti'];
  const collage: CollagePhoto[] = places
    .map((p) => ({ p, photo: getPlacePhoto(p.id) }))
    .filter((x) => x.photo)
    .sort((a, b) => (first.indexOf(a.p.id) + 1 || 99) - (first.indexOf(b.p.id) + 1 || 99))
    .map(({ p, photo }) => ({ id: p.id, name: p.name, src: photo!.src, pos: photo!.pos, by: photo!.by }));

  const h2 = 'm-0 font-display text-[clamp(26px,3.2vw,36px)] leading-tight text-ink';

  return (
    <>
      {/* Kop: oranje vlak met titel en zoekbalk */}
      {/* Geen overflow-hidden op de sectie zelf: dan worden de keuzelijsten van de zoekbalk afgesneden */}
      <section className="relative z-10 bg-brand text-[#2A1F17]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/15" />
          <div className="absolute -bottom-40 right-1/4 h-[300px] w-[300px] rounded-full bg-[#5A4030]/[0.08]" />
        </div>
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-4 pb-16 pt-12 sm:px-8 md:pb-20 md:pt-16 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h1 className="m-0 font-display text-[clamp(36px,5.2vw,60px)] leading-[1.05]">{t.home.heroTitle}</h1>
            <p className="m-0 mt-4 max-w-[580px] text-[18px] leading-relaxed text-[#2A1F17]/85">{t.home.heroSub}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/${locale}/kijken`} className="btn btn-primary !min-h-14 !px-7 !text-[17px] shadow-lg">
                ▶ {t.home.ctaWatch}
              </Link>
              <Link href={`/${locale}/zoeken`} className="btn !min-h-14 border-2 border-[#2A1F17] bg-white/30 !px-6 !text-[17px] text-[#2A1F17] hover:bg-white/50">
                🗺️ {t.home.ctaPlan}
              </Link>
            </div>
            <ul className="m-0 mt-6 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[15px] font-medium text-[#2A1F17]/90">
              {[t.home.trust1, t.home.trust2, t.home.trust3].map((x) => (
                <li key={x} className="flex items-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white/70 text-[11px] font-bold text-[#2F6B2A]" aria-hidden="true">✓</span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
          {/* Collage van echte plekken (vanaf laptop): wisselt steeds één kaart, tot alle plekken voorbij zijn geweest */}
          <HeroCollage photos={collage} hrefBase={`/${locale}/plek`} />
          <div id="zoeken" className="scroll-mt-28 lg:col-span-2">
            <SearchBar
              locale={locale}
              t={t}
              regions={getRegions(locale)}
              countries={getCountries(locale)}
              regionInfo={Object.fromEntries(
                getRegions(locale).map((r) => {
                  const inRegion = safe
                    .filter((p) => p.regionId === r.id)
                    .sort((a, b) => getVideos(b.id).length - getVideos(a.id).length || hash(a.id) - hash(b.id));
                  return [r.id, { count: places.filter((p) => p.regionId === r.id).length, examples: inRegion.slice(0, 3).map((p) => p.name) }];
                }),
              )}
              kindCounts={{ all: places.length, ...Object.fromEntries(kinds.map((k) => [k, places.filter((p) => p.kinds.includes(k)).length])) }}
            />
          </div>
        </div>
      </section>

      <SponsorBand labels={t.sponsors} places={ticker} becomeHref={`/${locale}/partners`} />

      {/* Zo werkt het: in één blik */}
      <section className="mx-auto max-w-[1240px] px-4 pt-14 sm:px-8" aria-labelledby="how">
        <h2 id="how" className={h2}>{t.home.howTitle}</h2>
        <ol className="m-0 mt-6 grid list-none gap-5 p-0 md:grid-cols-3">
          {[
            { icon: '📱', title: t.home.hs1t, text: t.home.hs1d, href: `/${locale}/kijken`, cta: t.home.hs1cta },
            { icon: '🗺️', title: t.home.hs2t, text: t.home.hs2d, href: `/${locale}/reizen`, cta: t.home.hs2cta },
            { icon: '🤝', title: t.home.hs3t, text: t.home.hs3d, href: `/${locale}/reizen#regelen`, cta: t.home.hs3cta },
          ].map((st, i) => (
            <li key={st.title} className="relative flex flex-col gap-2 rounded-3xl border border-rule bg-white p-6 shadow-[0_12px_30px_-24px_rgba(42,31,23,0.5)]">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-[26px]" aria-hidden="true">{st.icon}</span>
                <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-brand">{format(t.home.stepN, { n: i + 1 }, locale)}</span>
              </div>
              <h3 className="m-0 mt-2 text-[21px] font-semibold text-ink">{st.title}</h3>
              <p className="m-0 text-[15.5px] leading-relaxed text-muted">{st.text}</p>
              <Link href={st.href} className="mt-auto pt-2 text-[15px] font-semibold text-brand-dark hover:underline">{st.cta} →</Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Waarom Gnutube: zo gaat het meestal, zo gaat het hier */}
      <section className="mx-auto max-w-[1240px] px-4 pt-14 sm:px-8" aria-labelledby="why">
        <div className="overflow-hidden rounded-3xl bg-[#2A1F17] text-white">
          <div className="p-6 sm:p-10">
            <h2 id="why" className="m-0 font-display text-[clamp(26px,3.2vw,36px)] leading-tight">{t.home.whyTitle}</h2>
            <p className="m-0 mt-1 text-[16px] text-white/70">{t.home.whySub}</p>
          </div>
          <div className="grid grid-cols-[1fr_1fr] border-t border-white/10 text-[15px] sm:text-[16px]">
            <div className="px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50 sm:px-10">{t.home.whyUsual}</div>
            <div className="bg-brand/15 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#F6B27A] sm:px-10">{t.home.whyOurs}</div>
            {([
              [t.home.w1a, t.home.w1b],
              [t.home.w2a, t.home.w2b],
              [t.home.w3a, t.home.w3b],
              [t.home.w4a, t.home.w4b],
              [t.home.w5a, t.home.w5b],
            ] as const).map(([a, b]) => (
              <div key={a} className="contents">
                <div className="flex items-start gap-2 border-t border-white/10 px-6 py-4 text-white/60 sm:px-10">
                  <span aria-hidden="true">–</span>
                  {a}
                </div>
                <div className="flex items-start gap-2 border-t border-white/10 bg-brand/15 px-6 py-4 font-medium sm:px-10">
                  <span className="text-[#8EE08A]" aria-hidden="true">✓</span>
                  {b}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Soorten reis */}
      <section className="mx-auto max-w-[1240px] px-4 pt-16 sm:px-8" aria-labelledby="kinds">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="kinds" className={h2}>{t.home.byKind}</h2>
            <p className="m-0 mt-1 text-[16px] text-muted">{t.home.kindsSub}</p>
          </div>
          <Link href={`/${locale}/zoeken`} className="text-[15px] font-semibold text-brand-dark hover:underline">
            {t.nav.search} →
          </Link>
        </div>
        <ul className="m-0 mt-6 grid list-none grid-cols-2 gap-4 p-0 lg:grid-cols-4">
          {kinds.map((k) => {
            const photo = KIND_PHOTO[k];
            const inKind = safe.filter((p) => p.kinds.includes(k)).sort((a, b) => hash(a.id + k) - hash(b.id + k));
            return (
              <li key={k}>
                <Link href={`/${locale}/zoeken?soort=${k}`} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand">
                    {photo?.src ? (
                      <Image
                        src={photo.src}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ objectPosition: photo.pos }}
                      />
                    ) : null}
                    {photo?.src && photo.by && (
                      // Naamsvermelding van de fotograaf (Unsplash vraagt het niet verplicht, maar het hoort wel)
                      <span className="absolute bottom-2 right-2 rounded-full bg-black/45 px-2 py-0.5 text-[10.5px] text-white/90 backdrop-blur-sm">
                        {photo.by} · Unsplash
                      </span>
                    )}
                    {photo?.src ? null : (
                      <div className="grid h-full w-full grid-cols-2 grid-rows-2 transition-transform duration-500 group-hover:scale-105">
                        {/* Altijd vier vakjes; bij minder plekken herhalen we ze */}
                        {Array.from({ length: 4 }, (_, i) => inKind[i % inKind.length]).map((p, i) => (
                          <Poster key={i} id={p.id} kind={k} mountain={p.mountain} hasWater={p.hasWater} className="h-full w-full" />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-brand-dark" aria-hidden="true">
                      <KindIcon kind={k} color="currentColor" size={18} />
                    </span>
                    <span className="text-[17px] font-semibold text-ink group-hover:text-brand-dark">{t.kind[k]}</span>
                  </div>
                  <span className="ml-10 text-[14px] text-subtle">
                    {format(t.home.places, { n: places.filter((p) => p.kinds.includes(k)).length }, locale)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Populaire plekken */}
      <section className="mx-auto max-w-[1240px] px-4 pt-16 sm:px-8" aria-labelledby="popular">
        <h2 id="popular" className={h2}>{t.home.popular}</h2>
        <p className="m-0 mt-1 text-[16px] text-muted">{t.home.popularSub}</p>
        <ul className="m-0 mt-6 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((p) => {
            const videoHref = `/${locale}/kijken?plek=${p.id}`;
            const placeHref = `/${locale}/plek/${p.id}`;
            return (
              <li key={p.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-rule bg-white transition-shadow hover:shadow-lg">
                {/* Foto (of tekening): klik = de TikTok-video's van deze plek */}
                <Link
                  href={p.videos > 0 ? videoHref : placeHref}
                  aria-label={p.videos > 0 ? `${p.name}: ${format(t.home.videoCount, { n: p.videos }, locale)}` : p.name}
                  className="relative block aspect-[4/3] overflow-hidden"
                >
                  <PlaceImage
                    id={p.id}
                    kind={p.kind}
                    mountain={p.mountain}
                    hasWater={p.hasWater}
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-ink shadow-sm">
                    <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[p.kind] }} aria-hidden="true" />
                    {t.kind[p.kind]}
                  </span>
                  {p.videos > 0 && (
                    <span
                      className="absolute bottom-3 left-3 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-brand-dark shadow-lg transition-transform duration-300 group-hover:scale-110"
                      aria-hidden="true"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5.5v13l11-6.5z" />
                      </svg>
                    </span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <Link href={placeHref} className="text-[17px] font-semibold text-ink hover:text-brand-dark hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-[14px] text-subtle">{p.region}</span>
                  <span className="text-[14px] text-muted">{p.tagline}</span>
                  {p.videos > 0 && (
                    <Link href={videoHref} className="mt-auto pt-2 text-[14px] font-semibold text-brand-dark hover:underline">
                      ▶ {format(t.home.videoCount, { n: p.videos }, locale)}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Voor partners */}
      <section className="mx-auto max-w-[1240px] px-4 pt-16 sm:px-8" aria-labelledby="partners">
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-rule p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-[620px]">
            <h2 id="partners" className={h2}>{t.home.partnerTitle}</h2>
            <p className="m-0 mt-2 text-[17px] text-muted">{t.home.partnerBand}</p>
          </div>
          <Link href={`/${locale}/partners`} className="btn btn-ghost shrink-0">
            {t.home.partnerCta} →
          </Link>
        </div>
      </section>
    </>
  );
}
