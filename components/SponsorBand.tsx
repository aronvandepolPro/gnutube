import Link from 'next/link';
import data from '@/data/sponsors.json';

export type Sponsor = { name: string; logo: string; url: string };

type Props = {
  labels: { title: string; slot: string; become: string };
  /** Plekken (naam + coördinaten) die in de band meelopen zolang er nog geen sponsoren zijn. */
  places: { name: string; coords: string }[];
  /** Waar "Sponsor worden" naartoe gaat. */
  becomeHref: string;
};

/**
 * Sponsorrij op de homepage (op de plek waar de Prism-template partnerlogo's heeft).
 * - Met sponsoren in data/sponsors.json: hun logo's lopen als een band voorbij (stilgezet bij "minder beweging"),
 *   elk met een link naar de sponsor (rel="sponsored").
 * - Zonder sponsoren: de band met plaatsnamen en coördinaten loopt door zoals voorheen, met om de drie
 *   namen een lege plek "Jouw logo hier". Er staan bewust geen voorbeeldsponsoren.
 * Het label "Sponsoren" verschijnt pas als er echte sponsoren zijn, zodat betaalde plaatsing dan zichtbaar gemarkeerd is.
 */
export function SponsorBand({ labels, places, becomeHref }: Props) {
  const sponsors = (data.sponsors as Sponsor[]).filter((s) => s.name && s.logo);
  // Bij weinig sponsoren de reeks herhalen, zodat de band altijd de hele breedte vult.
  const reps = sponsors.length ? Math.ceil(8 / sponsors.length) : 0;
  const run = Array.from({ length: reps }, () => sponsors).flat();
  // Zonder sponsoren: plaatsnamen met om de drie een lege sponsorplek
  const filler = places.flatMap((p, i) => (i % 3 === 2 ? [p, { slot: true as const }] : [p])) as (
    | { name: string; coords: string; slot?: undefined }
    | { slot: true; name?: undefined; coords?: undefined }
  )[];

  return (
    <section aria-label={labels.title} className="border-b border-rule bg-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-4 py-5 sm:px-8 md:flex-row md:items-center md:gap-8">
        {/* Het label staat er alleen als er echte sponsoren zijn: betaalde plaatsing moet dan zichtbaar gemarkeerd zijn */}
        {sponsors.length > 0 && <span className="eyebrow shrink-0">{labels.title}</span>}

        {sponsors.length > 0 ? (
          <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
            <ul className="kt-ticker m-0 flex w-max list-none items-center gap-16 p-0">
              {/* Reeks twee keer achter elkaar voor een naadloze band; alleen de eerste set is voor schermlezers */}
              {[...run, ...run].map((s, i) => (
                <li key={i} aria-hidden={i >= sponsors.length ? true : undefined}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    tabIndex={i >= sponsors.length ? -1 : undefined}
                    className="flex h-12 items-center opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- logo's van wisselende afmetingen, klein en zonder layout-shift-risico */}
                    <img src={s.logo} alt={s.name} className="h-9 w-auto max-w-[160px] object-contain" loading="lazy" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]" aria-hidden="true">
            <div className="kt-ticker flex w-max items-center gap-12 whitespace-nowrap">
              {[...filler, ...filler].map((item, i) =>
                item.slot ? (
                  <span key={i} className="flex h-12 items-center rounded-2xl border border-dashed border-[#D6D3D1] px-6 text-[13px] text-subtle">
                    {labels.slot}
                  </span>
                ) : (
                  <span key={i} className="flex items-baseline gap-3 text-subtle">
                    <span className="text-[18px] font-semibold text-muted">{item.name}</span>
                    <span className="text-[12px] tracking-wide">{item.coords}</span>
                  </span>
                ),
              )}
            </div>
          </div>
        )}

        <Link href={becomeHref} className="btn btn-ghost shrink-0 !min-h-11 !text-[14px]">
          {labels.become} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
