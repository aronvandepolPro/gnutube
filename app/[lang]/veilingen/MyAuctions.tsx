'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';
import { getUser, isReady, serverReady, serverUser, subscribeUser } from '@/lib/account';
import { accountsEnabled, supabase } from '@/lib/supabase';
import { LoginForm } from '@/components/account/LoginForm';
import { tripRoute, useNow, timeLeft } from '@/lib/auction';

type Auction = {
  id: string; people: number; start_day: string; end_day: string; max_budget: number; note: string | null;
  trip: { stops?: { name?: string }[] }; closes_at: string; status: 'open' | 'accepted' | 'declined' | 'cancelled';
  decline_reason: string | null; created_at: string; bids: number;
  deal_id: string | null; deal_price: number | null; deposit: number | null; payment: 'pending' | 'test' | 'paid' | 'refunded' | null;
  partner_business: string | null; partner_email: string | null;
};
type Bid = {
  id: string; price: number; deposit: number; included: string; excluded: string | null; changes: string | null; valid_until: string;
  status: 'open' | 'won' | 'lost'; partner_kind: string; reviews: number; rating: number | null;
};

type Props = { t: Dictionary['auction']; account: Dictionary['account']; kinds: Dictionary['partners']['kinds']; locale: Locale };

/**
 * Mijn veilingen. Prijzen pas na het sluiten (auction_bids), zonder bedrijfsnaam. Kiezen maakt een deal;
 * na de aanbetaling (nu in testmodus) zie je het bedrijf. Wat je mag zien en doen bepaalt de database.
 */
