'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { deleteMyAccount, exportMyData, getUser, isReady, serverReady, serverUser, signOut, subscribeUser } from '@/lib/account';
import { readList, serverList, subscribe as subscribeTrip } from '@/lib/trip-store';
import { supabase } from '@/lib/supabase';
import { LoginForm } from '@/components/account/LoginForm';
import { tripRoute, useNow } from '@/lib/auction';

type AuctionRow = { id: string; status: string; closes_at: string; trip: { stops?: { name?: string }[] } };
type Sub = { id: number; place_id: string; url: string; status: 'pending' | 'approved' | 'rejected'; decision_note: string | null; created_at: string };

/** Alleen paden binnen de site (geen //andere-site.nl) als terugadres. */
const safeBack = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : null);

export function AccountPage({ t, locale }: { t: Dictionary['account']; locale: string }) {
  const user = useSyncExternalStore(subscribeUser, getUser, serverUser);
  const ready = useSyncExternalStore(subscribeUser, isReady, serverReady);
  const trip = useSyncExternalStore(subscribeTrip, () => readList('trip'), serverList);
  const liked = useSyncExternalStore(subscribeTrip, () => readList('liked'), serverList);
  const params = useSearchParams();
  const router = useRouter();
  const back = safeBack(params.get('terug'));
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [auctions, setAuctions] = useState<AuctionRow[]>([]);
  const now = useNow();
  const [deleted, setDeleted] = useState(false);

  // Net ingelogd via de link in de mail: terug naar waar je was
  useEffect(() => {
    if (user && back) router.replace(back);
  }, [user, back, router]);

  // Je ingestuurde video's
  useEffect(() => {
    const sb = supabase();
    if (!user || !sb) return;
    sb.from('submissions')
      .select('id, place_id, url, status, decision_note, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setSubs((data as Sub[]) ?? []));
    sb.rpc('my_auctions').then(({ data }) => setAuctions((data as AuctionRow[]) ?? []));
  }, [user]);

  if (deleted) return <p className="panel m-0 p-6 text-[16px]" role="status">✓ {t.deleted}</p>;
  if (!ready) return <div className="panel h-64" aria-busy="true" />;

  if (!user) {
    return (
      <div className="grid overflow-hidden rounded-[28px] border border-rule bg-white shadow-[0_20px_50px_-30px_rgba(42,31,23,0.45)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Waarom een account */}
        <div className="order-2 flex flex-col gap-5 bg-[#2A1F17] p-6 text-white sm:p-8 md:order-1">
          <div>
            <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#F0B47A]">Gnutube</p>
            <h2 className="m-0 mt-1 text-[26px] font-semibold leading-tight">{t.whyTitle}</h2>
          </div>
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0 text-[15px] leading-snug text-white/85">
            {[
              ['🧳', t.why1],
              ['🗺️', t.why2],
              ['⭐', t.why3],
              ['💳', t.why4],
              ['🎬', t.why5],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[16px]" aria-hidden="true">{icon}</span>
                <span className="pt-1">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Inloggen */}
        <div className="order-1 flex flex-col gap-4 p-6 sm:p-8 md:order-2">
          <div>
            <h2 className="m-0 text-[26px] font-semibold text-ink">🔐 {t.loginTitle}</h2>
            <p className="m-0 mt-1 text-[15px] text-muted">{t.loginIntro}</p>
          </div>
          <LoginForm t={t} locale={locale} back={back ?? `/${locale}/inloggen`} />
          <p className="m-0 border-t border-rule pt-3 text-[13px] text-subtle">
            🔒 {t.privacyNote} <Link href={`/${locale}/privacy`} className="underline underline-offset-2">{t.privacyLink}</Link>
          </p>
        </div>
      </div>
    );
  }

  const download = async () => {
    const data = await exportMyData();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gnutube-mijn-gegevens.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const remove = async () => {
    if (!window.confirm(t.deleteConfirm)) return;
    const r = await deleteMyAccount();
    if (!r.error) setDeleted(true);
    else window.alert(t.failed);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="panel flex flex-wrap items-center gap-4 p-6">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-[24px] font-bold uppercase text-white" aria-hidden="true">
          {(user.email ?? '?').slice(0, 1)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[18px] font-semibold text-ink">{t.loggedInAs.replace('{email}', user.email ?? '')}</span>
          <span className="text-[14px] text-muted">{t.counts.replace('{trip}', String(trip.length)).replace('{liked}', String(liked.length))}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/reizen`} className="btn btn-primary">🧳 {t.myTrip}</Link>
          {user.admin && <Link href={`/${locale}/beheer`} className="btn btn-ghost">🛠️ {t.admin}</Link>}
          <button type="button" className="btn btn-ghost" onClick={() => signOut()}>{t.logout}</button>
        </div>
        <p className="m-0 w-full text-[13px] text-subtle">☁️ {t.synced}</p>
      </section>

      <section className="panel flex flex-col items-start gap-3 p-6">
        <h2 className="m-0 text-[20px] font-semibold text-ink">🔨 {t.myAuctions}</h2>
        {auctions.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t.noAuctions}</p>
        ) : (
          <ul className="m-0 flex w-full list-none flex-col gap-1 p-0 text-[14px]">
            {auctions.slice(0, 5).map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-rule p-3">
                <span className="min-w-0 truncate">{tripRoute(a.trip) || `#${a.id.slice(0, 8).toUpperCase()}`}</span>
                <span className="font-semibold text-muted">
                  {a.status === 'open' ? (new Date(a.closes_at).getTime() > now ? t.au_running : t.au_choose) : t[`au_${a.status as 'accepted' | 'declined' | 'cancelled'}`]}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/${locale}/veilingen`} className="btn btn-ghost">🔨 {t.toAuctions}</Link>
      </section>

      <section className="panel p-6">
        <h2 className="m-0 text-[20px] font-semibold text-ink">🎬 {t.mySubmissions}</h2>
        {subs === null ? (
          <p className="m-0 mt-2 text-[15px] text-subtle">…</p>
        ) : subs.length === 0 ? (
          <p className="m-0 mt-2 text-[15px] text-muted">
            {t.noSubmissions} <Link href={`/${locale}/delen`} className="underline underline-offset-2">{t.shareOne}</Link>
          </p>
        ) : (
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rule p-3 text-[14px]">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate underline underline-offset-2">{s.url}</a>
                <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${s.status === 'approved' ? 'bg-[#E6F2E3] text-[#2F6B2A]' : s.status === 'rejected' ? 'bg-[#FFE5E5] text-[#A33]' : 'bg-sand text-muted'}`}>
                  {t[`status_${s.status}`]}
                </span>
                {s.decision_note && <span className="w-full text-[13px] text-subtle">{s.decision_note}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel flex flex-col gap-3 p-6">
        <h2 className="m-0 text-[20px] font-semibold text-ink">🔒 {t.privacyTitle}</h2>
        <p className="m-0 text-[15px] text-muted">
          {t.privacyNote} <Link href={`/${locale}/privacy`} className="underline underline-offset-2">{t.privacyLink}</Link>
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={download}>⬇️ {t.export}</button>
          <button type="button" className="btn btn-ghost !border-[#E3B5B5] !text-[#A33]" onClick={remove}>🗑️ {t.deleteAccount}</button>
        </div>
      </section>
    </div>
  );
}
