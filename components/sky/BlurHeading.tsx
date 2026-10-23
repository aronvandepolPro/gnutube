import { Fragment, type ElementType } from 'react';

type Props = {
  /** Eerste regel; tweede regel (optioneel) wordt cursief. */
  text: string;
  em?: string;
  as?: ElementType;
  className?: string;
  /** Vertraging van het eerste woord in ms. */
  delay?: number;
};

/** Kop die woord voor woord scherp wordt (idee uit Prism). Zonder animatie bij prefers-reduced-motion. */
export function BlurHeading({ text, em, as: Tag = 'h1', className, delay = 150 }: Props) {
  const a = text.split(' ').filter(Boolean);
  const b = em ? em.split(' ').filter(Boolean) : [];
  const words = [...a.map((w) => ({ w, em: false })), ...b.map((w) => ({ w, em: true }))];
  return (
    <Tag className={className}>
      {words.map((x, i) => (
        <Fragment key={i}>
          <span className="kt-blur-in inline-block" style={{ animationDelay: `${delay + i * 120}ms` }}>
            {x.em ? <em>{x.w}</em> : x.w}
          </span>
          {b.length > 0 && i === a.length - 1 ? <br /> : i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}

/** Totale duur van de kop-animatie, om tekst eronder daarna te laten volgen. */
export const blurDuration = (text: string, em = '', delay = 150) =>
  delay + (text.split(' ').length + (em ? em.split(' ').length : 0)) * 120;
