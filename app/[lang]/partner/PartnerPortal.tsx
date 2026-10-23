'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';
import { getUser, isReady, serverReady, serverUser, subscribeUser } from '@/lib/account';
import { supabase, accountsEnabled } from '@/lib/supabase';
import { tripRoute, timeLeft, useNow } from '@/lib/auction';
import { LoginForm } from '@/components/account/LoginForm';

type Partner = { id: string; business: string; kind: string; commission_pct: number; email: string };
type Stop = { id?: string; name?: string; nights?: number; stay?: string | null; activities?: string[] };
type Trip = { stops?: Stop[]; flightMode?: string; arrive?: string; depart?: string };
type Auction = {
  id: string; people: number; start_day: string; end_day: string; max_budget: number; note: string | null; trip: Trip;
  closes_at: string; status: 'open' | 'accepted' | 'declined' | 'cancelled'; decline_reason: string | null;
  bid_id: string | null; bid_price: number | null; bid_included: string | null; bid_excluded: string | null;
  bid_changes: string | null; bid_valid_until: string | null; bid_status: 'open' | 'won' | 'lost' | 'withdrawn' | null;
};
type Deal = {
  id: string; auction_id: string; price: number; deposit: number; payment: 'pending' | 'test' | 'paid' | 'refunded';
  people: number; start_day: string; end_day: string; trip: Trip; name: string | null; email: string | null; phone: string | null;
};
type Tab = 'open' | 'bids' | 'deals' | 'account';
const EMPTY = { price: '', included: '', excluded: '', changes: '', valid_until: '' };

type Props = { t: Dictionary['partnerPortal']; account: Dictionary['account']; locale: Locale };

/**
 * Partneromgeving: lopende veilingen bekijken en bieden, eigen biedingen volgen, gewonnen deals.
 * Een bedrijf ziet nooit de naam of contactgegevens van de reiziger vóór de aanbetaling; dat bepaalt de database.
 */
