'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { sendReport, type ReportReason } from '@/lib/community';
import { getUser } from '@/lib/account';

const REASONS: ReportReason[] = ['illegal', 'privacy', 'copyright', 'animals', 'hate', 'spam', 'wrong_place', 'other'];

/** Meldknop bij een video: reden kiezen, eventueel toelichting, versturen. Kan zonder account. */
export function ReportButton({ videoId, placeId, t, className = '' }: { videoId: string; placeId: string; t: Dictionary['report']; className?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'failed' | 'disabled'>('idle');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    setState('busy');
    const r = await sendReport({ videoId, placeId, reason, details, email });
    setState(r.error === 'disabled' ? 'disabled' : r.error ? 'failed' : 'sent');
  };
  const close = () => {
    setOpen(false);
    if (state === 'sent') {
      setReason('');
      setDetails('');
      setState('idle');
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`underline underline-offset-4 hover:text-ink ${className}`}>
        🚩 {t.button}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={close}>
          <div role="dialog" aria-modal="true" aria-labelledby={`report-${videoId}`} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-[#2A1F17] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 id={`report-${videoId}`} className="m-0 text-[22px] font-semibold">🚩 {t.title}</h2>
              <button type="button" onClick={close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-[#FBF6F0]" aria-label={t.cancel}>✕</button>
            </div>
            {state === 'sent' ? (
              <p className="m-0 mt-4 rounded-2xl bg-[#E6F2E3] p-4 text-[15px] text-[#2F6B2A]" role="status">✓ {t.sent}</p>
            ) : (
              <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
                <p className="m-0 text-[15px] text-[#5E5248]">{t.intro}</p>
                <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
                  <legend className="sr-only">{t.reasonLabel}</legend>
                  {REASONS.map((r) => (
                    <label key={r} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#EAE2D9] px-3 py-2 text-[14.5px] has-[:checked]:border-[#5A4030] has-[:checked]:bg-[#F6E4D2]">
                      <input type="radio" name={`reason-${videoId}`} value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[#5A4030]" />
                      {t.reasons[r]}
                    </label>
                  ))}
                </fieldset>
                <label className="flex flex-col gap-1">
                  <span className="text-[13px] font-semibold text-[#5E5248]">{t.detailsLabel}</span>
                  <textarea className="field min-h-20 py-2" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
                </label>
                {!getUser() && (
                  <label className="flex flex-col gap-1">
                    <span className="text-[13px] font-semibold text-[#5E5248]">{t.emailLabel}</span>
                    <input type="email" className="field !min-h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                )}
                {state === 'failed' && <p className="m-0 text-[14px] font-semibold text-[#A33]" role="alert">{t.failed}</p>}
                {state === 'disabled' && <p className="m-0 text-[14px] text-[#5E5248]" role="alert">{t.disabled}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="btn btn-primary" disabled={!reason || state === 'busy'}>{t.send}</button>
                  <button type="button" className="btn btn-ghost" onClick={close}>{t.cancel}</button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
