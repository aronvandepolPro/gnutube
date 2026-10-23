'use client';

/**
 * Toestemming voor video's van TikTok (de TikTok-speler kan cookies plaatsen en een bezoek volgen).
 * Eén keuze voor de hele site, bewaard in de opslag van deze browser (geen cookie van Gnutube zelf):
 *  - 'yes' → alle video's laden vanzelf
 *  - 'no'  → er laadt niets van TikTok tot de bezoeker zelf op "Video laden" klikt
 *  - null  → nog niet gekozen (of de tekst is veranderd): de gnoe (mascotte) vraagt het
 *
 * Voor geldige toestemming bewaren we ook wanneer en bij welke versie van de tekst er gekozen is.
 * Verander je de tekst of het doel wezenlijk, verhoog dan CONSENT_VERSION: dan wordt het opnieuw gevraagd.
 * Let op: dit bewijs staat alleen in de browser van de bezoeker; centraal vastleggen vraagt een server.
 */
export const CONSENT_VERSION = 1;
const KEY = 'kt-video-consent';
const META_KEY = 'kt-video-consent-meta';
const EVENT = 'kt-video-consent';
const OPEN_EVENT = 'kt-consent-open';

export type Choice = 'yes' | 'no' | null;

let memoryChoice: Choice = null; // als de browser geen opslag toestaat
let sessionAllowed = false; // "Video laden" bij één video: geldt voor dit bezoek

export function readChoice(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    const meta = JSON.parse(localStorage.getItem(META_KEY) ?? 'null') as { v?: number } | null;
    if (!meta || meta.v !== CONSENT_VERSION) return memoryChoice;
    return v === '1' ? 'yes' : v === '0' ? 'no' : memoryChoice;
  } catch {
    return memoryChoice;
  }
}

export function setChoice(choice: 'yes' | 'no') {
  memoryChoice = choice;
  // Intrekken = ook de toestemming voor dit bezoek vervalt (geladen video's verdwijnen)
  if (choice === 'no') sessionAllowed = false;
  try {
    localStorage.setItem(KEY, choice === 'yes' ? '1' : '0');
    localStorage.setItem(META_KEY, JSON.stringify({ v: CONSENT_VERSION, at: new Date().toISOString() }));
  } catch {
    /* geen opslag: de keuze geldt dan alleen voor deze pagina */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Toestemming alleen voor dit bezoek (knop "Video laden"). */
export function allowThisVisit() {
  sessionAllowed = true;
  window.dispatchEvent(new Event(EVENT));
}

export const videosAllowed = () => sessionAllowed || readChoice() === 'yes';

export function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

/** Gnoe opnieuw tonen (link "Cookie-instellingen"). */
export function openConsent() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
export function onOpenConsent(cb: () => void) {
  window.addEventListener(OPEN_EVENT, cb);
  return () => window.removeEventListener(OPEN_EVENT, cb);
}
