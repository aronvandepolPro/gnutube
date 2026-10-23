'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { format } from '@/lib/i18n/format';
import { kinds, type Kind, type Place } from '@/lib/data';
import { Poster } from '@/components/Poster';
import { ShareButton } from '@/components/ShareButton';
import { TikTokPlayer } from '@/components/TikTokPlayer';
import { SwipeCard, type Fling } from '@/components/SwipeCard';
import { add, readList, readRoute, serverList, serverRoute, subscribe as subscribeTrip, toggle } from '@/lib/trip-store';
import { TripSetup } from '@/components/TripSetup';
import type { Video } from '@/lib/videos';
import { requireLogin } from '@/lib/account';
import { useCommunityVideos } from '@/lib/community';
import { ReportButton } from '@/components/ReportButton';
import { PlaceSheet } from '@/components/PlaceSheet';
import { CommentsSheet } from '@/components/CommentsSheet';
import { countShare, useSocialCounts } from '@/lib/social';

type Item = Place & { coords: string; near: { id: string; name: string; km: number }[]; videos: Video[] };
/** Eén scherm in de feed: een video van een plek, of (zonder video) het affiche van de plek. */
type Slide = { key: string; place: Item; video: Video | null; /** Plaats in de volledige lijst (blijft gelijk als er plekken uitvallen). */ bi: number };
/** Voor jou (op maat), alle video's, of per soort (één video per plek, met plekpagina). */
type Mode = 'foryou' | 'all' | 'kinds';
const MODES: Mode[] = ['foryou', 'all', 'kinds'];
const noSub = () => () => {};
type Props = {
  locale: Locale;
  items: Item[];
  t: Pick<Dictionary, 'watch' | 'kind' | 'place' | 'share' | 'swipe' | 'post' | 'report' | 'social' | 'tripSetup' | 'search'>;
};

const pad = (n: number) => String(n).padStart(3, '0');

// Uitleg over het vegen: alleen bij het eerste bezoek (onthouden in deze browser)
const HINT_KEY = 'kt-swipe-hint';
const HINT_EVENT = 'kt-swipe-hint';
const hintSeen = () => {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return true;
  }
};
const subscribeHint = (cb: () => void) => {
  window.addEventListener(HINT_EVENT, cb);
  return () => window.removeEventListener(HINT_EVENT, cb);
};
const closeHint = () => {
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    /* geen opslag */
  }
  window.dispatchEvent(new Event(HINT_EVENT));
};

/**
 * Verticale feed zoals in TikTok: één video per scherm, scroll-snap. Alleen de zichtbare video speelt.
 * Plekken zonder video staan als affiche achteraan.
 * Kiezen zoals bij Tinder: naar rechts = in je reis, naar links = niets voor mij (andere video's van die plek
 * worden overgeslagen), dubbel tikken of ♥ = leuk, naar beneden = volgende. Bewaard in de browser (lib/trip-store).
 */
