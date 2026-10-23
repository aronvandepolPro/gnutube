import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPlaces } from '@/lib/data';
import { SkyHero } from '@/components/sky/SkyHero';
import { PostForm } from './PostForm';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.post.title };
}

/**
 * Deel je reisvideo: reizigers sturen een link naar hun eigen (openbare) TikTok-video van een plek in.
 * Geen upload: de video blijft bij de maker op TikTok (rechten op muziek regelt TikTok; verwijdert de maker hem daar,
 * dan verdwijnt hij ook hier). Elke inzending wordt eerst bekeken voordat hij op Gnutube komt.
 * Versturen staat nog uit: daarvoor is een database en moderatie nodig (zie PLACEHOLDERS.md).
 */
export default async function PostPage() {
  const { locale, t } = await getDictionary();
  const p = t.post;
  const places = getPlaces(locale)
    .filter((x) => !x.advisory)
    .map((x) => ({ id: x.id, name: x.name }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  const rules = [p.rule1, p.rule2, p.rule3, p.rule4, p.rule5];
  return (
    <>
      <SkyHero title={p.title} sub={p.intro} />
      <div className="mx-auto grid max-w-[1120px] gap-10 px-4 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Suspense fallback={<div className="panel h-[600px]" />}>
          <PostForm places={places} t={p} />
        </Suspense>
        <aside className="flex flex-col gap-6">
          <section className="rounded-3xl bg-sand p-6">
            <h2 className="m-0 text-[20px] font-semibold text-ink">📋 {p.rulesTitle}</h2>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0 text-[15px] text-muted">
              {rules.map((r) => (
                <li key={r} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-3xl border border-rule p-6">
            <h2 className="m-0 text-[20px] font-semibold text-ink">🔎 {p.howTitle}</h2>
            <ol className="m-0 mt-3 flex list-decimal flex-col gap-2 pl-5 text-[15px] text-muted">
              <li>{p.how1}</li>
              <li>{p.how2}</li>
              <li>{p.how3}</li>
            </ol>
          </section>
          <section className="rounded-3xl border border-rule p-6">
            <h2 className="m-0 text-[20px] font-semibold text-ink">🚩 {p.reportTitle}</h2>
            <p className="m-0 mt-2 text-[15px] text-muted">{p.reportText}</p>
          </section>
        </aside>
      </div>
    </>
  );
}
