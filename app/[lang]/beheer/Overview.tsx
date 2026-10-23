'use client';

import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';

/** Wat admin_overview() in de database teruggeeft: alleen totalen, niets per persoon. */
export type OverviewData = {
  accounts: number;
  accounts_7d: number;
  accounts_30d: number;
  active_7d: number;
  with_trip: number;
  bookings: number;
  bookings_open: number;
  bookings_paid: number;
  bookings_test: number;
  revenue: Record<string, { amount: number; commission: number }>;
  requests: number;
  requests_new: number;
  partners_new: number;
  partners_active: number;
  videos_pending: number;
  reports_open: number;
  reviews: number;
  hidden_videos?: number;
  comments?: number;
  signups_by_day?: number[];
  active_by_day?: number[];
  revenue_by_day?: number[];
  requests_by_day?: number[];
  top_places: { place_id: string; n: number }[];
};

/** Een onderdeel van de beheerpagina als tegel: aantal, en wat er openstaat */
export type Section = { id: string; icon: string; label: string; count: number | null; todo?: number; todoLabel?: string };

type Props = {
  data: OverviewData | null | 'missing';
  t: Dictionary['admin'];
  places: Record<string, string>;
  locale: string;
  sections: Section[];
  onGo: (tab: string) => void;
};

/** Kleine staafjes per dag (laatste 30 dagen) */
function Bars({ values, color = '#F0821E' }: { values: number[]; color?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-12 items-end gap-[3px]" aria-hidden="true">
      {values.map((v, i) => (
        <span key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: v ? color : 'rgba(251,244,234,0.12)' }} />
      ))}
    </div>
  );
}
/** Vakjes per dag, hoe meer hoe feller (zoals een activiteitenkaart) */
function Squares({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[4px]" aria-hidden="true">
      {values.map((v, i) => (
        <span
          key={i}
          className="aspect-square rounded-[4px]"
          style={{ background: v ? `rgba(240,130,30,${0.3 + 0.7 * (v / max)})` : 'rgba(251,244,234,0.1)' }}
        />
      ))}
    </div>
  );
}

const tile = 'flex min-h-[170px] flex-col gap-1.5 rounded-2xl border border-white/10 bg-[#2A1F17] p-4 text-[#FBF4EA]';
const label = 'm-0 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FBF4EA]/70';
const big = 'm-0 font-mono text-[40px] leading-none';
const small = 'm-0 font-mono text-[12px] text-[#FBF4EA]/60';

