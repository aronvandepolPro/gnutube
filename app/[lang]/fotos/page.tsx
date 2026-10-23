import type { Metadata } from 'next';
import Image from 'next/image';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SkyHero } from '@/components/sky/SkyHero';
import { getPlace } from '@/lib/data';
import { getPhotoCredits } from '@/lib/place-photos';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.photos.title };
}

/**
 * Fotoverantwoording: per foto de maker, de bron en de licentie (met links). Nodig voor Creative Commons-foto's
 * (naamsvermelding, licentie, en melden dat de foto is aangepast) en netjes voor Unsplash en Pexels.
 */
export default async function PhotoCreditsPage() {
  const { locale, t } = await getDictionary();
  const credits = getPhotoCredits()
    .map((c) => ({ ...c, name: getPlace(c.id, locale)?.name ?? c.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <SkyHero title={t.photos.title} sub={t.photos.intro} />
      <div className="mx-auto max-w-[860px] px-4 py-12 sm:px-8">
        <p className="m-0 mb-8 text-[15px] leading-relaxed text-muted">{t.photos.changed}</p>
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {credits.map((c) => (
            <li key={c.id} className="panel flex items-center gap-4 p-3">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                <Image src={c.src} alt="" fill sizes="96px" className="object-cover" style={{ objectPosition: c.pos ?? '50% 50%' }} />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 text-[14px]">
                <span className="text-[16px] font-semibold text-ink">{c.name}</span>
                <span className="text-muted">{c.by}</span>
                <span className="flex flex-wrap gap-x-4">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">{t.photos.source} ↗</a>
                  {c.licenseUrl && (
                    <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline underline-offset-4">{c.license} ↗</a>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
