import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPlaces } from '@/lib/data';
import { SkyHero } from '@/components/sky/SkyHero';
import { PartnerForm } from '@/components/partners/PartnerForm';
import { PartnerGnu } from '@/components/partners/PartnerGnu';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.partners.formTitle };
}

/** Alleen het aanmeldformulier voor partners (de uitleg staat op /partners). */
export default async function PartnerSignupPage() {
  const { locale, t } = await getDictionary();
  const p = t.partners;
  const places = getPlaces(locale)
    .filter((x) => !x.advisory)
    .map((x) => ({ id: x.id, name: x.name }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return (
    <>
      <SkyHero kicker={p.kicker} title={p.formTitle} sub={p.formSub} />
      <div className="mx-auto max-w-[860px] px-4 py-10 sm:px-8">
        <Link href={`/${locale}/partners`} className="btn btn-ghost mb-6 min-h-11">← {p.back}</Link>
        <PartnerForm t={p} places={places} locale={locale} />
      </div>
      <PartnerGnu hello={p.gnuHello} sent={p.gnuSent} close={p.close} />
    </>
  );
}
