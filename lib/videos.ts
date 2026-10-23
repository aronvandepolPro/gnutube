/**
 * TikTok-video's per plek, uit data/videos.json. Ze worden ingesloten via de officiële TikTok-speler
 * (niet gedownload); de naam van de maker staat er altijd bij. Toevoegen: link, plek en maker in het JSON-bestand.
 */
import data from '@/data/videos.json';

export type Video = {
  placeId: string;
  tiktokId: string;
  url: string;
  /** TikTok-gebruikersnaam zonder @ */
  author: string;
  authorName: string;
  title: string;
  /** true = gecontroleerd via TikTok oEmbed; false = echte link uit zoekresultaten, nog na te lopen. */
  checked?: boolean;
  /** Ingestuurd door een reiziger via Gnutube (goedgekeurd door beheer). */
  traveller?: boolean;
};

const videos = (data.videos as Video[]).filter((v) => /^\d+$/.test(v.tiktokId) && v.author);

export function getVideos(placeId?: string): Video[] {
  return placeId ? videos.filter((v) => v.placeId === placeId) : videos;
}
