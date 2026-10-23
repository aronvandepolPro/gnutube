'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';
import { getUser, LOGIN_NEEDED, serverUser, subscribeUser } from '@/lib/account';
import { accountsEnabled } from '@/lib/supabase';
import { deleteComment, flagComment, getDisplayName, loadComments, postComment, setDisplayName, type Comment } from '@/lib/social';

type Props = { videoId: string; title: string; t: Dictionary['social']; locale: Locale; onClose: () => void };

/** Reacties bij een video, van bezoekers van Gnutube. Reageren kan met een account; melden kan altijd. */
export function CommentsSheet({ videoId, title, t, locale, onClose }: Props) {
  const user = useSyncExternalStore(subscribeUser, getUser, serverUser);
  const [list, setList] = useState<Comment[] | null>(null);
  const [body, setBody] = useState('');
  const [name, setName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    loadComments(videoId).then((c) => alive && setList(c));
    return () => {
      alive = false;
    };
  }, [videoId]);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    getDisplayName().then((n) => alive && setName(n ?? ''));
    return () => {
      alive = false;
    };
  }, [user]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return window.dispatchEvent(new Event(LOGIN_NEEDED));
    if (!body.trim()) return;
    setBusy(true);
    if (!name) {
      if (nameInput.trim().length < 2) {
        setBusy(false);
        return setMsg(t.nameRequired);
      }
      const r = await setDisplayName(nameInput);
      if (r.error) {
        setBusy(false);
        return setMsg(t.failed);
      }
      setName(nameInput.trim());
    }
    const r = await postComment(videoId, body);
    setBusy(false);
    if (r.error) return setMsg(t.failed);
    setBody('');
    setMsg('');
    setList(await loadComments(videoId));
  };
  const remove = async (c: Comment) => {
    if (!window.confirm(t.deleteConfirm)) return;
    await deleteComment(videoId, c.id);
    setList(await loadComments(videoId));
  };
  const flag = async (c: Comment) => {
    const reason = window.prompt(t.flagPrompt) ?? '';
    const r = await flagComment(c.id, reason);
    setMsg(r.error ? t.failed : t.flagged);
  };
  const ago = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-end justify-end bg-black/50 sm:items-stretch" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="comments-title"
        onClick={(e) => e.stopPropagation()}
        className="kt-comments flex max-h-[85dvh] w-full flex-col rounded-t-[24px] bg-white text-[#2A1F17] shadow-2xl sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-[24px]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#EAE2D9] px-5 py-4">
          <h2 id="comments-title" className="m-0 text-[18px] font-semibold">💬 {format(t.title, { place: title }, locale)}</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#FBF6F0]" aria-label={t.close}>✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {!accountsEnabled ? (
            <p className="m-0 text-[14px] text-[#7D7064]">{t.disabled}</p>
          ) : list === null ? (
            <p className="m-0 text-[14px] text-[#7D7064]">…</p>
          ) : list.length === 0 ? (
            <p className="m-0 py-6 text-center text-[15px] text-[#7D7064]">{t.empty}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {list.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F6E4D2] text-[14px] font-bold uppercase text-[#5A4030]" aria-hidden="true">{c.name.slice(0, 1)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[13px] text-[#7D7064]"><strong className="text-[#2A1F17]">{c.name}</strong> · {ago(c.created_at)}</p>
                    <p className="m-0 mt-0.5 whitespace-pre-wrap break-words text-[15px]">{c.body}</p>
                    <div className="mt-1 flex gap-3 text-[12px] text-[#7D7064]">
                      {c.mine ? (
                        <button type="button" className="underline underline-offset-2" onClick={() => remove(c)}>{t.delete}</button>
                      ) : (
                        <button type="button" className="underline underline-offset-2" onClick={() => flag(c)}>🚩 {t.flag}</button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {accountsEnabled && (
          <form onSubmit={send} className="flex flex-col gap-2 border-t border-[#EAE2D9] p-4">
            {msg && <p className="m-0 text-[13px] font-semibold text-[#5A4030]" role="status">{msg}</p>}
            {user && name === '' && (
              <input className="field !min-h-10" placeholder={t.namePlaceholder} value={nameInput} onChange={(e) => setNameInput(e.target.value)} maxLength={40} aria-label={t.namePlaceholder} />
            )}
            <div className="flex gap-2">
              <textarea
                className="field min-h-11 flex-1 resize-none py-2.5"
                rows={1}
                placeholder={user ? t.placeholder : t.loginToComment}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => !user && window.dispatchEvent(new Event(LOGIN_NEEDED))}
                maxLength={500}
                aria-label={t.placeholder}
              />
              <button type="submit" disabled={busy || (!!user && !body.trim())} className="btn btn-primary !min-h-11 !px-4 disabled:opacity-50">{t.send}</button>
            </div>
            <p className="m-0 text-[11.5px] text-[#7D7064]">{t.rules}</p>
          </form>
        )}
      </aside>
    </div>,
    document.body,
  );
}
