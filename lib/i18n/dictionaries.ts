import { lang } from 'next/root-params';
import { notFound } from 'next/navigation';
import { hasLocale, type Locale } from './config';
import type en from '@/messages/en.json';

export type Dictionary = typeof en;

type Loader = () => Promise<unknown>;
const dictionaries: Record<Locale, Loader> = {
  nl: () => import('@/messages/nl.json').then((m) => m.default),
  en: () => import('@/messages/en.json').then((m) => m.default),
  de: () => import('@/messages/de.json').then((m) => m.default),
  fr: () => import('@/messages/fr.json').then((m) => m.default),
  es: () => import('@/messages/es.json').then((m) => m.default),
  it: () => import('@/messages/it.json').then((m) => m.default),
  pt: () => import('@/messages/pt.json').then((m) => m.default),
  sw: () => import('@/messages/sw.json').then((m) => m.default),
};

type Tree = { [k: string]: string | Tree };

/** Vult ontbrekende teksten aan met Engels, zodat een half vertaalde taal nooit een lege plek of fout toont. */
function withFallback(base: Tree, over: Tree): Tree {
  const out: Tree = {};
  for (const [k, v] of Object.entries(base)) {
    const o = over?.[k];
    out[k] = typeof v === 'string' ? (typeof o === 'string' && o.trim() ? o : v) : withFallback(v, (o as Tree) ?? {});
  }
  return out;
}

/** De taal van de huidige route; 404 bij een onbekende taal. */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  if (!hasLocale(value)) notFound();
  return value;
}

export async function getDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  const base = (await dictionaries.en()) as Tree;
  const t = locale === 'en' ? base : withFallback(base, (await dictionaries[locale]()) as Tree);
  return { locale, t: t as unknown as Dictionary };
}
