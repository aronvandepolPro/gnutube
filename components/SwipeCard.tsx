'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import './swipe.css';

export type Fling = { dir: 'left' | 'right'; n: number } | null;

type Props = {
  children: ReactNode;
  /** Naar rechts geveegd (of de knop): toevoegen. */
  onRight: () => void;
  /** Naar links geveegd (of de knop): niet voor mij. */
  onLeft: () => void;
  /** Dubbel getikt: leuk. */
  onLike: () => void;
  /** Van buitenaf (knoppen of toetsen) laten wegvliegen. */
  fling?: Fling;
  /** Hartje laten opploppen (na een like via knop of toets). */
  heartKey?: number;
  labels: { add: string; nope: string };
  className?: string;
};

/** Zoveel pixels slepen telt als keuze. */
const THRESHOLD = 60;
/** Een snelle veeg (pixels per milliseconde) telt al vanaf FLICK_MIN pixels. */
const FLICK_SPEED = 0.45;
const FLICK_MIN = 24;

/**
 * Trackpad-vegen lopen na: nog een tijd komen er wheel-events binnen (ook kleine verticale), terwijl de feed al bij de
 * volgende video is. Eén veeg = één doorlopende stroom events. Zit er in die stroom al een keuze, dan telt de rest
 * niet meer: geen tweede keuze en ook geen scrollen (de feed klikt per video vast, dus elk stukje omlaag zou naar
 * de volgende springen). Een nieuwe stroom begint pas na een korte pauze, dus bij een nieuwe aanraking.
 */
const STREAM_GAP = 250;
/**
 * Naloop wordt steeds zwakker. Wordt de zijwaartse beweging ineens weer flink sterker, dan begint de gebruiker
 * een nieuwe veeg (ook zonder pauze): die telt meteen, zodat je niet hoeft te wachten tot de naloop stopt.
 */
const NEW_GESTURE_RISE = 1.6;
const NEW_GESTURE_MIN = 6;
const stream = { last: 0, swiped: false, lastAbs: 0, gen: 0 };
let pageGuard = false;
/** Eén keer per pagina: elke wheel-beweging bijhouden, en na een keuze de rest van die stroom tegenhouden. */
function guardPage() {
  if (pageGuard || typeof window === 'undefined') return;
  pageGuard = true;
  window.addEventListener(
    'wheel',
    (e) => {
      const now = performance.now();
      const abs = Math.abs(e.deltaX);
      const sideways = abs > Math.abs(e.deltaY);
      if (now - stream.last >= STREAM_GAP) {
        stream.swiped = false;
        stream.gen++;
      } else if (stream.swiped && sideways && abs >= NEW_GESTURE_MIN && abs > stream.lastAbs * NEW_GESTURE_RISE) {
        // Nieuwe veeg midden in de naloop van de vorige
        stream.swiped = false;
        stream.gen++;
      }
      stream.last = now;
      if (sideways) stream.lastAbs = abs;
      if (stream.swiped) e.preventDefault();
    },
    { capture: true, passive: false },
  );
}

/**
 * Veegkaart zoals bij Tinder, over een video heen.
 * - Een onzichtbare laag vangt het vegen op; de onderste strook blijft vrij voor de knoppen van de TikTok-speler.
 * - Je ziet meteen wat er gebeurt: de kaart kantelt, kleurt groen (in je reis) of rood (niet voor mij), en een groot
 *   ✓ of ✕ groeit mee. Zodra het genoeg is, tikt de telefoon even (trillen) en springt het teken op.
 * - Een korte, snelle veeg is genoeg; langzaam slepen telt vanaf THRESHOLD pixels.
 * - Verticaal scrollen laat de laag aan de browser (touch-action: pan-y); trackpad: twee vingers opzij.
 * - Dubbel tikken = leuk (met een hartje).
 */
