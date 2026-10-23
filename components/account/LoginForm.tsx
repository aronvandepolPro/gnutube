'use client';

import { useEffect, useState } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { loginProviders, sendLoginEmail, signInWithProvider, verifyCode } from '@/lib/account';
import { isDemo } from '@/lib/visits';
import { accountsEnabled } from '@/lib/supabase';

type Props = {
  t: Dictionary['account'];
  locale: string;
  back: string;
  onDone?: () => void;
};

/**
 * Inloggen zonder wachtwoord, in twee stappen: ① e-mailadres → ② link of code uit de mail.
 * Staat inloggen nog niet aan (geen database), dan is het formulier wel te zien, met een melding.
 */
export function LoginForm({ t, locale, back, onDone }: Props) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  /** 'Doorgaan met Google/Apple' alleen als die in Supabase aanstaan (of in de voorbeeldmodus, om het te bekijken). */
  const [social, setSocial] = useState({ google: false, apple: false });
  useEffect(() => {
    let alive = true;
    loginProviders().then((p) => alive && setSocial(isDemo() ? { google: true, apple: true } : p));
    return () => {
      alive = false;
    };
  }, []);
  const withProvider = async (provider: 'google' | 'apple') => {
    if (!accountsEnabled) return setError(t.disabled);
    setBusy(true);
    setError('');
    const r = await signInWithProvider(provider, locale, back);
    // Bij succes gaat de browser naar Google/Apple; alleen bij een fout komen we hier terug
    if (r.error) {
      setBusy(false);
      setError(provider === 'apple' ? t.appleFailed : t.googleFailed);
    }
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t.emailInvalid);
    if (!accountsEnabled) return setError(t.disabled);
    setBusy(true);
    setError('');
    const r = await sendLoginEmail(email.trim(), locale, back);
    setBusy(false);
    if (r.error) setError(r.error === 'rate' ? t.rateLimited : t.failed);
    else setStep('code');
  };
  const resend = async () => {
    setResent(false);
    await send();
    setResent(true);
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const r = await verifyCode(email.trim(), code.replace(/\s/g, ''));
    setBusy(false);
    if (r.error) setError(t.codeFailed);
    else onDone?.();
  };

  // Stappen bovenaan: waar ben je
  const steps = (
    <ol className="m-0 flex list-none items-center gap-2 p-0 text-[13px] font-semibold" aria-label={t.stepsLabel}>
      {[t.stepEmail, t.stepCode].map((label, i) => {
        const active = (step === 'email' ? 0 : 1) === i;
        const done = step === 'code' && i === 0;
        return (
          <li key={i} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            {i > 0 && <span className="h-px w-6 bg-rule" aria-hidden="true" />}
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-[12px] ${
                done ? 'bg-[#2F6B2A] text-white' : active ? 'bg-brand-dark text-white' : 'bg-sand text-subtle'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={active ? 'text-ink' : 'text-subtle'}>{label}</span>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="flex flex-col gap-4">
      {steps}
      {!accountsEnabled && <p className="m-0 rounded-2xl bg-warning px-4 py-3 text-[14px] text-warning-ink">{t.disabled}</p>}
      {step === 'email' && (social.google || social.apple) && (
        <>
          {social.apple && (
            <button
              type="button"
              onClick={() => withProvider('apple')}
              disabled={busy}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-black px-5 text-[16px] font-semibold text-white shadow-sm transition-colors hover:bg-[#222] disabled:opacity-60"
            >
              <svg width="18" height="20" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
                <path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-165-40c-77 0-104 41-166 41s-106-57-156-127C44 791 0 669 0 553c0-187 121-286 241-286 64 0 117 42 157 42 38 0 98-45 171-45 28 0 128 3 194 77zM554 159c30-36 51-85 51-135 0-7-1-14-2-20-48 2-106 33-141 73-27 31-53 80-53 131 0 8 1 15 2 18 3 1 9 1 14 1 43 0 97-29 129-68z" />
              </svg>
              {t.apple}
            </button>
          )}
          {social.google && (
            <button
              type="button"
              onClick={() => withProvider('google')}
              disabled={busy}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-[#DADCE0] bg-white px-5 text-[16px] font-semibold text-[#1F1F1F] shadow-sm transition-colors hover:bg-[#F8F9FA] disabled:opacity-60"
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              {t.google}
            </button>
          )}
          <div className="flex items-center gap-3 text-[13px] text-subtle">
            <span className="h-px flex-1 bg-rule" aria-hidden="true" />
            {t.orEmail}
            <span className="h-px flex-1 bg-rule" aria-hidden="true" />
          </div>
        </>
      )}
      {step === 'email' ? (
        <form onSubmit={send} className="flex flex-col gap-3" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">{t.emailLabel}</span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t.emailPlaceholder}
              className="field !min-h-13 text-[17px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="m-0 text-[14px] font-semibold text-[#A33]" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary !min-h-12 !text-[16px]" disabled={busy}>
            {busy ? t.sending : `✉️ ${t.send}`}
          </button>
          <p className="m-0 text-[13px] text-subtle">🔑 {t.noPassword}</p>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-3" noValidate>
          <p className="m-0 rounded-2xl bg-[#E6F2E3] p-3 text-[14px] text-[#2F6B2A]" role="status">
            ✉️ {t.sent.replace('{email}', email.trim())}
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">{t.codeLabel}</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={10}
              placeholder="••••••"
              className="field !min-h-14 text-center text-[24px] font-semibold tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          {error && (
            <p className="m-0 text-[14px] font-semibold text-[#A33]" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary !min-h-12 !text-[16px]" disabled={busy || code.replace(/\s/g, '').length < 6}>
            {t.verify}
          </button>
          <div className="flex flex-col gap-1 rounded-2xl bg-sand p-3 text-[13px] text-muted">
            <span>
              <strong className="text-ink">{t.notReceived}</strong> {t.checkSpam}
            </span>
            <span className="flex flex-wrap gap-x-4">
              <button type="button" className="underline underline-offset-4 hover:text-ink" onClick={resend} disabled={busy}>
                {t.resend}
              </button>
              <button
                type="button"
                className="underline underline-offset-4 hover:text-ink"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError('');
                  setResent(false);
                }}
              >
                {t.otherEmail}
              </button>
            </span>
            {resent && !error && (
              <span className="text-[#2F6B2A]" role="status">
                ✓ {t.resent}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
