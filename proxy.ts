import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales } from '@/lib/i18n/config';

/** Kies een taal op basis van Accept-Language (eerste ondersteunde taal, anders Nederlands). */
function pickLocale(request: NextRequest) {
  const header = request.headers.get('accept-language') ?? '';
  const wanted = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return wanted.find((w) => (locales as readonly string[]).includes(w.lang))?.lang ?? defaultLocale;
}

/*
 * Wachtwoordslot voor de testfase.
 * Staat SITE_PASSWORD in de omgeving (Vercel → Environment Variables, type Secret), dan moet je dat
 * wachtwoord één keer per apparaat invullen voordat je de site ziet. Zonder SITE_PASSWORD is er geen slot
 * (lokaal ontwikkelen, en straks bij de lancering: variabele weghalen = site open).
 * Zolang het slot aan staat, vragen we zoekmachines de site niet op te nemen.
 */
const GATE_COOKIE = 'kt-toegang';
const GATE_FIELD = 'wachtwoord';

async function sha256(text: string) {
  const data = new TextEncoder().encode(`gnutube:${text}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

function gatePage(wrong: boolean) {
  const html = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Gnutube · Binnenkort</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100svh; display: grid; place-items: center; padding: 16px;
    background: #F0821E; color: #2A1F17; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
  main { width: 100%; max-width: 400px; background: #FFFBF6; border-radius: 24px; padding: 32px 28px;
    box-shadow: 0 20px 50px rgba(42, 31, 23, 0.18); }
  .logo { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 30px; margin: 0 0 18px; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  p { margin: 0 0 20px; color: #5A4030; line-height: 1.5; font-size: 15px; }
  label { display: block; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: #7A6656; margin-bottom: 6px; }
  input { width: 100%; font: inherit; font-size: 17px; padding: 12px 14px; border-radius: 12px;
    border: 1px solid #E3D6C8; background: #fff; color: #2A1F17; }
  input:focus { outline: 2px solid #5A4030; outline-offset: 1px; }
  button { margin-top: 14px; width: 100%; font: inherit; font-weight: 600; font-size: 16px; padding: 13px;
    border: 0; border-radius: 999px; background: #3B2A1E; color: #fff; cursor: pointer; }
  button:hover { background: #2A1F17; }
  .err { color: #A33; font-weight: 600; font-size: 14px; margin: 10px 0 0; }
  .en { margin: 18px 0 0; font-size: 13px; color: #7A6656; }
</style>
</head>
<body>
<main>
  <p class="logo">Gnutube</p>
  <h1>Nog even geheim</h1>
  <p>Gnutube is nog in de testfase. Vul het wachtwoord in dat je van ons hebt gekregen.</p>
  <form method="post">
    <label for="pw">Wachtwoord</label>
    <input id="pw" name="${GATE_FIELD}" type="password" autocomplete="current-password" required autofocus />
    ${wrong ? '<p class="err" role="alert">Dat wachtwoord klopt niet.</p>' : ''}
    <button type="submit">Naar de site</button>
  </form>
  <p class="en">Gnutube is in private testing. Enter the password you received.</p>
</main>
</body>
</html>`;
  return new NextResponse(html, {
    status: wrong ? 401 : 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' },
  });
}

/** Geeft een antwoord terug als het slot de bezoeker tegenhoudt (of net binnenlaat), anders null. */
async function gate(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  const expected = await sha256(password);
  if (request.cookies.get(GATE_COOKIE)?.value === expected) return null;

  if (request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    const given = form?.get(GATE_FIELD);
    if (typeof given === 'string' && given === password) {
      // Terug naar dezelfde pagina, nu met toegang (303 = daarna gewoon GET)
      const res = NextResponse.redirect(request.nextUrl, 303);
      res.cookies.set(GATE_COOKIE, expected, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
      return res;
    }
    return gatePage(true);
  }
  return gatePage(false);
}

export async function proxy(request: NextRequest) {
  const blocked = await gate(request);
  if (blocked) return blocked;

  const locked = !!process.env.SITE_PASSWORD;
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) {
    if (!locked) return;
    const res = NextResponse.next();
    res.headers.set('x-robots-tag', 'noindex, nofollow');
    return res;
  }
  request.nextUrl.pathname = `/${pickLocale(request)}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Alles behalve Next-interne paden en bestanden met een extensie (favicon, afbeeldingen)
  matcher: ['/((?!_next|.*\\..*).*)'],
};
