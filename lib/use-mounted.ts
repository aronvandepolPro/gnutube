'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};
/** true zodra de pagina in de browser draait (niet tijdens het opbouwen op de server). */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}
