'use client';

import { useEffect, useRef, useState } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';

type Props = {
  title: string;
  t: Dictionary['share'] & { label: string };
  /** Link om te delen (standaard de huidige pagina). */
  url?: string;
  /** Na delen (kopiëren, WhatsApp, e-mail): bv. de teller ophogen. */
  onShared?: () => void;
  /** Hoe vaak al gedeeld via Gnutube (getoond naast de knop). */
  count?: number;
  /** Lijst naar boven openen (onderaan het scherm). */
  up?: boolean;
  /** Kleine knop: alleen het pijltje en het aantal (bv. naast een video). */
  compact?: boolean;
};

/** Delen: link kopiëren, WhatsApp en e-mail. Geen externe scripts. */
export function ShareButton({ title, t, url, onShared, count, up = false, compact = false }: Props) {
  const link = () => (url ? new URL(url, window.location.origin).toString() : window.location.href);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onEsc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      onShared?.();
      setTimeout(() => setCopied(false), 2000);
    } catch { /* klembord niet beschikbaar */ }
  };

  const item = 'flex min-h-11 items-center rounded-xl px-4 text-left text-[15px] hover:bg-sand';
  const shareText = () => encodeURIComponent(`${title} — ${link()}`);

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={compact ? 'flex min-h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 text-[14px] font-semibold text-white hover:bg-white/20' : 'btn btn-ghost'}
        aria-label={compact ? t.label : undefined}
        title={compact ? t.label : undefined}
      >
        {compact ? (
          <>
            ↗ <span className="tabular-nums">{count ?? 0}</span>
          </>
        ) : (
          <>
            ↗ {t.label}
            {count ? <span className="ml-1.5 rounded-full bg-sand px-2 py-0.5 text-[12px] font-semibold text-ink">{count}</span> : null}
          </>
        )}
      </button>
      {open && (
        <div className={`glass-strong absolute left-0 z-20 flex min-w-56 flex-col overflow-hidden rounded-2xl p-1.5 text-ink ${up ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          <button type="button" onClick={copy} className={item}>{t.copy}</button>
          <button type="button" className={item} onClick={() => { onShared?.(); window.open(`https://wa.me/?text=${shareText()}`, '_blank', 'noopener,noreferrer'); }}>{t.whatsapp}</button>
          <button type="button" className={item} onClick={() => { onShared?.(); window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${shareText()}`; }}>{t.email}</button>
          <span role="status" className="sr-only">{copied ? t.copied : ''}</span>
          {copied && <span className="px-4 pb-2 text-[12px] text-ink/60" aria-hidden="true">{t.copied}</span>}
        </div>
      )}
    </div>
  );
}
