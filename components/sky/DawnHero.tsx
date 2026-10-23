import Link from 'next/link';
import { SafariScene } from './SafariScene';
import { BlurHeading, blurDuration } from './BlurHeading';

type Props = {
  lineA: string;
  lineB: string;
  sub: string;
  cta: { href: string; label: string };
  cta2: { href: string; label: string };
  scrollHint: string;
  labels: Record<'savanna' | 'wetland' | 'desert' | 'forest' | 'coast', string>;
};

/** Homepage-kop op volledig scherm met de bewegende safariscène bij daglicht (op de plek van Prism's video). Donkere tekst op lichte lucht. */
export function DawnHero({ lineA, lineB, sub, cta, cta2, scrollHint, labels }: Props) {
  const after = blurDuration(lineA, lineB);
  return (
    <section className="relative -mt-[73px] h-[100svh] min-h-[680px] overflow-hidden bg-[#D6EBF3] text-black">
      <SafariScene labels={labels} />
      <div className="relative mx-auto flex h-full max-w-[1240px] flex-col items-center justify-start gap-7 px-4 pb-40 pt-[18vh] text-center sm:px-8">
        <BlurHeading
          text={lineA}
          em={lineB}
          className="m-0 max-w-[1100px] font-display text-[clamp(60px,10vw,156px)] font-normal italic leading-[0.9] [text-shadow:0_2px_24px_rgb(255_255_255/0.6)]"
        />
        <p className="kt-blur-in m-0 max-w-[560px] text-[18px] leading-relaxed text-black/75 [text-shadow:0_1px_12px_rgb(255_255_255/0.7)]" style={{ animationDelay: `${after + 150}ms` }}>
          {sub}
        </p>
        <div className="kt-blur-in flex flex-wrap justify-center gap-3" style={{ animationDelay: `${after + 300}ms` }}>
          <Link href={cta.href} className="btn bg-black text-white hover:bg-black/80">
            {cta.label}
          </Link>
          <Link href={cta2.href} className="btn border border-black/25 bg-white/40 text-black backdrop-blur-md hover:bg-white/70">
            {cta2.label}
          </Link>
        </div>
      </div>
      <span className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[12px] font-medium uppercase tracking-[0.14em] text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]" aria-hidden="true">
        ↓ {scrollHint}
      </span>
    </section>
  );
}
