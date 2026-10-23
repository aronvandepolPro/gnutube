import type { Dictionary } from '@/lib/i18n/dictionaries';

export function AdvisoryBadge({ t }: { t: Dictionary['advisory'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-ink/30 bg-warning px-3 py-1 text-[12px] font-medium text-warning-ink">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 1 L11 10.5 H1 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6 4.5 V7.2 M6 8.4 V9" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      {t.short}
    </span>
  );
}

export function AdvisoryNotice({ t }: { t: Dictionary['advisory'] }) {
  return (
    <div role="note" className="rounded-2xl border border-warning-ink/30 bg-warning px-5 py-4 text-[15px] text-warning-ink">
      <p className="m-0">{t.long}</p>
      <p className="m-0 mt-1 text-[12px] opacity-80">{t.provisional}</p>
    </div>
  );
}
