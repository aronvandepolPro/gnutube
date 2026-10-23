import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SkyHero } from '@/components/sky/SkyHero';
import Link from 'next/link';
import { ConsentSettingsLink } from '@/components/ConsentBanner';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.cookies.title };
}

/** Uitleg over cookies en video's: wat Gnutube bewaart, wat TikTok doet en hoe je je keuze wijzigt. */
export default async function CookiesPage() {
  const { locale, t } = await getDictionary();
  const c = t.cookies;
  const sections = [
    { h: c.ownH, p: c.ownP },
    { h: c.tiktokH, p: c.tiktokP },
    { h: c.choiceH, p: c.choiceP },
    { h: c.whoH, p: c.whoP },
  ];
  return (
    <>
      <SkyHero title={c.title} sub={c.intro} />
      <div className="mx-auto max-w-[760px] px-4 py-12 sm:px-8">
        {sections.map((s) => (
          <section key={s.h} className="mb-8">
            <h2 className="m-0 text-[22px] font-semibold text-ink">{s.h}</h2>
            <p className="m-0 mt-2 text-[16px] leading-relaxed text-muted">{s.p}</p>
          </section>
        ))}
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
          <span className="text-[15px] text-muted">{c.change}</span>
          <span className="btn btn-primary">
            <ConsentSettingsLink label={t.consent.settings} plain />
          </span>
        </div>
        <p className="m-0 mt-6 text-[15px] text-muted">
          🔒 {c.privacyMore}{' '}
          <Link href={`/${locale}/privacy`} className="font-semibold underline underline-offset-4">{t.footer.privacy}</Link>
        </p>
      </div>
    </>
  );
}
