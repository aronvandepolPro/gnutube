'use client';

import type { Session } from '@supabase/supabase-js';
import { accountsEnabled, supabase } from './supabase';
import { add, CHANGE_EVENT, clearAll, readList, readRoute, replaceAll, type RouteSettings } from './trip-store';

/**
 * Account van de bezoeker: wie is ingelogd, en zijn reis/likes/routekeuzes gelijk houden met de database.
 * - Bij inloggen: wat in deze browser staat samenvoegen met wat in het account staat (niets gaat verloren).
 * - Daarna: elke wijziging gaat (na een korte pauze) naar het account; bij terugkomen in het venster
 *   wordt het account opnieuw gelezen, zodat wijzigingen van een ander apparaat zichtbaar worden.
 * - Bij uitloggen: deze browser wordt leeggemaakt (gedeelde computer).
 */

export type AccountUser = { id: string; email: string | null; admin: boolean };

let user: AccountUser | null = null;
let ready = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribeUser(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export const getUser = () => user;
export const serverUser = () => null;
export const isReady = () => ready;
export const serverReady = () => false;

// ─── Synchroniseren ────────────────────────────────────────────────────────
let applyingRemote = false;
let lastSynced = '';
let pushTimer = 0;

type Row = { trip: string[]; liked: string[]; nope: string[]; route: Partial<RouteSettings> | null; updated_at: string };

const union = (a: string[], b: string[]) => [...a, ...b.filter((x) => !a.includes(x))];

async function pull(merge: boolean) {
  const sb = supabase();
  if (!sb || !user) return;
  const { data, error } = await sb.from('user_data').select('trip, liked, nope, route, updated_at').eq('user_id', user.id).maybeSingle<Row>();
  if (error) return;
  applyingRemote = true;
  if (merge) {
    // Eerste keer na inloggen: samenvoegen, daarna meteen opslaan
    replaceAll({
      trip: union(data?.trip ?? [], readList('trip')),
      liked: union(data?.liked ?? [], readList('liked')),
      nope: union(data?.nope ?? [], readList('nope')),
      route: data?.route ?? readRoute(),
    });
    applyingRemote = false;
    await push();
  } else if (data && data.updated_at !== lastSynced) {
    // Later: het account wint (er is op een ander apparaat iets veranderd)
    replaceAll({ trip: data.trip, liked: data.liked, nope: data.nope, route: data.route });
    lastSynced = data.updated_at;
    applyingRemote = false;
  } else applyingRemote = false;
}

async function push() {
  const sb = supabase();
  if (!sb || !user) return;
  const updated_at = new Date().toISOString();
  const { error } = await sb.from('user_data').upsert({
    user_id: user.id,
    trip: readList('trip'),
    liked: readList('liked'),
    nope: readList('nope'),
    route: readRoute(),
    updated_at,
  });
  if (!error) lastSynced = updated_at;
}

function schedulePush() {
  if (applyingRemote || !user) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(push, 800);
}

// ─── Inloggen nodig ────────────────────────────────────────────────────────
const PENDING_KEY = 'kt-pending';
export const LOGIN_NEEDED = 'kt-login-needed';
type Pending = { kind: 'trip' | 'liked'; id: string };

/**
 * Voor liken en toevoegen aan je reis moet je ingelogd zijn. Ingelogd: true. Anders wordt de actie onthouden
 * (en na het inloggen alsnog uitgevoerd) en verschijnt het inlogvenster.
 */
export function requireLogin(pending: Pending): boolean {
  // Accounts nog niet ingesteld (geen Supabase-sleutels): gewoon in deze browser bewaren, zoals voorheen
  if (user || !accountsEnabled) return true;
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* geen opslag: dan na inloggen opnieuw doen */
  }
  window.dispatchEvent(new Event(LOGIN_NEEDED));
  return false;
}
function applyPending() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    const p = raw ? (JSON.parse(raw) as Pending) : null;
    if (p && (p.kind === 'trip' || p.kind === 'liked') && typeof p.id === 'string') add(p.kind, p.id);
  } catch {
    /* niets te doen */
  }
}

