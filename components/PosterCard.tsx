import Link from 'next/link';
import type { Place } from '@/lib/data';
import { Poster } from './Poster';

type Props = {
  place: Place;
  href: string;
  coords: string;
  className?: string;
  size?: 'sm' | 'md';
};

/** Affiche in een dun kader, met naam en coördinaten eronder. */
export function PosterCard({ place, href, coords, className = '', size = 'md' }: Props) {
  return (
    <Link href={href} className={`kt-poster panel group block p-2 pb-0 ${className}`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[16px]">
        <Poster
          id={place.id}
          kind={place.kind}
          mountain={place.mountain}
          hasWater={place.hasWater}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div className="flex flex-col gap-0.5 px-2 pb-3 pt-3">
        <span className={`font-display italic leading-tight text-ink ${size === 'sm' ? 'text-[20px]' : 'text-[24px]'}`}>
          {place.name}
        </span>
        <span className="text-[11px] tracking-wide text-ink/45">{coords}</span>
      </div>
    </Link>
  );
}
