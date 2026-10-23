import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPrivacy } from '@/lib/privacy';
import { SkyHero } from '@/components/sky/SkyHero';

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getDictionary();
  return { title: getPrivacy(locale).title };
}

/** Privacyverklaring (concept, zie lib/privacy.ts). */
export default async function PrivacyPage() {
  const { locale, t } = await getDictionary();
  const p = getPrivacy(locale);
  return (
    <>
      <SkyHero title={p.title} sub={p.intro} />
      <div className="mx-auto max-w-[760px] px-4 py-12 sm:px-8">
        <p className="m-0 text-[14px] text-subtle">{p.updated}</p>
        <p className="m-0 mt-3 rounded-2xl bg-[#FFF4E5] p-4 text-[14px] text-[#7A4A12]">⚠️ {p.draft}</p>
        {p.onlyIn && <p className="m-0 mt-3 text-[14px] text-subtle">{p.onlyIn}</p>}
        {p.sections.map((s) => (
          <section key={s.h} className="mt-10">
            <h2 className="m-0 text-[22px] font-semibold text-ink">{s.h}</h2>
            {s.list && (
              <ul className="m-0 mt-3 flex flex-col gap-2 pl-5 text-[16px] leading-relaxed text-muted">
                {s.list.map((x) => <li key={x}>{x}</li>)}
              </ul>
            )}
            {s.p?.map((x) => <p key={x} className="m-0 mt-3 text-[16px] leading-relaxed text-muted">{x}</p>)}
          </section>
        ))}
        <div className="panel mt-12 flex flex-wrap items-center gap-3 p-5">
          <Link href={`/${locale}/cookies`} className="btn btn-ghost">🍪 {t.cookies.title}</Link>
          <Link href={`/${locale}/inloggen`} className="btn btn-ghost">👤 {t.account.title}</Link>
        </div>
      </div>
    </>
  );
}