// ─── Sessie ────────────────────────────────────────────────────────────────
async function onSession(session: Session | null) {
  const sb = supabase();
  const before = user?.id ?? null;
  const next = session?.user ?? null;
  if (!next) {
    user = null;
    ready = true;
    emit();
    if (before) clearAll();
    return;
  }
  if (next.id === before) return;
  const { data: adminRow } = (await sb?.from('admins').select('user_id').eq('user_id', next.id).maybeSingle()) ?? { data: null };
  user = { id: next.id, email: next.email ?? null, admin: !!adminRow };
  ready = true;
  emit();
  await pull(true);
  applyPending();
}

let started = false;
/** Eén keer starten (AccountProvider in de layout). */
export function startAccount() {
  if (started) return;
  started = true;
  const sb = supabase();
  if (!sb) {
    ready = true;
    emit();
    return;
  }
  sb.auth.getSession().then(({ data }) => onSession(data.session));
  // Geen supabase-aanroepen direct in deze callback (kan vastlopen): even uitstellen
  sb.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => onSession(session), 0);
  });
  window.addEventListener(CHANGE_EVENT, schedulePush);
  window.addEventListener('focus', () => pull(false));
}

export async function signOut() {
  await supabase()?.auth.signOut();
}

/** Inloglink (en code) per e-mail sturen. Na het klikken kom je terug op `back`. */
export async function sendLoginEmail(email: string, locale: string, back: string) {
  const sb = supabase();
  if (!sb) return { error: 'disabled' as const };
  const redirect = `${window.location.origin}/${locale}/inloggen?terug=${encodeURIComponent(back)}`;
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: true } });
  if (!error) return { error: null };
  // 429: te veel mails kort na elkaar (limiet van de maildienst), dat is iets anders dan een fout adres
  return { error: error.status === 429 || /rate limit/i.test(error.message) ? ('rate' as const) : ('failed' as const) };
}
/**
 * Welke inlogmanieren aanstaan in Supabase (Authentication → Providers). Zo verschijnt de knop
 * 'Doorgaan met Google' pas als Google daar is aangezet. Eén keer per bezoek opgevraagd.
 */
type Providers = { google: boolean; apple: boolean };
let providers: Promise<Providers> | null = null;
/** Welke inlogknoppen (Google, Apple) aan staan in Supabase. */
export function loginProviders(): Promise<Providers> {
  const off = { google: false, apple: false };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Promise.resolve(off);
  providers ??= fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { external?: Record<string, boolean> } | null) => ({ google: !!j?.external?.google, apple: !!j?.external?.apple }))
    .catch(() => off);
  return providers;
}
/** Inloggen met Google of Apple: daarheen en daarna terug naar `back` (een account wordt vanzelf gemaakt). */
export async function signInWithProvider(provider: 'google' | 'apple', locale: string, back: string) {
  const sb = supabase();
  if (!sb) return { error: 'disabled' as const };
  const redirectTo = `${window.location.origin}/${locale}/inloggen?terug=${encodeURIComponent(back)}`;
  const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
  return { error: error ? ('failed' as const) : null };
}

/** Inloggen met de code uit de mail (handig als je de mail op een ander apparaat opent). */
export async function verifyCode(email: string, code: string) {
  const sb = supabase();
  if (!sb) return { error: 'disabled' as const };
  const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
  return { error: error ? ('failed' as const) : null };
}

/** Al je gegevens als bestand (recht op inzage). */
export async function exportMyData() {
  const sb = supabase();
  if (!sb || !user) return null;
  const [{ data: d }, { data: subs }] = await Promise.all([
    sb.from('user_data').select('*').eq('user_id', user.id).maybeSingle(),
    sb.from('submissions').select('*').eq('user_id', user.id),
  ]);
  return { account: { id: user.id, email: user.email }, data: d, submissions: subs ?? [], exported_at: new Date().toISOString() };
}

/** Account en alles wat eraan hangt wissen (recht op verwijdering). */
export async function deleteMyAccount() {
  const sb = supabase();
  if (!sb || !user) return { error: 'failed' as const };
  const { error } = await sb.rpc('delete_my_account');
  if (error) return { error: 'failed' as const };
  await sb.auth.signOut();
  return { error: null };
}
