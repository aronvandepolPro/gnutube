'use client';

import { useEffect, useState } from 'react';
import type { StayType, TripStay } from './data';
import { supabase } from './supabase';

/** Verblijf zoals beheer het invoert (tabel stays). */
export type DbStay = {
  id: string;
  place_id: string;
  name: string;
  type: StayType;
  price_from: number | null;
  currency: string;
  url: string | null;
  source: string;
  recommended: boolean;
  note: string | null;
  active: boolean;
};

let cache: Promise<DbStay[]> | null = null;
export function loadDbStays(fresh = false) {
  const sb = supabase();
  if (!sb) return Promise.resolve([] as DbStay[]);
  if (fresh || !cache)
    cache = Promise.resolve(sb.from('stays').select('*').order('name')).then(({ data }) => (data as DbStay[]) ?? []).catch(() => []);
  return cache;
}

/** Verblijven uit de database (alleen actieve voor bezoekers). Leeg zolang er geen database is. */
export function useDbStays(): DbStay[] {
  const [list, setList] = useState<DbStay[]>([]);
  useEffect(() => {
    let alive = true;
    loadDbStays().then((v) => alive && setList(v.filter((s) => s.active)));
    return () => {
      alive = false;
    };
  }, []);
  return list;
}

export const toTripStay = (s: DbStay): TripStay => ({
  id: `db-${s.id}`,
  name: s.name,
  type: s.type,
  priceFrom: s.price_from === null ? null : Number(s.price_from),
  currency: s.currency,
  recommended: s.recommended,
  rating: null,
  ratingSource: null,
  highlight: s.note,
  url: s.url,
});
