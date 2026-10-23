import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SkyHero } from '@/components/sky/SkyHero';
import { AccountPage } from './AccountPage';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.login };
}

/** Inloggen (link of code per mail) en je account: ingestuurde video's, gegevens downloaden, account wissen. */
export default async function LoginPage() {
  const { locale, t } = await getDictionary();
  return (
    <>
      <SkyHero title={t.account.title} sub={t.account.intro} />
      <div className="mx-auto max-w-[980px] px-4 py-12 sm:px-8">
        <Suspense fallback={<div className="panel h-64" />}>
          <AccountPage t={t.account} locale={locale} />
        </Suspense>
      </div>
    </>
  );
}
