import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SkyHero } from '@/components/sky/SkyHero';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.terms.title };
}

/**
 * Voorwaarden (CONCEPT) voor Gnutube als tussenpersoon: de afspraak over de reis is tussen reiziger en bedrijf.
 * De tekst moet een jurist nakijken en aanvullen ([rechte haken]) voordat Gnutube live gaat.
 */
export default async function TermsPage() {
  const { t } = await getDictionary();
  const c = t.terms;
  const sections = [
    { h: c.s1h, p: c.s1p },
    { h: c.s2h, p: c.s2p },
    { h: c.s3h, p: c.s3p },
    { h: c.s4h, p: c.s4p },
    { h: c.s5h, p: c.s5p },
    { h: c.s6h, p: c.s6p },
    { h: c.s7h, p: c.s7p },
    { h: c.s8h, p: c.s8p },
    { h: c.s9h, p: c.s9p },
    { h: c.s10h, p: c.s10p },
  ];
  return (
    <>
      <SkyHero title={c.title} sub={c.intro} />
      <div className="mx-auto max-w-[760px] px-4 py-12 sm:px-8">
        <p className="m-0 rounded-2xl bg-[#FFF4E5] p-4 text-[14px] text-[#7A4A12]">⚠️ {c.draft}</p>
        {sections.map((s, i) => (
          <section key={s.h} className="mt-10">
            <h2 className="m-0 text-[22px] font-semibold text-ink">{i + 1}. {s.h}</h2>
            <p className="m-0 mt-2 text-[16px] leading-relaxed text-muted">{s.p}</p>
          </section>
        ))}
      </div>
    </>
  );
}
