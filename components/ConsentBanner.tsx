'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { onOpenConsent, readChoice, setChoice, subscribe } from '@/lib/video-consent';
import { GnuHead } from './mascot/GnuHead';
import './consent.css';

type Labels = { title: string; text: string; accept: string; decline: string; more: string };

const noop = () => () => {};
// Testen: ?gnoe (of het oude ?giraf) achter het adres laat de mascotte altijd zien, tot je kiest
const hasTestParam = () => {
  const q = new URLSearchParams(window.location.search);
  return q.has('gnoe') || q.has('giraf');
};

/** Hoe lang de afscheidsanimatie duurt voordat de keuze wordt opgeslagen en de gnoe weg is. */
const LEAVE_MS = { yes: 2400, no: 2900 } as const;

/**
 * Cookie-keuze op een vriendelijke manier: de gnoe (mascotte van Gnutube) springt linksonder het scherm in
 * met een koekje in zijn bek, en vraagt het in een tekstballonnetje.
 *  - Ja: hij eet het koekje op, knikt en duikt weer weg.
 *  - Nee: er rolt een traantje uit zijn oog, oren omlaag, en hij zakt weg.
 * Voor geldige toestemming: vooraf (er laadt niets van TikTok vóór 'Ja'), duidelijke uitleg met link naar de
 * cookiepagina, 'Ja' en 'Nee' even groot, en later te wijzigen of in te trekken via de footer.
 */
export function ConsentBanner({ t, locale }: { t: Labels; locale: string }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => 'server' as const);
  const forced = useSyncExternalStore(noop, hasTestParam, () => false);
  const [reopened, setReopened] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [leaving, setLeaving] = useState<'yes' | 'no' | null>(null);
  useEffect(
    () =>
      onOpenConsent(() => {
        setLeaving(null);
        setReopened(true);
      }),
    [],
  );

  const open = choice === null || reopened || leaving !== null || (forced && !dismissed);
  if (choice === 'server' || !open) return null;

  const pick = (c: 'yes' | 'no') => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setLeaving(c);
    setDismissed(true);
    window.setTimeout(
      () => {
        setChoice(c);
        setReopened(false);
        setLeaving(null);
      },
      reduce ? 0 : LEAVE_MS[c],
    );
  };

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-text"
      className={`kt-gnu pointer-events-none fixed -bottom-[96px] left-2 z-50 h-[234px] w-[130px] sm:-bottom-[133px] sm:left-6 sm:h-[324px] sm:w-[180px] ${leaving ? `kt-gnu-${leaving}` : ''}`}
    >
      <div className="kt-gnu-pop pointer-events-auto absolute inset-0">
        <GnuHead cookie body id="gnu-consent" className="block h-full w-full" />
      </div>
      <div className="kt-gnu-bubble pointer-events-auto fixed bottom-[150px] left-3 right-3 rounded-2xl border border-rule bg-white p-4 text-ink shadow-[0_16px_40px_-14px_rgba(42,31,23,0.45)] sm:absolute sm:bottom-[229px] sm:left-[192px] sm:right-auto sm:w-[300px]">
        <span className="absolute -left-[7px] bottom-6 hidden h-3.5 w-3.5 rotate-45 border-b border-l border-rule bg-white sm:block" aria-hidden="true" />
        <span className="absolute -bottom-[7px] left-[70px] h-3.5 w-3.5 rotate-45 border-b border-r border-rule bg-white sm:hidden" aria-hidden="true" />
        <p id="consent-title" className="m-0 text-[16px] font-semibold">{t.title}</p>
        <p id="consent-text" className="m-0 mt-1 text-[13.5px] leading-snug text-muted">
          {t.text}{' '}
          <Link href={`/${locale}/cookies`} className="font-medium text-brand-dark underline underline-offset-2">
            {t.more}
          </Link>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => pick('yes')} disabled={leaving !== null} className="btn btn-primary !min-h-10 !px-3 !text-[14px]">
            {t.accept}
          </button>
          <button type="button" onClick={() => pick('no')} disabled={leaving !== null} className="btn btn-ghost !min-h-10 !px-3 !text-[14px]">
            {t.decline}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Knop om de keuze te wijzigen of in te trekken (footer en cookiepagina). */
export function ConsentSettingsLink({ label, plain = false }: { label: string; plain?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => import('@/lib/video-consent').then((m) => m.openConsent())}
      className={plain ? 'min-h-11 font-semibold' : 'min-h-11 text-left underline underline-offset-4 hover:text-white'}
    >
      {label}
    </button>
  );
}
