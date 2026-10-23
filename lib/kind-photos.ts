import type { Kind } from './data';

/**
 * Foto per soort reis (homepage, 'Reizen per soort'). Alle foto's zijn in Tanzania genomen en komen van Unsplash
 * (Unsplash-licentie: gratis te gebruiken, ook commercieel; naamsvermelding niet verplicht, wel netjes).
 * De bestanden staan in public/kinds/ (1400 px breed); 'page' is de bronpagina met fotograaf.
 * Gekozen op 15 oktober 2026 (tweede keuze, allemaal gecontroleerd op een plek in Tanzania). Vervang ze later door eigen foto's of foto's van partners.
 */
/** by = fotograaf (leeg = geen naamsvermelding op de kaart, bv. bij eigen foto's). */
export type KindPhoto = { src: string; pos: string; by: string; page: string; place: string };


export const KIND_PHOTO: Record<Kind, KindPhoto> = {
  safari: {
    src: '/kinds/safari-2.jpg',
    pos: '50% 55%',
    by: 'Mike Holford',
    page: 'https://unsplash.com/photos/lion-on-ground-during-daytime-xHnb8UeZnmg',
    place: 'Tanzania',
  },
  island: {
    src: '/kinds/eilanden-2.jpg',
    pos: '50% 50%',
    by: 'Jack Balke',
    page: 'https://unsplash.com/photos/tropical-resort-with-bungalows-on-turquoise-water-JvvfgHodZUc',
    place: 'Zanzibar',
  },
  beach: {
    src: '/kinds/strand-2.jpg',
    pos: '50% 55%',
    by: 'Polly Sadler',
    page: 'https://unsplash.com/photos/a-white-sandy-beach-with-houses-on-it-glxZAuaYH_M',
    place: 'Nungwi, Zanzibar',
  },
  lake: {
    src: '/kinds/meren-2.jpg',
    pos: '50% 55%',
    by: 'Omar',
    page: 'https://unsplash.com/photos/a-body-of-water-surrounded-by-rocks-and-grass-U0mR2l1wodc',
    place: 'Victoriameer, Musoma',
  },
  nature: {
    src: '/kinds/natuur-2.jpg',
    pos: '50% 60%',
    by: 'Yoel Winkler',
    page: 'https://unsplash.com/photos/a-wooden-bridge-in-the-woods-Llx5aP0m0nc',
    place: 'Zanzibar',
  },
  mountain: {
    src: '/kinds/bergen-2.jpg',
    pos: '50% 45%',
    by: 'Nichika Sakurai',
    page: 'https://unsplash.com/photos/a-view-of-a-snow-capped-mountain-through-the-leaves-of-a-corn-field-WMDSjqVV71c',
    place: 'Kilimanjaro, vanuit Moshi',
  },
  culture: {
    src: '/kinds/cultuur-2.jpg',
    pos: '50% 60%',
    by: 'Pieter Bouwer',
    page: 'https://unsplash.com/photos/people-on-brown-field-near-trees-under-cloudy-sky-during-daytime-8IctEW-hJZI',
    place: 'Tanzania',
  },
  city: {
    src: '/kinds/steden-2.jpg',
    pos: '50% 55%',
    by: 'Moses Londo',
    page: 'https://unsplash.com/photos/a-large-body-of-water-with-a-boat-in-the-middle-of-it-1bubgYf5zeY',
    place: 'Dar es Salaam',
  },
};
