import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SkyHero } from '@/components/sky/SkyHero';
import { PartnerGnu } from '@/components/partners/PartnerGnu';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.partners.title };
}

/** Voor partners: waarom, voor wie, hoe het werkt en het aanmeldformulier. De gnoe heet je welkom. */
export default async function PartnersPage() {
  const { locale, t } = await getDictionary();
  const p = t.partners;
  const why = [
    { icon: '🎬', h: p.why1h, p: p.why1p },
    { icon: '🧳', h: p.why2h, p: p.why2p },
    { icon: '🌍', h: p.why3h, p: p.why3p },
  ];
  const steps = [p.step1, p.step2, p.step3];
  return (
    <>
      <SkyHero kicker={p.kicker} title={p.title} sub={p.intro}>
        <Link href={`/${locale}/partners/aanmelden`} className="btn btn-primary">🤝 {p.cta}</Link>
      </SkyHero>

      <div className="mx-auto max-w-[1120px] px-4 py-14 sm:px-8">
        <section aria-labelledby="why">
          <h2 id="why" className="m-0 text-[30px] font-semibold text-ink">{p.whyTitle}</h2>
          <ul className="m-0 mt-6 grid list-none gap-4 p-0 md:grid-cols-3">
            {why.map((w) => (
              <li key={w.h} className="panel flex flex-col gap-2 p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-[26px]" aria-hidden="true">{w.icon}</span>
                <h3 className="m-0 text-[19px] font-semibold text-ink">{w.h}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-muted">{w.p}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how" className="mt-16 rounded-3xl bg-sand p-6 sm:p-10">
          <h2 id="how" className="m-0 text-[30px] font-semibold text-ink">{p.howTitle}</h2>
          <ol className="m-0 mt-6 grid list-none gap-6 p-0 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-[18px] font-bold text-white">{i + 1}</span>
                <p className="m-0 pt-2 text-[16px] text-ink">{s}</p>
              </li>
            ))}
          </ol>
          <p className="m-0 mt-6 text-[14px] text-muted">{p.honest}</p>
        </section>

        <section className="mt-16 flex flex-col items-start gap-4 rounded-3xl bg-brand p-8 text-[#2A1F17] sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="m-0 text-[28px] font-semibold">{p.formTitle}</h2>
            <p className="m-0 mt-1 text-[16px] text-[#2A1F17]/85">{p.formSub}</p>
          </div>
          <Link href={`/${locale}/partners/aanmelden`} className="btn btn-primary shrink-0 !min-h-14 !px-8 !text-[17px]">🤝 {p.cta}</Link>
        </section>
      </div>

      <PartnerGnu hello={p.gnuHelloInfo} sent={p.gnuSent} close={p.close} />
    </>
  );
}