export function MyAuctions({ t, account, kinds, locale }: Props) {
  const user = useSyncExternalStore(subscribeUser, getUser, serverUser);
  const ready = useSyncExternalStore(subscribeUser, isReady, serverReady);
  const now = useNow();
  const [list, setList] = useState<Auction[] | null>(null);
  const [bids, setBids] = useState<Record<string, Bid[]>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [ask, setAsk] = useState<{ kind: 'accept' | 'decline' | 'cancel'; id: string } | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data } = await sb.rpc('my_auctions');
    const rows = ((data as Auction[]) ?? []).map((a) => ({ ...a, max_budget: Number(a.max_budget) }));
    setList(rows);
    // Biedingen van gesloten veilingen (de database geeft niets terug zolang een veiling loopt)
    const closed = rows.filter((a) => a.status !== 'open' || new Date(a.closes_at).getTime() <= Date.now());
    const out: Record<string, Bid[]> = {};
    await Promise.all(
      closed.map(async (a) => {
        const { data: b } = await sb.rpc('auction_bids', { aid: a.id });
        out[a.id] = ((b as Bid[]) ?? []).map((x) => ({ ...x, price: Number(x.price), deposit: Number(x.deposit) }));
      }),
    );
    setBids(out);
  }, []);

  useEffect(() => {
    if (!user) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [user, load]);

  if (!accountsEnabled) return <p className="panel m-0 p-6 text-[16px] text-muted">{t.disabled}</p>;
  if (!ready) return <div className="panel h-48" aria-busy="true" />;
  if (!user) {
    return (
      <div className="panel flex max-w-xl flex-col gap-4 p-6 sm:p-8">
        <h2 className="m-0 text-[24px] font-semibold text-ink">🔐 {t.loginFirst}</h2>
        <LoginForm t={account} locale={locale} back={`/${locale}/veilingen`} />
      </div>
    );
  }
  if (list === null) return <div className="panel h-48" aria-busy="true" />;
  if (list.length === 0) {
    return (
      <div className="panel flex flex-col items-start gap-3 p-6">
        <p className="m-0 text-[17px] text-muted">{t.mineEmpty}</p>
        <Link href={`/${locale}/reizen`} className="btn btn-primary">🧳 {t.toPlanner}</Link>
      </div>
    );
  }

  const sb = supabase()!;
  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(''), 4000);
  };
  const run = async (fn: string, args: Record<string, unknown>) => {
    const { error } = await sb.rpc(fn, args);
    setAsk(null);
    if (error) return flash(t.failed);
    await load();
  };
  const usd = (n: number) => Number(n).toLocaleString(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const letter = (i: number) => String.fromCharCode(65 + (i % 26));

  return (
    <div className="flex flex-col gap-5">
      {msg && <p className="m-0 rounded-xl bg-sand p-3 text-[14px] font-semibold text-ink" role="status">{msg}</p>}
      {list.map((a) => {
        const closesAt = new Date(a.closes_at).getTime();
        const running = a.status === 'open' && closesAt > now;
        const choosing = a.status === 'open' && closesAt <= now;
        const b = bids[a.id] ?? [];
        const badge = running
          ? { text: format(t.stRunning, { left: timeLeft(closesAt - now, t) }, locale), cls: 'bg-brand-soft text-brand-dark' }
          : choosing
            ? { text: t.stChoose, cls: 'bg-[#FFF4E5] text-[#7A4A12]' }
            : a.status === 'accepted'
              ? { text: t.stAccepted, cls: 'bg-[#E6F2E3] text-[#2F6B2A]' }
              : { text: a.status === 'declined' ? t.stDeclined : t.stCancelled, cls: 'bg-sand text-muted' };
        return (
          <article key={a.id} className={`panel flex flex-col gap-4 p-5 sm:p-6 ${a.status === 'cancelled' || a.status === 'declined' ? 'opacity-70' : ''}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${badge.cls}`}>{badge.text}</span>
              <span className="text-[13px] text-subtle">#{a.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-[22px] font-semibold text-ink">{tripRoute(a.trip) || t.yourTrip}</h2>
              <p className="m-0 text-[15px] text-muted">
                {day(a.start_day)} – {day(a.end_day)} · {format(t.peopleN, { n: a.people }, locale)} · {format(t.maxLine, { amount: usd(a.max_budget) }, locale)}
              </p>
            </div>

            {running && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sand p-4 text-[14.5px] text-muted">
                <span>🔒 {format(t.bidsSoFar, { n: a.bids }, locale)}</span>
                {ask?.kind === 'cancel' && ask.id === a.id ? (
                  <span className="ml-auto flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary !min-h-10" onClick={() => run('cancel_auction', { aid: a.id })}>{t.cancelYes}</button>
                    <button type="button" className="btn btn-ghost !min-h-10" onClick={() => setAsk(null)}>{t.back}</button>
                  </span>
                ) : (
                  <button type="button" className="ml-auto text-[13px] underline underline-offset-2" onClick={() => setAsk({ kind: 'cancel', id: a.id })}>{t.cancel}</button>
                )}
              </div>
            )}

            {/* Na het sluiten: alle biedingen naast elkaar, zonder bedrijfsnaam */}
            {a.status !== 'open' || choosing ? (
              b.length === 0 ? (
                a.status === 'open' || a.status === 'declined' ? <p className="m-0 text-[15px] text-muted">{t.noBids}</p> : null
              ) : (
                <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
                  {b.map((x, i) => {
                    const expired = x.valid_until < new Date(now).toISOString().slice(0, 10);
                    return (
                      <li key={x.id} className={`flex flex-col gap-2 rounded-2xl border p-4 ${x.status === 'won' ? 'border-brand-dark bg-brand-soft' : 'border-rule bg-white'} ${x.status === 'lost' ? 'opacity-60' : ''}`}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-[15px] font-semibold text-ink">{format(t.bidN, { n: letter(i) }, locale)} · {kinds[x.partner_kind as keyof typeof kinds] ?? x.partner_kind}</span>
                          <span className="text-[22px] font-semibold text-ink">{usd(x.price)}</span>
                        </div>
                        <span className="text-[13px] text-subtle">
                          {format(t.perPerson, { amount: usd(x.price / a.people) }, locale)} · {x.reviews ? format(t.ratingLine, { rating: x.rating ?? 0, n: x.reviews }, locale) : t.noReviews}
                        </span>
                        <p className="m-0 whitespace-pre-line text-[14px] text-ink"><strong>{t.included}:</strong> {x.included}</p>
                        {x.excluded && <p className="m-0 whitespace-pre-line text-[14px] text-muted"><strong>{t.excluded}:</strong> {x.excluded}</p>}
                        {x.changes && <p className="m-0 whitespace-pre-line text-[14px] text-muted"><strong>{t.changes}:</strong> {x.changes}</p>}
                        <span className={`text-[12.5px] ${expired ? 'font-semibold text-[#A33]' : 'text-subtle'}`}>{format(expired ? t.expired : t.validUntil, { date: day(x.valid_until) }, locale)}</span>
                        {choosing && !expired &&
                          (ask?.kind === 'accept' && ask.id === x.id ? (
                            <div className="flex flex-col gap-2 rounded-xl bg-sand p-3 text-[13.5px] text-muted">
                              <p className="m-0">{format(t.acceptConfirm, { deposit: usd(x.deposit), rest: usd(x.price - x.deposit) }, locale)}</p>
                              <span className="flex flex-wrap gap-2">
                                <button type="button" className="btn btn-primary !min-h-10" onClick={() => run('accept_bid', { bid: x.id })}>✓ {t.acceptYes}</button>
                                <button type="button" className="btn btn-ghost !min-h-10" onClick={() => setAsk(null)}>{t.back}</button>
                              </span>
                            </div>
                          ) : (
                            <button type="button" className="btn btn-primary !min-h-11 self-start" onClick={() => setAsk({ kind: 'accept', id: x.id })}>✓ {t.accept}</button>
                          ))}
                        {x.status === 'won' && <span className="text-[13px] font-semibold text-[#2F6B2A]">✓ {t.chosen}</span>}
                      </li>
                    );
                  })}
                </ul>
              )
            ) : null}

            {/* Geen van allen */}
            {choosing && (
              <div className="flex flex-col gap-2 border-t border-rule pt-4">
                <label className="flex flex-col gap-1.5">
                  <span className="eyebrow">{b.length ? t.declineAll : t.closeEmpty}</span>
                  <input className="field !min-h-11" value={reason[a.id] ?? ''} onChange={(e) => setReason({ ...reason, [a.id]: e.target.value })} maxLength={500} placeholder={t.reasonPlaceholder} />
                </label>
                <button
                  type="button"
                  className="btn btn-ghost !min-h-11 self-start disabled:opacity-50"
                  disabled={(reason[a.id] ?? '').trim().length < 3}
                  onClick={() => run('decline_auction', { aid: a.id, reason: reason[a.id] })}
                >
                  ✕ {t.declineSend}
                </button>
                <span className="text-[12.5px] text-subtle">{t.reasonShared}</span>
              </div>
            )}
            {a.status === 'declined' && a.decline_reason && <p className="m-0 text-[14px] text-subtle">{format(t.yourReason, { reason: a.decline_reason }, locale)}</p>}

            {/* Deal: aanbetaling, daarna de gegevens van het bedrijf */}
            {a.status === 'accepted' && a.deal_id && (
              <div className="flex flex-col gap-3 rounded-2xl bg-[#2A1F17] p-5 text-white">
                {a.payment === 'pending' ? (
                  <>
                    <p className="m-0 text-[18px] font-semibold">💳 {format(t.depositTitle, { deposit: usd(a.deposit ?? 0) }, locale)}</p>
                    <p className="m-0 text-[14px] text-white/75">{format(t.depositText, { rest: usd((a.deal_price ?? 0) - (a.deposit ?? 0)) }, locale)}</p>
                    <p className="m-0 rounded-xl bg-white/10 p-3 text-[13px] text-white/80">🧪 {t.testBanner}</p>
                    <button type="button" className="btn btn-primary !min-h-12 self-start" onClick={() => run('test_pay_deposit', { did: a.deal_id })}>💳 {t.payTest}</button>
                  </>
                ) : (
                  <>
                    <p className="m-0 text-[18px] font-semibold">🤝 {t.contactTitle}</p>
                    <p className="m-0 text-[15px]">
                      <strong>{a.partner_business}</strong> · <a href={`mailto:${a.partner_email}`} className="underline underline-offset-2">{a.partner_email}</a>
                    </p>
                    <p className="m-0 text-[14px] text-white/75">{format(t.contactText, { rest: usd((a.deal_price ?? 0) - (a.deposit ?? 0)) }, locale)}</p>
                    {a.payment === 'test' && <span className="self-start rounded-full bg-[#FFF4E5] px-2.5 py-0.5 text-[12px] font-semibold text-[#7A4A12]">TEST</span>}
                  </>
                )}
              </div>
            )}
          </article>
        );
      })}
      <p className="m-0 text-[13px] text-subtle">
        {t.mineFooter} <Link href={`/${locale}/reisvoorwaarden`} className="underline underline-offset-2">{t.terms}</Link>
      </p>
    </div>
  );
}
