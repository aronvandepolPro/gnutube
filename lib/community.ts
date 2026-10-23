'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { getUser } from './account';
import type { Video } from './videos';

/**
 * Wat reizigers en beheer aan de video's veranderen, live uit de database:
 *  - weggehaalde video's (na een melding) worden overal verborgen;
 *  - goedgekeurde inzendingen van reizigers komen erbij.
 * Zonder database: niets verborgen en niets extra.
 */

type Community = { hidden: Set<string>; extra: Video[] };
const EMPTY: Community = { hidden: new Set(), extra: [] };
let cache: Promise<Community> | null = null;

async function load(): Promise<Community> {
  const sb = supabase();
  if (!sb) return EMPTY;
  const [hidden, approved] = await Promise.all([
    sb.from('hidden_videos').select('video_id'),
    sb.from('approved_videos').select('place_id, tiktok_id, author, url'),
  ]);
  return {
    hidden: new Set((hidden.data ?? []).map((r: { video_id: string }) => r.video_id)),
    extra: (approved.data ?? []).map((r: { place_id: string; tiktok_id: string; author: string | null; url: string }) => ({
      placeId: r.place_id,
      tiktokId: r.tiktok_id,
      url: r.url,
      author: r.author ?? '',
      authorName: r.author ?? '',
      title: '',
      checked: true,
      traveller: true,
    })),
  };
}

/** Video's van de site plus goedgekeurde inzendingen, zonder weggehaalde video's. */
export function useCommunityVideos(base: Video[]): Video[] {
  const [c, setC] = useState<Community>(EMPTY);
  useEffect(() => {
    let alive = true;
    cache ??= load().catch(() => EMPTY);
    cache.then((v) => alive && setC(v));
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => {
    if (c === EMPTY) return base;
    const known = new Set(base.map((v) => v.tiktokId));
    return [...base, ...c.extra.filter((v) => !known.has(v.tiktokId))].filter((v) => !c.hidden.has(v.tiktokId));
  }, [base, c]);
}

export type ReportReason = 'illegal' | 'privacy' | 'copyright' | 'animals' | 'hate' | 'spam' | 'wrong_place' | 'other';

export async function sendReport(r: { videoId: string; placeId: string; reason: ReportReason; details: string; email: string }) {
  const sb = supabase();
  if (!sb) return { error: 'disabled' as const };
  const u = getUser();
  const { error } = await sb.from('reports').insert({
    video_id: r.videoId,
    place_id: r.placeId,
    reason: r.reason,
    details: r.details.trim() || null,
    reporter_id: u?.id ?? null,
    reporter_email: r.email.trim() || u?.email || null,
  });
  return { error: error ? ('failed' as const) : null };
}

export async function sendSubmission(s: { placeId: string; url: string; tiktokId: string | null; author: string | null; visited: string; note: string }) {
  const sb = supabase();
  const u = getUser();
  if (!sb) return { error: 'disabled' as const };
  if (!u) return { error: 'login' as const };
  const { error } = await sb.from('submissions').insert({
    user_id: u.id,
    place_id: s.placeId,
    url: s.url.trim(),
    tiktok_id: s.tiktokId,
    author: s.author,
    visited: s.visited || null,
    note: s.note.trim() || null,
  });
  return { error: error ? ('failed' as const) : null };
}
