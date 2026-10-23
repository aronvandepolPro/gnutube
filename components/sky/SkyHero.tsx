import type { ReactNode } from 'react';
import type { TimeOfDay } from './SkyScene';

type Props = {
  /** Niet meer gebruikt (was de nachtscène); blijft voor bestaande aanroepen. */
  time?: TimeOfDay;
  title: string;
  em?: string;
  /** Klein label boven de kop, bv. soort reis en coördinaten. */
  kicker?: string;
  sub?: string;
  children?: ReactNode;
  /** Compacte versie: lager oranje vlak, zodat wat eronder staat meteen in beeld is. */
  compact?: boolean;
};

/** Kop voor binnenpagina's: oranje vlak met titel, net als op de homepage. */
export function SkyHero({ title, em, kicker, sub, children, compact = false }: Props) {
  return (
    <section className="relative overflow-hidden bg-brand text-[#2A1F17]">
      <div className="pointer-events-none absolute -right-32 -top-32 h-[380px] w-[380px] rounded-full bg-white/15" aria-hidden="true" />
      <div className={`relative mx-auto flex w-full max-w-[1240px] flex-col px-4 sm:px-8 ${compact ? 'gap-1.5 pb-6 pt-6 md:pb-7 md:pt-7' : 'gap-3 pb-12 pt-12 md:pb-14 md:pt-14'}`}>
        {kicker && <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#5A4030]">{kicker}</span>}
        <h1 className={`m-0 max-w-[1000px] font-display leading-[1.05] ${compact ? 'text-[clamp(30px,3.6vw,42px)]' : 'text-[clamp(36px,5vw,56px)]'}`}>
          {title}
          {em && <> {em}</>}
        </h1>
        {sub && <p className={`m-0 max-w-[640px] leading-relaxed text-[#2A1F17]/85 ${compact ? 'text-[16px]' : 'text-[18px]'}`}>{sub}</p>}
        {children && <div className="mt-2 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}
