'use client';

import { useState, useSyncExternalStore } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { format } from '@/lib/i18n/format';

export type EmbedSource = { provider: 'youtube' | 'tiktok'; videoId: string; creator: string; url: string };

const CONSENT_KEY = 'kt-video-consent';
const providerName = { youtube: 'YouTube', tiktok: 'TikTok' } as const;

const subscribeNoop = () => () => {};

function readConsent() {
  try { return localStorage.getItem(CONSENT_KEY) === '1'; } catch { return false; }
}

/**
 * Officiële embed van YouTube of TikTok, pas geladen na toestemming (cookies/tracking van derden).
 * Naam en link van de maker staan er altijd bij.
 */
export function VideoEmbed({ src, t }: { src: EmbedSource; t: Dictionary['watch'] }) {
  const stored = useSyncExternalStore(subscribeNoop, readConsent, () => false);
  const [allowedNow, setAllowed] = useState(false);
  const allowed = stored || allowedNow;

  const name = providerName[src.provider];
  const iframeSrc =
    src.provider === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(src.videoId)}`
      : `https://www.tiktok.com/embed/v2/${encodeURIComponent(src.videoId)}`;

  if (!allowed) {
    return (
      <div className="flex h-full w-full flex-col items-start justify-center gap-4 bg-black p-6 text-ink">
        <p className="m-0 font-display text-[32px] italic">{format(t.consentTitle, { provider: name })}</p>
        <p className="m-0 max-w-sm text-[15px] text-ink/70">{format(t.consentText, { provider: name })}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setAllowed(true)} className="btn btn-primary">
            {t.consentButton}
          </button>
          <button
            type="button"
            onClick={() => {
              try { localStorage.setItem(CONSENT_KEY, '1'); } catch { /* geen opslag */ }
              setAllowed(true);
            }}
            className="btn btn-ghost"
          >
            {t.consentAlways}
          </button>
        </div>
        <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[14px] underline">
          @{src.creator} · {name}
        </a>
      </div>
    );
  }

  return (
    <iframe
      src={iframeSrc}
      title={`${name} · @${src.creator}`}
      className="h-full w-full border-0"
      allow="encrypted-media; picture-in-picture; fullscreen"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
