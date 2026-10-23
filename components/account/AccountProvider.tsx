'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { getUser, LOGIN_NEEDED, serverUser, startAccount, subscribeUser } from '@/lib/account';
import { LoginForm } from './LoginForm';

/** Start de accountkoppeling en toont het inlogvenster als iemand iets wil bewaren zonder ingelogd te zijn. */
export function AccountProvider({ t, locale }: { t: Dictionary['account']; locale: string }) {
  const pathname = usePathname();
  const user = useSyncExternalStore(subscribeUser, getUser, serverUser);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    startAccount();
    const show = () => setOpen(true);
    window.addEventListener(LOGIN_NEEDED, show);
    return () => window.removeEventListener(LOGIN_NEEDED, show);
  }, []);
  // Ingelogd: venster dicht
  const visible = open && !user;

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-needed"
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-[#2A1F17] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="login-needed" className="m-0 text-[22px] font-semibold">🔐 {t.neededTitle}</h2>
          <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-sand" aria-label={t.close}>✕</button>
        </div>
        <p className="m-0 mt-2 text-[15px] text-[#5E5248]">{t.neededText}</p>
        <div className="mt-4">
          <LoginForm t={t} locale={locale} back={pathname} onDone={() => setOpen(false)} />
        </div>
        <p className="m-0 mt-4 text-[12.5px] text-[#7D7064]">
          {t.privacyNote}{' '}
          <Link href={`/${locale}/privacy`} className="underline underline-offset-2">{t.privacyLink}</Link>
        </p>
      </div>
    </div>
  );
}

/** Knop in de kop: Inloggen, of de eerste letter van je e-mailadres als je bent ingelogd. */
export function AccountButton({ login, account, locale, className }: { login: string; account: string; locale: string; className: string }) {
  const user = useSyncExternalStore(subscribeUser, getUser, serverUser);
  return (
    <Link href={`/${locale}/inloggen`} className={className} aria-label={user ? account : undefined}>
      {user ? (
        <>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-[13px] font-bold uppercase text-white" aria-hidden="true">
            {(user.email ?? '?').slice(0, 1)}
          </span>
          <span className="ml-2">{account}</span>
        </>
      ) : (
        login
      )}
    </Link>
  );
}
