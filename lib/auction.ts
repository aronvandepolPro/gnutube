'use client';

import { useEffect, useState } from 'react';

/** De route van een veiling (uit de momentopname van de reis): "Serengeti → Zanzibar". */
export const tripRoute = (trip: { stops?: { name?: string }[] } | null | undefined) =>
  (trip?.stops ?? []).map((s) => s.name).filter(Boolean).join(' → ');

/** De huidige tijd, elke minuut bijgewerkt (voor het aftellen). Op de server 0. */
export function useNow() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return now;
}

/** Resterende tijd als korte tekst: "2 d 5 u", "5 u 12 m", "12 m". */
export function timeLeft(ms: number, t: { leftDays: string; leftHours: string; leftMinutes: string }) {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d) return t.leftDays.replace('{d}', String(d)).replace('{h}', String(h));
  if (h) return t.leftHours.replace('{h}', String(h)).replace('{m}', String(m % 60));
  return t.leftMinutes.replace('{m}', String(Math.max(1, m)));
}
