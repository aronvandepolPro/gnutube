'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';
import { loadPlaceReviews, type PublicReview } from '@/lib/visits';

type Labels = { reviewsEmpty: string; reviewVerified: string; reviewTraveller: string; reviewTrip: string; reviewAverage: string };

/** Recensies van hele reizen waar deze plek in zat; alleen van reizigers die de reis via Gnutube boekten en maakten. */
export function PlaceReviews({ placeId, locale, t }: { placeId: string; locale: Locale; t: Labels }) {
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadPlaceReviews(placeId).then((r) => alive && setReviews(r));
    return () => {
      alive = false;
    };
  }, [placeId]);
  if (reviews === null) return null;
  if (!reviews.length) return <p className="m-0 text-[16px] text-ink/60">{t.reviewsEmpty}</p>;
  const avg = reviews.reduce((n, r) => n + r.rating, 0) / reviews.length;
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] text-muted">
        <span className="text-[20px] text-[#E8A21A]">★</span> <strong className="text-ink">{avg.toLocaleString(locale, { maximumFractionDigits: 1 })}</strong>{' '}
        {format(t.reviewAverage, { n: reviews.length }, locale)}
      </p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-2xl border border-rule bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[15px] font-semibold text-ink">{r.name || t.reviewTraveller}</span>
              <span className="text-[16px] text-[#E8A21A]" aria-label={`${r.rating}/5`}>
                {'★'.repeat(r.rating)}
                <span className="text-rule">{'★'.repeat(5 - r.rating)}</span>
              </span>
            </div>
            <p className="m-0 mt-0.5 text-[12.5px] text-[#2F6B2A]">
              ✓ {t.reviewVerified}
              {r.start_day && ` · ${format(t.reviewTrip, { date: new Date(`${r.start_day}T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' }) }, locale)}`}
            </p>
            <p className="m-0 mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">{r.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
