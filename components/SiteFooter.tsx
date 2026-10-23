import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { FooterGlobe } from './FooterGlobe';
import { ConsentSettingsLink } from './ConsentBanner';
import './footer-globe.css';

/** Footer: donker vlak met de Gnutube-naam en een draaiende wereldbol in oranje. */
export function SiteFooter({ t, locale }: { t: Dictionary; locale: string }) {
  return (
    <footer className="kt-footer relative mt-20 flex min-h-[calc(100dvh-80px)] flex-col overflow-hidden text-white">
      <div className="kt-footer-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pt-12 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <span className="kt-footer-word font-logo text-[clamp(64px,11vw,168px)] italic leading-[0.95]">Gnutube</span>
          <span className="text-[16px] text-white/80">{t.footer.line}</span>
          <span className="text-[13px] text-white/55">{t.footer.demo}</span>
        </div>
        <ul className="m-0 flex list-none flex-wrap items-center gap-x-6 gap-y-2 p-0 text-[14px] text-white/70 md:pb-2">
          <li>
            <Link href={`/${locale}/privacy`} className="underline underline-offset-4 hover:text-white">{t.footer.privacy}</Link>
          </li>
          <li>
            <Link href={`/${locale}/reisvoorwaarden`} className="underline underline-offset-4 hover:text-white">{t.footer.terms}</Link>
          </li>
          <li>
            <Link href={`/${locale}/fotos`} className="underline underline-offset-4 hover:text-white">{t.footer.photos}</Link>
          </li>
          <li>
            <Link href={`/${locale}/cookies`} className="underline underline-offset-4 hover:text-white">{t.cookies.footer}</Link>
          </li>
          <li>
            <ConsentSettingsLink label={t.consent.settings} />
          </li>
        </ul>
      </div>
      <div className="relative min-h-[320px] flex-1">
        <FooterGlobe className="absolute inset-0 block h-full w-full" />
      </div>
    </footer>
  );
}
