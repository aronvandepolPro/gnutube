'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { preconnect } from 'react-dom';
import { allowThisVisit, setChoice, subscribe, videosAllowed } from '@/lib/video-consent';

/**
 * TikTok-video via de officiële TikTok-speler (https://www.tiktok.com/player/v1/{id}), niet gedownload.
 * - Laadt pas na toestemming (TikTok plaatst cookies). Heeft de bezoeker in de balk 'ja' gezegd, dan laadt hij
 *   vanzelf; anders staat hier per video de knop "Video laden" (zie lib/video-consent.ts).
 * - `active`: de video is in beeld en speelt. `preload`: alvast geladen en gepauzeerd (de volgende/vorige in de feed),
 *   zodat hij direct start zodra hij in beeld komt, zonder te herladen.
 * - Geluid: standaard aan. Zet de bezoeker het bij één video uit (knop in de TikTok-speler), dan blijft het uit bij
 *   alle volgende video's, ook bij een later bezoek, tot hij het weer aanzet (bewaard als 'kt-sound').
 *   Browsers staan geluid pas toe na een klik of tik op de pagina: tot dan start de video zonder geluid, bij de
 *   eerste klik/tik gaat het geluid alsnog aan.
 * Bediening via de berichten van de officiële speler (play, pause, mute, unMute; onPlayerReady, onMute).
 * Naam van de maker zet de pagina zelf onder de video (caption).
 */

const TIKTOK_ORIGIN = 'https://www.tiktok.com';

const SOUND_KEY = 'kt-sound';
const UNLOCK = 'kt-sound-unlock';

/** Wil de bezoeker geluid? Standaard ja; 'off' als hij het zelf uitzette. */
function soundWanted() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}
function setSoundWanted(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* geen opslag: dan alleen voor deze video */
  }
}
/** Heeft de bezoeker al geklikt of getikt? Pas dan mag een browser geluid afspelen. */
function canPlaySound() {
  return typeof navigator !== 'undefined' && !!navigator.userActivation?.hasBeenActive;
}
// Eerste klik/tik/toets op de pagina: laat de video in beeld alsnog geluid geven
if (typeof window !== 'undefined') {
  const unlock = () => {
    window.dispatchEvent(new Event(UNLOCK));
    ['pointerdown', 'keydown', 'touchend'].forEach((t) => window.removeEventListener(t, unlock, true));
  };
  ['pointerdown', 'keydown', 'touchend'].forEach((t) => window.addEventListener(t, unlock, true));
}

export type TikTokLabels = {
  consentTitle: string;
  consentText: string;
  consentButton: string;
  consentAlways: string;
  /** Melding als de speler niet laadt (TikTok niet bereikbaar). Zonder deze teksten: geen melding. */
  loadFailed?: string;
  loadFailedText?: string;
  retry?: string;
  openOnTikTok?: string;
};

/** Zo lang wachten op de speler voordat we zeggen dat hij niet laadt. */
const LOAD_TIMEOUT = 12000;

type Props = {
  tiktokId: string;
  active: boolean;
  preload?: boolean;
  title: string;
  labels: TikTokLabels;
  /** TikTok-naam van de maker (zonder @), voor de link naar de video op TikTok. */
  author?: string;
  /** Affiche dat zichtbaar is zolang de speler niet geladen is. */
  placeholder?: React.ReactNode;
};

