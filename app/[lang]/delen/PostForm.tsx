'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { getUser, LOGIN_NEEDED, serverUser, subscribeUser } from '@/lib/account';
import { sendSubmission } from '@/lib/community';
import { accountsEnabled } from '@/lib/supabase';

type Props = { places: { id: string; name: string }[]; t: Dictionary['post'] };

/** Herkent een link naar één TikTok-video: tiktok.com/@naam/video/123… of een korte link (vm./vt.tiktok.com/…). */
export function parseTikTok(url: string): { author: string | null; id: string | null } | null {
  const u = url.trim();
  const full = u.match(/^https?:\/\/(?:www\.|m\.)?tiktok\.com\/@([\w.]+)\/video\/(\d{8,})/i);
  if (full) return { author: full[1], id: full[2] };
  if (/^https?:\/\/(?:vm|vt)\.tiktok\.com\/[\w-]+\/?$/i.test(u)) return { author: null, id: null };
  return null;
}

/**
 * Formulier om een eigen reisvideo in te sturen. Versturen kan als je bent ingelogd; de inzending komt bij beheer
 * en verschijnt pas na goedkeuring.
 */
export function PostForm({ places, t }: Props) {
  const params = useSearchParams();
  const [place, setPlace] = useState(() => {
    const id = params.get('plek');
    return places.some((p) => p.id === id) ? id! : '';
  });
  const [url, setUrl] = useState('');
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [checks, setChecks] = useState({ own: false, people: false, age: false, rules: false });
  const user = useSyncExternalStore(subscribeUser, getUser, serverUser);
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'failed'>('idle');

  const link = url.trim() ? parseTikTok(url) : null;
  const linkError = url.trim() !== '' && !link;
  const ready = !!place && !!link && Object.values(checks).every(Boolean);
  const placeName = places.find((p) => p.id === place)?.name;

  const check = (key: keyof typeof checks, label: string) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-rule bg-white p-3 text-[15px] has-[:checked]:border-brand-dark has-[:checked]:bg-brand-soft">
      <input
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 accent-[#5A4030]"
        checked={checks[key]}
        onChange={(e) => setChecks({ ...checks, [key]: e.target.checked })}
      />
      <span>{label}</span>
    </label>
  );

  return (
    state === 'sent' ? (
      <div className="panel flex flex-col items-start gap-3 p-6 sm:p-8" role="status">
        <p className="m-0 text-[24px] font-semibold text-ink">🎉 {t.sentTitle}</p>
        <p className="m-0 text-[16px] text-muted">{t.sentText}</p>
      </div>
    ) : (
    <form
      className="panel flex flex-col gap-6 p-6 sm:p-8"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready || !link) return;
        if (!user) {
          window.dispatchEvent(new Event(LOGIN_NEEDED));
          return;
        }
        setState('busy');
        const r = await sendSubmission({ placeId: place, url, tiktokId: link.id, author: link.author, visited: when, note });
        setState(r.error ? 'failed' : 'sent');
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[24px] font-semibold text-ink">🎬 {placeName ? t.formTitlePlace.replace('{place}', placeName) : t.formTitle}</h2>
        <p className="m-0 text-[15px] text-muted">{t.formSub}</p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">1 · {t.placeLabel}</span>
        <select className="field cursor-pointer !min-h-12" value={place} onChange={(e) => setPlace(e.target.value)} required>
          <option value="">{t.placePick}</option>
          {places.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">2 · {t.linkLabel}</span>
        <input
          type="url"
          inputMode="url"
          className="field !min-h-12"
          placeholder="https://www.tiktok.com/@jouwnaam/video/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-invalid={linkError}
          aria-describedby="link-help"
        />
        <span id="link-help" className={`text-[13px] ${linkError ? 'font-semibold text-[#A33]' : link ? 'text-[#2F6B2A]' : 'text-subtle'}`}>
          {linkError ? t.linkError : link ? (link.author ? t.linkOkBy.replace('{handle}', link.author) : t.linkOk) : t.linkHelp}
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">3 · {t.whenLabel}</span>
          <input type="month" className="field !min-h-12" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="eyebrow">4 · {t.noteLabel}</span>
          <textarea
            className="field min-h-24 py-3"
            maxLength={280}
            placeholder={t.notePlaceholder}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <span className="text-right text-[12px] text-subtle">{note.length}/280</span>
        </label>
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="eyebrow mb-2">5 · {t.checksLabel}</legend>
        {check('own', t.checkOwn)}
        {check('people', t.checkPeople)}
        {check('age', t.checkAge)}
        {check('rules', t.checkRules)}
      </fieldset>

      <div className="flex flex-col gap-2 border-t border-rule pt-5">
        {accountsEnabled ? (
          <>
            <button type="submit" disabled={!ready || state === 'busy'} className="btn btn-primary self-start disabled:cursor-not-allowed disabled:opacity-60">
              {user ? t.submit : `🔐 ${t.submitLogin}`}
            </button>
            {state === 'failed' && <p className="m-0 text-[14px] font-semibold text-[#A33]" role="alert">{t.failed}</p>}
            <p className="m-0 text-[13px] text-subtle">{t.reviewNote}</p>
          </>
        ) : (
          <>
            <button type="submit" disabled className="btn btn-primary cursor-not-allowed self-start opacity-60">
              {ready ? `✓ ${t.submitReady}` : t.submit}
            </button>
            <p className="m-0 text-[13px] text-subtle">{t.submitSoon}</p>
          </>
        )}
      </div>
    </form>
    )
  );
}
