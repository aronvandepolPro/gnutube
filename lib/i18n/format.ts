import { localeTag, type Locale } from './config';

type Vars = Record<string, string | number>;

/**
 * Minimale ICU-achtige formattering: `{naam}` en `{n, plural, =0 {...} one {...} other {...}}`
 * (met `#` als het getal). Werkt op server en client.
 */
export function format(template: string, vars: Vars = {}, locale: Locale = 'nl'): string {
  const tag = localeTag[locale];
  const withPlurals = template.replace(
    /\{(\w+), plural, ((?:=?\w+ \{[^}]*\}\s*)+)\}/g,
    (_, key: string, body: string) => {
      const n = Number(vars[key]);
      const forms: Record<string, string> = {};
      for (const m of body.matchAll(/(=?\w+) \{([^}]*)\}/g)) forms[m[1]] = m[2];
      const rule = new Intl.PluralRules(tag).select(n);
      // Exact getal (bv. =0) gaat voor op de gewone meervoudsvormen
      const form = forms[`=${n}`] ?? forms[rule] ?? forms.other ?? '';
      return form.replace(/#/g, n.toLocaleString(tag));
    },
  );
  return withPlurals.replace(/\{(\w+)\}/g, (m, key: string) => {
    const v = vars[key];
    if (v === undefined) return m;
    return typeof v === 'number' ? v.toLocaleString(tag) : v;
  });
}
