import type { Kind } from './data';

/** Vaste kleur per soort reis: lichtpuntjes op de kaart en de wereldbol, stipjes bij plekken. */
export const KIND_COLOR: Record<Kind, string> = {
  safari: '#F2B44F',
  island: '#2BB3C0',
  beach: '#F4A08C',
  lake: '#5B9BE6',
  nature: '#8EE08A',
  mountain: '#9DA9F5',
  culture: '#E7C9FF',
  city: '#C99A6E',
};

/** Donkere variant per soort reis, voor tekst op een lichte ondergrond (de stempels op de kaarten). */
export const KIND_INK: Record<Kind, string> = {
  safari: '#93600F',
  island: '#0E6E77',
  beach: '#A4452F',
  lake: '#235A9C',
  nature: '#38722F',
  mountain: '#3F4BA0',
  culture: '#6E45A3',
  city: '#7A5130',
};
