import Image from 'next/image';
import type { Kind } from '@/lib/data';
import { getPlacePhoto } from '@/lib/place-photos';
import { Poster } from './Poster';

type Props = {
  id: string;
  kind: Kind;
  mountain: boolean;
  hasWater: boolean;
  /** Klassen voor de foto of het affiche (bv. h-full w-full, hover-zoom). */
  className?: string;
  /** Hint voor de beeldgrootte (next/image). */
  sizes?: string;
  priority?: boolean;
};

/**
 * Beeld van een plek: de eigen foto als die er is (data/place-photos.json), anders het getekende affiche.
 * Vult de ouder (die moet 'relative' zijn en een hoogte hebben).
 */
export function PlaceImage({ id, kind, mountain, hasWater, className = '', sizes = '(min-width: 1024px) 25vw, 100vw', priority }: Props) {
  const photo = getPlacePhoto(id);
  if (!photo) return <Poster id={id} kind={kind} mountain={mountain} hasWater={hasWater} className={`absolute inset-0 h-full w-full ${className}`} />;
  return (
    <>
      <Image
        src={photo.src}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${className}`}
        style={{ objectPosition: photo.pos ?? '50% 50%' }}
      />
      {photo.by && (
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/45 px-2 py-0.5 text-[10.5px] text-white/90 backdrop-blur-sm">
          {photo.by}
        </span>
      )}
    </>
  );
}
