'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BlurHeading, blurDuration } from './sky/BlurHeading';
import './photo-hero.css';

type Props = {
  lineA: string;
  lineB: string;
  sub: string;
  cta: { href: string; label: string };
  cta2: { href: string; label: string };
  scrollHint: string;
  /** "Foto {n} van {total}" */
  labels: { slide: string };
};

/** Foto's in public/hero/ (sfeerbeelden, geen specifieke plekken; zie PLACEHOLDERS.md). */
const SLIDES = ['/hero/waterval.jpg', '/hero/strand.jpg', '/hero/kilimanjaro.jpg'];
const INTERVAL = 7000;

/**
 * Homepage-kop op volledig scherm: drie foto's die zacht in elkaar overlopen, met een langzame zoom.
 * Rechts stipjes om een foto te kiezen (daarna wisselt hij niet meer vanzelf); staat ook stil bij toetsenbordfocus in de kop en bij "minder beweging".
 */
export function PhotoHero({ lineA, lineB, sub, cta, cta2, scrollHint, labels }: Props) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  // Toetsenbordfocus in de kop: dan even niet wisselen
  const [focused, setFocused] = useState(false);
  const after = blurDuration(lineA, lineB);

  useEffect(() => {
    if (paused || focused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setTimeout(() => setActive((a) => (a + 1) % SLIDES.length), INTERVAL);
    return () => window.clearTimeout(id);
  }, [active, paused, focused]);

  return (
    <section
      className="relative -mt-[73px] h-[calc(100svh-150px)] min-h-[560px] md:h-[calc(100svh-90px)] md:min-h-[640px] overflow-hidden bg-black text-white"
      onFocus={(e) => setFocused(e.target.matches(':focus-visible'))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {/* Foto's */}
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${i === active ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden="true"
        >
          <Image
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={`object-cover ${i === active ? 'kt-hero-zoom' : ''}`}
          />
        </div>
      ))}

      {/* Verlopen voor leesbare tekst: links donker, boven voor het menu, onder naar de pagina */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

      {/* Tekst en knoppen */}
      <div className="relative mx-auto flex h-full max-w-[1240px] flex-col justify-center gap-6 px-4 pt-16 sm:px-8">
        <BlurHeading
          text={lineA}
          em={lineB}
          className="m-0 max-w-[760px] font-display text-[clamp(56px,8.5vw,132px)] font-normal italic leading-[0.92] [text-shadow:0_2px_30px_rgb(0_0_0/0.35)]"
        />
        <p
          className="kt-blur-in m-0 max-w-[520px] text-[18px] leading-relaxed text-white/90 [text-shadow:0_1px_14px_rgb(0_0_0/0.45)]"
          style={{ animationDelay: `${after + 150}ms` }}
        >
          {sub}
        </p>
        <div className="kt-blur-in flex flex-wrap gap-3" style={{ animationDelay: `${after + 300}ms` }}>
          <Link href={cta.href} className="btn btn-primary">
            {cta.label} <span aria-hidden="true">→</span>
          </Link>
          <Link href={cta2.href} className="btn btn-ghost">
            {cta2.label}
          </Link>
        </div>
      </div>

      {/* Stipjes */}
      <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 sm:bottom-auto sm:left-auto sm:right-8 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0 sm:flex-col sm:gap-3">
        {SLIDES.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => {
              // Zelf een foto kiezen = automatisch wisselen stopt
              setActive(i);
              setPaused(true);
            }}
            aria-label={labels.slide.replace('{n}', String(i + 1)).replace('{total}', String(SLIDES.length))}
            aria-current={i === active}
            className="grid h-8 w-8 place-items-center rounded-full"
          >
            <span className={`block h-3 w-3 rounded-full border-2 border-white transition-colors ${i === active ? 'bg-white' : 'bg-transparent'}`} />
          </button>
        ))}
      </div>

      <span
        className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.14em] text-white/85 sm:bottom-8 sm:text-[12px]"
        aria-hidden="true"
      >
        ↓ {scrollHint}
      </span>
    </section>
  );
}
