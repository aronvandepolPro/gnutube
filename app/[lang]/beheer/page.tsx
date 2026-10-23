import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPlaces } from '@/lib/data';
import { AdminPanel } from './AdminPanel';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.admin.title, robots: { index: false, follow: false } };
}

/** Beheer (alleen voor admins, afgedwongen door de database): meldingen en ingestuurde video's beoordelen. */
export default async function AdminPage() {
  const { locale, t } = await getDictionary();
  const places = Object.fromEntries(getPlaces(locale).map((p) => [p.id, p.name]));
  return (
    <div className="bg-[#120D0A]">
      <div className="mx-auto min-h-[calc(100svh-73px)] max-w-[1440px] px-4 py-8 sm:px-8">
        <h1 className="sr-only">{t.admin.title}</h1>
        <AdminPanel t={t.admin} reasons={t.report.reasons} kinds={t.partners.kinds} pq={t.partners} stayTypes={t.route.stayTypes} places={places} locale={locale} />
      </div>
    </div>
  );
}