export function Overview({ data, t, places, locale, sections, onGo }: Props) {
  const loc = locale as Locale;
  const days = (v?: number[]) => (v && v.length ? v : Array<number>(30).fill(0));
  const num = (n: number) => n.toLocaleString(locale);
  const money = (cur: string, n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
  const ready = data && data !== 'missing' ? data : null;
  const revenue = ready ? Object.entries(ready.revenue) : [];
  const maxTop = ready ? Math.max(1, ...ready.top_places.map((p) => p.n)) : 1;

  return (
    <div className="flex flex-col gap-3">
      {data === 'missing' && <p className="m-0 rounded-2xl bg-white/5 p-4 text-[14px] text-[#FBF4EA]/80">{t.ovMissing}</p>}
      {data === null && <div className="h-40 rounded-2xl bg-white/5" aria-busy="true" />}

      {ready && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <article className={`${tile} sm:col-span-2`}>
            <header className="mb-1 flex items-center gap-2">
              <h3 className={label}>{t.ovAccounts}</h3>
              <span className="ml-auto font-mono text-[12px] text-[#7FD08A]">↑ {format(t.ovNewWeek, { n: ready.accounts_7d }, loc)}</span>
            </header>
            <p className={big}>{num(ready.accounts)}</p>
            <p className={small}>
              {format(t.ovNew30, { n: ready.accounts_30d }, loc)} · {t.ovWithTrip}: {ready.with_trip}
            </p>
            <div className="mt-auto pt-3">
              <Squares values={days(ready.signups_by_day)} />
              <p className="m-0 mt-2 font-mono text-[11px] text-[#FBF4EA]/50">{t.ovSignups30}</p>
            </div>
          </article>

          <article className={`${tile} sm:col-span-2`}>
            <header className="mb-1 flex items-center gap-2">
              <h3 className={label}>{t.ovRevenue}</h3>
              <span className="ml-auto font-mono text-[12px] text-[#FBF4EA]/50">30d</span>
            </header>
            {revenue.length === 0 ? (
              <>
                <p className={`${big} text-[#FBF4EA]/40`}>—</p>
                <p className={small}>{t.ovNoRevenue}</p>
              </>
            ) : (
              revenue.map(([cur, v]) => (
                <div key={cur}>
                  <p className={big}>{money(cur, v.amount)}</p>
                  <p className={small}>
                    {t.ovCommission}: {money(cur, v.commission)}
                  </p>
                </div>
              ))
            )}
            <div className="mt-auto pt-3">
              <Bars values={days(ready.revenue_by_day)} />
            </div>
          </article>

          <article className={tile}>
            <header className="mb-1 flex items-center gap-2">
              <h3 className={label}>{t.ovActiveWeek}</h3>
              <span className="ml-auto flex items-center gap-1.5 font-mono text-[12px] text-[#7FD08A]">
                <span className="h-2 w-2 rounded-full bg-[#7FD08A]" />
                7d
              </span>
            </header>
            <p className={big}>{num(ready.active_7d)}</p>
            <div className="mt-auto pt-3">
              <Bars values={days(ready.active_by_day)} color="#7FD08A" />
            </div>
          </article>

          <article className={tile}>
            <header className="mb-1">
              <h3 className={label}>{t.ovBookings}</h3>
            </header>
            <p className={big}>{num(ready.bookings)}</p>
            <p className={small}>{format(t.ovBookingsSub, { open: ready.bookings_open, paid: ready.bookings_paid }, loc)}</p>
            {ready.bookings_test > 0 && (
              <p className="m-0 mt-auto pt-3 font-mono text-[11px] text-[#FBF4EA]/40">{format(t.ovTestBookings, { n: ready.bookings_test }, loc)}</p>
            )}
          </article>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {ready && (
          <article className={tile}>
            <header className="mb-1">
              <h3 className={label}>{t.ovTopPlaces}</h3>
            </header>
            <p className="m-0 font-mono text-[11px] text-[#FBF4EA]/50">{t.ovTopNote}</p>
            {ready.top_places.length === 0 ? (
              <p className="m-0 mt-2 text-[14px] text-[#FBF4EA]/60">{t.ovNone}</p>
            ) : (
              <ol className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                {ready.top_places.map((p) => (
                  <li key={p.place_id} className="flex items-center gap-3 text-[13px]">
                    <span className="w-32 shrink-0 truncate">{places[p.place_id] ?? p.place_id}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full bg-[#F0821E]" style={{ width: `${(p.n / maxTop) * 100}%` }} />
                    </span>
                    <span className="w-8 text-right font-mono text-[12px] text-[#FBF4EA]/60">{p.n}</span>
                  </li>
                ))}
              </ol>
            )}
          </article>
        )}
        {/* Alle onderdelen als tegels: klik om te openen */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-2">
          {sections.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => onGo(x.id)}
              className={`group flex min-h-[130px] flex-col gap-1 rounded-2xl border p-4 text-left text-[#FBF4EA] transition-colors ${
                x.todo ? 'border-[#F0821E]/60 bg-[#3A2615] hover:bg-[#4A2F18]' : 'border-white/10 bg-[#2A1F17] hover:bg-[#33261C]'
              }`}
            >
              <span className="text-[22px]" aria-hidden="true">
                {x.icon}
              </span>
              <span className="text-[15px] font-semibold leading-tight">{x.label}</span>
              <span className="mt-auto flex items-end justify-between gap-2">
                <span className="font-mono text-[28px] leading-none">{x.count === null ? '—' : num(x.count)}</span>
                {!!x.todo && <span className="rounded-full bg-[#F0821E] px-2 py-0.5 font-mono text-[11px] font-semibold text-white">{x.todoLabel}</span>}
              </span>
              <span className="font-mono text-[11px] text-[#FBF4EA]/40 transition-colors group-hover:text-[#F5B26B]">{t.ovOpen} →</span>
            </button>
          ))}
        </div>
      </div>

      <p className="m-0 px-1 font-mono text-[11px] text-[#FBF4EA]/40">🔒 {t.ovPrivacy}</p>
    </div>
  );
}
