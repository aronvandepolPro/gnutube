import { localeTag, type Locale } from '@/lib/i18n/config';

/**
 * Stappen van de budgetschuif: maximumprijs per persoon per nacht, in euro.
 * Niet-lineair: fijne stappen onderaan (waar de meeste prijzen liggen), grove bovenaan.
 * De laatste stap is "5000+" = geen grens. Pas de reeks hier aan als jullie een andere schaal willen.
 */
const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

export const BUDGET_MIN = 100;
export const BUDGET_MAX = 5000;

export const budgetSteps: number[] = [
  ...range(100, 500, 50),
  ...range(600, 1000, 100),
  ...range(1250, 2000, 250),
  ...range(2500, 5000, 500),
];

/** Uit de URL: een getal binnen de schaal, anders geen budget (= geen grens). */
export function parseBudget(value: string | null): number | null {
  const n = Number(value);
  if (!value || !Number.isFinite(n) || n < BUDGET_MIN || n >= BUDGET_MAX) return null;
  return n;
}

/** Index op de schuif voor een bedrag (dichtstbijzijnde stap). */
export function stepIndex(max: number | null) {
  if (max === null) return budgetSteps.length - 1;
  let best = 0;
  budgetSteps.forEach((s, i) => {
    if (Math.abs(s - max) < Math.abs(budgetSteps[best] - max)) best = i;
  });
  return best;
}

export function inBudget(price: number, max: number | null) {
  return max === null || price <= max;
}

export function euro(amount: number, locale: Locale) {
  return new Intl.NumberFormat(localeTag[locale], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

/**
 * Budget per persoon per nacht ('night', standaard) of voor de hele reis ('trip', alle reizigers samen).
 * Hele reis: €500 tot €30.000+, met grovere stappen naar boven.
 */
export type BudgetMode = 'night' | 'trip';
export const TRIP_MAX = 30000;
export const tripSteps: number[] = [...range(500, 2000, 250), ...range(2500, 10000, 500), ...range(12500, 30000, 2500)];
export const stepsFor = (mode: BudgetMode) => (mode === 'trip' ? tripSteps : budgetSteps);
export const maxFor = (mode: BudgetMode) => (mode === 'trip' ? TRIP_MAX : BUDGET_MAX);
export const parseMode = (v: string | null): BudgetMode => (v === 'totaal' ? 'trip' : 'night');

/** Uit de URL, voor beide soorten budget. */
export function parseBudgetFor(value: string | null, mode: BudgetMode): number | null {
  const n = Number(value);
  const steps = stepsFor(mode);
  if (!value || !Number.isFinite(n) || n < steps[0] || n >= maxFor(mode)) return null;
  return n;
}
export function stepIndexFor(max: number | null, mode: BudgetMode) {
  const steps = stepsFor(mode);
  if (max === null) return steps.length - 1;
  let best = 0;
  steps.forEach((s, i) => {
    if (Math.abs(s - max) < Math.abs(steps[best] - max)) best = i;
  });
  return best;
}
/** Past een plek? Per nacht: prijs p.p.p.n. ≤ budget. Hele reis: prijs × aangeraden nachten × reizigers ≤ budget. */
export function fitsBudget(price: number, max: number | null, mode: BudgetMode, nights: number, people: number) {
  if (max === null) return true;
  return mode === 'trip' ? price * nights * people <= max : price <= max;
}
/** Aantal reizigers uit de URL (minstens 1, standaard 2). */
export const parsePeople = (v: string | null) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.round(n) : 2;
};
