# Gnutube

Reisplatform voor heel Afrika: kijken, vergelijken en zelf een reis samenstellen. De volledige opdracht staat in [BOUWOPDRACHT.md](BOUWOPDRACHT.md) en het klikbare prototype in [prototype/](prototype/).

## Starten

Node.js staat in `~/.local/node` (de PATH-regel staat in `~/.zshrc`; open een nieuwe terminal).

```bash
npm install
npm run dev
```

Open http://localhost:3000. De site stuurt je door naar je taal (`/nl`, `/en`, `/de`, `/fr`).

## Stand van zaken: stap 1a

| Pagina | Pad | Status |
| --- | --- | --- |
| Ontdek | `/nl` | Klaar. Het logboek is leeg tot er echte video’s zijn |
| Kijken | `/nl/kijken` | Feed met affiches. De toestemmingsgate voor YouTube en TikTok (`components/VideoEmbed.tsx`) is klaar maar nog niet gekoppeld |
| Zoeken | `/nl/zoeken` | Filters op soort, regio, land en budget (schuif €100–€5.000+). Prijzen komen uit `data/stays.json`, dat nu nog leeg is |
| Plekpagina | `/nl/plek/[id]` | Overzicht, activiteiten, in de buurt en delen |
| Kaart | `/nl/kaart` | MapLibre met de demotegels |
| Mijn reizen | `/nl/reizen` | Route samenstellen en in de veiling zetten |
| Mijn veilingen | `/nl/veilingen` | Biedingen vergelijken, kiezen, aanbetaling (testmodus) |
| Voor partners | `/nl/partners` en `/nl/partner` | Aanmelden; goedgekeurde bedrijven bieden op veilingen |

## Opbouw

```
app/[lang]/        pagina's per taal
components/        affiche, zoekbalk, delen, video-embed, …
lib/i18n/          talen, vertaalbestanden laden, formatteren
lib/data.ts        datalaag (nu JSON, straks Supabase met dezelfde functies)
messages/          één bestand per taal (nl, en, de, fr, es, it, pt, sw)
data/content/      vertaalde inhoud (slogans, landen, activiteiten) voor es, it, pt, sw
data/seed.json     regio's, landen, bestemmingen, activiteiten
supabase/          schema (migrations/) en seed.sql
scripts/           extractie uit het prototype, seed bouwen, MapLibre-worker kopiëren
```

- **Talen:** 8 talen via de ingebouwde i18n van Next.js (`next/root-params`) in plaats van next-intl. Alle teksten staan in `messages/`. Ontbreekt een tekst of een vertaling van inhoud, dan valt de site terug op Engels.
- **Taal toevoegen:** voeg de code toe in `lib/i18n/config.ts`, maak `messages/<code>.json` (zelfde sleutels als `en.json`) en eventueel `data/content/<code>.json`, en draai `npm run seed:build`.
- **Vertalingen in es, it, pt en sw** zijn niet door moedertaalsprekers nagelezen. Laat ze controleren voor de lancering.
- **Ontwerp:** donker, met "liquid glass", naar het voorbeeld van de Prism-template (21st.dev). Dit **wijkt bewust af** van het ontwerp in BOUWOPDRACHT.md (papier en inkt), op verzoek van de opdrachtgever. Er is geen code uit de template overgenomen, alleen de richting.
  - **Tokens:** staan in `app/globals.css`. Ze zijn semantisch: `paper` is de achtergrond, `ink` de voorgrond.
  - **Bouwstenen:** `btn`, `btn-primary`, `btn-ghost`, `chip`, `field`, `panel`, `glass`, `glass-strong` en `eyebrow`.
  - **Lettertypen:** Instrument Serif (koppen) en Barlow (tekst).
  - **Beeld:** op de plekken waar Prism video gebruikt, staat een bewegende nachtscène in zwart-wit (`components/sky/`). Zodra er video's met gebruiksrecht zijn, kunnen die erin.
- **Seed opnieuw bouwen:** `npm run seed:build` maakt `data/seed.json` en `supabase/seed.sql` uit `data/prototype-extract.json`.

## Open punten

Zie [PLACEHOLDERS.md](PLACEHOLDERS.md).
