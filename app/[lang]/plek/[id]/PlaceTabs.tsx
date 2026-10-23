'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { BestTime } from '@/lib/best-time';
import type { Locale } from '@/lib/i18n/config';
import { PlaceReviews } from '@/components/PlaceReviews';

type Props = {
  t: Dictionary['place'];
  activities: string[];
  nightsLabel: string;
  stays: { id: string; name: string; price: string }[];
  /** Beste reistijd met reden en bron; null = nog geen bron. */
  bestTime: BestTime | null;
  placeId: string;
  locale: Locale;
};

type Tab = 'overview' | 'stays' | 'reviews';

/** Toegankelijke tabbladen: pijltjestoetsen, Home/End, aria-koppelingen. */
export function PlaceTabs({ t, activities, nightsLabel, stays, bestTime, placeId, locale }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const base = useId();
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: t.overview },
    { id: 'stays', label: t.stays },
    { id: 'reviews', label: t.reviews },
  ];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setTab(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className="mt-2">
      <div role="tablist" aria-label={t.overview} className="inline-flex gap-1 rounded-full border border-rule bg-sand p-1">
        {tabs.map((it, i) => (
          <button
            key={it.id}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            type="button"
            id={`${base}-tab-${it.id}`}
            aria-selected={tab === it.id}
            aria-controls={`${base}-panel-${it.id}`}
            tabIndex={tab === it.id ? 0 : -1}
            onClick={() => setTab(it.id)}
            onKeyDown={(e) => onKey(e, i)}
            className="min-h-10 rounded-full px-5 text-[15px] text-muted transition-colors hover:text-ink aria-selected:bg-brand-dark aria-selected:font-semibold aria-selected:text-white"
          >
            {it.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${base}-panel-${tab}`}
        aria-labelledby={`${base}-tab-${tab}`}
        tabIndex={0}
        className="py-6"
      >
        {tab === 'overview' && (
          <dl className="m-0 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="eyebrow">{t.activities}</dt>
              <dd className="m-0 mt-2">
                {activities.length ? (
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {activities.map((a) => (
                      <li key={a} className="rounded-full border border-rule bg-sand px-4 py-1.5 text-[15px]">{a}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-[15px] text-ink/60">{t.noActivities}</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="eyebrow">{t.bestTime}</dt>
              <dd className="m-0 mt-2">
                {bestTime ? (
                  <div className="flex flex-col gap-3">
                    <p className="m-0 text-[18px] font-semibold text-ink">{bestTime.label || t.bestTimeAllYear}</p>
                    {/* Twaalf maanden: groen = beste tijd, lichtgroen = ook goed */}
                    <ol className="m-0 grid list-none grid-cols-12 gap-1 p-0" aria-hidden="true">
                      {bestTime.monthNames.map((m, i) => {
                        const best = bestTime.months.includes(i + 1);
                        const alsoGood = !best && bestTime.alsoMonths.includes(i + 1);
                        return (
                          <li key={m} className="flex flex-col items-center gap-1">
                            <span className={`h-2.5 w-full rounded-full ${best ? 'bg-[#2F6B2A]' : alsoGood ? 'bg-[#8EC98A]' : 'bg-rule'}`} />
                            <span className={`text-[11px] ${best ? 'font-semibold text-ink' : 'text-subtle'}`}>{m}</span>
                          </li>
                        );
                      })}
                    </ol>
                    <p className="m-0 text-[15px] leading-relaxed text-muted">{bestTime.why}</p>
                    {bestTime.also && (
                      <p className="m-0 text-[15px] leading-relaxed text-muted">
                        <span className="font-semibold text-ink">{t.bestTimeAlso}</span> {bestTime.also.label}. {bestTime.also.text}
                      </p>
                    )}
                    {bestTime.avoid && (
                      <p className="m-0 text-[15px] leading-relaxed text-muted">
                        <span className="font-semibold text-ink">{t.bestTimeAvoid}</span> {bestTime.avoid}
                      </p>
                    )}
                    <p className="m-0 text-[13px] text-subtle">
                      {t.bestTimeSource}{' '}
                      <a href={bestTime.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-ink">
                        {bestTime.source.name} ↗
                      </a>
                    </p>
                  </div>
                ) : (
                  <span className="text-[15px] text-ink/60">{t.bestTimeUnknown}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">{t.suggestedNights}</dt>
              <dd className="m-0 mt-1 text-[16px]">{nightsLabel}</dd>
            </div>
          </dl>
        )}
        {tab === 'stays' &&
          (stays.length ? (
            <ul className="m-0 list-none border-t border-rule p-0">
              {stays.map((s) => (
                <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule py-3">
                  <span className="text-[16px]">{s.name}</span>
                  <span className="text-[14px] text-ink/70">{s.price}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[16px] text-ink/60">{t.staysEmpty}</p>
          ))}
        {tab === 'reviews' && <PlaceReviews placeId={placeId} locale={locale} t={t} />}
      </div>
    </div>
  );
}