export function PartnerPortal({ t, account, locale }: Props) {
  const user = useSyncExternalStore(subscribeUser, getUser, serverUser);
  const ready = useSyncExternalStore(subscribeUser, isReady, serverReady);
  const now = useNow();
  const [partner, setPartner] = useState<Partner | null | undefined>(undefined);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tab, setTab] = useState<Tab>('open');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data: me } = await sb.from('partners').select('id, business, kind, commission_pct, email').ilike('email', getUser()?.email ?? '').maybeSingle<Partner>();
    // Admins zien alle partners; een partner alleen zichzelf. Hier gaat het om het eigen account.
    const mine = me && me.email.toLowerCase() === (getUser()?.email ?? '').toLowerCase() ? me : null;
    setPartner(mine);
    if (!mine) return;
    const [a, d] = await Promise.all([sb.rpc('partner_auctions'), sb.rpc('partner_deals')]);
    setAuctions(((a.data as Auction[]) ?? []).map((x) => ({ ...x, max_budget: Number(x.max_budget), bid_price: x.bid_price === null ? null : Number(x.bid_price) })));
    setDeals(((d.data as Deal[]) ?? []).map((x) => ({ ...x, price: Number(x.price), deposit: Number(x.deposit) })));
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
        <h2 className="m-0 text-[24px] font-semibold text-ink">🔐 {t.loginTitle}</h2>
        <p className="m-0 text-[15px] text-muted">{t.loginIntro}</p>
        <LoginForm t={account} locale={locale} back={`/${locale}/partner`} />
      </div>
    );
  }
  if (partner === undefined) return <div className="panel h-48" aria-busy="true" />;
  if (partner === null) {
    return (
      <p className="panel m-0 p-6 text-[16px] text-muted">
        {t.notPartner} <Link href={`/${locale}/partners/aanmelden`} className="font-semibold text-brand-dark underline underline-offset-2">{t.apply}</Link>
      </p>
    );
  }

  const sb = supabase()!;
  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(''), 4000);
  };
  const usd = (n: number) => Number(n).toLocaleString(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const share = (price: number) => price - (price * Number(partner.commission_pct)) / 100;
  const isRunning = (a: Auction) => a.status === 'open' && new Date(a.closes_at).getTime() > now;
  const open = auctions.filter(isRunning);
  const mine = auctions.filter((a) => a.bid_id);
  /** Vroegste "geldig tot": 7 dagen na het sluiten (zo controleert de database het ook). */
  const minValid = (a: Auction) => {
    const d = new Date(a.closes_at);
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  };

  const startBid = (a: Auction) => {
    setEditing(a.id);
    setForm(
      a.bid_id && a.bid_status !== 'withdrawn'
        ? { price: String(a.bid_price ?? ''), included: a.bid_included ?? '', excluded: a.bid_excluded ?? '', changes: a.bid_changes ?? '', valid_until: a.bid_valid_until ?? '' }
        : { ...EMPTY, valid_until: minValid(a) },
    );
  };
  const saveBid = async (e: React.FormEvent, a: Auction) => {
    e.preventDefault();
    const price = Number(form.price);
    if (!(price > 0) || form.included.trim().length < 10 || !form.valid_until) return flash(t.required);
    if (price > a.max_budget) return flash(t.overBudget);
    if (form.valid_until < minValid(a)) return flash(format(t.validTooShort, { date: day(minValid(a)) }, locale));
    const { error } = await sb.rpc('place_bid', {
      aid: a.id,
      p_price: price,
      p_included: form.included,
      p_excluded: form.excluded,
      p_changes: form.changes,
      p_valid_until: form.valid_until,
    });
    if (error) return flash(t.failed);
    setEditing(null);
    flash(t.bidSaved);
    await load();
  };
  const withdraw = async (a: Auction) => {
    const { error } = await sb.rpc('withdraw_bid', { aid: a.id });
    if (error) return flash(t.failed);
    await load();
  };

  const bidStatus = (a: Auction) =>
    a.bid_status === 'withdrawn'
      ? t.bWithdrawn
      : isRunning(a)
        ? t.bOpen
        : a.bid_status === 'won'
          ? t.bWon
          : a.bid_status === 'lost' || a.status !== 'open'
            ? t.bLost
            : t.bWaiting;

  const tripDetails = (a: { trip: Trip; people: number; start_day: string; end_day: string }) => (
    <>
      <h3 className="m-0 text-[19px] font-semibold text-ink">{tripRoute(a.trip) || '—'}</h3>
      <p className="m-0 text-[14.5px] text-muted">{day(a.start_day)} – {day(a.end_day)} · {format(t.peopleN, { n: a.people }, locale)}</p>
      <ol className="m-0 flex flex-col gap-1 pl-5 text-[14px] text-muted">
        {(a.trip.stops ?? []).map((s, i) => (
          <li key={`${s.id}-${i}`}>
            <strong className="text-ink">{s.name}</strong>
            {s.nights ? ` · ${format(t.nightsN, { n: s.nights }, locale)}` : ''}
            {s.stay ? ` · ${s.stay}` : ''}
            {s.activities?.length ? ` · ${s.activities.join(', ')}` : ''}
          </li>
        ))}
      </ol>
      {a.trip.flightMode && <p className="m-0 text-[13px] text-subtle">✈️ {a.trip.flightMode === 'own' ? t.ownFlight : t.arrangeFlight}</p>}
    </>
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'open', label: `${t.tabOpen} (${open.length})` },
    { id: 'bids', label: `${t.tabBids} (${mine.length})` },
    { id: 'deals', label: `${t.tabDeals}${deals.length ? ` (${deals.length})` : ''}` },
    { id: 'account', label: t.tabAccount },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[22px] font-semibold text-ink">👋 {partner.business}</span>
        <span className="text-[14px] text-subtle">{partner.email}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((x) => (
          <button key={x.id} type="button" className="chip" aria-pressed={tab === x.id} onClick={() => setTab(x.id)}>{x.label}</button>
        ))}
      </div>
      {msg && <p className="m-0 rounded-xl bg-sand p-3 text-[14px] font-semibold text-ink" role="status">{msg}</p>}

      {tab === 'open' && (
        <>
          <p className="m-0 text-[14.5px] text-muted">{t.openIntro}</p>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {open.length === 0 && <li className="text-[15px] text-muted">{t.noOpen}</li>}
            {open.map((a) => (
              <li key={a.id} className="panel flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-[13px] font-semibold text-brand-dark">⏳ {format(t.closesIn, { left: timeLeft(new Date(a.closes_at).getTime() - now, t) }, locale)}</span>
                  <span className="rounded-full bg-sand px-3 py-1 text-[13px] font-semibold text-ink">{format(t.maxBudget, { total: usd(a.max_budget), pp: usd(a.max_budget / a.people) }, locale)}</span>
                  {a.bid_id && a.bid_status !== 'withdrawn' && <span className="rounded-full bg-[#E6F2E3] px-3 py-1 text-[13px] font-semibold text-[#2F6B2A]">✓ {format(t.yourBid, { amount: usd(a.bid_price ?? 0) }, locale)}</span>}
                </div>
                {tripDetails(a)}
                {a.note && <p className="m-0 whitespace-pre-line rounded-xl bg-sand p-3 text-[14px] text-ink">💬 {a.note}</p>}

                {editing === a.id ? (
                  <form onSubmit={(e) => saveBid(e, a)} className="grid gap-3 rounded-2xl border border-rule p-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-[13px] text-subtle">
                      {t.priceTotal}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">USD</span>
                        <input className="field !min-h-11 flex-1" type="number" min={1} max={a.max_budget} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                      </div>
                      {Number(form.price) > 0 && <span>{format(t.shareLine, { share: usd(share(Number(form.price))), pct: partner.commission_pct }, locale)}</span>}
                    </label>
                    <label className="flex flex-col gap-1 text-[13px] text-subtle">
                      {t.validUntil}
                      <input className="field !min-h-11" type="date" min={minValid(a)} value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} required />
                    </label>
                    <label className="flex flex-col gap-1 text-[13px] text-subtle sm:col-span-2">
                      {t.included}
                      <textarea className="field min-h-24 py-2" value={form.included} onChange={(e) => setForm({ ...form, included: e.target.value })} maxLength={3000} placeholder={t.includedPlaceholder} required />
                    </label>
                    <label className="flex flex-col gap-1 text-[13px] text-subtle">
                      {t.excluded}
                      <textarea className="field min-h-20 py-2" value={form.excluded} onChange={(e) => setForm({ ...form, excluded: e.target.value })} maxLength={2000} placeholder={t.excludedPlaceholder} />
                    </label>
                    <label className="flex flex-col gap-1 text-[13px] text-subtle">
                      {t.changes}
                      <textarea className="field min-h-20 py-2" value={form.changes} onChange={(e) => setForm({ ...form, changes: e.target.value })} maxLength={2000} placeholder={t.changesPlaceholder} />
                    </label>
                    <p className="m-0 text-[12.5px] text-subtle sm:col-span-2">🔒 {t.noContactRule}</p>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <button type="submit" className="btn btn-primary !min-h-11">🔨 {a.bid_id && a.bid_status !== 'withdrawn' ? t.updateBid : t.placeBid}</button>
                      <button type="button" className="btn btn-ghost !min-h-11" onClick={() => setEditing(null)}>{t.cancel}</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary !min-h-11" onClick={() => startBid(a)}>
                      🔨 {a.bid_id && a.bid_status !== 'withdrawn' ? t.editBid : t.makeBid}
                    </button>
                    {a.bid_id && a.bid_status !== 'withdrawn' && (
                      <button type="button" className="btn btn-ghost !min-h-11" onClick={() => withdraw(a)}>{t.withdraw}</button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'bids' && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {mine.length === 0 && <li className="text-[15px] text-muted">{t.noBids}</li>}
          {mine.map((a) => (
            <li key={a.id} className={`panel flex flex-col gap-2 p-4 ${a.bid_status === 'lost' || a.bid_status === 'withdrawn' ? 'opacity-70' : ''}`}>
              <div className="flex flex-wrap items-center gap-2 text-[14px]">
                <span className={`rounded-full px-2.5 py-0.5 font-semibold ${a.bid_status === 'won' ? 'bg-[#E6F2E3] text-[#2F6B2A]' : 'bg-sand'}`}>{bidStatus(a)}</span>
                <span className="text-[16px] font-semibold text-ink">{tripRoute(a.trip) || '—'}</span>
                <span className="ml-auto text-[16px] font-semibold text-ink">{usd(a.bid_price ?? 0)}</span>
              </div>
              <p className="m-0 text-[14px] text-muted">
                {day(a.start_day)} · {format(t.peopleN, { n: a.people }, locale)} · {format(t.maxShort, { amount: usd(a.max_budget) }, locale)}
              </p>
              {a.status === 'declined' && a.decline_reason && <p className="m-0 text-[14px] text-muted">💬 {format(t.declineReason, { reason: a.decline_reason }, locale)}</p>}
            </li>
          ))}
        </ul>
      )}

      {tab === 'deals' && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {deals.length === 0 && <li className="text-[15px] text-muted">{t.noDeals}</li>}
          {deals.map((d) => (
            <li key={d.id} className="panel flex flex-col gap-2 p-5">
              <div className="flex flex-wrap items-center gap-2 text-[14px]">
                <span className={`rounded-full px-2.5 py-0.5 font-semibold ${d.payment === 'pending' ? 'bg-sand' : 'bg-[#E6F2E3] text-[#2F6B2A]'}`}>{d.payment === 'pending' ? t.dWaiting : t.dPaid}</span>
                {d.payment === 'test' && <span className="rounded-full bg-[#FFF4E5] px-2.5 py-0.5 text-[12px] font-semibold text-[#7A4A12]">TEST</span>}
                <span className="ml-auto text-[16px] font-semibold text-ink">{usd(d.price)}</span>
              </div>
              {tripDetails(d)}
              <p className="m-0 text-[14px] text-muted">{format(t.dealMoney, { deposit: usd(d.deposit), share: usd(d.price - d.deposit) }, locale)}</p>
              {d.name ? (
                <p className="m-0 rounded-xl bg-sand p-3 text-[14.5px] text-ink">
                  🤝 <strong>{d.name}</strong> · <a href={`mailto:${d.email}`} className="underline underline-offset-2">{d.email}</a>
                  {d.phone && ` · ${d.phone}`}
                </p>
              ) : (
                <p className="m-0 text-[13px] text-subtle">🔒 {t.contactAfter}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === 'account' && (
        <div className="panel flex flex-col gap-2 p-5 text-[15px] text-muted">
          <p className="m-0"><strong className="text-ink">{partner.business}</strong> · {partner.email}</p>
          <p className="m-0">{format(t.commission, { pct: partner.commission_pct }, locale)}</p>
          <p className="m-0 text-[13px] text-subtle">{t.accountNote}</p>
          <Link href={`/${locale}/reisvoorwaarden`} className="text-[13px] underline underline-offset-2">{t.terms}</Link>
        </div>
      )}
    </div>
  );
}