export function TikTokPlayer({ tiktokId, active, preload = false, title, labels, author, placeholder }: Props) {
  const allowed = useSyncExternalStore(subscribe, videosAllowed, () => false);
  // Verbinding met TikTok alvast opzetten (sneller), maar pas na toestemming: ook een verbinding geeft TikTok je IP-adres
  if (allowed) preconnect(TIKTOK_ORIGIN);

  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const activeRef = useRef(active);
  /** Pagina niet in beeld (ander tabblad, andere pagina van de site): dan blijft de video stil. */
  const away = useRef(false);
  const loaded = allowed && (active || preload);
  /** De speler meldde zich niet op tijd: TikTok niet bereikbaar (netwerk, filter) of video weg. */
  const [failed, setFailed] = useState(false);
  /** Telt op bij "Opnieuw proberen", zodat de speler echt opnieuw laadt. */
  const [attempt, setAttempt] = useState(0);

  /** Laatst bekende speler; blijft bruikbaar als React de ref al heeft losgemaakt (pagina verborgen). */
  const win = useRef<Window | null>(null);
  const send = (type: string, value?: number) =>
    (frame.current?.contentWindow ?? win.current)?.postMessage({ type, value, 'x-tiktok-player': true }, TIKTOK_ORIGIN);
  /** Tot wanneer 'onMute'-berichten van onszelf komen (en dus niet de keuze van de bezoeker zijn). */
  const ownMuteUntil = useRef(0);
  const setMute = (mute: boolean) => {
    ownMuteUntil.current = performance.now() + 1500;
    send(mute ? 'mute' : 'unMute');
  };
  const start = () => {
    // Zonder klik op de pagina blokkeert de browser geluid (en soms dan het afspelen): eerst stil starten
    setMute(!(soundWanted() && canPlaySound()));
    send('play');
  };
  /** Buiten beeld: stil en terug naar het begin, zodat hij bij het in beeld komen vooraan start. */
  const hold = () => {
    send('pause');
    send('seekTo', 0);
  };

  // Berichten van de speler: klaar → starten als deze video in beeld is; geluid aan/uit → onthouden
  useEffect(() => {
    if (!loaded) {
      ready.current = false;
      return;
    }
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== TIKTOK_ORIGIN || e.source !== frame.current?.contentWindow) return;
      const data = typeof e.data === 'string' ? safeParse(e.data) : e.data;
      if (!data || data['x-tiktok-player'] !== true) return;
      if (data.type === 'onPlayerReady') {
        ready.current = true;
        setFailed(false);
        win.current = frame.current?.contentWindow ?? null;
        if (activeRef.current && !away.current) start();
        else if (activeRef.current) send('pause');
        else hold();
      }
      // De speler start soms toch vanzelf (autoplay na het bufferen): buiten beeld direct weer stilzetten
      if (data.type === 'onStateChange' && data.value === 1 && !activeRef.current) hold();
      // Pagina niet in beeld: niet vanzelf weer gaan spelen
      if (data.type === 'onStateChange' && data.value === 1 && activeRef.current && away.current) send('pause');
      // Alleen de video in beeld bepaalt de geluidskeuze (de bezoeker drukte daar op de knop)
      if (data.type === 'onMute' && activeRef.current && performance.now() > ownMuteUntil.current) setSoundWanted(data.value === false);
    };
    // Eerste klik/tik: geluid alsnog aan bij de video die nu speelt
    const onUnlock = () => {
      if (ready.current && activeRef.current && soundWanted()) setMute(false);
    };
    window.addEventListener('message', onMessage);
    window.addEventListener(UNLOCK, onUnlock);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener(UNLOCK, onUnlock);
    };
    // send/start lezen alleen refs en de gedeelde geluidskeuze
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // In beeld maar na een tijd nog steeds geen speler: melding tonen in plaats van een zwart vlak
  useEffect(() => {
    if (!loaded || !active || !labels.loadFailed) return;
    const t = window.setTimeout(() => {
      if (!ready.current) setFailed(true);
    }, LOAD_TIMEOUT);
    return () => window.clearTimeout(t);
  }, [loaded, active, attempt, labels.loadFailed]);

  // Weg van de pagina: pauzeren. Ander tabblad of app → pauze, terug → verder spelen.
  // Naar een andere pagina van de site → pauze (ook als Next.js deze pagina op de achtergrond bewaart);
  // kom je terug, dan speelt de video in beeld weer verder.
  useEffect(() => {
    away.current = document.hidden;
    if (ready.current && activeRef.current && !away.current) start();
    const onVisible = () => {
      away.current = document.hidden;
      if (!ready.current) return;
      if (away.current) send('pause');
      else if (activeRef.current) send('play');
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onVisible);
      away.current = true;
      send('pause');
    };
    // send/start lezen alleen refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // In beeld: afspelen (met de gekozen geluidsstand); uit beeld maar nog geladen: pauzeren
  useEffect(() => {
    activeRef.current = active;
    if (!ready.current) return;
    if (active && !away.current) start();
    else if (!active) hold();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const src =
    `${TIKTOK_ORIGIN}/player/v1/${encodeURIComponent(tiktokId)}` +
    // Altijd autoplay: de speler meldt pas 'klaar' als hij mag starten. Een vooruit geladen video wordt bij
    // 'klaar' meteen gepauzeerd (hij start zonder geluid, dus dat is niet te horen). Zo blijft het adres gelijk
    // en hoeft de speler niet opnieuw te laden als hij in beeld komt.
    // Geen volledig scherm: TikTok vult dan de zijkanten met een wazige kopie van de video.
    `?autoplay=1&loop=1&description=0&music_info=0&rel=0&native_context_menu=0&closed_caption=0&fullscreen_button=0` +
    (attempt ? `&kt=${attempt}` : '');

  /**
   * Andere pagina van de site: Next.js bewaart deze pagina verborgen (React Activity), en dan speelt de video
   * gewoon door. Daarom bij verbergen de speler losmaken (about:blank = stil), en bij terugkomen opnieuw laden.
   */
  const attach = useCallback(
    (el: HTMLIFrameElement | null) => {
      frame.current = el;
      if (el && el.getAttribute('src') !== src) el.setAttribute('src', src);
      return () => {
        ready.current = false;
        win.current = null;
        el?.setAttribute('src', 'about:blank');
        frame.current = null;
      };
    },
    [src],
  );

  if (!allowed) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        {placeholder && <div className="absolute inset-0 opacity-40">{placeholder}</div>}
        <div className="relative z-20 flex h-full flex-col items-start justify-end gap-3 p-6 text-white [&>*]:pointer-events-auto pointer-events-none">
          <p className="m-0 font-display text-[28px] italic leading-tight">{labels.consentTitle}</p>
          <p className="m-0 max-w-sm text-[14px] text-white/75">{labels.consentText}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={allowThisVisit} className="btn btn-primary !min-h-11">
              {labels.consentButton}
            </button>
            <button type="button" onClick={() => setChoice('yes')} className="btn btn-ghost !min-h-11">
              {labels.consentAlways}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!active && !preload) {
    return <div className="relative h-full w-full overflow-hidden bg-black">{placeholder}</div>;
  }

  if (failed && active) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        {placeholder && <div className="absolute inset-0 opacity-40">{placeholder}</div>}
        <div className="relative z-20 flex h-full flex-col items-start justify-end gap-3 p-6 text-white [&>*]:pointer-events-auto pointer-events-none">
          <p className="m-0 text-[24px] font-semibold leading-tight">{labels.loadFailed}</p>
          <p className="m-0 max-w-sm text-[14px] text-white/75">{labels.loadFailedText}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setAttempt((n) => n + 1);
              }}
              className="btn btn-primary !min-h-11"
            >
              {labels.retry}
            </button>
            {author && labels.openOnTikTok && (
            <a
              href={`https://www.tiktok.com/@${encodeURIComponent(author)}/video/${encodeURIComponent(tiktokId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost !min-h-11"
            >
              {labels.openOnTikTok}
            </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={attach}
      src={src}
      title={title}
      className="h-full w-full border-0 bg-black"
      allow="autoplay; encrypted-media; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      loading="eager"
    />
  );
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
