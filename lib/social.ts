'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getUser } from './account';

/**
 * Eigen reacties en een eigen deelteller bij video's (los van TikTok). Zonder database: alles op 0 en uit.
 */
export type Comment = { id: number; video_id: string; body: string; created_at: string; name: string; mine: boolean };
type Counts = { shares: Record<string, number>; comments: Record<string, number> };
const EMPTY: Counts = { shares: {}, comments: {} };

let counts: Counts = EMPTY;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function loadCounts() {
  const sb = supabase();
  if (!sb) return Promise.resolve();
  loading ??= Promise.all([sb.from('video_shares').select('video_id, count'), sb.from('video_comment_counts').select('video_id, n')])
    .then(([s, c]) => {
      counts = {
        shares: Object.fromEntries(((s.data as { video_id: string; count: number }[]) ?? []).map((r) => [r.video_id, r.count])),
        comments: Object.fromEntries(((c.data as { video_id: string; n: number }[]) ?? []).map((r) => [r.video_id, r.n])),
      };
      emit();
    })
    .catch(() => {});
  return loading;
}

/** Aantal keer gedeeld en aantal reacties per video. */
export function useSocialCounts(): Counts {
  const [c, setC] = useState<Counts>(counts);
  useEffect(() => {
    const on = () => setC(counts);
    listeners.add(on);
    void loadCounts();
    return () => {
      listeners.delete(on);
    };
  }, []);
  return c;
}

/** Eén keer delen tellen (na kopiëren of delen via WhatsApp/e-mail). */
export async function countShare(videoId: string) {
  const sb = supabase();
  if (!sb) return;
  const { data } = await sb.rpc('share_video', { v: videoId });
  if (typeof data === 'number') {
    counts = { ...counts, shares: { ...counts.shares, [videoId]: data } };
    emit();
  }
}

export async function loadComments(videoId: string): Promise<Comment[]> {
  const sb = supabase();
  if (!sb) return [];
  const { data } = await sb.from('video_comments_public').select('*').eq('video_id', videoId).order('created_at', { ascending: false }).limit(200);
  return (data as Comment[]) ?? [];
}

export async function postComment(videoId: string, body: string) {
  const sb = supabase();
  const u = getUser();
  if (!sb || !u) return { error: 'login' as const };
  const { error } = await sb.from('video_comments').insert({ video_id: videoId, user_id: u.id, body: body.trim() });
  if (error) return { error: 'failed' as const };
  counts = { ...counts, comments: { ...counts.comments, [videoId]: (counts.comments[videoId] ?? 0) + 1 } };
  emit();
  return { error: null };
}

export async function deleteComment(videoId: string, id: number) {
  const sb = supabase();
  if (!sb) return;
  const { error } = await sb.from('video_comments').delete().eq('id', id);
  if (!error) {
    counts = { ...counts, comments: { ...counts.comments, [videoId]: Math.max(0, (counts.comments[videoId] ?? 1) - 1) } };
    emit();
  }
}

export async function flagComment(id: number, reason: string) {
  const sb = supabase();
  if (!sb) return { error: 'disabled' as const };
  const { error } = await sb.from('comment_flags').insert({ comment_id: id, reporter_id: getUser()?.id ?? null, reason: reason || null });
  return { error: error ? ('failed' as const) : null };
}

export async function getDisplayName(): Promise<string | null> {
  const sb = supabase();
  const u = getUser();
  if (!sb || !u) return null;
  const { data } = await sb.from('profiles').select('display_name').eq('user_id', u.id).maybeSingle<{ display_name: string }>();
  return data?.display_name ?? null;
}
export async function setDisplayName(name: string) {
  const sb = supabase();
  const u = getUser();
  if (!sb || !u) return { error: 'login' as const };
  const { error } = await sb.from('profiles').upsert({ user_id: u.id, display_name: name.trim(), updated_at: new Date().toISOString() });
  return { error: error ? ('failed' as const) : null };
}

