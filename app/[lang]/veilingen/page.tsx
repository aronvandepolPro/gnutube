import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SkyHero } from '@/components/sky/SkyHero';
import { MyAuctions } from './MyAuctions';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.auction.mineTitle, robots: { index: false, follow: false } };
}

/** Mijn veilingen: hoe lang ze nog lopen, de biedingen na het sluiten, kiezen en de aanbetaling. */
export default async function AuctionsPage() {
  const { locale, t } = await getDictionary();
  return (
    <>
      <SkyHero title={t.auction.mineTitle} sub={t.auction.mineSub} />
      <div className="mx-auto max-w-[1040px] px-4 py-10 sm:px-8">
        <MyAuctions t={t.auction} account={t.account} kinds={t.partners.kinds} locale={locale} />
      </div>
    </>
  );
}
