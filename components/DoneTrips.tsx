'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';
import { isDemo, reviewTrip, useDoneTrips, type DoneTrip } from '@/lib/visits';
import { accountsEnabled } from '@/lib/supabase';

export type DoneTripsLabels = {
  doneTitle: string;
  doneOnMap: string;
  donePlaces: string;
  doneHow: string;
  doneLogin: string;
  doneTest: string;
  reviewWrite: string;
  reviewEdit: string;
  reviewYours: string;
  reviewStars: string;
  reviewPlaceholder: string;
  reviewTooShort: string;
  reviewSend: string;
  reviewSaved: string;
  reviewFailed: string;
  reviewPublic: string;
  cancel: string;
};

const fmtDate = (d: string, locale: Locale) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Gemaakte reizen, uit je boekingen: betaald, bevestigd en de laatste dag voorbij. Niet zelf aan te vinken.
 * Per reis een recensie van de hele reis (alleen jij kunt die schrijven, één per reis).
 */
export function DoneTrips({ locale, t, placeNames }: { locale: Locale; t: DoneTripsLabels; placeNames: Record<string, string> }) {
  const { user, trips } = useDoneTrips();
  if (!accountsEnabled && !user) return null;
  return (
    <section aria-labelledby="done-trips">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="done-trips" className="m-0 text-[24px] font-semibold text-ink">
          ✅ {t.doneTitle}
          {user && isDemo() && <span className="ml-2 rounded-full bg-warning px-2.5 py-1 align-middle text-[12px] font-semibold text-warning-ink">Voorbeeld</span>}
        </h2>
        {trips.length > 0 && (
          <Link href={`/${locale}/kaart?mijn=1`} className="text-[15px] font-semibold text-brand-dark underline underline-offset-4">{t.doneOnMap}</Link>
        )}
      </div>
      {!user ? (
        <p className="m-0 mt-3 text-[15px] text-muted">{t.doneLogin}</p>
      ) : trips.length === 0 ? (
        <p className="m-0 mt-3 text-[15px] text-muted">{t.doneHow}</p>
      ) : (
        <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
          {trips.map((d) => (
            <DoneTripItem key={d.group_id} d={d} locale={locale} t={t} placeNames={placeNames} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DoneTripItem({ d, locale, t, placeNames }: { d: DoneTrip; locale: Locale; t: DoneTripsLabels; placeNames: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(d.rating ?? 0);
  const [body, setBody] = useState(d.body ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const names = d.place_ids.map((id) => placeNames[id] ?? id);
  const send = async () => {
    if (rating < 1 || body.trim().length < 20) return setMsg(t.reviewTooShort);
    setBusy(true);
    const r = await reviewTrip(d.group_id, rating, body);
    setBusy(false);
    setMsg(r.error ? t.reviewFailed : t.reviewSaved);
    if (!r.error) setOpen(false);
  };
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-rule bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#2F6B2A] text-[18px] font-bold text-white" aria-hidden="true">✓</span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-semibold text-ink">
            {fmtDate(d.start_day, locale)} – {fmtDate(d.end_day, locale)}
            {d.test && <span className="ml-2 rounded-full bg-warning px-2 py-0.5 text-[11px] font-semibold text-warning-ink">{t.doneTest}</span>}
          </span>
          <span className="text-[13px] text-subtle">{format(t.donePlaces, { n: names.length }, locale)} · 👥 {d.people}</span>
          {names.length > 0 && <span className="text-[14px] text-muted">{names.join(' → ')}</span>}
        </div>
      </div>
      {d.rating && !open && (
        <div className="rounded-xl bg-sand p-3">
          <p className="m-0 text-[13px] font-semibold text-subtle">{t.reviewYours}</p>
          <p className="m-0 mt-1 text-[18px] text-[#E8A21A]" aria-label={`${d.rating}/5`}>{'★'.repeat(d.rating)}<span className="text-rule">{'★'.repeat(5 - d.rating)}</span></p>
          <p className="m-0 mt-1 whitespace-pre-line text-[14px] text-ink">{d.body}</p>
        </div>
      )}
      {open ? (
        <div className="flex flex-col gap-3 rounded-xl border border-rule p-3">
          <div className="flex items-center gap-1" role="radiogroup" aria-label={t.reviewStars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n}/5`}
                onClick={() => setRating(n)}
                className={`text-[30px] leading-none transition-transform hover:scale-110 ${n <= rating ? 'text-[#E8A21A]' : 'text-rule'}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea className="field min-h-28" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.reviewPlaceholder} />
          <p className="m-0 text-[12.5px] text-subtle">{t.reviewPublic}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={send} className="btn btn-primary !min-h-10">{t.reviewSend}</button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost !min-h-10">{t.cancel}</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => { setOpen(true); setMsg(null); }} className="btn btn-ghost !min-h-10 w-fit">
          ⭐ {d.rating ? t.reviewEdit : t.reviewWrite}
        </button>
      )}
      {msg && <p className="m-0 text-[14px] text-muted" role="status">{msg}</p>}
    </li>
  );
}
