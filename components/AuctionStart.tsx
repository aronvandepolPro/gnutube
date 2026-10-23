'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';
import { accountsEnabled, supabase } from '@/lib/supabase';
import { getUser, isReady, serverReady, serverUser, subscribeUser } from '@/lib/account';
import { LoginForm } from '@/components/account/LoginForm';

/** Momentopname van de hele reis, zoals hij in de veiling gaat. */
export type TripSnapshot = Record<string, unknown> & { stops: unknown[] };

type Props = {
  t: Dictionary['auction'];
  account: Dictionary['account'];
  locale: Locale;
  trip: TripSnapshot;
  summary: string[];
  /** Voorinvulling uit de reis */
  people: number;
  start: string | null;
  nights: number;
  budget: number | null;
};

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Reis in de veiling zetten: de reiziger kiest het aantal personen en een maximumbudget (USD, hele groep).
 * Goedgekeurde bedrijven bieden 3 dagen lang, zonder de naam of gegevens van de reiziger te zien.
 * De database controleert alles (start_auction): ingelogd, maximaal 2 lopende veilingen, datum in de toekomst.
 */
export function AuctionStart({ t, account, locale, trip, summary, people: people0, start: start0, nights, budget: budget0 }: Props) {
  const user = useSyncExternalStore(subscribeUser, getUser, serverUser);
  const ready = useSyncExternalStore(subscribeUser, isReady, serverReady);
  const tomorrow = addDays(new Date().toISOString().slice(0, 10), 1);
  const [f, setF] = useState({
    name: '',
    phone: '',
    note: '',
    people: String(people0),
    start: start0 && start0 >= tomorrow ? start0 : '',
    budget: budget0 ? String(Math.round(budget0)) : '',
  });
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<{ s: 'idle' | 'busy' | 'sent' | 'failed'; err?: string }>({ s: 'idle' });
  const [touched, setTouched] = useState(false);
  const people = Math.max(1, Math.min(100, Math.round(Number(f.people) || 0)));
  const budget = Math.round(Number(f.budget) || 0);
  const ok = f.name.trim().length >= 2 && Number(f.people) >= 1 && budget > 0 && !!f.start && f.start >= tomorrow && agree;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const usd = (n: number) => n.toLocaleString(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const sb = supabase();
    if (!ok || !sb) return;
    setState({ s: 'busy' });
    const { error } = await sb.rpc('start_auction', {
      p_name: f.name.trim(),
      p_phone: f.phone.trim(),
      p_people: people,
      p_start: f.start,
      p_end: addDays(f.start, Math.max(1, nights)),
      p_max_budget: budget,
      p_note: f.note.trim(),
      p_trip: { ...trip, people },
    });
    if (!error) return setState({ s: 'sent' });
    setState({ s: 'failed', err: error.message.includes('maximaal 2') ? t.tooMany : undefined });
  };

  return (
    <section id="regelen" aria-labelledby="auction-title" className="scroll-mt-24 overflow-hidden rounded-3xl bg-[#2A1F17] text-white">
      <div className="grid gap-0 md:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-4 p-6 sm:p-8">
          <span className="text-[40px]" aria-hidden="true">🔨</span>
          <h2 id="auction-title" className="m-0 text-[28px] font-semibold leading-tight">{t.startTitle}</h2>
          <p className="m-0 text-[16px] text-white/75">{t.startSub}</p>
          <ol className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            {[t.step1, t.step2, t.step3, t.step4].map((x, i) => (
              <li key={x} className="flex gap-2"><span className="font-semibold text-[#8EE08A]" aria-hidden="true">{i + 1}.</span>{x}</li>
            ))}
          </ol>
          <div className="rounded-2xl bg-white/[0.07] p-4 text-[14px] text-white/80">
            <p className="m-0 mb-2 font-semibold text-white">{t.startSummary}</p>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {summary.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
          <p className="m-0 text-[13px] text-white/60">{t.startNoCommit}</p>
        </div>

        <div className="bg-white p-6 text-[#2A1F17] sm:p-8">
          {state.s === 'sent' ? (
            <div className="flex h-full flex-col items-start justify-center gap-3" role="status">
              <span className="text-[44px]" aria-hidden="true">🎉</span>
              <p className="m-0 text-[24px] font-semibold">{t.sentTitle}</p>
              <p className="m-0 text-[16px] text-[#5E5248]">{t.sentText}</p>
              <Link href={`/${locale}/veilingen`} className="btn btn-primary">🔨 {t.toMine}</Link>
            </div>
          ) : !accountsEnabled ? (
            <p className="m-0 text-[15px] text-[#5E5248]">{t.disabled}</p>
          ) : !ready ? (
            <div className="h-48" aria-busy="true" />
          ) : !user ? (
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[18px] font-semibold">🔐 {t.loginFirst}</p>
              <LoginForm t={account} locale={locale} back={`/${locale}/reizen#regelen`} />
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="eyebrow">{t.people}</span>
                  <input type="number" min={1} max={100} className="field !min-h-12" value={f.people} onChange={set('people')} aria-invalid={touched && !(Number(f.people) >= 1)} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="eyebrow">{t.startDate}</span>
                  <input type="date" min={tomorrow} className="field !min-h-12" value={f.start} onChange={set('start')} aria-invalid={touched && !f.start} />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">{t.maxBudget}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-[#5E5248]">USD</span>
                  <input type="number" min={1} step={50} inputMode="numeric" className="field !min-h-12 flex-1" value={f.budget} onChange={set('budget')} aria-invalid={touched && budget <= 0} />
                </div>
                <span className="text-[13px] text-[#5E5248]">
                  {budget > 0 ? format(t.budgetPerPerson, { total: usd(budget), pp: usd(budget / people) }, locale) : t.budgetHint}
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">{t.name}</span>
                <input className="field !min-h-12" value={f.name} onChange={set('name')} maxLength={120} autoComplete="name" aria-invalid={touched && f.name.trim().length < 2} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">{t.phone}</span>
                <input type="tel" className="field !min-h-12" value={f.phone} onChange={set('phone')} maxLength={40} autoComplete="tel" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">{t.note}</span>
                <textarea className="field min-h-24 py-3" value={f.note} onChange={set('note')} maxLength={2000} placeholder={t.notePlaceholder} />
                <span className="text-[12.5px] text-[#5E5248]">{t.noteNoContact}</span>
              </label>
              <p className="m-0 rounded-2xl bg-sand p-3 text-[13px] text-[#5E5248]">🔒 {t.privateNote}</p>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-rule p-3 text-[14px] has-[:checked]:border-brand-dark has-[:checked]:bg-brand-soft">
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#5A4030]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>
                  {t.agree} <Link href={`/${locale}/reisvoorwaarden`} target="_blank" className="underline underline-offset-2">{t.terms}</Link> {t.and}{' '}
                  <Link href={`/${locale}/privacy`} target="_blank" className="underline underline-offset-2">{t.privacy}</Link>
                </span>
              </label>
              {touched && !ok && <p className="m-0 text-[13px] font-semibold text-[#A33]">{t.incomplete}</p>}
              {state.s === 'failed' && <p className="m-0 text-[14px] font-semibold text-[#A33]" role="alert">{state.err ?? t.failed}</p>}
              <button type="submit" disabled={state.s === 'busy'} className="btn btn-primary !min-h-14 !text-[17px] disabled:cursor-not-allowed disabled:opacity-60">
                🔨 {state.s === 'busy' ? t.sending : t.send}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
