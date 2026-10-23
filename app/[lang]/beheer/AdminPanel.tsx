'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { getUser, isReady, serverReady, serverUser, subscribeUser } from '@/lib/account';
import { supabase } from '@/lib/supabase';
import { useNow } from '@/lib/auction';
import { loadDbStays, type DbStay } from '@/lib/stays-db';
import { format } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/config';
import { Overview, type OverviewData, type Section } from './Overview';
import { PartnerDetails, type PartnerAnswers } from './PartnerDetails';

type Report = {
  id: number;
  video_id: string;
  place_id: string;
  reason: string;
  details: string | null;
  reporter_email: string | null;
  status: 'open' | 'removed' | 'kept';
  decision_note: string | null;
  created_at: string;
};
type Submission = {
  id: number;
  place_id: string;
  url: string;
  tiktok_id: string | null;
  author: string | null;
  visited: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};
type Hidden = { video_id: string; reason: string | null; created_at: string };
type Partner = {
  id: number;
  kind: string;
  business: string;
  contact: string;
  email: string;
  phone: string | null;
  place_id: string | null;
  website: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'accepted' | 'rejected';
  created_at: string;
  details: PartnerAnswers | null;
};
type AdminAuction = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  people: number;
  start_day: string;
  end_day: string;
  max_budget: number;
  note: string | null;
  trip: { stops?: { name: string; nights: number; stay: string | null; activities: string[] }[] };
  closes_at: string;
  status: 'open' | 'accepted' | 'declined' | 'cancelled';
  decline_reason: string | null;
  hidden: boolean;
  created_at: string;
  bids: { id: string; price: number; status: string; partners: { business: string } | null }[];
  // Eén deal per veiling: PostgREST geeft die als object (of null) terug, niet als lijst
  deals: { id: string; price: number; deposit: number; payment: 'pending' | 'test' | 'paid' | 'refunded' } | null;
};
type PartnerAcc = { id: string; email: string; business: string; kind: string; place_id: string | null; commission_pct: number; active: boolean };
type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  blocked: boolean;
  admin: boolean;
  comments: number;
  bookings: number;
};
type AdminComment = { id: number; video_id: string; body: string; hidden: boolean; created_at: string; comment_flags: { id: number; reason: string | null }[] };
type Tab = 'overview' | 'users' | 'comments' | 'tripReviews' | 'auctions' | 'reports' | 'submissions' | 'partners' | 'stays' | 'hidden';
const PAYMENT = ['pending', 'paid', 'refunded'] as const;
const STAY_TYPES = ['camp', 'lodge', 'luxe', 'hotel', 'bungalow', 'resort', 'villa'] as const;
const EMPTY_STAY = { place_id: '', name: '', type: 'lodge', price_from: '', currency: 'EUR', url: '', source: '', note: '', recommended: false };
const P_STATUS = ['new', 'contacted', 'accepted', 'rejected'] as const;

type Props = {
  t: Dictionary['admin'];
  reasons: Dictionary['report']['reasons'];
  kinds: Dictionary['partners']['kinds'];
  pq: Dictionary['partners'];
  stayTypes: Dictionary['route']['stayTypes'];
  places: Record<string, string>;
  locale: string;
};

/**
 * Beheer van meldingen en inzendingen. Wat je hier mag zien en doen, bepaalt de database (alleen admins);
 * deze pagina toont alleen wat de database teruggeeft.
 */
