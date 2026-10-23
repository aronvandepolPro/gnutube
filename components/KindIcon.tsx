import type { Kind } from '@/lib/data';

/** Eenvoudige lijniconen per soort reis (en een kompasroos voor "alles"). */
export function KindIcon({ kind, color, size = 28 }: { kind: Kind | ''; color: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 32 32', fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (kind) {
    case 'safari': // acacia
      return (
        <svg {...common}>
          <path d="M4 12c3-3 8-4 12-4s9 1 12 4c-3 1-8 1.5-12 1.5S7 13 4 12z" />
          <path d="M16 13.5V28M16 18l-4-4.5M16 17l4.5-3.5" />
          <path d="M3 28h26" />
        </svg>
      );
    case 'island': // eilandje met palm
      return (
        <svg {...common}>
          <path d="M6 24c3-3 17-3 20 0" />
          <path d="M16 23V12" />
          <path d="M16 12c-2-3-6-4-9-2M16 12c2-3 6-4 9-2M16 12c-1-3-1-6 1-8M16 12c3-1 6 0 8 3" />
          <path d="M3 28c2.5 0 2.5-1.5 5-1.5S10.5 28 13 28s2.5-1.5 5-1.5 2.5 1.5 5 1.5 2.5-1.5 5-1.5" />
        </svg>
      );
    case 'beach': // golf en zon
      return (
        <svg {...common}>
          <circle cx="22" cy="9" r="4" />
          <path d="M3 20c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
          <path d="M3 26c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
        </svg>
      );
    case 'lake': // meer met riet
      return (
        <svg {...common}>
          <ellipse cx="16" cy="22" rx="12" ry="5" />
          <path d="M9 22c2 0 2-1 4-1s2 1 4 1 2-1 4-1" />
          <path d="M6 18V8M6 8c-1 1-1 3 0 4M9 18v-7M26 18V10M26 10c1 1 1 3 0 4" />
        </svg>
      );
    case 'nature': // boom en blad
      return (
        <svg {...common}>
          <path d="M16 28V16" />
          <path d="M16 17c-6 0-9-4-9-8 4 0 9 2 9 8zM16 20c5 0 8-3.5 8-7-3.5 0-8 2-8 7z" />
          <path d="M8 28h16" />
        </svg>
      );
    case 'mountain': // bergen
      return (
        <svg {...common}>
          <path d="M2 27l9-14 5 7 4-5 10 12H2z" />
          <path d="M9 16.2l2-3.2 2.4 3.4" />
        </svg>
      );
    case 'culture': // koepel met boog
      return (
        <svg {...common}>
          <path d="M8 27V15a8 8 0 0 1 16 0v12" />
          <path d="M16 4v3M4 27h24" />
          <path d="M13 27v-6a3 3 0 0 1 6 0v6" />
        </svg>
      );
    case 'city': // skyline
      return (
        <svg {...common}>
          <path d="M3 28h26" />
          <path d="M5 28V16h6v12M11 28V9h7v19M18 28V13h5v15M23 28V19h4v9" />
          <path d="M14 13h1M14 17h1M14 21h1M7 20h1M7 24h1" />
        </svg>
      );
    default: // kompasroos
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="12" />
          <path d="M16 7l3 9-3 9-3-9z" />
        </svg>
      );
  }
}
