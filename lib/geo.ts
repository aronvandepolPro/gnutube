import { localeTag, type Locale } from '@/lib/i18n/config';

export type Compass = { N: string; S: string; E: string; W: string };

/** "3,3° Z  36,9° O" — met de windrichtingen en het decimaalteken van de taal. */
export function coordText(lat: number, lon: number, compass: Compass, locale: Locale) {
  const f = (n: number) =>
    Math.abs(n).toLocaleString(localeTag[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${f(lat)}° ${lat < 0 ? compass.S : compass.N}  ${f(lon)}° ${lon < 0 ? compass.W : compass.E}`;
}
