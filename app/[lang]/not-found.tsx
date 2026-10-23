import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SkyHero } from '@/components/sky/SkyHero';

/** 404: verdwaald in de nacht, met de weg terug. */
export default async function NotFound() {
  const { locale, t } = await getDictionary();
  return (
    <SkyHero time="night" title={t.notFound.titleA} em={t.notFound.titleB} sub={t.notFound.text}>
      <Link href={`/${locale}`} className="btn btn-primary">
        {t.notFound.back}
      </Link>
      <Link href={`/${locale}/kaart`} className="btn btn-ghost">
        {t.nav.map}
      </Link>
    </SkyHero>
  );
}
