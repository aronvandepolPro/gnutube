import data from '@/data/place-photos.json';

/** Foto van een plek (uit data/place-photos.json); null = nog geen foto, dan tonen we het getekende affiche. */
export type PlacePhoto = {
  src: string;
  /** Korte naamsvermelding op de foto (fotograaf · licentie). */
  by?: string;
  source?: string;
  pos?: string;
  /** Pagina van de foto bij de bron (voor de fotoverantwoording). */
  url?: string;
  license?: string;
  licenseUrl?: string;
};

const photos = new Map(
  Object.entries(data as Record<string, unknown>)
    .filter(([k, v]) => !k.startsWith('_') && v && typeof (v as PlacePhoto).src === 'string')
    .map(([k, v]) => [k, v as PlacePhoto]),
);

export function getPlacePhoto(id: string): PlacePhoto | null {
  return photos.get(id) ?? null;
}

/** Alle foto's met een bronpagina, voor de pagina Fotoverantwoording. */
export function getPhotoCredits(): (PlacePhoto & { id: string })[] {
  return [...photos.entries()].filter(([, p]) => p.url).map(([id, p]) => ({ id, ...p }));
}
