'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { readChoice, subscribe } from '@/lib/video-consent';
import { GnuHead } from '@/components/mascot/GnuHead';
import '@/components/consent.css';

/** Event dat het formulier stuurt na een geslaagde aanmelding: de gnoe juicht en springt weg. */
export const PARTNER_SENT = 'kt-partner-sent';

/**
 * De gnoe springt rechtsonder in beeld (gespiegeld, zodat hij naar de pagina kijkt) en verwelkomt
 * aanstaande partners. Na het versturen knikt hij blij en springt hij weg. Met ✕ gaat hij meteen weg.
 */
export function PartnerGnu({ hello, sent, close }: { hello: string; sent: string; close: string }) {
  const [state, setState] = useState<'hello' | 'sent' | 'gone'>('hello');
  // Eerst de cookievraag (ook met een gnoe): pas daarna komt deze gnoe, anders staan er twee tegelijk
  const choice = useSyncExternalStore(subscribe, readChoice, () => 'server' as const);

  useEffect(() => {
    const onSent = () => {
      setState('sent');
      window.setTimeout(() => setState('gone'), 3200);
    };
    window.addEventListener(PARTNER_SENT, onSent);
    return () => window.removeEventListener(PARTNER_SENT, onSent);
  }, []);

  if (state === 'gone' || choice === null || choice === 'server') return null;
  return (
    <div
      className={`kt-gnu pointer-events-none fixed -bottom-[96px] right-2 z-40 h-[234px] w-[130px] sm:-bottom-[133px] sm:right-6 sm:h-[324px] sm:w-[180px] ${state === 'sent' ? 'kt-gnu-yes' : ''}`}
      role="status"
    >
      <div className="kt-gnu-pop pointer-events-auto absolute inset-0">
        <div className="h-full w-full -scale-x-100">
          <GnuHead body id="gnu-partner" className="block h-full w-full" />
        </div>
      </div>
      <div className="kt-gnu-bubble pointer-events-auto fixed bottom-[150px] left-3 right-3 rounded-2xl border border-rule bg-white p-4 pr-10 text-ink shadow-[0_16px_40px_-14px_rgba(42,31,23,0.45)] sm:absolute sm:bottom-[229px] sm:left-auto sm:right-[192px] sm:w-[280px]">
        <span className="absolute -right-[7px] bottom-6 hidden h-3.5 w-3.5 -rotate-45 border-b border-r border-rule bg-white sm:block" aria-hidden="true" />
        <p className="m-0 text-[15px] font-semibold leading-snug">{state === 'sent' ? sent : hello}</p>
        <button type="button" onClick={() => setState('gone')} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-[14px] text-subtle hover:bg-sand" aria-label={close}>
          ✕
        </button>
      </div>
    </div>
  );
}
