import type { Metadata } from 'next';
import { Barlow, IBM_Plex_Mono, Instrument_Serif } from 'next/font/google';
import '../globals.css';
import { locales } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ConsentBanner } from '@/components/ConsentBanner';
import { AccountProvider } from '@/components/account/AccountProvider';

const instrument = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-instrument' });
const barlow = Barlow({ weight: ['300', '400', '500', '600'], subsets: ['latin'], variable: '--font-barlow' });
const plexMono = IBM_Plex_Mono({ weight: ['400', '500'], subsets: ['latin'], variable: '--font-plex-mono' });

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: { default: t.meta.title, template: `%s · Gnutube` },
    description: t.meta.description,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
  };
}

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  const { locale, t } = await getDictionary();
  return (
    <html lang={locale} className={`${instrument.variable} ${barlow.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-3 focus:text-black"
        >
          {t.nav.skip}
        </a>
        <SiteHeader locale={locale} t={t.nav} cta={t.concept.cta} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter t={t} locale={locale} />
        <ConsentBanner t={{ ...t.consent, more: t.cookies.more }} locale={locale} />
        <AccountProvider t={t.account} locale={locale} />
      </body>
    </html>
  );
}
