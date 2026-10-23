'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Place } from '@/lib/data';
import type { Video } from '@/lib/videos';
import { KIND_COLOR } from '@/lib/kind-colors';
import { KindIcon } from './KindIcon';
import { PlaceImage } from './PlaceImage';
import { TikTokPlayer, type TikTokLabels } from './TikTokPlayer';

type Props = {
  place: Place & { videos: Video[]; near: { id: string; name: string; km: number }[] };
  inTrip: boolean;
  labels: TikTokLabels & {
    kind: string;
    yes: string;
    no: string;
    full: string;
    close: string;
    videos: string;
    activities: string;
    nearby: string;
    km: (n: number) => string;
    by: (handle: string) => string;
  };
  href: string;
  onYes: () => void;
  onNo: () => void;
  onClose: () => void;
};

/**
 * Plekpagina als venster over de feed: foto, uitleg, activiteiten en alle video's van de plek.
 * Onderaan de keuze: Ja (in je reis) of Nee (niets voor mij); daarna gaat de feed door naar de volgende plek.
 */
export function PlaceSheet({ place: p, inTrip, labels, href, onYes, onNo, onClose }: Props) {
  const [v, setV] = useState(0);
  const video = p.videos[v] ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="kt-sheet fixed inset-0 z-[55] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="kt-sheet-panel relative flex max-h-[94dvh] w-full max-w-[980px] flex-col overflow-hidden rounded-t-[28px] bg-white text-[#2A1F17] shadow-2xl sm:rounded-[28px]"
      >
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[16px] shadow-md hover:bg-white" aria-label={labels.close}>
          ✕
        </button>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[340px_minmax(0,1fr)]">
          {/* Video's van de plek (of de foto als er nog geen video is) */}
          <div className="relative bg-black md:min-h-[560px]">
            <div className="relative mx-auto aspect-[9/16] max-h-[60dvh] md:h-full md:max-h-none">
              {video ? (
                <TikTokPlayer key={video.tiktokId} tiktokId={video.tiktokId} active title={`${p.name} · @${video.author}`} labels={labels} placeholder={<PlaceImage id={p.id} kind={p.kind} mountain={p.mountain} hasWater={p.hasWater} sizes="340px" />} />
              ) : (
                <PlaceImage id={p.id} kind={p.kind} mountain={p.mountain} hasWater={p.hasWater} sizes="340px" />
              )}
            </div>
            {p.videos.length > 1 && (
              <div className="absolute inset-x-0 top-3 z-10 flex justify-center gap-1.5" role="group" aria-label={labels.videos}>
                {p.videos.map((x, i) => (
                  <button
                    key={x.tiktokId}
                    type="button"
                    onClick={() => setV(i)}
                    aria-label={`${labels.videos} ${i + 1}`}
                    aria-pressed={i === v}
                    className="h-2 w-6 rounded-full bg-white/40 transition-colors aria-pressed:bg-white"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Over de plek */}
          <div className="flex flex-col">
            <div className="relative h-40 shrink-0 overflow-hidden sm:h-48">
              <PlaceImage id={p.id} kind={p.kind} mountain={p.mountain} hasWater={p.hasWater} sizes="640px" />
              <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[13px] font-semibold">
                <KindIcon kind={p.kind} color={KIND_COLOR[p.kind]} size={16} />
                {labels.kind}
              </span>
            </div>
            <div className="flex flex-col gap-3 p-5 sm:p-7">
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#7D7064]">{p.region}</span>
              <h2 id="sheet-title" className="m-0 text-[34px] font-semibold leading-tight">{p.name}</h2>
              <p className="m-0 text-[17px] text-[#5E5248]">{p.tagline}</p>
              {video && <p className="m-0 text-[13px] text-[#7D7064]">{labels.by(video.author)}</p>}
              {p.activities.length > 0 && (
                <div>
                  <h3 className="m-0 mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#7D7064]">{labels.activities}</h3>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {p.activities.map((a) => (
                      <li key={a} className="rounded-full border border-[#EAE2D9] bg-[#FBF6F0] px-3 py-1 text-[14px]">{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {p.near.length > 0 && (
                <p className="m-0 text-[14px] text-[#5E5248]">
                  <span className="font-semibold">{labels.nearby}:</span> {p.near.map((n) => `${n.name} (${labels.km(n.km)})`).join(' · ')}
                </p>
              )}
              <Link href={href} className="self-start text-[14px] font-semibold text-[#5A4030] underline underline-offset-4">
                {labels.full} →
              </Link>
            </div>
          </div>
        </div>

        {/* Kiezen */}
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-[#EAE2D9] bg-white p-4 sm:p-5">
          <button type="button" onClick={onNo} className="flex min-h-14 items-center justify-center gap-2 rounded-full border-2 border-[#E5484D] text-[16px] font-semibold text-[#C2363B] transition-colors hover:bg-[#FFF1F1]">
            ✕ {labels.no}
          </button>
          <button type="button" onClick={onYes} disabled={inTrip} className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#2FA84F] text-[16px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60">
            ✓ {labels.yes}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
