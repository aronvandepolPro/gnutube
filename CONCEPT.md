# Gnutube — conceptoverzicht

Korte uitleg van het websiteconcept, bedoeld om aan een andere AI-assistent of ontwikkelaar te geven samen met de code.

## Wat is Gnutube?

> Huidige focus: alleen Tanzania (31 plekken in vier gebieden). De data voor heel Afrika blijft staan; zie `SCOPE` in `lib/data.ts`.

Een reisplatform voor heel Afrika: kijken (video's en veldnotities van reizigers), zoeken en vergelijken (175 bestemmingen in 54 landen), en zelf een reis samenstellen en die in de veiling zetten: goedgekeurde lokale bedrijven bieden 3 dagen lang, daarna kiest de reiziger. Gnutube is tussenpersoon en krijgt 12,5% commissie als aanbetaling (zie `VEILING-PLAN.md`). De volledige opdracht staat in `BOUWOPDRACHT.md`; open punten in `PLACEHOLDERS.md`.

## Techniek

- **Framework:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.
- **Talen:** 8 talen (nl, en, de, fr, es, it, pt, sw) via `messages/*.json` en `app/[lang]/`. Ontbreekt een vertaling, dan valt de site terug op Engels.
- **Data:** `data/seed.json` met regio's, landen, bestemmingen en activiteiten; `data/stays.json` met verblijven en prijzen (nu leeg). Het Supabase-schema staat klaar in `supabase/`.
- **Kaart:** MapLibre, nu met demotegels.
- **Starten:** `npm install` en daarna `npm run dev`; de site draait dan op http://localhost:3000.

## Ontwerp

- **Stijl:** donker, met "liquid glass", geïnspireerd op de Prism-template van 21st.dev. Er is geen code van de template gebruikt.
- **Lettertypen:** Instrument Serif in cursief voor koppen, Barlow voor tekst.
- **Bouwstenen:** in `app/globals.css`: `btn`, `btn-primary`, `btn-ghost`, `chip`, `field`, `panel`, `glass`, `eyebrow`.
- **Navigatie:** op laptop en iPad een open balk over de kopfoto (links, zoekicoon, taalkeuze, Inloggen), die bij scrollen donker wordt; op iPad staand zitten de links achter de menuknop. Op de telefoon een zwevende glazen pil met menu. Inloggen leidt naar een 'komt eraan'-pagina tot de accounts er zijn (stap 1b).

## De homepage

1. **Kopsectie (`components/PhotoHero.tsx`)**
   - Drie foto's (`public/hero/`) die zacht in elkaar overlopen met een langzame zoom, met stipjes om te kiezen en een pauzeknop.
   - De eerdere getekende safaririt (`components/sky/SafariScene.tsx`, `DawnHero.tsx`) staat nog in de code maar wordt niet meer gebruikt.
2. **Zoeksectie (`components/explore/`)**
   - Bij "Heel Afrika" draait er een 3D-wereldbol (`Globe.tsx`), getekend op canvas, met alle 54 Afrikaanse landen en hun grenzen uit Natural Earth (`public/geo/globe.json`, gemaakt met `npm run geo:build`). De rest van de wereld staat er gedempt bij en een vliegtuigje vliegt in een baan om de bol.
   - Kies je een land of regio, dan draait de bol ernaartoe en zoomt in. Ingezoomd zie je meren, rivieren, de plekken van de site met hun naam en de buurlanden. Meren en rivieren komen ook uit Natural Earth.
   - Kies je een soort reis, dan lichten alleen die plekken op; er is geen aparte achtergrondscène meer (`KindScenes.tsx` staat er nog maar wordt niet gebruikt).
   - Kleine eilandstaten krijgen op de hele bol een ringetje.
   - Bij een gekozen land staat linksonder een paneel met feiten (`CountryFacts.tsx`): hoofdstad, inwoners, oppervlakte (vergeleken met het land van de lezer), talen, munteenheid, buurlanden en het aantal plekken op de site. De gegevens komen uit open data (`data/country-facts.json`).
3. **Overige secties:** de vier soorten reizen, "Zo werkt het", echte cijfers, het logboek en een slotsectie.

## Overige pagina's

| Pad | Pagina |
| --- | --- |
| `/[lang]/zoeken` | Zoeken met filters en een budgetschuif (€100 tot €5.000+ per persoon per nacht) |
| `/[lang]/plek/[id]` | Plekpagina |
| `/[lang]/kaart` | Kaart |
| `/[lang]/kijken` | Verticale kijkfeed |
| `/[lang]/reizen` | Mijn reizen: route samenstellen en in de veiling zetten |
| `/[lang]/veilingen` | Mijn veilingen: biedingen vergelijken, kiezen, aanbetaling |
| `/[lang]/partners` | Voor partners: uitleg en aanmelden |
| `/[lang]/partner` | Partneromgeving: bieden op veilingen, deals |
| `/[lang]/reisvoorwaarden` | Voorwaarden (concept, door jurist na te kijken) |

## Regels die gelden

- **Niets verzinnen:** geen prijzen, reviews, scores of aantallen. Waar gegevens ontbreken, staan placeholders zoals `[prijs]`.
- **Reisadvies:** plekken met een negatief reisadvies krijgen een markering en komen niet in de kijkfeed.
- **Gesponsorde plaatsingen:** altijd zichtbaar gemarkeerd als "Uitgelicht · betaald".
- **Nog niet gecontroleerd:**
  - de bestemmingen, de coördinaten en de vertalingen in es, it, pt en sw;
  - de landschapskleuren op de wereldbol (woestijn, regenwoud): die zijn een benadering, de grenzen zelf komen uit Natural Earth.
