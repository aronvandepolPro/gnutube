'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { readRoute, updateRoute } from '@/lib/trip-store';
import { PeopleStepper } from './PeopleStepper';
import { useMounted } from '@/lib/use-mounted';

export type TripSetupLabels = {
  title: string;
  sub: string;
  nameLabel: string;
  namePlaceholder: string;
  whenLabel: string;
  whenDate: string;
  whenMonth: string;
  whenUnknown: string;
  monthLabel: string;
  save: string;
  skip: string;
  people: string;
  peopleN: string;
  fewer: string;
  more: string;
};

type When = 'date' | 'month' | 'unknown';

/**
 * 'Maak je reis': naam, wanneer (precieze datum, ongeveer een maand, of nog niet bekend) en aantal reizigers.
 * Wordt gebruikt als venster bij de eerste keer naar rechts vegen, en in Mijn reis om je reis aan te passen.
 */
export function TripSetup(props: { locale: Locale; t: TripSetupLabels; onDone: () => void; showSkip?: boolean }) {
  // Alleen in de browser: het formulier leest je opgeslagen reis en de datum van vandaag
  const mounted = useMounted();
  return mounted ? <TripSetupForm {...props} /> : null;
}

function TripSetupForm({ locale, t, onDone, showSkip = true }: { locale: Locale; t: TripSetupLabels; onDone: () => void; showSkip?: boolean }) {
  const r = readRoute();
  const [name, setName] = useState(r.name ?? '');
  const [when, setWhen] = useState<When>(r.start ? (r.start.endsWith('-01') ? 'month' : 'date') : 'unknown');
  const [date, setDate] = useState(r.start ?? '');
  // Maand + jaar (voor 'ongeveer'): standaard volgende maand
  const now = new Date();
  const [ym, setYm] = useState(() => (r.start ? r.start.slice(0, 7) : `${now.getFullYear()}-${String(((now.getMonth() + 1) % 12) + 1).padStart(2, '0')}`));
  const [people, setPeople] = useState(r.people || 2);

  // Komende 18 maanden om uit te kiezen
  const months = Array.from({ length: 18 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    };
  });

  const save = () => {
    const start = when === 'date' ? date || null : when === 'month' ? `${ym}-01` : null;
    updateRoute({ name: name.trim(), start, people, setupDone: true });
    onDone();
  };
  const skip = () => {
    updateRoute({ setupDone: true });
    onDone();
  };

  const tab = (w: When, label: string) => (
    <button type="button" key={w} aria-pressed={when === w} onClick={() => setWhen(w)} className="chip !min-h-10">
      {label}
    </button>
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="eyebrow">{t.nameLabel}</span>
        <input className="field" value={name} maxLength={60} placeholder={t.namePlaceholder} onChange={(e) => setName(e.target.value)} />
      </label>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="eyebrow mb-1">{t.whenLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {tab('date', t.whenDate)}
          {tab('month', t.whenMonth)}
          {tab('unknown', t.whenUnknown)}
        </div>
        {when === 'date' && (
          <input type="date" className="field !min-h-11 w-fit" value={date} min={now.toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} aria-label={t.whenDate} />
        )}
        {when === 'month' && (
          <select className="field !min-h-11 w-fit" value={ym} onChange={(e) => setYm(e.target.value)} aria-label={t.monthLabel}>
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        )}
      </fieldset>
      <PeopleStepper locale={locale} value={people} t={t} onChange={setPeople} />
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" className="btn btn-primary">✓ {t.save}</button>
        {showSkip && (
          <button type="button" onClick={skip} className="btn btn-ghost">
            {t.skip}
          </button>
        )}
      </div>
    </form>
  );
}
