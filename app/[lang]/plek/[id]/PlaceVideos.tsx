'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { TikTokPlayer, type TikTokLabels } from '@/components/TikTokPlayer';
import type { Video } from '@/lib/videos';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { useCommunityVideos } from '@/lib/community';
import { ReportButton } from '@/components/ReportButton';

type Props = {
  placeId: string;
  report: Dictionary['report'];
  placeName: string;
  videos: Video[];
  watchHref: string;
  poster: ReactNode;
  labels: TikTokLabels & { title: string; videoBy: string; follow: string; all: string; prev: string; next: string };
};

/** Video's van één plek: één verticale TikTok-speler, met vorige/volgende en de maker in het onderschrift. */
export function PlaceVideos({ placeId, report, placeName, videos: base, watchHref, poster, labels }: Props) {
  const [i, setI] = useState(0);
  // Plus goedgekeurde video's van reizigers, zonder weggehaalde video's
  const all = useCommunityVideos(base);
  const videos = all.filter((x) => x.placeId === placeId);
  const v = videos[Math.min(i, videos.length - 1)];
  if (!v) return null;
  return (
    <section className="mt-24" aria-labelledby="videos">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="videos" className="m-0 font-display text-[clamp(40px,5vw,72px)] font-normal leading-none">
          {labels.title}
        </h2>
        <Link href={watchHref} className="btn btn-ghost">
          {labels.all} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="mt-8 grid items-center gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/10">
          <TikTokPlayer key={v.tiktokId} tiktokId={v.tiktokId} active title={`${placeName} · @${v.author}`} labels={labels} placeholder={poster} />
        </div>
        <div className="flex flex-col gap-4">
          {v.title && <p className="m-0 text-[17px] text-ink/80">{v.title}</p>}
          <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink/70">
            <span>{labels.videoBy.replace('{handle}', v.author)}</span>
            <a href={`https://www.tiktok.com/@${v.author}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-ink">
              {labels.follow} ↗
            </a>
            {v.traveller && <span className="rounded-full bg-sand px-2 py-0.5 text-[12px]">🧳 {report.traveller}</span>}
            <ReportButton videoId={v.tiktokId} placeId={placeId} t={report} />
          </p>
          {videos.length > 1 && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setI((i - 1 + videos.length) % videos.length)} className="glass grid h-11 w-11 place-items-center rounded-full" aria-label={labels.prev}>
                ←
              </button>
              <span className="text-[13px] tabular-nums text-ink/60" aria-live="polite">
                {i + 1} / {videos.length}
              </span>
              <button type="button" onClick={() => setI((i + 1) % videos.length)} className="glass grid h-11 w-11 place-items-center rounded-full" aria-label={labels.next}>
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