export function AdminPanel({ t, reasons, kinds, pq, stayTypes, places, locale }: Props) {
  const user = useSyncExternalStore(subscribeUser, getUser, serverUser);
  const ready = useSyncExternalStore(subscribeUser, isReady, serverReady);
  const [tab, setTab] = useState<Tab>('overview');
  const clock = useNow();
  const [overview, setOverview] = useState<OverviewData | null | 'missing'>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [hidden, setHidden] = useState<Hidden[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [auctions, setAuctions] = useState<AdminAuction[]>([]);
  const [accounts, setAccounts] = useState<PartnerAcc[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [tripReviews, setTripReviews] = useState<{ id: number; rating: number; body: string; hidden: boolean; created_at: string }[]>([]);
  const [stays, setStays] = useState<DbStay[]>([]);
  const [stayForm, setStayForm] = useState(EMPTY_STAY);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ids, setIds] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [users, setUsers] = useState<AdminUser[] | 'missing' | null>(null);
  const [userQ, setUserQ] = useState('');
  const [hideForm, setHideForm] = useState({ video: '', reason: '' });

  const load = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const [r, s, h, pa, rq, st, acc, cm, tr, ov] = await Promise.all([
      sb.from('reports').select('*').order('status').order('created_at', { ascending: false }).limit(200),
      sb
        .from('submissions')
        .select('id, place_id, url, tiktok_id, author, visited, note, status, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      sb.from('hidden_videos').select('*').order('created_at', { ascending: false }),
      sb.from('partner_applications').select('*').order('created_at', { ascending: false }).limit(300),
      sb.from('auctions').select('*, bids(id, price, status, partners(business)), deals(id, price, deposit, payment)').order('created_at', { ascending: false }).limit(300),
      sb.from('stays').select('*').order('place_id').order('name'),
      sb.from('partners').select('*').order('business'),
      sb
        .from('video_comments')
        .select('id, video_id, body, hidden, created_at, comment_flags(id, reason)')
        .order('created_at', { ascending: false })
        .limit(200),
      sb.from('trip_reviews').select('id, rating, body, hidden, created_at').order('created_at', { ascending: false }).limit(200),
      sb.rpc('admin_overview'),
    ]);
    // Zonder de nieuwste schema.sql bestaat de functie nog niet: dan een uitleg in plaats van cijfers
    setOverview(ov.error ? 'missing' : (ov.data as OverviewData));
    setTripReviews((tr.data as { id: number; rating: number; body: string; hidden: boolean; created_at: string }[]) ?? []);
    setComments((cm.data as AdminComment[]) ?? []);
    setAccounts((acc.data as PartnerAcc[]) ?? []);
    setAuctions((rq.data as AdminAuction[]) ?? []);
    setStays((st.data as DbStay[]) ?? []);
    setPartners((pa.data as Partner[]) ?? []);
    setReports((r.data as Report[]) ?? []);
    setSubs((s.data as Submission[]) ?? []);
    setHidden((h.data as Hidden[]) ?? []);
  }, []);

  const loadUsers = useCallback(async (q: string) => {
    const sb = supabase();
    if (!sb) return;
    const { data, error: e } = await sb.rpc('admin_list_users', { q });
    setUsers(e ? 'missing' : ((data as AdminUser[]) ?? []));
  }, []);

  useEffect(() => {
    // Laden zodra bekend is dat je admin bent (na deze render, niet midden erin)
    if (!user?.admin) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [user, load]);

  if (!ready) return <div className="mt-2 h-40 rounded-3xl bg-white/5" aria-busy="true" />;
  if (!user?.admin) {
    return (
      <div className="mt-2 flex flex-col gap-4">
        <p className="m-0 text-[32px] font-semibold text-[#FBF4EA]" aria-hidden="true">
          🛠️ {t.title}
        </p>
        <p className="panel m-0 p-6 text-[16px] text-muted">
          {t.notAdmin}{' '}
          <Link href={`/${locale}/inloggen`} className="underline underline-offset-2">
            {t.login}
          </Link>
        </p>
      </div>
    );
  }

  const sb = supabase()!;
  const now = () => new Date().toISOString();
  const need = (key: string) => {
    const n = (notes[key] ?? '').trim();
    if (!n) setError(t.noteRequired);
    return n;
  };
  const decideReport = async (r: Report, status: 'removed' | 'kept') => {
    const note = need(`r${r.id}`);
    if (!note) return;
    setError('');
    const { error: e } = await sb.from('reports').update({ status, decision_note: note, decided_by: user.id, decided_at: now() }).eq('id', r.id);
    if (!e && status === 'removed') await sb.from('hidden_videos').upsert({ video_id: r.video_id, reason: note });
    if (e) setError(t.failed);
    await load();
  };
  const setAuctionHidden = async (id: string, hide: boolean) => {
    const { error: e } = await sb.from('auctions').update({ hidden: hide }).eq('id', id);
    if (e) setError(t.failed);
    await load();
  };
  // Aanbetaling met de hand op betaald of terugbetaald zetten (tot er een betaaldienst is die dit zelf doet)
  const setPayment = async (id: string, payment: (typeof PAYMENT)[number]) => {
    const { error: e } = await sb.from('deals').update({ payment, paid_at: payment === 'paid' ? now() : null }).eq('id', id);
    if (e) setError(t.failed);
    await load();
  };
  const addStay = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = stayForm;
    if (!f.place_id || f.name.trim().length < 2 || f.source.trim().length < 2) return setError(t.stayRequired);
    setError('');
    const { error: er } = await sb.from('stays').insert({
      place_id: f.place_id,
      name: f.name.trim(),
      type: f.type,
      price_from: f.price_from === '' ? null : Number(f.price_from),
      currency: f.currency,
      url: f.url.trim() || null,
      source: f.source.trim(),
      note: f.note.trim() || null,
      recommended: f.recommended,
    });
    if (er) return setError(t.failed);
    setStayForm({ ...EMPTY_STAY, place_id: f.place_id });
    await loadDbStays(true);
    await load();
  };
  const toggleStay = async (x: DbStay) => {
    await sb.from('stays').update({ active: !x.active }).eq('id', x.id);
    await loadDbStays(true);
    await load();
  };
  const hideReview = async (id: number, hide: boolean) => {
    await sb.from('trip_reviews').update({ hidden: hide }).eq('id', id);
    await load();
  };
  const hideComment = async (c: AdminComment, hide: boolean) => {
    await sb.from('video_comments').update({ hidden: hide }).eq('id', c.id);
    await load();
  };
  /** Partneraccount maken van een aanmelding: de partner logt daarna in met dit e-mailadres. */
  const makeAccount = async (x: Partner) => {
    const { error: e } = await sb.from('partners').insert({ email: x.email.toLowerCase(), business: x.business, kind: x.kind, place_id: x.place_id });
    if (e) return setError(t.failed);
    await sb.from('partner_applications').update({ status: 'accepted' }).eq('id', x.id);
    await load();
  };
  const setCommission = async (a: PartnerAcc, pct: string) => {
    const n = Number(pct);
    if (pct === '' || !Number.isFinite(n) || n === Number(a.commission_pct)) return;
    const { error: e } = await sb.from('partners').update({ commission_pct: n }).eq('id', a.id);
    if (e) setError(t.failed);
    await load();
  };
  const toggleAccount = async (a: PartnerAcc) => {
    await sb.from('partners').update({ active: !a.active }).eq('id', a.id);
    await load();
  };
  const setPartnerStatus = async (id: number, status: Partner['status']) => {
    const { error: e } = await sb.from('partner_applications').update({ status }).eq('id', id);
    if (e) setError(t.failed);
    await load();
  };
  /** Accepteren = partneraccount maken (als dat er nog niet is) en de aanmelding op 'Partner' zetten. */
  const acceptPartner = async (x: Partner) => {
    setError('');
    if (!accounts.some((a) => a.email.toLowerCase() === x.email.toLowerCase())) return makeAccount(x);
    await setPartnerStatus(x.id, 'accepted');
  };
  /** Mail in je eigen mailprogramma, alvast ingevuld (je verstuurt hem zelf). */
  const partnerMail = (x: Partner) => {
    const ok = x.status === 'accepted';
    const vars = { name: x.contact, business: x.business };
    const subject = format(ok ? t.pMailAcceptSubject : t.pMailRejectSubject, vars, locale as Locale);
    const body = format(ok ? t.pMailAcceptBody : t.pMailRejectBody, vars, locale as Locale);
    return `mailto:${x.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const deleteComment = async (c: AdminComment) => {
    if (!window.confirm(t.cConfirmDelete)) return;
    const { error: e } = await sb.from('video_comments').delete().eq('id', c.id);
    if (e) setError(t.failed);
    await load();
  };
  /** Een video weghalen zonder melding: TikTok-link of alleen het nummer. */
  const hideVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = hideForm.video.match(/(\d{8,25})/)?.[1];
    if (!id) return setError(t.hideInvalid);
    const reason = hideForm.reason.trim();
    if (!reason) return setError(t.noteRequired);
    setError('');
    const { error: er } = await sb.from('hidden_videos').upsert({ video_id: id, reason });
    if (er) return setError(t.failed);
    setHideForm({ video: '', reason: '' });
    await load();
  };
  const blockUser = async (u: AdminUser, block: boolean) => {
    if (block && !window.confirm(format(t.uConfirmBlock, { email: u.email }, locale as Locale))) return;
    const { error: e } = await sb.rpc('admin_block_user', { target: u.id, block });
    if (e) setError(t.failed);
    await loadUsers(userQ);
  };
  const deleteUser = async (u: AdminUser) => {
    if (!window.confirm(format(t.uConfirmDelete, { email: u.email }, locale as Locale))) return;
    const { error: e } = await sb.rpc('admin_delete_user', { target: u.id });
    if (e) setError(/betaalde/.test(e.message) ? t.uPaid : t.failed);
    await loadUsers(userQ);
  };
  const restore = async (videoId: string) => {
    await sb.from('hidden_videos').delete().eq('video_id', videoId);
    await load();
  };
  const decideSub = async (s: Submission, status: 'approved' | 'rejected') => {
    const note = status === 'rejected' ? need(`s${s.id}`) : (notes[`s${s.id}`] ?? '').trim();
    if (status === 'rejected' && !note) return;
    const tiktokId = (ids[s.id] ?? s.tiktok_id ?? '').trim();
    if (status === 'approved' && !/^\d{8,25}$/.test(tiktokId)) return setError(t.idRequired);
    setError('');
    const { error: e } = await sb
      .from('submissions')
      .update({ status, decision_note: note || null, decided_at: now(), ...(status === 'approved' ? { tiktok_id: tiktokId } : {}) })
      .eq('id', s.id);
    if (e) setError(t.failed);
    await load();
  };

  const openReports = reports.filter((r) => r.status === 'open').length;
  const pendingSubs = subs.filter((s) => s.status === 'pending').length;
  const runningAuctions = auctions.filter((x) => x.status === 'open' && new Date(x.closes_at).getTime() > clock).length;
  const newPartners = partners.filter((x) => x.status === 'new').length;
  const flagged = comments.filter((c) => c.comment_flags.length && !c.hidden).length;
  // Elk onderdeel is een tegel op het overzicht: naam, aantal, en wat er openstaat
  const sections: Section[] = [
    { id: 'auctions', icon: '🔨', label: t.auctions, count: auctions.length, todo: runningAuctions, todoLabel: format(t.auRunning, { n: runningAuctions }, locale as Locale) },
    { id: 'reports', icon: '🚩', label: t.reports, count: reports.length, todo: openReports, todoLabel: format(t.ovNew, { n: openReports }, locale as Locale) },
    {
      id: 'submissions',
      icon: '🎬',
      label: t.submissions,
      count: subs.length,
      todo: pendingSubs,
      todoLabel: format(t.ovNew, { n: pendingSubs }, locale as Locale),
    },
    {
      id: 'partners',
      icon: '🤝',
      label: t.partners,
      count: partners.length,
      todo: newPartners,
      todoLabel: format(t.ovNew, { n: newPartners }, locale as Locale),
    },
    { id: 'stays', icon: '🛏️', label: t.stays, count: stays.length },
    { id: 'comments', icon: '💬', label: t.comments, count: comments.length, todo: flagged, todoLabel: `🚩 ${flagged}` },
    { id: 'tripReviews', icon: '⭐', label: t.tripReviews, count: tripReviews.length },
    { id: 'hidden', icon: '🗑️', label: t.hidden, count: hidden.length },
    { id: 'users', icon: '👤', label: t.usersTab, count: overview && overview !== 'missing' ? overview.accounts : null },
  ];
  const current = sections.find((x) => x.id === tab);
  const open = (id: Tab) => {
    setTab(id);
    setError('');
    if (id === 'users' && users === null) void loadUsers('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const date = (d: string) => new Date(d).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const noteBox = (key: string) => (
    <textarea
      className="field min-h-16 w-full py-2 text-[14px]"
      placeholder={t.note}
      maxLength={1000}
      value={notes[key] ?? ''}
      onChange={(e) => setNotes({ ...notes, [key]: e.target.value })}
    />
  );

  return (
    <div className="mt-2 flex flex-col gap-5">
      {/* Donker blok: titel en (bij Overzicht) alle tegels; bij een onderdeel een terugknop */}
      <section className="text-[#FBF4EA]">
        <div className="flex flex-wrap items-center gap-3 px-1">
          {tab === 'overview' ? (
            <p className="m-0 text-[28px] font-semibold text-[#FBF4EA]" aria-hidden="true">
              🛠️ {t.title}
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => open('overview')}
                className="rounded-full border border-white/15 px-4 py-2 text-[14px] font-semibold text-[#FBF4EA] transition-colors hover:bg-white/10"
              >
                ← {t.overview}
              </button>
              <p className="m-0 text-[24px] font-semibold text-[#FBF4EA]">
                {current?.icon} {current?.label}
              </p>
            </>
          )}
          <button
            type="button"
            className="ml-auto rounded-full border border-white/15 px-4 py-2 text-[14px] font-semibold text-[#FBF4EA] transition-colors hover:bg-white/10"
            onClick={() => void load()}
          >
            ↻ {t.refresh}
          </button>
        </div>
        {tab === 'overview' && (
          <div className="mt-5">
            <Overview data={overview} t={t} places={places} locale={locale} sections={sections} onGo={(id) => open(id as Tab)} />
          </div>
        )}
      </section>
      {error && (
        <p className="m-0 rounded-xl bg-[#FFE5E5] p-3 text-[14px] font-semibold text-[#A33]" role="alert">
          {error}
        </p>
      )}

      {tab === 'tripReviews' && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {tripReviews.length === 0 && <li className="text-[15px] text-muted">{t.none}</li>}
          {tripReviews.map((r) => (
            <li key={r.id} className={`panel flex flex-wrap items-start gap-3 p-3 text-[14px] ${r.hidden ? 'opacity-50' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[#E8A21A]">
                  {'★'.repeat(r.rating)}
                  <span className="text-rule">{'★'.repeat(5 - r.rating)}</span>
                </p>
                <p className="m-0 mt-1 whitespace-pre-wrap break-words text-ink">{r.body}</p>
                <p className="m-0 mt-1 text-[12px] text-subtle">{date(r.created_at)}</p>
              </div>
              <button type="button" className="btn btn-ghost !min-h-9" onClick={() => hideReview(r.id, !r.hidden)}>
                {r.hidden ? t.stayShow : t.stayHide}
              </button>
            </li>
          ))}
        </ul>
      )}
      {tab === 'comments' && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {comments.length === 0 && <li className="text-[15px] text-muted">{t.none}</li>}
          {[...comments]
            .sort((a, b) => b.comment_flags.length - a.comment_flags.length)
            .map((c) => (
              <li key={c.id} className={`panel flex flex-wrap items-start gap-3 p-3 text-[14px] ${c.hidden ? 'opacity-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="m-0 whitespace-pre-wrap break-words text-ink">{c.body}</p>
                  <p className="m-0 mt-1 text-[12px] text-subtle">
                    {date(c.created_at)} ·{' '}
                    <a href={`https://www.tiktok.com/player/v1/${c.video_id}`} target="_blank" rel="noopener noreferrer" className="underline">
                      {t.openVideo}
                    </a>
                    {c.comment_flags.length > 0 && (
                      <>
                        {' '}
                        · 🚩 {c.comment_flags.length}
                        {c.comment_flags
                          .filter((f) => f.reason)
                          .map((f) => ` “${f.reason}”`)
                          .join('')}
                      </>
                    )}
                  </p>
                </div>
                <button type="button" className="btn btn-ghost !min-h-9" onClick={() => hideComment(c, !c.hidden)}>
                  {c.hidden ? t.stayShow : t.stayHide}
                </button>
                <button type="button" className="btn btn-ghost !min-h-9 text-[#A33]" onClick={() => deleteComment(c)}>
                  🗑️ {t.cDelete}
                </button>
              </li>
            ))}
        </ul>
      )}

      {tab === 'auctions' && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {auctions.length === 0 && <li className="text-[15px] text-muted">{t.none}</li>}
          {auctions.map((x) => {
            const deal = x.deals;
            const running = x.status === 'open' && new Date(x.closes_at).getTime() > clock;
            return (
              <li key={x.id} className={`panel flex flex-col gap-2 p-4 ${x.status === 'cancelled' || x.hidden ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-center gap-2 text-[14px]">
                  <span className="rounded-full bg-sand px-2.5 py-0.5 font-semibold">{running ? t.au_running : x.status === 'open' ? t.au_choose : t[`au_${x.status}`]}</span>
                  {x.hidden && <span className="rounded-full bg-[#FFE5E5] px-2.5 py-0.5 font-semibold text-[#A33]">{t.au_hidden}</span>}
                  <span className="text-[16px] font-semibold text-ink">{x.name}</span>
                  <span className="text-subtle">· {date(x.created_at)}</span>
                </div>
                <p className="m-0 text-[14px] text-muted">
                  <a href={`mailto:${x.email}`} className="underline underline-offset-2">{x.email}</a>
                  {x.phone && <> · {x.phone}</>} · {x.people} p. · {x.start_day} – {x.end_day} · max USD {Number(x.max_budget).toLocaleString(locale)} · {t.au_closes} {date(x.closes_at)}
                </p>
                <ol className="m-0 flex flex-col gap-0.5 pl-5 text-[14px]">
                  {(x.trip.stops ?? []).map((st, i) => (
                    <li key={i}>
                      <strong>{st.name}</strong> · {st.nights} n.{st.stay ? ` · 🛏️ ${st.stay}` : ''}
                      {st.activities?.length ? ` · ${st.activities.join(', ')}` : ''}
                    </li>
                  ))}
                </ol>
                {x.note && <p className="m-0 text-[15px] text-muted">“{x.note}”</p>}
                {x.bids.length > 0 && (
                  <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13.5px]">
                    {[...x.bids].sort((a, b) => a.price - b.price).map((b) => (
                      <li key={b.id} className={b.status === 'won' ? 'font-semibold text-[#2F6B2A]' : 'text-muted'}>
                        🔨 {b.partners?.business ?? '?'} · USD {Number(b.price).toLocaleString(locale)} · {b.status}
                      </li>
                    ))}
                  </ul>
                )}
                {x.decline_reason && <p className="m-0 text-[13.5px] text-subtle">✕ {x.decline_reason}</p>}
                {deal && (
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-semibold text-ink">
                      💳 {t.au_deposit} USD {Number(deal.deposit).toLocaleString(locale)} · {deal.payment}
                    </span>
                    {PAYMENT.filter((p) => p !== deal.payment).map((p) => (
                      <button key={p} type="button" className="chip !min-h-9" onClick={() => setPayment(deal.id, p)}>
                        {t[`pay_${p}`]}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-[13px]">
                  <button type="button" className="chip !min-h-9" onClick={() => setAuctionHidden(x.id, !x.hidden)}>
                    {x.hidden ? t.au_show : t.au_hide}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'stays' && (
        <div className="flex flex-col gap-4">
          <form onSubmit={addStay} className="panel grid gap-3 p-4 sm:grid-cols-2">
            <p className="m-0 text-[14px] text-muted sm:col-span-2">{t.stayIntro}</p>
            <select className="field !min-h-11" value={stayForm.place_id} onChange={(e) => setStayForm({ ...stayForm, place_id: e.target.value })}>
              <option value="">{t.stayPlace}</option>
              {Object.entries(places)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([id, n]) => (
                  <option key={id} value={id}>
                    {n}
                  </option>
                ))}
            </select>
            <input
              className="field !min-h-11"
              placeholder={t.stayName}
              value={stayForm.name}
              onChange={(e) => setStayForm({ ...stayForm, name: e.target.value })}
              maxLength={120}
            />
            <select className="field !min-h-11" value={stayForm.type} onChange={(e) => setStayForm({ ...stayForm, type: e.target.value })}>
              {STAY_TYPES.map((k) => (
                <option key={k} value={k}>
                  {stayTypes[k]}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select className="field !min-h-11 w-24" value={stayForm.currency} onChange={(e) => setStayForm({ ...stayForm, currency: e.target.value })}>
                {['EUR', 'USD', 'GBP', 'TZS'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                className="field !min-h-11 flex-1"
                type="number"
                min={0}
                placeholder={t.stayPrice}
                value={stayForm.price_from}
                onChange={(e) => setStayForm({ ...stayForm, price_from: e.target.value })}
              />
            </div>
            <input
              className="field !min-h-11"
              type="url"
              placeholder={t.stayUrl}
              value={stayForm.url}
              onChange={(e) => setStayForm({ ...stayForm, url: e.target.value })}
              maxLength={300}
            />
            <input
              className="field !min-h-11"
              placeholder={t.staySource}
              value={stayForm.source}
              onChange={(e) => setStayForm({ ...stayForm, source: e.target.value })}
              maxLength={300}
            />
            <input
              className="field !min-h-11 sm:col-span-2"
              placeholder={t.stayNote}
              value={stayForm.note}
              onChange={(e) => setStayForm({ ...stayForm, note: e.target.value })}
              maxLength={300}
            />
            <label className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[#5A4030]"
                checked={stayForm.recommended}
                onChange={(e) => setStayForm({ ...stayForm, recommended: e.target.checked })}
              />
              ⭐ {t.stayRecommended}
            </label>
            <button type="submit" className="btn btn-primary !min-h-11 justify-self-start">
              ＋ {t.stayAdd}
            </button>
          </form>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {stays.length === 0 && <li className="text-[15px] text-muted">{t.none}</li>}
            {stays.map((x) => (
              <li key={x.id} className={`panel flex flex-wrap items-center gap-3 p-3 text-[14px] ${x.active ? '' : 'opacity-50'}`}>
                <span className="font-semibold text-ink">{x.name}</span>
                <span className="text-subtle">
                  {places[x.place_id] ?? x.place_id} · {stayTypes[x.type]}
                  {x.price_from !== null ? ` · ${x.currency} ${x.price_from}` : ''}
                  {x.recommended ? ' · ⭐' : ''}
                </span>
                <span className="text-[12px] text-subtle">
                  {t.staySource}: {x.source}
                </span>
                <button type="button" className="btn btn-ghost ml-auto !min-h-9" onClick={() => toggleStay(x)}>
                  {x.active ? t.stayHide : t.stayShow}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'reports' && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {reports.length === 0 && <li className="text-[15px] text-muted">{t.none}</li>}
          {reports.map((r) => (
            <li key={r.id} className={`panel flex flex-col gap-2 p-4 ${r.status !== 'open' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center gap-2 text-[14px]">
                <span className="rounded-full bg-sand px-2.5 py-0.5 font-semibold">{t[`status_${r.status}`]}</span>
                <span className="font-semibold text-ink">{reasons[r.reason as keyof typeof reasons] ?? r.reason}</span>
                <span className="text-subtle">
                  · {places[r.place_id] ?? r.place_id} · {date(r.created_at)}
                </span>
                <a
                  href={`https://www.tiktok.com/player/v1/${r.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto underline underline-offset-2"
                >
                  {t.openVideo} ↗
                </a>
              </div>
              {r.details && <p className="m-0 text-[15px] text-muted">“{r.details}”</p>}
              {r.reporter_email && (
                <p className="m-0 text-[13px] text-subtle">
                  {t.reporter}: {r.reporter_email}
                </p>
              )}
              {r.status === 'open' ? (
                <>
                  {noteBox(`r${r.id}`)}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary !min-h-10" onClick={() => decideReport(r, 'removed')}>
                      🗑️ {t.remove}
                    </button>
                    <button type="button" className="btn btn-ghost !min-h-10" onClick={() => decideReport(r, 'kept')}>
                      ✓ {t.keep}
                    </button>
                  </div>
                </>
              ) : (
                r.decision_note && (
                  <p className="m-0 text-[13px] text-subtle">
                    {t.decided}: {r.decision_note}
                  </p>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === 'submissions' && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {subs.length === 0 && <li className="text-[15px] text-muted">{t.none}</li>}
          {subs.map((s) => (
            <li key={s.id} className={`panel flex flex-col gap-2 p-4 ${s.status !== 'pending' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center gap-2 text-[14px]">
                <span className="rounded-full bg-sand px-2.5 py-0.5 font-semibold">{t[`sub_${s.status}`]}</span>
                <span className="font-semibold text-ink">{places[s.place_id] ?? s.place_id}</span>
                <span className="text-subtle">
                  · {s.author ? `@${s.author}` : ''} {s.visited ? `· ${s.visited}` : ''} · {date(s.created_at)}
                </span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="ml-auto underline underline-offset-2">
                  {t.openVideo} ↗
                </a>
              </div>
              {s.note && <p className="m-0 text-[15px] text-muted">“{s.note}”</p>}
              {s.status === 'pending' && (
                <>
                  <label className="flex flex-col gap-1 text-[13px] text-subtle">
                    {t.tiktokId}
                    <input
                      className="field !min-h-10 text-[14px]"
                      inputMode="numeric"
                      value={ids[s.id] ?? s.tiktok_id ?? ''}
                      onChange={(e) => setIds({ ...ids, [s.id]: e.target.value })}
                    />
                  </label>
                  {noteBox(`s${s.id}`)}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary !min-h-10" onClick={() => decideSub(s, 'approved')}>
                      ✓ {t.approve}
                    </button>
                    <button type="button" className="btn btn-ghost !min-h-10" onClick={() => decideSub(s, 'rejected')}>
                      ✕ {t.reject}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === 'partners' && accounts.length > 0 && (
        <section className="panel flex flex-col gap-2 p-4">
          <h2 className="m-0 text-[18px] font-semibold text-ink">🔑 {t.accounts}</h2>
          <p className="m-0 text-[13px] text-subtle">{t.accountsNote}</p>
          {accounts.map((a) => (
            <div key={a.id} className={`flex flex-wrap items-center gap-3 border-t border-rule pt-2 text-[14px] ${a.active ? '' : 'opacity-50'}`}>
              <span className="font-semibold text-ink">{a.business}</span>
              <span className="text-subtle">{a.email}</span>
              <label className="ml-auto flex items-center gap-1.5 text-subtle">
                {t.commissionLabel}
                <input
                  className="field !min-h-9 w-20"
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  defaultValue={a.commission_pct}
                  onBlur={(e) => setCommission(a, e.target.value)}
                />
                %
              </label>
              <button type="button" className="btn btn-ghost !min-h-9" onClick={() => toggleAccount(a)}>
                {a.active ? t.stayHide : t.stayShow}
              </button>
            </div>
          ))}
        </section>
      )}
      {tab === 'partners' && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {partners.length === 0 && <li className="text-[15px] text-muted">{t.none}</li>}
          {partners.map((x) => (
            <li key={x.id} className={`panel flex flex-col gap-2 p-4 ${x.status === 'rejected' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center gap-2 text-[14px]">
                <span className="rounded-full bg-sand px-2.5 py-0.5 font-semibold">{t[`p_${x.status}`]}</span>
                <span className="text-[16px] font-semibold text-ink">{x.business}</span>
                <span className="text-subtle">
                  · {kinds[x.kind as keyof typeof kinds] ?? x.kind} · {x.place_id ? (places[x.place_id] ?? x.place_id) : '—'} · {date(x.created_at)}
                </span>
              </div>
              <p className="m-0 text-[14px] text-muted">
                {x.contact} ·{' '}
                <a href={`mailto:${x.email}`} className="underline underline-offset-2">
                  {x.email}
                </a>
                {x.phone && <> · {x.phone}</>}
                {x.website && (
                  <>
                    {' '}
                    ·{' '}
                    <a
                      href={x.website.startsWith('http') ? x.website : `https://${x.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {x.website}
                    </a>
                  </>
                )}
              </p>
              {x.message && <p className="m-0 text-[15px] text-muted">“{x.message}”</p>}
              {x.details && <PartnerDetails d={x.details} pq={pq} locale={locale} places={places} />}
              {x.status === 'new' || x.status === 'contacted' ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary !min-h-11" onClick={() => acceptPartner(x)}>
                    ✓ {t.pAccept}
                  </button>
                  <button type="button" className="btn btn-ghost !min-h-11" onClick={() => setPartnerStatus(x.id, 'rejected')}>
                    ✕ {t.pReject}
                  </button>
                </div>
              ) : (
                <a href={partnerMail(x)} className="btn btn-ghost !min-h-10 self-start">
                  {x.status === 'accepted' ? t.pMailAccept : t.pMailReject}
                </a>
              )}
              <details className="text-[13px]">
                <summary className="cursor-pointer text-subtle">{t.pOther}</summary>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {P_STATUS.filter((st) => st !== x.status).map((st) => (
                    <button key={st} type="button" className="chip !min-h-9" onClick={() => setPartnerStatus(x.id, st)}>
                      {t[`p_${st}`]}
                    </button>
                  ))}
                  {x.status === 'accepted' && !accounts.some((a) => a.email.toLowerCase() === x.email.toLowerCase()) && (
                    <button type="button" className="btn btn-primary !min-h-9" onClick={() => makeAccount(x)}>
                      🔑 {t.makeAccount}
                    </button>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {tab === 'hidden' && (
        <form onSubmit={hideVideo} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-[13px] text-subtle">
            {t.hideTitle}
            <input
              className="field !min-h-11 text-[14px]"
              placeholder={t.hidePlaceholder}
              value={hideForm.video}
              onChange={(e) => setHideForm({ ...hideForm, video: e.target.value })}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-[13px] text-subtle">
            {t.hideReason}
            <input
              className="field !min-h-11 text-[14px]"
              maxLength={300}
              value={hideForm.reason}
              onChange={(e) => setHideForm({ ...hideForm, reason: e.target.value })}
            />
          </label>
          <button type="submit" className="btn btn-primary !min-h-11">
            🗑️ {t.hideAdd}
          </button>
        </form>
      )}

      {tab === 'users' && (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[13px] text-subtle">{t.uNote}</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void loadUsers(userQ.trim());
            }}
          >
            <input
              className="field !min-h-11 flex-1 text-[14px]"
              type="search"
              placeholder={t.uSearch}
              value={userQ}
              onChange={(e) => setUserQ(e.target.value)}
            />
            <button type="submit" className="btn btn-ghost !min-h-11">
              {t.uSearchBtn}
            </button>
          </form>
          {users === 'missing' ? (
            <p className="panel m-0 p-4 text-[14px] text-muted">{t.uMissing}</p>
          ) : users === null ? (
            <div className="panel h-24" aria-busy="true" />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {users.length === 0 && <li className="text-[15px] text-muted">{t.none}</li>}
              {users.map((u) => (
                <li key={u.id} className={`panel flex flex-wrap items-center gap-3 p-3 text-[14px] ${u.blocked ? 'opacity-60' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 flex flex-wrap items-center gap-2 font-semibold text-ink">
                      <span className="break-all">{u.email}</span>
                      {u.admin && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[12px] text-brand-dark">{t.uAdmin}</span>}
                      {u.blocked && <span className="rounded-full bg-[#FFE5E5] px-2 py-0.5 text-[12px] text-[#A33]">{t.uBlocked}</span>}
                    </p>
                    <p className="m-0 mt-0.5 text-[12px] text-subtle">
                      {t.uJoined} {date(u.created_at)} · {t.uLast} {u.last_sign_in_at ? date(u.last_sign_in_at) : t.uNever} ·{' '}
                      {format(t.uComments, { n: u.comments }, locale as Locale)} · {format(t.uBookings, { n: u.bookings }, locale as Locale)}
                    </p>
                  </div>
                  {!u.admin && u.id !== user.id && (
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-ghost !min-h-9" onClick={() => blockUser(u, !u.blocked)}>
                        {u.blocked ? t.uUnblock : `⛔ ${t.uBlock}`}
                      </button>
                      <button type="button" className="btn btn-ghost !min-h-9 text-[#A33]" onClick={() => deleteUser(u)}>
                        🗑️ {t.uDelete}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'hidden' && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {hidden.length === 0 && <li className="text-[15px] text-muted">{t.none}</li>}
          {hidden.map((h) => (
            <li key={h.video_id} className="panel flex flex-wrap items-center gap-3 p-4 text-[14px]">
              <span className="font-mono">{h.video_id}</span>
              <span className="text-subtle">{h.reason}</span>
              <button type="button" className="btn btn-ghost ml-auto !min-h-10" onClick={() => restore(h.video_id)}>
                ↺ {t.restore}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