export function SwipeCard({ children, onRight, onLeft, onLike, fling, heartKey = 0, labels, className = '' }: Props) {
  const card = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const addStamp = useRef<HTMLSpanElement>(null);
  const nopeStamp = useRef<HTMLSpanElement>(null);
  const tintAdd = useRef<HTMLDivElement>(null);
  const tintNope = useRef<HTMLDivElement>(null);
  const badgeAdd = useRef<HTMLSpanElement>(null);
  const badgeNope = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; horiz: boolean | null; lastX: number; lastT: number; vx: number } | null>(null);
  const armed = useRef<'left' | 'right' | null>(null);
  const lastTap = useRef(0);
  /** Vegen met twee vingers op een trackpad (horizontaal scrollen). */
  const wheel = useRef<{ dx: number; timer: number; done: boolean; gen: number }>({ dx: 0, timer: 0, done: false, gen: -1 });
  const [hearts, setHearts] = useState<number[]>([]);
  const popHeart = (id: number) => {
    setHearts((h) => [...h, id]);
    window.setTimeout(() => setHearts((l) => l.filter((x) => x !== id)), 900);
  };

  /** Kaart volgt de vinger; kleur, stempel en teken groeien mee. */
  const setPos = (dx: number) => {
    const el = card.current;
    if (!el) return;
    el.style.transform = dx ? `translateX(${dx}px) rotate(${dx / 16}deg)` : '';
    const r = Math.max(0, Math.min(1, dx / THRESHOLD));
    const l = Math.max(0, Math.min(1, -dx / THRESHOLD));
    if (addStamp.current) addStamp.current.style.opacity = String(r);
    if (nopeStamp.current) nopeStamp.current.style.opacity = String(l);
    if (tintAdd.current) tintAdd.current.style.opacity = String(r * 0.55);
    if (tintNope.current) tintNope.current.style.opacity = String(l * 0.55);
    if (badgeAdd.current) {
      badgeAdd.current.style.opacity = String(r);
      badgeAdd.current.style.transform = `translate(-50%, -50%) scale(${0.5 + r * 0.6})`;
    }
    if (badgeNope.current) {
      badgeNope.current.style.opacity = String(l);
      badgeNope.current.style.transform = `translate(-50%, -50%) scale(${0.5 + l * 0.6})`;
    }
    // Over de drempel: kort trillen (telefoon) en het teken laten opspringen
    const now = r >= 1 ? 'right' : l >= 1 ? 'left' : null;
    if (now !== armed.current) {
      armed.current = now;
      el.classList.toggle('is-armed', now !== null);
      if (now && 'vibrate' in navigator && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(12);
    }
  };

  const leave = (dir: 'left' | 'right') => {
    const el = card.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const done = () => {
      // Terugzetten (de feed scrollt intussen door naar de volgende)
      el.classList.remove('is-leaving');
      el.style.opacity = '';
      setPos(0);
    };
    if (dir === 'right') onRight();
    else onLeft();
    if (reduce) return done();
    // Teken vol in beeld tijdens het wegvliegen
    setPos(dir === 'right' ? THRESHOLD * 1.5 : -THRESHOLD * 1.5);
    el.classList.remove('is-settling');
    el.classList.add('is-leaving');
    el.style.transform = `translateX(${dir === 'right' ? 140 : -140}%) rotate(${dir === 'right' ? 22 : -22}deg)`;
    el.style.opacity = '0';
    window.setTimeout(done, 380);
  };

  // Wegvliegen via knoppen of toetsen (alleen bij een nieuwe opdracht, niet bij het verschijnen van de kaart)
  const flingSeen = useRef(fling?.n);
  useEffect(() => {
    if (!fling || fling.n === flingSeen.current) return;
    flingSeen.current = fling.n;
    leave(fling.dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fling?.n]);

  // Hartje na een like van buitenaf
  useEffect(() => {
    if (!heartKey) return;
    const t = window.setTimeout(() => popHeart(heartKey), 0);
    return () => window.clearTimeout(t);
  }, [heartKey]);

  // Trackpad: twee vingers naar links of rechts = vegen. Verticaal scrollen blijft gewoon scrollen.
  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    guardPage();
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) {
        // Midden in een zijwaartse veeg: kleine verticale uitschieters niet laten scrollen
        if (wheel.current.dx !== 0) e.preventDefault();
        return;
      }
      e.preventDefault();
      // Naloop van een veeg die al een keuze maakte (ook op een andere kaart): negeren
      if (stream.swiped) return;
      const w = wheel.current;
      window.clearTimeout(w.timer);
      // Nieuwe veeg (nieuwe stroom): opnieuw beginnen met tellen
      if (w.gen !== stream.gen) {
        w.gen = stream.gen;
        w.dx = 0;
        w.done = false;
      }
      if (!w.done) {
        w.dx -= e.deltaX;
        card.current?.classList.remove('is-settling');
        setPos(w.dx);
        if (Math.abs(w.dx) > THRESHOLD) {
          w.done = true;
          stream.swiped = true;
          leave(w.dx > 0 ? 'right' : 'left');
        }
      }
      // Na een korte pauze: terugveren (als het niet genoeg was) en klaar voor de volgende veeg
      w.timer = window.setTimeout(() => {
        if (!w.done) {
          card.current?.classList.add('is-settling');
          setPos(0);
        }
        w.dx = 0;
        w.done = false;
      }, 220);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horiz: null, lastX: e.clientX, lastT: e.timeStamp, vx: 0 };
    card.current?.classList.remove('is-settling');
    // Muis: meteen vastpakken, zodat ook een snelle sleepbeweging buiten de kaart blijft tellen.
    // (Touch niet: daar beslist de browser zelf over verticaal scrollen.)
    if (e.pointerType === 'mouse') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    // Snelheid bijhouden (voor een snelle veeg)
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.vx = 0.7 * ((e.clientX - d.lastX) / dt) + 0.3 * d.vx;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    // Pas beslissen na een paar pixels: vooral opzij = vegen, vooral omlaag = scrollen (laten we aan de browser)
    if (d.horiz === null && Math.hypot(dx, dy) > 6) {
      d.horiz = Math.abs(dx) > Math.abs(dy) * 0.8;
      const target = e.currentTarget as HTMLElement;
      if (d.horiz && !target.hasPointerCapture(e.pointerId)) target.setPointerCapture(e.pointerId);
    }
    if (d.horiz) setPos(dx);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    // Ver genoeg gesleept, of een korte snelle veeg in dezelfde richting
    const flick = Math.abs(dx) > FLICK_MIN && Math.abs(d.vx) > FLICK_SPEED && Math.sign(d.vx) === Math.sign(dx);
    if (d.horiz && (Math.abs(dx) > THRESHOLD || flick)) return leave(dx > 0 ? 'right' : 'left');
    // Terugveren
    card.current?.classList.add('is-settling');
    setPos(0);
    // Dubbel tikken = leuk
    if (!d.horiz && Math.hypot(dx, e.clientY - d.y) < 8) {
      const now = Date.now();
      if (now - lastTap.current < 320) {
        onLike();
        popHeart(now);
        lastTap.current = 0;
      } else lastTap.current = now;
    }
  };

  return (
    <div ref={card} className={`kt-swipe-card relative ${className}`}>
      {children}
      {/* Kleur over de video tijdens het vegen: groen = in je reis, rood = niet voor mij */}
      <div ref={tintAdd} className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-l from-[#2FA84F] to-transparent opacity-0" aria-hidden="true" />
      <div ref={tintNope} className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#E5484D] to-transparent opacity-0" aria-hidden="true" />
      {/* Veeglaag: alles behalve de onderste strook (bediening van de speler) */}
      <div
        ref={layer}
        className="absolute inset-x-0 bottom-16 top-0 z-10 cursor-grab select-none active:cursor-grabbing"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          drag.current = null;
          card.current?.classList.add('is-settling');
          setPos(0);
        }}
        aria-hidden="true"
      />
      {/* Groot teken in het midden */}
      <span ref={badgeAdd} className="kt-swipe-badge pointer-events-none absolute left-1/2 top-[42%] z-20 grid h-28 w-28 place-items-center rounded-full bg-[#2FA84F] text-[64px] font-bold text-white opacity-0 shadow-2xl" aria-hidden="true">
        ✓
      </span>
      <span ref={badgeNope} className="kt-swipe-badge pointer-events-none absolute left-1/2 top-[42%] z-20 grid h-28 w-28 place-items-center rounded-full bg-[#E5484D] text-[60px] font-bold text-white opacity-0 shadow-2xl" aria-hidden="true">
        ✕
      </span>
      {/* Stempels zoals bij Tinder */}
      <span
        ref={addStamp}
        className="kt-swipe-stamp pointer-events-none absolute left-5 top-16 z-20 -rotate-12 rounded-xl border-4 border-[#8EE08A] bg-black/20 px-3 py-1 text-[24px] font-extrabold uppercase tracking-wider text-[#8EE08A] opacity-0"
        aria-hidden="true"
      >
        {labels.add}
      </span>
      <span
        ref={nopeStamp}
        className="kt-swipe-stamp pointer-events-none absolute right-5 top-16 z-20 rotate-12 rounded-xl border-4 border-[#FF6B6B] bg-black/20 px-3 py-1 text-[24px] font-extrabold uppercase tracking-wider text-[#FF6B6B] opacity-0"
        aria-hidden="true"
      >
        {labels.nope}
      </span>
      {hearts.map((h) => (
        <span
          key={h}
          className="kt-heart-burst pointer-events-none absolute left-1/2 top-1/2 z-20 text-[96px] leading-none drop-shadow-lg"
          aria-hidden="true"
        >
          ❤️
        </span>
      ))}
    </div>
  );
}
