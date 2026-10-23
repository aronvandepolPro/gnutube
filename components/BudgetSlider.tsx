'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';
import { euro, maxFor, stepIndexFor, stepsFor, type BudgetMode } from '@/lib/budget';

type Props = {
  locale: Locale;
  /** Huidige maximumprijs; null = geen grens. */
  value: number | null;
  /** Per persoon per nacht, of voor de hele reis. */
  mode?: BudgetMode;
  t: {
    budget: string;
    budgetUpTo: string;
    budgetNoLimit: string;
    budgetModeNight: string;
    budgetModeTrip: string;
    budgetTripUpTo: string;
  };
  /** Wordt aangeroepen na loslaten / even stilstaan, niet bij elke pixel. */
  onCommit?: (value: number | null, mode: BudgetMode) => void;
  /** In een gewoon formulier: naam van het verborgen veld dat meegestuurd wordt (plus `${name}soort`). */
  name?: string;
};

/** Budgetschuif: per persoon per nacht (€100–€5.000+) of voor de hele reis (€500–€30.000+). */
export function BudgetSlider({ locale, value, mode: initialMode = 'night', t, onCommit, name }: Props) {
  const id = useId();
  const [mode, setMode] = useState<BudgetMode>(initialMode);
  const [index, setIndex] = useState(() => stepIndexFor(value, initialMode));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const steps = stepsFor(mode);
  const last = steps.length - 1;
  const amount = index === last ? null : steps[index];
  const label =
    amount === null
      ? `${euro(maxFor(mode), locale)}+ · ${t.budgetNoLimit}`
      : format(mode === 'trip' ? t.budgetTripUpTo : t.budgetUpTo, { max: euro(amount, locale) }, locale);

  const commit = (i: number, m: BudgetMode) => {
    if (!onCommit) return;
    if (timer.current) clearTimeout(timer.current);
    const s = stepsFor(m);
    timer.current = setTimeout(() => onCommit(i === s.length - 1 ? null : s[i], m), 250);
  };
  const change = (i: number) => {
    setIndex(i);
    commit(i, mode);
  };
  const switchMode = (m: BudgetMode) => {
    if (m === mode) return;
    setMode(m);
    // Andere schaal: opnieuw beginnen zonder grens
    const i = stepsFor(m).length - 1;
    setIndex(i);
    commit(i, m);
  };

  const pct = (index / last) * 100;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">{t.budget}</label>
        <span className="relative z-10 flex shrink-0 rounded-full border border-rule bg-white p-0.5 shadow-sm" role="group" aria-label={t.budget}>
          {(['night', 'trip'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => switchMode(m)}
              className="min-h-8 rounded-full px-3 text-[12.5px] font-semibold text-ink transition-colors hover:bg-sand aria-pressed:bg-brand-dark aria-pressed:text-white aria-pressed:hover:bg-brand-dark"
            >
              {m === 'night' ? t.budgetModeNight : t.budgetModeTrip}
            </button>
          ))}
        </span>
      </div>
      <span className="text-[14px] text-ink" aria-hidden="true">{label}</span>
      <input
        id={id}
        type="range"
        min={0}
        max={last}
        step={1}
        value={index}
        onChange={(e) => change(Number(e.target.value))}
        aria-valuetext={label}
        className="kt-range h-9 w-full min-w-48 cursor-pointer"
        style={{ ['--kt-fill' as string]: `${pct}%` }}
      />
      <div className="flex justify-between text-[11px] text-subtle" aria-hidden="true">
        <span>{euro(steps[0], locale)}</span>
        <span>{euro(maxFor(mode), locale)}+</span>
      </div>
      {name && (
        <>
          <input type="hidden" name={name} value={amount ?? ''} />
          {mode === 'trip' && <input type="hidden" name={`${name}soort`} value="totaal" />}
        </>
      )}
    </div>
  );
}
