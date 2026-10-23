'use client';

import Link from 'next/link';
import { AccountButton } from './account/AccountProvider';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { getUser, serverUser, subscribeUser } from '@/lib/account';
import { supabase } from '@/lib/supabase';
import { locales, localeLabel, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { format } from '@/lib/i18n/format';

type Props = { locale: Locale; t: Dictionary['nav']; cta: string };

/**
 * Kopbalk: wit, eenvoudig, altijd zichtbaar (zoals bij boekingssites).
 * Logo in oranje, links in het midden (vanaf laptop), rechts zoeken, taal en Inloggen.
 * Vanaf 980 px staan de links op één regel tussen logo en knoppen; daaronder achter de menuknop.
 */
export function SiteHeader({ locale, t, cta }: Props) {
  const pathname = usePathname();
  // Beheer staat alleen in het menu voor beheerders (wat ze mogen zien en doen, bepaalt de database)
  const user = useSyncExternalStore(subscribeUser, getUser, serverUser);
  // Rood getal bij Beheer: meldingen, video's, aanvragen en partners die op een besluit wachten
  const [todo, setTodo] = useState(0);
  const isAdmin = !!user?.admin;
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    const check = () => {
      const sb = supabase();
      if (!sb || document.hidden) return;
      void sb.rpc('admin_todo_count').then(({ data }) => alive && setTodo(typeof data === 'number' ? data : 0));
    };
    check();
    const id = window.setInterval(check, 120_000);
    window.addEventListener('focus', check);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener('focus', check);
    };
  }, [isAdmin, pathname]);
  const todoCount = isAdmin ? todo : 0;
  // Menu's horen bij één pad: na navigeren zijn ze vanzelf dicht.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const [langOn, setLangOn] = useState<string | null>(null);
  const langOpen = langOn === pathname;

  const rest = pathname.split('/').slice(2).join('/');
  const hrefFor = (l: Locale) => `/${l}${rest ? '/' + rest : ''}`;

  const items: { href: string; label: string; exact?: boolean; badge?: number }[] = [
    { href: `/${locale}`, label: t.discover, exact: true },
    { href: `/${locale}/zoeken`, label: t.destinations },
    { href: `/${locale}/reizen`, label: t.tripsShort },
    { href: `/${locale}/kijken`, label: t.videos },
    { href: `/${locale}/kaart`, label: t.map },
    { href: `/${locale}/partners`, label: t.partners },
    ...(user?.admin ? [{ href: `/${locale}/beheer`, label: t.admin, badge: todoCount }] : []),
  ];
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[64px] max-w-[1240px] items-center gap-2 px-4 sm:px-8 md:h-[73px] md:max-xl:gap-1 md:max-xl:px-4">
        <Link href={`/${locale}`} className="shrink-0 font-logo text-[30px] italic leading-none text-brand-dark md:max-xl:text-[26px]">
          Gnutube
        </Link>

        <nav aria-label={t.menu} className={`ml-3 hidden min-w-0 items-center gap-0 min-[980px]:flex ${isAdmin ? 'xl:ml-5 2xl:ml-8 2xl:gap-1' : 'xl:ml-8 xl:gap-1'}`}>
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(it.href, it.exact) ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[14px] font-medium md:max-xl:px-1.5 md:max-xl:text-[13.5px] text-muted transition-colors hover:bg-sand hover:text-ink aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-dark xl:px-2.5 xl:text-[15px] ${isAdmin ? '2xl:px-3.5' : 'xl:px-3.5'}`}
            >
              {it.label}
              {!!it.badge && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#D33] px-1.5 text-[11px] font-bold leading-none text-white" aria-label={format(t.todo, { n: it.badge }, locale)}>
                  {it.badge > 99 ? '99+' : it.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 md:max-xl:gap-0">
          {/* Opvallend: zelf een video delen */}
          <Link
            href={`/${locale}/delen`}
            className="mr-1 hidden min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-4 md:max-xl:px-3 md:max-xl:text-[14px] text-[15px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(240,127,30,0.8)] transition-transform hover:scale-105 md:flex"
          >
            <span aria-hidden="true">＋</span> {t.share}
          </Link>
          <Link
            href={`/${locale}/zoeken`}
            aria-label={t.searchLabel}
            className="grid h-11 w-11 place-items-center rounded-full text-ink transition-colors hover:bg-sand md:max-xl:w-9"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
          </Link>

          {/* Taalkeuze: kort "NL ⌄", met een lijstje talen */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOn(langOpen ? null : pathname)}
              aria-expanded={langOpen}
              aria-haspopup="true"
              aria-label={`${t.language}: ${localeLabel[locale]}`}
              className="flex h-11 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold text-ink transition-colors hover:bg-sand md:max-xl:px-2"
            >
              {locale.toUpperCase()}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M3 4.5 6 7.5 9 4.5" />
              </svg>
            </button>
            {langOpen && (
              <ul className="absolute right-0 top-full z-50 m-0 mt-2 w-52 list-none rounded-2xl border border-rule bg-white p-2 shadow-lg">
                {locales.map((l) => (
                  <li key={l}>
                    <Link
                      href={hrefFor(l)}
                      hrefLang={l}
                      aria-current={l === locale ? 'true' : undefined}
                      className="flex min-h-10 items-center justify-between rounded-xl px-3 text-[14px] text-muted hover:bg-sand hover:text-ink aria-[current=true]:font-semibold aria-[current=true]:text-brand-dark"
                    >
                      {localeLabel[l]}
                      <span className="text-[12px] uppercase text-subtle">{l}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <AccountButton
            login={t.login}
            account={t.account}
            locale={locale}
            className="ml-1 hidden min-h-11 items-center whitespace-nowrap rounded-full border border-brand-dark px-5 md:max-xl:px-3 md:max-xl:text-[14px] text-[15px] font-semibold text-brand-dark transition-colors hover:bg-brand-dark hover:text-white sm:flex"
          />

          <button
            type="button"
            onClick={() => setOpenOn(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t.close : t.menu}
            className="ml-1 flex h-11 w-11 items-center justify-center rounded-full border border-rule text-ink min-[980px]:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" stroke="currentColor" strokeWidth="1.6">
              {open ? <path d="M4 4 L14 14 M14 4 L4 14" /> : <path d="M2 5 H16 M2 9 H16 M2 13 H16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Uitklapmenu voor telefoon */}
      {open && (
        <nav id="mobile-nav" aria-label={t.menu} className="border-t border-rule bg-white px-4 pb-4 pt-2 min-[980px]:hidden">
          <div className="mx-auto flex max-w-[1240px] flex-col">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                aria-current={isActive(it.href, it.exact) ? 'page' : undefined}
                className="flex min-h-12 items-center border-b border-rule px-1 text-[16px] font-medium text-ink last:border-b-0 aria-[current=page]:text-brand-dark"
              >
                {it.label}
                {!!it.badge && <span className="ml-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#D33] px-1.5 text-[11px] font-bold text-white">{it.badge}</span>}
              </Link>
            ))}
            <Link href={`/${locale}/kijken`} className="btn btn-primary mt-3">
              {cta}
            </Link>
            <Link href={`/${locale}/delen`} className="btn mt-2 bg-brand text-white md:hidden">
              ＋ {t.share}
            </Link>
            <AccountButton login={t.login} account={t.account} locale={locale} className="btn btn-ghost mt-2 sm:hidden" />
          </div>
        </nav>
      )}
    </header>
  );
}
