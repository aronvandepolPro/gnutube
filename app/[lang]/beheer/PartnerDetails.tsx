'use client';

import { useEffect, useState } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { supabase } from '@/lib/supabase';

/** Antwoorden uit het aanmeldformulier (zie components/partners/PartnerForm.tsx) */
export type PartnerAnswers = {
  capacity?: number;
  units?: number;
  price?: { amount: number; currency: string };
  fac?: string[];
  act?: string[];
  lang?: string[];
  season?: string;
  seasonNote?: string;
  licence?: string;
  impact?: string;
  channels?: string[];
  commission?: string;
  payments?: string[];
  media?: string | boolean;
  photos?: string[];
  facOther?: string;
  near?: string[];
  nearOther?: string;
  transport?: string[];
  vehicles?: number;
  vehicle?: string[];
  safariPlaces?: string[];
  transportNote?: string;
  kinds?: string[];
  items?: { cat?: 'stay' | 'offer'; name?: string; count?: number; guests?: number; price?: { amount: number; currency: string }; text?: string; photos?: string[] }[];
};

type Props = { d: PartnerAnswers; pq: Dictionary['partners']; locale: string; places?: Record<string, string> };

/** Foto's staan in privé opslag: alleen beheerders krijgen een tijdelijke link (1 uur). */
function Photos({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const sb = supabase();
    if (!sb || !paths.length) return;
    let alive = true;
    void sb.storage
      .from('partner-photos')
      .createSignedUrls(paths, 3600)
      .then(({ data }) => alive && setUrls((data ?? []).map((x) => x.signedUrl).filter((u): u is string => !!u)));
    return () => {
      alive = false;
    };
  }, [paths]);
  if (!urls.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {urls.map((u, i) => (
        <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] overflow-hidden rounded-xl bg-sand">
          {/* eslint-disable-next-line @next/next/no-img-element -- tijdelijke link uit privé opslag */}
          <img src={u} alt={`${i + 1}`} className="h-full w-full object-cover transition-transform hover:scale-105" />
        </a>
      ))}
    </div>
  );
}

export function PartnerDetails({ d, pq, locale, places = {} }: Props) {
  const opt = (group: string, v: string) => pq.opt[`${group}_${v}` as keyof typeof pq.opt] ?? v;
  const list = (group: string, vs?: string[]) => (vs?.length ? vs.map((v) => opt(group, v)).join(', ') : null);
  const media = d.media === true || d.media === 'yes' ? 'yes' : d.media === false || d.media === 'no' ? 'no' : null;
  const rows: [string, React.ReactNode][] = [];
  if (d.kinds?.length) rows.push([pq.kindLabel, d.kinds.map((k) => pq.kinds[k as keyof typeof pq.kinds] ?? k).join(', ')]);
  if (d.units != null) rows.push([pq.units, d.units]);
  if (d.capacity != null) rows.push([pq.capacity, d.capacity]);
  if (d.price) rows.push([pq.priceFrom, `${d.price.currency} ${d.price.amount.toLocaleString(locale)}`]);
  if (list('fac', d.fac) || d.facOther) rows.push([pq.facilities, [list('fac', d.fac), d.facOther].filter(Boolean).join(' · ')]);
  if (list('near', d.near) || d.nearOther) rows.push([pq.nearAdmin, [list('near', d.near), d.nearOther].filter(Boolean).join(' · ')]);
  if (list('transport', d.transport)) rows.push([pq.transportTitle, list('transport', d.transport)]);
  if (d.vehicles != null || d.vehicle?.length) rows.push([pq.vehicleTypes, [d.vehicles != null && `${d.vehicles}×`, list('vehicle', d.vehicle)].filter(Boolean).join(' ')]);
  if (d.safariPlaces?.length) rows.push([pq.safariPlaces, d.safariPlaces.map((id) => places[id] ?? id).join(', ')]);
  if (d.transportNote) rows.push(['', <span key="tn" className="whitespace-pre-wrap">{d.transportNote}</span>]);
  if (list('act', d.act)) rows.push([pq.activities, list('act', d.act)]);
  if (list('lang', d.lang)) rows.push([pq.languages, list('lang', d.lang)]);
  if (d.season) rows.push([pq.season, d.season === 'other' && d.seasonNote ? d.seasonNote : opt('season', d.season)]);
  if (d.licence) rows.push([pq.licence, d.licence]);
  if (d.impact) rows.push([pq.impact, <span key="i" className="whitespace-pre-wrap">{d.impact}</span>]);
  if (list('channels', d.channels)) rows.push([pq.channels, list('channels', d.channels)]);
  if (d.commission)
    rows.push([
      pq.commissionQ,
      <span key="c" className={`font-semibold ${d.commission === 'yes' ? 'text-[#2F6B2A]' : d.commission === 'no' ? 'text-[#A33]' : ''}`}>
        {opt('commission', d.commission)}
      </span>,
    ]);
  if (list('payments', d.payments)) rows.push([pq.payments, list('payments', d.payments)]);
  if (media) rows.push([pq.mediaQ, opt('media', media)]);

  return (
    <div className="flex flex-col gap-3">
      {!!d.photos?.length && <Photos paths={d.photos} />}
      {!!d.items?.length && (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.08em] text-subtle">{pq.itemsAdmin}</p>
          {d.items.map((x, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-rule bg-white p-3 text-[13.5px]">
              <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <strong className="text-[15px] text-ink">
                  {x.cat === 'offer' ? '🚙' : '🛏️'} {i + 1}. {x.name || '—'}
                </strong>
                <span className="text-subtle">
                  {[x.count != null && `${x.count}×`, x.guests != null && `${pq.itemGuests}: ${x.guests}`, x.price && `${x.price.currency} ${x.price.amount.toLocaleString(locale)}`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </p>
              {x.text && <p className="m-0 whitespace-pre-wrap text-ink">{x.text}</p>}
              {!!x.photos?.length && <Photos paths={x.photos} />}
            </div>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <dl className="m-0 grid gap-x-4 gap-y-1.5 rounded-xl bg-sand/60 p-3 text-[13.5px] sm:grid-cols-[minmax(0,14rem)_1fr]">
          {rows.map(([k, v], i) => (
            <div key={`${k}-${i}`} className="contents">
              <dt className="text-subtle">{k}</dt>
              <dd className="m-0 text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
