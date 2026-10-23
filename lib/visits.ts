'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { getUser, serverUser, subscribeUser } from './account';

/**
 * Gemaakte reizen van de ingelogde reiziger, uit zijn boekingen (betaald, bevestigd, laatste dag voorbij).
 * Niemand kan dit zelf aanvinken: de database bepaalt het (my_done_trips). Zonder account of database: leeg.
 */
export type DoneTrip = {
  group_id: string;
  start_day: string;
  end_day: string;
  people: number;
  place_ids: string[];
  /** Testboeking (alleen zichtbaar voor beheerders). */
  test: boolean;
  rating: number | null;
  body: string | null;
};

/**
 * Voorbeeldmodus (alleen tijdens het ontwikkelen, met ?voorbeeld=1): twee verzonnen gemaakte reizen, zodat je kunt
 * zien hoe Mijn kaart, 'Gemaakte reizen' en recensies eruitzien zonder database. Op de echte site staat dit uit.
 */
export function isDemo() {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('voorbeeld') === '1') sessionStorage.setItem('kt-voorbeeld', '1');
    return sessionStorage.getItem('kt-voorbeeld') === '1';
  } catch {
    return false;
  }
}
const DEMO_USER = { id: 'voorbeeld', email: null, admin: false };
let demoTrips: DoneTrip[] = [
  {
    group_id: 'voorbeeld-1',
    start_day: '2026-07-04',
    end_day: '2026-07-15',
    people: 2,
    place_ids: ['tz-arusha', 'tz-tarangire', 'tz-ngorongoro', 'tz-serengeti', 'tz-zanzibar', 'tz-stonetown'],
    test: false,
    rating: null,
    body: null,
  },
  {
    group_id: 'voorbeeld-2',
    start_day: '2025-02-08',
    end_day: '2025-02-16',
    people: 4,
    place_ids: ['tz-kilimanjaro', 'tz-usambara', 'tz-mafia'],
    test: false,
    rating: 5,
    body: 'Voorbeeldtekst: zo ziet een recensie eruit. In het echt schrijft de reiziger hier zelf over zijn hele reis.',
  },
];

let cache: { user: string; trips: DoneTrip[] } | null = null;
const listeners = new Set<() => void>();

export async function loadDoneTrips(force = false): Promise<DoneTrip[]> {
  if (isDemo()) return demoTrips;
  const sb = supabase();
  const u = getUser();
  if (!sb || !u) return [];
  if (!force && cache?.user === u.id) return cache.trips;
  const { data, error } = await sb.rpc('my_done_trips');
  const trips = error ? [] : ((data as DoneTrip[]) ?? []);
  cache = { user: u.id, trips };
  listeners.forEach((l) => l());
  return trips;
}

/** Gemaakte reizen + of het laden klaar is. */
export function useDoneTrips() {
  const realUser = useSyncExternalStore(subscribeUser, getUser, serverUser);
  const demo = useSyncExternalStore(subscribeUser, isDemo, () => false);
  const user = demo ? DEMO_USER : realUser;
  const [trips, setTrips] = useState<DoneTrip[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    const run = () =>
      loadDoneTrips().then((t) => {
        if (!alive) return;
        setTrips(t);
        setLoaded(true);
      });
    void run();
    listeners.add(run);
    return () => {
      alive = false;
      listeners.delete(run);
    };
  }, [user?.id]);
  return { user, trips: user ? trips : [], loaded: !user || loaded };
}

/** Recensie van een gemaakte reis schrijven of aanpassen. */
export async function reviewTrip(groupId: string, rating: number, body: string) {
  if (isDemo()) {
    demoTrips = demoTrips.map((d) => (d.group_id === groupId ? { ...d, rating, body: body.trim() } : d));
    listeners.forEach((l) => l());
    return { error: null };
  }
  const sb = supabase();
  if (!sb) return { error: 'disabled' as const };
  const { error } = await sb.rpc('review_trip', { gid: groupId, p_rating: rating, p_body: body.trim() });
  if (error) return { error: 'failed' as const };
  await loadDoneTrips(true);
  return { error: null };
}

export type PublicReview = { id: number; rating: number; body: string; created_at: string; name: string | null; place_ids: string[]; start_day: string | null };

/** Openbare recensies van reizen waar deze plek in zat. */
export async function loadPlaceReviews(placeId: string): Promise<PublicReview[]> {
  if (isDemo())
    return demoTrips
      .filter((d) => d.rating && d.body && d.place_ids.includes(placeId))
      .map((d, i) => ({ id: i + 1, rating: d.rating!, body: d.body!, created_at: d.end_day, name: 'Voorbeeld-reiziger', place_ids: d.place_ids, start_day: d.start_day }));
  const sb = supabase();
  if (!sb) return [];
  const { data } = await sb.from('trip_reviews_public').select('*').contains('place_ids', [placeId]).order('created_at', { ascending: false }).limit(50);
  return (data as PublicReview[]) ?? [];
}

