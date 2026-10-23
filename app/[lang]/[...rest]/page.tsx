import { notFound } from 'next/navigation';

/** Vangt onbekende paden binnen een taal op, zodat ze de opgemaakte 404 van [lang]/not-found krijgen. */
export default function CatchAll() {
  notFound();
}
