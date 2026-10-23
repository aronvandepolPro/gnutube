'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';

type Props = {
  locale: Locale;
  value: number;
  t: { people: string; peopleN: string; fewer: string; more: string };
  onChange?: (n: number) => void;
  /** In een gewoon formulier: naam van het verborgen veld. */
  name?: string;
};

/** Aantal reizigers (minstens 1, geen maximum) met min/plus-knoppen; het getal is ook in te typen. */
export function PeopleStepper({ locale, value, t, onChange, name }: Props) {
  const [n, setN] = useState(value);
  const [text, setText] = useState(String(value));
  const set = (v: number) => {
    const next = Math.max(1, Math.round(v) || 1);
    setN(next);
    setText(String(next));
    onChange?.(next);
  };
  const btn = 'grid h-9 w-9 shrink-0 place-items-center rounded-full border border-rule bg-white text-[18px] text-ink transition-colors hover:border-brand-dark disabled:opacity-30';
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">{t.people}</span>
      <div className="flex items-center gap-2" role="group" aria-label={t.people}>
        <button type="button" className={btn} onClick={() => set(n - 1)} disabled={n <= 1} aria-label={t.fewer}>−</button>
        <label className="flex items-center gap-1.5 text-[15px] font-medium text-ink">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={text}
            aria-label={t.people}
            onChange={(e) => {
              setText(e.target.value);
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v >= 1) {
                setN(Math.round(v));
                onChange?.(Math.round(v));
              }
            }}
            onFocus={(e) => e.target.select()}
            onBlur={() => set(Number(text))}
            className="w-14 rounded-lg border border-rule bg-white px-1.5 py-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span aria-hidden="true">{format(t.peopleN, { n }, locale).replace(/\s*[\d.,]+\s*/, ' ').trim()}</span>
        </label>
        <button type="button" className={btn} onClick={() => set(n + 1)} aria-label={t.more}>+</button>
      </div>
      {name && <input type="hidden" name={name} value={n} />}
    </div>
  );
}
