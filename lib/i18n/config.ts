export const locales = ['nl', 'en', 'de', 'fr', 'es', 'it', 'pt', 'sw'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'nl';

/** BCP 47-tags voor Intl-formattering (getallen, bedragen in euro). */
export const localeTag: Record<Locale, string> = {
  nl: 'nl-NL',
  en: 'en-GB',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  sw: 'sw-TZ',
};

/** Taal waarop wordt teruggevallen als een vertaling ontbreekt. */
export const fallbackLocale: Locale = 'en';

export const localeLabel: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  sw: 'Kiswahili',
};

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
