import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { kinds, type Kind } from '@/lib/data';
import { BudgetSlider } from './BudgetSlider';
import { PeopleStepper } from './PeopleStepper';
import { KindIcon } from './KindIcon';
import { Picker, type PickerOption } from './Picker';

type Props = {
  locale: Locale;
  t: Pick<Dictionary, 'searchBar' | 'kind' | 'search'>;
  regions: { id: string; name: string }[];
  countries: { id: string; regionId: string; name: string }[];
  /** Per regio/gebied: aantal plekken en een paar bekende namen (voor het keuzepaneel). */
  regionInfo?: Record<string, { count: number; examples: string[] }>;
  /** Aantal plekken per soort reis, en in totaal. */
  kindCounts?: Partial<Record<Kind | 'all', number>>;
};

/** Zoekbalk zoals bij een boekingssite. Gewoon HTML-formulier: werkt ook zonder JavaScript. */
export function SearchBar({ locale, t, regions, countries, regionInfo = {}, kindCounts = {} }: Props) {
  const field = 'flex min-w-0 flex-1 flex-col gap-1 rounded-2xl px-4 py-2.5 transition-colors hover:bg-sand/60';
  const label = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle';

  const count = (n: number | undefined) => (n === undefined ? undefined : String(n));
  // Waarheen: hele bereik, dan elk gebied (of regio met de landen erin)
  const whereOptions: PickerOption[] = [
    { value: '', label: t.searchBar.anywhere, meta: count(kindCounts.all), icon: <AreaIcon id="all" /> },
    ...regions.flatMap((r): PickerOption[] => [
      {
        value: `r:${r.id}`,
        label: r.name,
        hint: regionInfo[r.id]?.examples.join(' · '),
        meta: count(regionInfo[r.id]?.count),
        icon: <AreaIcon id={r.id} />,
      },
      ...countries
        .filter((c) => c.regionId === r.id)
        .map((c) => ({ value: `c:${c.id}`, label: c.name, icon: <AreaIcon id="country" /> })),
    ]),
  ];
  const kindOptions: PickerOption[] = [
    { value: '', label: t.kind.all, meta: count(kindCounts.all), icon: <KindIcon kind="" color="currentColor" size={20} /> },
    ...kinds.map((k) => ({
      value: k,
      label: t.kind[k],
      meta: count(kindCounts[k]),
      icon: <KindIcon kind={k} color="currentColor" size={20} />,
    })),
  ];

  return (
    <form
      action={`/${locale}/zoeken`}
      method="get"
      role="search"
      className="grid gap-1 rounded-[24px] border-4 border-[#5A4030]/80 bg-white p-2 text-ink shadow-xl md:grid-cols-2 lg:flex lg:flex-row lg:items-stretch lg:rounded-full"
    >
      <div className={`${field}`}>
        <span className={label}>{t.searchBar.where}</span>
        <Picker
          name="waar"
          label={t.searchBar.where}
          options={whereOptions}
          placement="up"
          multiple={{ done: t.searchBar.done, many: t.searchBar.manyAreas, placeholder: t.searchBar.pickWhere }}
        />
      </div>
      <div className={`${field}`}>
        <span className={label}>{t.kind.label}</span>
        <Picker
          name="soort"
          label={t.kind.label}
          options={kindOptions}
          placement="up"
          columns={2}
          multiple={{ done: t.searchBar.done, many: t.searchBar.many, placeholder: t.searchBar.pickKind }}
        />
      </div>
      <div className={`${field} lg:min-w-0 lg:flex-none`}>
        <PeopleStepper locale={locale} value={2} name="personen" t={t.search} />
      </div>
      <div className={`${field} lg:min-w-64`}>
        <BudgetSlider locale={locale} value={null} name="budget" t={t.search} />
      </div>
      <button
        type="submit"
        className="btn btn-primary min-h-14 px-8 md:self-center lg:min-h-0 lg:self-stretch"
      >
        {t.searchBar.submit}
      </button>
    </form>
  );
}

/** Lijnicoon per gebied: bergen (noord), rivier (zuid), meer met bos (west), golven (kust), kompas (alles). */
function AreaIcon({ id }: { id: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      {id === 'north' && (
        <g {...p}>
          <path d="M2 20l7-11 4 6 3-4 6 9z" />
          <path d="M7.5 11.5 9 9l1.6 2.4" />
        </g>
      )}
      {id === 'south' && (
        <g {...p}>
          <path d="M4 4c4 3 2 6 6 8s2 5 6 8" />
          <path d="M14 4c3 2 3 4 6 5" />
        </g>
      )}
      {id === 'west' && (
        <g {...p}>
          <ellipse cx="12" cy="16" rx="8" ry="3.5" />
          <path d="M8 12V7M8 7l-2.5 2.5M8 7l2.5 2.5M16 12V6M16 6l-3 3M16 6l3 3" />
        </g>
      )}
      {id === 'coast' && (
        <g {...p}>
          <path d="M3 15c2 0 2-1.5 4.5-1.5S9.5 15 12 15s2-1.5 4.5-1.5S18.5 15 21 15" />
          <path d="M3 19c2 0 2-1.5 4.5-1.5S9.5 19 12 19s2-1.5 4.5-1.5S18.5 19 21 19" />
          <circle cx="16" cy="7" r="3" />
        </g>
      )}
      {(id === 'all' || id === 'country' || !['north', 'south', 'west', 'coast'].includes(id)) && (
        <g {...p}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M15 9l-1.8 4.2L9 15l1.8-4.2z" />
        </g>
      )}
    </svg>
  );
}