export function WatchFeed({ locale, items, t }: Props) {
  const params = useSearchParams();
  const [mode, setModeState] = useState<Mode>(() => {
    if (params.get('plek')) return 'all';
    const m = params.get('modus') as Mode | null;
    return m && MODES.includes(m) ? m : 'foryou';
  });
  const [kind, setKind] = useState<Kind | ''>('');
  /** Plekken die tijdens het kijken in je reis of bij 'niets voor mij' kwamen: hun latere video's vallen weg. */
  const [cutoff, setCutoff] = useState<Record<string, number>>({});
  /** Open plekpagina (index in de feed). */
  const [sheet, setSheet] = useState<number | null>(null);
  /** Open reacties (video). */
  const [comments, setComments] = useState<{ id: string; place: string } | null>(null);
  const social = useSocialCounts();
  /** Pas na het laden in de browser kennen we je keuzes (de server weet ze niet). */
  const hydrated = useSyncExternalStore(noSub, () => true, () => false);
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLElement | null)[]>([]);
  const seenHint = useSyncExternalStore(subscribeHint, hintSeen, () => true);
  const trip = useSyncExternalStore(subscribeTrip, () => readList('trip'), serverList);
  const route = useSyncExternalStore(subscribeTrip, readRoute, serverRoute);
  const tripName = route.name || t.swipe.myTrip;
  const liked = useSyncExternalStore(subscribeTrip, () => readList('liked'), serverList);
  const [fling, setFling] = useState<{ i: number; f: Fling }>({ i: -1, f: null });
  const [heart, setHeart] = useState<{ i: number; n: number }>({ i: -1, n: 0 });
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  // Volgnummer voor animaties (toast, hartje, wegvliegen)
  const seq = useRef(0);
  const tick = () => ++seq.current;
  const showToast = (text: string) => setToast({ text, n: tick() });
  /** Venster 'Maak je reis' (eerste keer naar rechts vegen). */
  const [setup, setSetup] = useState(false);

  // Video's van de site + goedgekeurde inzendingen van reizigers, zonder weggehaalde video's
  const baseVideos = useMemo(() => items.flatMap((p) => p.videos), [items]);
  const allVideos = useCommunityVideos(baseVideos);
  /**
   * De volledige lijst voor deze manier van kijken. Plekken die al in je reis staan of die je wegveegde, komen
   * niet (meer) langs. Wordt alleen opnieuw opgebouwd bij een andere manier of soort, niet tijdens het kijken.
   */
  const base = useMemo<Slide[]>(() => {
    const trip0 = hydrated ? readList('trip') : [];
    const nope0 = hydrated ? readList('nope') : [];
    const liked0 = hydrated ? readList('liked') : [];
    const gone = new Set([...trip0, ...nope0]);
    const pool = items
      .filter((p) => mode === 'foryou' || !kind || p.kinds.includes(kind))
      .filter((p) => !gone.has(p.id))
      .map((p) => ({ ...p, videos: allVideos.filter((v) => v.placeId === p.id) }));
    const byCount = (a: Item, b: Item) => b.videos.length - a.videos.length;

    // Per soort: één scherm per plek (de eerste video), met de plekpagina om te kiezen
    if (mode === 'kinds') return [...pool].sort(byCount).map((p, bi) => ({ key: p.id, place: p, video: p.videos[0] ?? null, bi }));

    let withVideo = pool.filter((p) => p.videos.length);
    if (mode === 'foryou') {
      // Op maat: soorten uit je reis en je likes wegen zwaarder; plekken die je leuk vond komen terug
      const placeOf = new Map(allVideos.map((v) => [v.tiktokId, v.placeId]));
      const byId = new Map(items.map((p) => [p.id, p]));
      const kindScore = new Map<Kind, number>();
      const boost = new Map<string, number>();
      const addKinds = (id: string | undefined, w: number) => byId.get(id ?? '')?.kinds.forEach((k) => kindScore.set(k, (kindScore.get(k) ?? 0) + w));
      trip0.forEach((id) => addKinds(id, 3));
      nope0.forEach((id) => addKinds(id, -2));
      for (const k of liked0) {
        const id = placeOf.get(k) ?? k;
        addKinds(id, 2);
        boost.set(id, (boost.get(id) ?? 0) + 5);
      }
      const score = (p: Item) => (boost.get(p.id) ?? 0) + p.kinds.reduce((n, k, i) => n + (kindScore.get(k) ?? 0) * (i === 0 ? 1.5 : 1), 0);
      withVideo = withVideo.sort((a, b) => score(b) - score(a) || byCount(a, b));
    } else withVideo = withVideo.sort(byCount);

    // Video's om en om per plek, zodat niet vijf video's van dezelfde plek achter elkaar komen
    const rounds = Math.max(0, ...withVideo.map((p) => p.videos.length));
    const out: Slide[] = [];
    for (let r = 0; r < rounds; r++)
      for (const p of withVideo) if (p.videos[r]) out.push({ key: p.videos[r].tiktokId, place: p, video: p.videos[r], bi: out.length });
    if (mode === 'all') for (const p of pool.filter((x) => !x.videos.length)) out.push({ key: p.id, place: p, video: null, bi: out.length });
    return out;
  }, [items, kind, allVideos, mode, hydrated]);

  // Wat je net koos, valt weg uit de rest van de feed (wat je al zag blijft staan, zodat het beeld niet verspringt)
  const list = useMemo(() => base.filter((s) => cutoff[s.place.id] === undefined || s.bi <= cutoff[s.place.id]), [base, cutoff]);
  const cut = (i: number) => setCutoff((c) => ({ ...c, [list[i].place.id]: list[i].bi }));

  /** Opnieuw beginnen bovenaan (andere manier of soort): geen oude veeg- of hartjesopdrachten meenemen. */
  const restart = () => {
    setCutoff({});
    setSheet(null);
    setIndex(0);
    setFling({ i: -1, f: null });
    setHeart({ i: -1, n: 0 });
    scroller.current?.scrollTo({ top: 0 });
  };
  const setMode = (m: Mode) => {
    setModeState(m);
    restart();
  };

  const go = (i: number, smooth = true) => {
    const el = slides.current[i];
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto', block: 'start' });
  };

  /**
   * Na een keuze precies één video verder, nooit meer. De feed zit dan even vast: alle scrollbewegingen
   * (naloop van een touchpadveeg, muiswiel, vinger) worden tegengehouden, en mocht er toch iets doorkomen, dan kan
   * hij niet voorbij de volgende video. Zolang er bewegingen blijven binnenkomen, blijft hij vast (tot 3 seconden).
   */
  const lock = useRef<{ until: number; max: number; el: HTMLElement | null }>({ until: 0, max: 0, el: null });
  const next = (from: number) => {
    const now = performance.now();
    lock.current = { until: now + 700, max: now + 1200, el: null };
    window.setTimeout(() => {
      lock.current.el = slides.current[from + 1] ?? null;
      go(from + 1);
    }, 260);
  };
  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const locked = () => performance.now() < lock.current.until;
    // Alleen omhoog/omlaag tegenhouden: zijwaarts vegen (de volgende keuze) moet meteen kunnen
    const hold = (e: Event) => {
      if (!locked()) return;
      if (e instanceof WheelEvent && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      lock.current.until = Math.min(Math.max(lock.current.until, performance.now() + 250), lock.current.max);
    };
    // Niet voorbij de volgende video
    const clamp = () => {
      const el = lock.current.el;
      if (!locked() || !el) return;
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
      if (sc.scrollTop > top + 4) sc.scrollTop = top;
    };
    window.addEventListener('wheel', hold, { capture: true, passive: false });
    window.addEventListener('touchmove', hold, { capture: true, passive: false });
    sc.addEventListener('scroll', clamp, { passive: true });
    return () => {
      window.removeEventListener('wheel', hold, { capture: true });
      window.removeEventListener('touchmove', hold, { capture: true });
      sc.removeEventListener('scroll', clamp);
    };
  }, []);
  const addToTrip = (i: number) => {
    // Inloggen nodig: de keuze wordt onthouden en na het inloggen alsnog bewaard
    if (!requireLogin({ kind: 'trip', id: list[i].place.id })) return next(i);
    add('trip', list[i].place.id);
    showToast(format(t.swipe.added, { place: list[i].place.name, trip: readRoute().name || t.swipe.myTrip }));
    // Eerste plek in je reis: vraag even om je reis aan te maken (overslaan mag)
    if (!readRoute().setupDone) window.setTimeout(() => setSetup(true), 450);
    cut(i);
    next(i);
  };
  const nope = (i: number) => {
    add('nope', list[i].place.id);
    cut(i);
    next(i);
  };
  const likeKey = (s: Slide) => s.video?.tiktokId ?? s.place.id;
  const like = (i: number, fromOutside = false) => {
    const k = likeKey(list[i]);
    if (!readList('liked').includes(k) && !requireLogin({ kind: 'liked', id: k })) return;
    if (fromOutside) {
      toggle('liked', k);
      if (!readList('liked').includes(k)) return;
      setHeart({ i, n: tick() });
    } else add('liked', k);
  };

  // Volledig scherm: de pagina zelf scrolt niet mee en de footer verdwijnt zolang je kijkt
  useEffect(() => {
    document.documentElement.classList.add('kt-watch');
    return () => document.documentElement.classList.remove('kt-watch');
  }, []);

  // Na het laden zet de feed zich in jouw volgorde; de browser houdt dan de oude video vast (scroll-snap).
  // Daarom terug naar boven, zodat je echt bij de eerste video van jouw feed begint.
  useEffect(() => {
    if (hydrated && !params.get('plek')) scroller.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Startpositie uit ?plek=
  useEffect(() => {
    const id = params.get('plek');
    const i = id ? list.findIndex((s) => s.place.id === id) : -1;
    if (i > 0) requestAnimationFrame(() => go(i, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pijltjestoetsen (en j/k) gaan naar de vorige/volgende video
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, select, textarea, [contenteditable]')) return;
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'PageDown') {
        e.preventDefault();
        go(Math.min(list.length - 1, index + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'PageUp') {
        e.preventDefault();
        go(Math.max(0, index - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFling({ i: index, f: { dir: 'right', n: tick() } });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFling({ i: index, f: { dir: 'left', n: tick() } });
      } else if (e.key === 'l') {
        like(index, true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, list.length]);

  // Huidige slide bijhouden
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setIndex(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { root: scroller.current, threshold: 0.6 },
    );
    slides.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [list]);


  return (
    <div className="relative">
      {/* Manier van kijken + soort reis */}
      <div className="absolute left-0 right-[84px] top-0 z-10 flex flex-col gap-2 py-3 pl-3 sm:right-56 sm:pl-8 lg:flex-row lg:items-center lg:gap-3">
        <div className="flex w-max gap-1 rounded-full bg-black/55 p-1 backdrop-blur" role="group" aria-label={t.watch.modeLabel}>
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className="min-h-9 rounded-full px-3 text-[13px] font-semibold sm:px-4 sm:text-[14px] text-white/75 transition-colors hover:text-white aria-pressed:bg-white aria-pressed:text-[#2A1F17]"
            >
              {m === 'foryou' ? `✨ ${t.watch.modeForYou}` : m === 'all' ? t.watch.modeAll : t.watch.modeKinds}
            </button>
          ))}
        </div>
        {mode !== 'foryou' && (
          <div className="kt-no-scrollbar flex min-w-0 gap-2 overflow-x-auto" role="group" aria-label={t.kind.label}>
            <button type="button" className="min-h-9 shrink-0 rounded-full border border-white/25 bg-black/55 px-3 text-[13px] font-semibold text-white/85 backdrop-blur transition-colors hover:bg-white/15 aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-[#2A1F17]" aria-pressed={!kind} onClick={() => { setKind(''); restart(); }}>
              {t.kind.all}
            </button>
            {kinds.map((k) => (
              <button key={k} type="button" className="min-h-9 shrink-0 rounded-full border border-white/25 bg-black/55 px-3 text-[13px] font-semibold text-white/85 backdrop-blur transition-colors hover:bg-white/15 aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-[#2A1F17]" aria-pressed={kind === k} onClick={() => { setKind(k); restart(); }}>
                {t.kind[k]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Je reis (naam + aantal plekken): hier komt alles in wat je naar rechts veegt */}
      <Link
        href={`/${locale}/reizen`}
        aria-label={`${format(t.swipe.fillingTrip, { trip: tripName })} · ${trip.length}`}
        className="absolute right-3 top-3 z-20 flex min-h-11 items-center gap-2 rounded-full bg-white py-1 pl-3 pr-2 text-[#2A1F17] shadow-lg sm:right-8 sm:pl-4"
      >
        <span aria-hidden="true">🧳</span>
        <span className="hidden max-w-[200px] flex-col leading-tight sm:flex">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#7D7064]">{format(t.swipe.fillingTrip, { trip: '' }).replace(/[:\s]+$/, '')}</span>
          <span className="truncate text-[14px] font-semibold">{tripName}</span>
        </span>
        <span key={trip.length} className="kt-pop grid h-7 min-w-7 place-items-center rounded-full bg-brand px-1.5 text-[13px] font-bold text-white">{trip.length}</span>
      </Link>
      {!seenHint && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/70 p-6 backdrop-blur-sm" role="dialog" aria-labelledby="swipe-hint">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-[#2A1F17] shadow-2xl">
            <p id="swipe-hint" className="m-0 text-[20px] font-semibold">{t.swipe.hintTitle}</p>
            <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0 text-[15px]">
              <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#8EE08A] font-bold text-[#173B14]">→</span>{t.swipe.hintRight}</li>
              <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#FFE0E6]">❤️</span>{t.swipe.hintLike}</li>
              <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-sand font-bold">↓</span>{t.swipe.hintDown}</li>
              <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#FFD6D6] font-bold text-[#A33]">←</span>{t.swipe.hintLeft}</li>
            </ul>
            <button type="button" onClick={closeHint} className="btn btn-primary mt-5 w-full">{t.swipe.hintOk}</button>
          </div>
        </div>
      )}
      {toast && (
        <div
          key={toast.n}
          className="kt-toast pointer-events-none fixed bottom-6 left-1/2 z-40 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-[#2A1F17] shadow-xl"
          role="status"
        >
          ✓ {toast.text}
        </div>
      )}

      {/* Vorige / volgende op desktop */}
      <div className="absolute right-6 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex">
        <button type="button" onClick={() => go(Math.max(0, index - 1))} disabled={index === 0} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[18px] text-white hover:bg-white/20 disabled:opacity-30" aria-label={t.watch.prev}>↑</button>
        <span className="text-[12px] tracking-wide text-ink/60" aria-live="polite">
          {format(t.watch.counter, { i: pad(index + 1), n: pad(list.length) })}
        </span>
        <button type="button" onClick={() => go(Math.min(list.length - 1, index + 1))} disabled={index >= list.length - 1} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[18px] text-white hover:bg-white/20 disabled:opacity-30" aria-label={t.watch.next}>↓</button>
        {list[index + 1] && (
          <span className="mt-1 max-w-[120px] text-center text-[11px] leading-tight text-ink/50">
            {t.watch.next}: {list[index + 1].place.name}
          </span>
        )}
      </div>

      {/* overflow-anchor: none, anders schuift de browser door als de volgorde na het laden wordt aangepast */}
      <div ref={scroller} style={{ overflowAnchor: 'none' }} className="h-[calc(100dvh-65px)] md:h-[calc(100dvh-74px)] snap-y snap-mandatory overflow-y-auto overscroll-contain">
        {list.map(({ key, place: p, video }, i) => {
          const poster = <Poster id={p.id} kind={p.kind} mountain={p.mountain} hasWater={p.hasWater} className="h-full w-full" />;
          return (
          <article
            key={key}
            ref={(el) => { slides.current[i] = el; }}
            data-index={i}
            aria-label={p.name}
            className={`grid h-[calc(100dvh-65px)] md:h-[calc(100dvh-74px)] snap-start snap-always grid-rows-[minmax(70%,1fr)_minmax(0,auto)] lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-1 lg:gap-12 lg:px-24 lg:pb-10 ${mode !== 'foryou' ? 'pt-[112px]' : 'pt-[64px]'} lg:pt-20`}
          >
            {/* Video met aan weerszijden een knop (vanaf laptop): klikken = wegvegen naar die kant */}
            <div className="contents lg:flex lg:min-h-0 lg:items-center lg:justify-center lg:gap-10">
              <button
                type="button"
                onClick={() => setFling({ i, f: { dir: 'left', n: tick() } })}
                aria-label={t.swipe.nope}
                className="group hidden shrink-0 flex-col items-center gap-2 lg:flex"
              >
                <span className="grid h-[72px] w-[72px] place-items-center rounded-full border border-[#FF6B6B]/50 text-[#FF6B6B] bg-white/[0.06] text-[30px] font-bold shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur transition-all duration-200 group-hover:scale-110 group-hover:bg-[#E5484D] group-hover:border-[#E5484D] group-hover:text-white group-active:scale-95" aria-hidden="true">
                  ✕
                </span>
                <span className="text-[13px] font-semibold text-white/60 transition-colors group-hover:text-white">
                  {`← ${t.swipe.nope}`}
                </span>
              </button>
              <SwipeCard
                className="overflow-hidden bg-black lg:aspect-[9/16] lg:h-full lg:rounded-[28px] lg:border lg:border-white/10"
                onRight={() => addToTrip(i)}
                onLeft={() => nope(i)}
                onLike={() => like(i)}
                fling={fling.i === i ? fling.f : null}
                heartKey={heart.i === i ? heart.n : 0}
                labels={{ add: t.swipe.stampAdd, nope: t.swipe.stampNope }}
              >
                {video ? (
                  <TikTokPlayer
                    tiktokId={video.tiktokId}
                    active={index === i && sheet === null && !setup}
                    preload={Math.abs(index - i) === 1}
                    title={`${p.name} · @${video.author}`}
                    labels={{
                      consentTitle: format(t.watch.consentTitle, { provider: 'TikTok' }),
                      consentText: format(t.watch.consentText, { provider: 'TikTok' }),
                      consentButton: t.watch.consentButton,
                      consentAlways: t.watch.consentAlways,
                      loadFailed: t.watch.loadFailed,
                      loadFailedText: t.watch.loadFailedText,
                      retry: t.watch.retry,
                      openOnTikTok: t.watch.openOnTikTok,
                    }}
                    author={video.author}
                    placeholder={poster}
                  />
                ) : (
                  <>
                    <div className="kt-kenburns absolute inset-0">{poster}</div>
                    <span className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1.5 text-[12px] text-white">{t.place.noVideo}</span>
                  </>
                )}
                {/* Plekpagina openen (vooral bij 'Per soort') */}
                <button
                  type="button"
                  onClick={() => setSheet(i)}
                  className={`absolute bottom-20 left-4 z-20 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-semibold text-[#2A1F17] shadow-xl transition-transform hover:scale-105 ${mode === 'kinds' ? 'flex' : 'hidden'}`}
                >
                  🔎 {t.watch.openPlace}
                </button>
                <span className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1.5 text-[12px] text-white lg:hidden">
                  {format(t.watch.counter, { i: pad(i + 1), n: pad(list.length) })}
                </span>
              </SwipeCard>
              <button
                type="button"
                onClick={() => setFling({ i, f: { dir: 'right', n: tick() } })}
                aria-label={t.swipe.add}
                className="group hidden shrink-0 flex-col items-center gap-2 lg:flex"
              >
                <span className="grid h-[72px] w-[72px] place-items-center rounded-full border border-[#8EE08A]/50 text-[#8EE08A] bg-white/[0.06] text-[30px] font-bold shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur transition-all duration-200 group-hover:scale-110 group-hover:bg-[#2FA84F] group-hover:border-[#2FA84F] group-hover:text-white group-active:scale-95" aria-hidden="true">
                  ✓
                </span>
                <span className="text-[13px] font-semibold text-white/60 transition-colors group-hover:text-white">
                  {`${t.swipe.add} →`}
                </span>
              </button>
            </div>

            <div className="kt-no-scrollbar flex min-h-0 flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-8 lg:justify-center lg:px-0 lg:py-0">
              {/* Plek: soort en regio, naam, korte omschrijving */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#F0B47A]">{t.kind[p.kind]} · {p.region}</span>
                <h2 className="m-0 text-[clamp(30px,3.6vw,46px)] font-semibold leading-[1.05] text-white">{p.name}</h2>
                <p className="m-0 text-[16px] leading-snug text-white/75">{p.tagline}</p>
              </div>
              {/* Kiezen: niets voor mij · leuk · in mijn reis */}
              <div className="flex items-center gap-3" role="group" aria-label={t.swipe.choose}>
                <button
                  type="button"
                  onClick={() => setFling({ i, f: { dir: 'left', n: tick() } })}
                  aria-label={t.swipe.nope}
                  title={`${t.swipe.nope} (←)`}
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/10 text-[20px] text-[#FF8A8A] transition-transform hover:scale-110"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => like(i, true)}
                  aria-pressed={liked.includes(likeKey(list[i]))}
                  aria-label={t.swipe.like}
                  title={`${t.swipe.like} (L)`}
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/10 text-[20px] transition-transform hover:scale-110 aria-pressed:border-[#FF6B8A] aria-pressed:bg-[#FF6B8A]/25"
                >
                  {liked.includes(likeKey(list[i])) ? '❤️' : '🤍'}
                </button>
                <button
                  type="button"
                  onClick={() => setFling({ i, f: { dir: 'right', n: tick() } })}
                  aria-label={t.swipe.add}
                  title={`${t.swipe.add} (→)`}
                  className="flex h-12 items-center gap-2 rounded-full bg-[#8EE08A] px-4 text-[15px] font-semibold text-[#173B14] transition-transform hover:scale-105"
                >
                  {trip.includes(p.id) ? '✓' : '+'} {trip.includes(p.id) ? t.swipe.inTrip : t.swipe.add}
                </button>
              </div>
              {/* Doen: plek bekijken, reacties, delen */}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setSheet(i)} className="btn btn-primary !min-h-11">
                  🔎 {t.watch.openPlace}
                </button>
                {video && (
                  <button
                    type="button"
                    onClick={() => setComments({ id: video.tiktokId, place: p.name })}
                    className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 text-[14px] font-semibold text-white hover:bg-white/20"
                    aria-label={format(t.social.open, { n: social.comments[video.tiktokId] ?? 0 }, locale)}
                    title={t.social.button}
                  >
                    💬 <span className="tabular-nums">{social.comments[video.tiktokId] ?? 0}</span>
                  </button>
                )}
                <ShareButton
                  title={p.name}
                  t={{ ...t.share, label: t.place.share }}
                  url={`/${locale}/kijken?plek=${p.id}`}
                  count={video ? social.shares[video.tiktokId] ?? 0 : undefined}
                  onShared={video ? () => void countShare(video.tiktokId) : undefined}
                  up
                  compact
                />
              </div>
              {/* Maker van de video, klein */}
              {video ? (
                <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/55">
                  <span>{format(t.watch.videoBy, { handle: video.author })}</span>
                  <a href={`https://www.tiktok.com/@${video.author}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">
                    {t.watch.follow} ↗
                  </a>
                  {video.traveller && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[12px]">🧳 {t.report.traveller}</span>}
                  <ReportButton videoId={video.tiktokId} placeId={p.id} t={t.report} className="text-white/55" />
                </p>
              ) : (
                <p className="m-0 text-[13px] text-white/50">{t.watch.noVideoYet}</p>
              )}
            </div>
          </article>
          );
        })}
        {list.length === 0 && (
          <div className="grid h-full place-items-center p-8 text-center">
            <div className="flex max-w-sm flex-col items-center gap-3">
              <span className="text-[44px]" aria-hidden="true">🎉</span>
              <p className="m-0 text-[22px] font-semibold text-white">{t.watch.emptyTitle}</p>
              <p className="m-0 text-[15px] text-white/70">{t.watch.emptyText}</p>
              <Link href={`/${locale}/reizen`} className="btn btn-primary mt-2">🧳 {t.swipe.myTrip}</Link>
            </div>
          </div>
        )}
      </div>

      {comments && <CommentsSheet videoId={comments.id} title={comments.place} t={t.social} locale={locale} onClose={() => setComments(null)} />}

      {setup && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="setup-title">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-[#2A1F17] shadow-2xl [--color-ink:#2A1F17] [--color-muted:#5E5248] [--color-subtle:#7D7064]">
            <p id="setup-title" className="m-0 text-[22px] font-semibold">🧳 {t.tripSetup.title}</p>
            <p className="m-0 mb-4 mt-1 text-[14px] leading-relaxed text-[#5E5248]">{t.tripSetup.sub}</p>
            <TripSetup locale={locale} t={{ ...t.search, ...t.tripSetup }} onDone={() => setSetup(false)} />
          </div>
        </div>
      )}
      {sheet !== null && list[sheet] && (
        <PlaceSheet
          place={list[sheet].place}
          inTrip={trip.includes(list[sheet].place.id)}
          href={`/${locale}/plek/${list[sheet].place.id}`}
          labels={{
            consentTitle: format(t.watch.consentTitle, { provider: 'TikTok' }),
            consentText: format(t.watch.consentText, { provider: 'TikTok' }),
            consentButton: t.watch.consentButton,
            consentAlways: t.watch.consentAlways,
            kind: t.kind[list[sheet].place.kind],
            yes: t.watch.sheetYes,
            no: t.watch.sheetNo,
            full: t.watch.sheetFull,
            close: t.watch.sheetClose,
            videos: t.place.videos,
            activities: t.place.activities,
            nearby: t.place.nearby,
            km: (n) => format(t.place.distance, { km: n }, locale),
            by: (handle) => format(t.watch.videoBy, { handle }),
          }}
          onClose={() => setSheet(null)}
          onYes={() => {
            const i = sheet;
            setSheet(null);
            addToTrip(i);
          }}
          onNo={() => {
            const i = sheet;
            setSheet(null);
            nope(i);
          }}
        />
      )}
    </div>
  );
}
