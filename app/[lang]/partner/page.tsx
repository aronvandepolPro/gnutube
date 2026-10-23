import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SkyHero } from '@/components/sky/SkyHero';
import { PartnerPortal } from './PartnerPortal';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.partnerPortal.title, robots: { index: false, follow: false } };
}

/** Partneromgeving voor goedgekeurde bedrijven: bieden op veilingen, biedingen volgen en deals. */
export default async function PartnerPage() {
  const { locale, t } = await getDictionary();
  return (
    <>
      <SkyHero kicker={t.partnerPortal.kicker} title={t.partnerPortal.title} sub={t.partnerPortal.intro} />
      <div className="mx-auto max-w-[1040px] px-4 py-10 sm:px-8">
        <PartnerPortal t={t.partnerPortal} account={t.account} locale={locale} />
      </div>
    </>
  );
}
