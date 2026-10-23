'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './picker.css';

export type PickerOption = {
  value: string;
  label: string;
  /** Korte toelichting onder de naam, bv. een paar bekende plekken. */
  hint?: string;
  /** Rechts in de rij, bv. het aantal plekken. */
  meta?: string;
  icon?: ReactNode;
};

type Props = {
  /** Naam van het formulierveld (zoals bij een gewone keuzelijst). */
  name: string;
  label: string;
  options: PickerOption[];
  defaultValue?: string;
  /** Liefst naar boven of naar beneden uitklappen; bij te weinig ruimte klapt hij de andere kant op. */
  placement?: 'up' | 'down';
  /** Opties in twee kolommen (bij veel opties, zodat er niet gescrold hoeft te worden). */
  columns?: 1 | 2;
  /**
   * Meerdere keuzes tegelijk (aanvinken). De eerste optie (waarde '') betekent "alles" en wist de keuze.
   * Het formulier krijgt de keuzes als één waarde met komma's, bv. soort=safari,beach.
   */
  multiple?: { done: string; many: string; placeholder?: string };
};

const HEADER = 80; // hoogte van de menubalk bovenin
const MIN_SPACE = 260;

/**
 * Keuzelijst in de huisstijl: een knop met een glazen paneel eronder.
 * Achter de schermen staat een gewone <select> met dezelfde naam. Die wordt mee gezet en krijgt een
 * 'change'-event, zodat formulieren en luisteraars (zoals de wereldbol op de homepage) gewoon blijven werken.
 */
export function Picker({ name, label, options, defaultValue = '', placement = 'down', columns = 1, multiple }: Props) {
  const [value, setValue] = useState(defaultValue);
  // Bij meerdere keuzes: standaard staat alles aangevinkt; je vinkt uit wat je niet wilt
  const allValues = options.filter((o) => o.value).map((o) => o.value);
  const [values, setValues] = useState<string[]>(defaultValue ? defaultValue.split(',') : []);
  const everything = values.length === 0 || values.length === allValues.length;
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  // Richting en maximale hoogte worden bij het openen bepaald (ruimte boven en onder het veld)
  const [dir, setDir] = useState<{ up: boolean; max: number }>({ up: placement === 'up', max: 420 });
  const select = useRef<HTMLSelectElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value) ?? options[0];
  // Wat er in het veld staat bij meerdere keuzes: 'Alles', één naam, twee namen, of 'n soorten'
  const picked = options.filter((o) => o.value && values.includes(o.value));
  const shown = !multiple
    ? { label: current.label, icon: current.icon }
    : values.length === 0 && multiple.placeholder
      ? { label: multiple.placeholder, icon: null, empty: true }
      : everything
      ? { label: options[0].label, icon: options[0].icon }
      : picked.length === 1
        ? { label: picked[0].label, icon: picked[0].icon }
        : {
            label: picked.length === 2 ? `${picked[0].label} + ${picked[1].label}` : multiple.many.replace('{n}', String(picked.length)),
            icon: picked[0].icon,
          };
  const isSelected = (v: string) => (multiple ? (v ? values.includes(v) : values.length === allValues.length) : v === value);

  const choose = (v: string) => {
    if (multiple) {
      // Aanvinken of uitvinken; de lijst blijft open. 'Alles' vinkt alles aan (of, als alles al aan staat, alles uit).
      setValues((cur) =>
        !v ? (cur.length === allValues.length ? [] : allValues) : cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
      );
      return;
    }
    setValue(v);
    setOpen(false);
    const el = select.current;
    if (el && el.value !== v) {
      el.value = v;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  // Klik buiten het paneel of Escape: dicht
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  const openList = () => {
    const r = root.current?.getBoundingClientRect();
    if (r) {
      const above = r.top - HEADER - 56; // boven het kopje van het veld
      const below = window.innerHeight - r.bottom - 16;
      const up = placement === 'up' ? above >= MIN_SPACE || above > below : !(below >= MIN_SPACE || below > above);
      setDir({ up, max: Math.min(440, Math.max(180, up ? above : below)) });
    }
    setFocus(Math.max(0, options.findIndex((o) => isSelected(o.value))));
    setOpen(true);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocus((f) => Math.min(options.length - 1, f + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocus((f) => Math.max(0, f - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(options[focus].value);
    }
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKey}>
      {/* Formulierwaarde: gewone (onzichtbare) keuzelijst, of bij meerdere keuzes één waarde met komma's */}
      {multiple ? (
        <input type="hidden" name={name} value={everything ? '' : allValues.filter((v) => values.includes(v)).join(',')} />
      ) : (
        <select ref={select} name={name} defaultValue={defaultValue} className="sr-only" tabIndex={-1} aria-hidden="true">
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${shown.label}`}
        className="flex min-h-9 w-full items-center justify-between gap-2 text-left text-[16px] text-ink"
      >
        <span className="flex min-w-0 items-center gap-2">
          {shown.icon && <span className="shrink-0 opacity-80">{shown.icon}</span>}
          <span className={`truncate ${'empty' in shown && shown.empty ? 'text-subtle' : ''}`}>{shown.label}</span>
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={`shrink-0 transition-transform ${open !== (placement === 'up') ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute -left-4 z-50 ${
            columns === 2 ? 'w-[min(520px,calc(100vw-32px))]' : 'w-[calc(100%+2rem)] min-w-[280px] max-w-[calc(100vw-32px)]'
          } rounded-[20px] border border-rule bg-white p-2 shadow-[0_24px_60px_-18px_rgba(42,31,23,0.4)] ${
            dir.up ? 'kt-pick-up bottom-full mb-12' : 'kt-pick-down top-full mt-4'
          }`}
        >
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            aria-multiselectable={multiple ? true : undefined}
            className={`m-0 list-none overflow-y-auto p-0 ${columns === 2 ? 'grid grid-cols-2 gap-1' : ''}`}
            style={{ maxHeight: dir.max - (multiple ? 60 : 16) }}
          >
            {options.map((o, i) => {
              const selected = isSelected(o.value);
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={selected}
                  onPointerEnter={() => setFocus(i)}
                  onClick={() => choose(o.value)}
                  className={`flex cursor-pointer items-center gap-2 rounded-2xl px-2 py-2 transition-colors sm:gap-3 sm:px-3 sm:py-2.5 ${
                    focus === i ? 'bg-sand' : ''
                  } ${selected ? 'text-brand-dark' : 'text-ink'}`}
                >
                  <span
                    className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full border sm:h-10 sm:w-10 ${
                      selected ? 'border-brand-dark bg-brand-dark text-white' : 'border-rule bg-white text-muted'
                    }`}
                    aria-hidden="true"
                  >
                    {o.icon}
                    {/* Vinkje bij meerdere keuzes */}
                    {multiple && selected && (
                      <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-brand text-white ring-2 ring-white">
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.5 6.5 5 9l4.5-6" />
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-medium sm:text-[15px]">{o.label}</span>
                    {o.hint && <span className="truncate text-[12.5px] text-subtle">{o.hint}</span>}
                  </span>
                  {o.meta && <span className="shrink-0 font-mono text-[12px] text-subtle">{o.meta}</span>}
                </li>
              );
            })}
          </ul>
          {multiple && (
            <div className="mt-2 flex items-center justify-end gap-2 border-t border-rule px-1 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-primary !min-h-10 !px-5 !text-[14px]">
                {multiple.done}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
