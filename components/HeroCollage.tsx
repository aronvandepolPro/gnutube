'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type CollagePhoto = { id: string; name: string; src: string; pos?: string; by?: string };

/** Om de zoveel milliseconden wisselt één kaart (om de beurt links, midden, rechts). */
const INTERVAL = 3200;
/** Duur van het overvloeien. */
const FADE = 700;

const SLOTS = [
  { cls: 'left-0 top-6 h-[220px] w-[46%] -rotate-3 hover:-rotate-1', label: '' },
  { cls: 'left-[30%] top-0 z-10 h-[260px] w-[44%] rotate-2 hover:rotate-0', label: '' },
  { cls: 'right-0 top-10 h-[230px] w-[40%] rotate-[4deg] hover:rotate-[2deg]', label: 'text-right' },
];

/**
 * Drie foto's van echte plekken als collage. Om de beurt wisselt één kaart naar de volgende plek, zodat na een
 * tijdje alle plekken met een foto voorbij zijn gekomen; daarna begint de rij opnieuw (in een nieuwe volgorde).
 * - Stopt zolang je met de muis op de collage staat, als het tabblad niet zichtbaar is, en bij 'minder beweging'.
 * - Elke kaart is een link naar de plek. De volgende foto wordt vooraf geladen, zodat hij meteen klaarstaat.
 */
export function HeroCollage({ photos, hrefBase }: { photos: CollagePhoto[]; hrefBase: string }) {
  // Begin altijd met de eerste drie (zelfde als de server); daarna wisselt er telkens één kaart
  const [shown, setShown] = useState([0, 1, 2]);
  /** Vorige foto per kaart, die nog even zichtbaar blijft tijdens het overvloeien. */
  const [prev, setPrev] = useState<(number | null)[]>([null, null, null]);
  /** De foto die hierna komt (wordt alvast geladen). */
  const [upcoming, setUpcoming] = useState<number | null>(null);
  const paused = useRef(false);

  useEffect(() => {
    if (photos.length <= 3) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const shuffle = (a: number[]) => {
      const r = [...a];
      for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    };
    // Eerst alle andere plekken in willekeurige volgorde; is de rij op, dan opnieuw schudden
    let cur = [0, 1, 2];
    let queue = shuffle(photos.map((_, i) => i).slice(3));
    let turn = 0;
    const take = () => {
      if (!queue.length) queue = shuffle(photos.map((_, i) => i).filter((x) => !cur.includes(x)));
      return queue.shift() as number;
    };
    let ahead = take();
    const t0 = window.setTimeout(() => setUpcoming(ahead), 0);
    const timers: number[] = [];

    const tick = () => {
      if (paused.current || document.hidden || reduce.matches) return;
      const slot = turn++ % 3;
      const old = cur[slot];
      cur = cur.map((x, i) => (i === slot ? ahead : x));
      ahead = take();
      setPrev((p) => p.map((x, i) => (i === slot ? old : x)));
      setShown(cur);
      setUpcoming(ahead);
      timers.push(window.setTimeout(() => setPrev((p) => p.map((x, i) => (i === slot ? null : x))), FADE + 50));
    };
    const id = window.setInterval(tick, INTERVAL);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
      timers.forEach((x) => window.clearTimeout(x));
    };
  }, [photos]);

  const next = upcoming !== null ? photos[upcoming] : null;

  return (
    <div
      className="relative hidden h-[300px] lg:block"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      {SLOTS.map((slot, i) => {
        const p = photos[shown[i]];
        const old = prev[i] !== null ? photos[prev[i] as number] : null;
        if (!p) return null;
        return (
          <Link
            key={i}
            href={`${hrefBase}/${p.id}`}
            className={`group absolute overflow-hidden rounded-2xl border-4 border-white bg-[#2A1F17] shadow-xl transition-transform duration-300 hover:z-20 hover:scale-[1.04] ${slot.cls}`}
          >
            {old && <Image src={old.src} alt="" fill sizes="320px" className="object-cover" style={{ objectPosition: old.pos ?? '50% 50%' }} />}
            <Image
              key={p.id}
              src={p.src}
              alt=""
              fill
              sizes="320px"
              priority={shown[i] < 3}
              className={`${old ? 'kt-collage-in ' : ''}object-cover transition-transform duration-500 group-hover:scale-105`}
              style={{ objectPosition: p.pos ?? '50% 50%', animationDuration: `${FADE}ms` }}
            />
            <span className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-[15px] font-semibold text-white ${slot.label}`}>
              {p.name}
            </span>
            {p.by && (
              <span className={`pointer-events-none absolute top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm ${i === 0 ? 'left-2' : 'right-2'}`}>
                {p.by}
              </span>
            )}
          </Link>
        );
      })}
      {next && (
        <div className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0" aria-hidden="true">
          <Image src={next.src} alt="" width={320} height={240} sizes="320px" />
        </div>
      )}
    </div>
  );
}
