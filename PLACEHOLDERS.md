# Placeholders en open punten

Alles wat hier staat, is bewust niet ingevuld of verzonnen. Op de site staat het tussen `[haken]` of als lege staat.

## Teksten en cijfers op de site

| Waar | Placeholder | Wie vult in |
| --- | --- | --- |
| Zoeken, resultaatrij | `Prijs nog onbekend` | Partners, via verblijven met prijs (zie hieronder) |
| Budgetschuif | Werkt, maar vindt pas iets zodra er prijzen in `data/stays.json` staan | Partners (fase 2) of jullie, met de hand |
| Zoeken, gesponsorde rij | `[DollyEscape — locatie nog invullen]` | Jullie: land en park van DollyEscape |
| Plekpagina, Overzicht | `Beste reistijd: [maanden]` | Redactie met lokale kennis |
| Footer | `Privacy [nog op te stellen]`, `Voorwaarden [nog op te stellen]` | Jurist |
| Logboek, kijkmodus | Lege staat, geen video’s | Makers en lodges (fase 2), eerst afspraken over gebruiksrecht |
| Plekpagina, Verblijven en Ervaringen | Lege staat | Partners (fase 2) en reizigers met account (1b/2) |

Sorteren op "Best beoordeeld" valt terug op A tot Z zolang er geen echte reviews zijn. De site toont geen scores, aantallen, likes of makersnamen: die uit het prototype waren voorbeelddata.

## Sponsoren

De sponsorrij op de homepage (onder de kopfoto) is leeg tot er echte sponsoren zijn. Toevoegen:
1. Zet het logo in `public/sponsors/` (wit of licht logo op transparante achtergrond, SVG of PNG van minstens 400 px breed).
2. Voeg de sponsor toe in `data/sponsors.json`: `{ "name": "...", "logo": "/sponsors/bestand.svg", "url": "https://..." }`.
3. Zodra er een sponsor in staat, verschijnt links het label "Sponsoren" en krijgen de links `rel="sponsored"`; betaalde plaatsing is dan zichtbaar gemarkeerd. "Sponsor worden" verwijst nu naar de partnerpagina, die er nog niet is (fase 2).

## Prijzen en het budgetfilter

De budgetschuif loopt van €100 tot €5.000+ per persoon per nacht. De stappen worden naar boven toe groter (€50, €100, €250 en €500) en staan in `lib/budget.ts`. Een plek telt mee als het goedkoopste verblijf onder het gekozen maximum valt. Plekken zonder prijs vallen niet weg, maar komen apart onderaan.

Tot de partnerportal er is (fase 2), voeg je prijzen met de hand toe in `data/stays.json`:

```json
{ "id": "uniek-id", "destinationId": "tz-serengeti", "partnerId": null, "type": "lodge",
  "name": "Naam van het verblijf", "priceFrom": 450, "currency": "EUR" }
```

`type` is een van: camp, lodge, luxe, hotel, bungalow, resort, villa. Alleen prijzen in **EUR** tellen mee. Voor andere valuta is een koersbron nodig, en die is nog niet gekozen.

## Vertalingen nalezen (es, it, pt, sw)

De vertalingen in Spaans, Italiaans, Portugees en Swahili zijn door AI gemaakt en niet door moedertaalsprekers nagelezen. Laat elke taal controleren voor de lancering. Deze termen zijn twijfelgevallen:

- **Alle talen:**
  - De stap "Stempel" uit "Zo werkt het": letterlijk vertaald, en de beeldspraak werkt mogelijk niet. Alternatief: "Bewaar".
  - "Het logboek" en "veldnotities".
  - "Game drive": in it en pt Engels gelaten.
  - "Canopy walk" en "floodlit waterhole".
- **Spaans:**
  - "video" in Latijns-Amerikaanse spelling; in Spanje is het "vídeo".
  - "Para socios": "Para colaboradores" past mogelijk beter.
  - Landnamen "R. D. del Congo", "Esuatini" en "Yibuti".
- **Italiaans:**
  - "Ruanda" naast "Rwanda", en "RD del Congo".
  - Gorongosa ("rinato") en Majete ("restaurata") moeten consequent worden.
- **Portugees:**
  - Spelling volgens Portugal (Quénia, Zimbabué, Botsuana, Madagáscar, Maurícia). Mozambique en Angola gebruiken vaak andere vormen.
- **Swahili:**
  - "Waliopimwa juu zaidi" (Best beoordeeld) slaat grammaticaal op personen.
  - Termen voor kitesurfen en raften zijn omschrijvingen, geen vaste woorden.
  - "Bwawa la pwani" voor lagune.
  - "Sokwe-mtu" voor gorilla.
  - De omschrijving van de modernistische architectuur in Asmara.

Vertaalde inhoud staat in `data/content/<taal>.json`, de brontekst in `data/content/_source.json`. Na een correctie draai je `npm run seed:build`.

## Beeld

- **Kopfoto's homepage** (`public/hero/waterval.jpg`, `strand.jpg`, `kilimanjaro.jpg`) zijn uitsneden uit de ontwerpbeelden die jullie aanleverden; de ingebakken tekst, het menu en de knoppen zijn er met beeldbewerking uit gepoetst. Twee aandachtspunten:
  - Ze lijken door AI gemaakt. De waterval bestaat niet echt, en de andere twee lijken op echte plekken maar zijn dat niet precies. Voor een platform dat 'echte plekken' belooft: vervang ze vóór de lancering door echte foto's met gebruiksrecht (van partners of met licentie), of zet er zichtbaar bij dat het sfeerbeelden zijn.
  - Ze zijn 1536 px breed. Op grote schermen worden ze iets zachter; bij voorkeur foto's van 2400 px of breder, zonder tekst erin. Zelfde bestandsnamen gebruiken, dan hoeft er niets aan de code te veranderen.

## Data die gecontroleerd moet worden

- **Focus op Tanzania.** De site toont nu alleen Tanzania (`SCOPE` in `lib/data.ts`; op `null` zetten = weer heel Afrika). De 'regio's' zijn vier gebieden binnen Tanzania: Noord, Zuid, West, Kust en eilanden.
- **19 nieuwe Tanzaniaanse plekken** in `data/tanzania.json` (bijvoorbeeld Stone Town, Kilwa Kisiwani, Gombe, Mikumi, Lake Natron), samen 31 plekken. Ze zijn opgesteld uit algemene kennis en **niet gecontroleerd**: namen, afgeronde coördinaten, indeling in gebieden, activiteiten en korte omschrijvingen moeten worden nagelopen door mensen met lokale kennis. Er staan bewust geen lodges, prijzen of openingstijden in.

- **Alle 175 bestemmingen, coördinaten, slogans en activiteiten** komen uit het prototype en zijn uit algemene kennis samengesteld. Op elke plekpagina staat dat ze nog niet gecontroleerd zijn. Na controle vul je `verified_at` en `verified_by` in de database.
- **Reisadviezen zijn voorlopig.** 9 landen (so, ss, cf, td, bf, ml, ne, ly, sd) en 10 bestemmingen hebben een markering uit het prototype. Toets ze aan een officiële bron en vul `source_url` en `checked_at` in `travel_advisories`. Tot die tijd geldt: liever onterecht gemarkeerd dan onterecht niet.
- **Luchthavens per land** (`countries.airport`) staan maar bij een deel van de landen.
- **Landfeiten bij de wereldbol** (`data/country-facts.json`, opnieuw maken met `npm run facts:build`) komen uit open data: hoofdstad, oppervlakte, talen, munteenheid en buurlanden uit mledoze/countries, inwoners uit Natural Earth (schatting 2019). Twee aandachtspunten:
  - **Licentie:** mledoze/countries valt onder de ODbL. Bronvermelding is verplicht (staat onder het paneel), en een afgeleide database die je openbaar gebruikt valt ook onder de ODbL.
  - **Steekproef nodig:** de dataset is goed maar niet foutloos. Loop de 54 landen een keer na, vooral hoofdsteden (bv. Tanzania: Dodoma) en officiële talen. De inwonertallen zijn van 2019 en lopen dus achter.
  - **Echte weetjes** (verhalen, bijzonderheden) staan er bewust niet in: die moet de redactie schrijven en controleren. Als jullie dat willen, komt er een veld per land voor bij.

## Technische keuzes die nog open staan

- **Kaart.** Getekend uit eigen gegevens (Natural Earth, publiek domein, bron vermeld op de kaart). Geen externe kaartdienst nodig. Alleen voor straten of wegen op detailniveau zou later een kaartdienst nodig zijn.
- **Supabase-project.** Schema en seed staan klaar in `supabase/`, maar er is nog geen project. De site leest nu uit `data/seed.json`.
- **E-maildienst** voor bevestigingen en offerteaanvragen (stap 1b).
- **Domein.** De naam is vastgesteld als **Gnutube** (voorheen knoetube); de domeinnaam moet nog gekozen worden.
- **URL’s** zijn nu Nederlands in alle talen (`/en/zoeken`). Vertaalde paden kunnen later, met redirects.

## Uit de bouwopdracht, nog in te vullen door jullie

- [ ] Domeinnaam (de naam Gnutube is vastgesteld)
- [ ] Kosten voor reizigers en pakketprijzen voor partners
- [ ] Contactgegevens partnerteam
- [ ] Doorlooptijd controle partners
- [ ] Lokale operator(s) voor offerteaanvragen, met vergunningen
- [ ] Locatie DollyEscape
- [ ] Partnervoorwaarden, privacyverklaring en cookiebeleid (juridisch)
- [ ] Kaartdienst, videohosting, e-maildienst
- [ ] Controle van bestemmingen, activiteiten, seizoenen en luchthavens
- [ ] Eerste set echte foto’s en video’s, met afspraken over gebruiksrecht
- [ ] Moderatie van reviews en posts: wie en binnen welke tijd

## Foto's bij 'Reizen per soort' (public/kinds/)

Van Unsplash (Unsplash-licentie: gratis, ook commercieel; naamsvermelding niet verplicht). Alle in Tanzania genomen (gecontroleerd op de plek die Unsplash bij de foto vermeldt), gedownload op 15 oktober 2026. Op de kaarten staat klein de naam van de fotograaf.

| Bestand | Fotograaf | Plek | Bron |
|---|---|---|---|
| safari-2.jpg | Mike Holford | Tanzania | https://unsplash.com/photos/lion-on-ground-during-daytime-xHnb8UeZnmg |
| eilanden-2.jpg | Jack Balke | Zanzibar | https://unsplash.com/photos/tropical-resort-with-bungalows-on-turquoise-water-JvvfgHodZUc |
| strand-2.jpg | Polly Sadler | Nungwi, Zanzibar | https://unsplash.com/photos/a-white-sandy-beach-with-houses-on-it-glxZAuaYH_M |
| meren-2.jpg | Omar | Victoriameer, Musoma | https://unsplash.com/photos/a-body-of-water-surrounded-by-rocks-and-grass-U0mR2l1wodc |
| natuur-2.jpg | Yoel Winkler | Zanzibar | https://unsplash.com/photos/a-wooden-bridge-in-the-woods-Llx5aP0m0nc |
| bergen-2.jpg | Nichika Sakurai | Kilimanjaro, vanuit Moshi | https://unsplash.com/photos/a-view-of-a-snow-capped-mountain-through-the-leaves-of-a-corn-field-WMDSjqVV71c |
| cultuur-2.jpg | Pieter Bouwer | Tanzania | https://unsplash.com/photos/people-on-brown-field-near-trees-under-cloudy-sky-during-daytime-8IctEW-hJZI |
| steden-2.jpg | Moses Londo | Dar es Salaam | https://unsplash.com/photos/a-large-body-of-water-with-a-boat-in-the-middle-of-it-1bubgYf5zeY |

Let op: op cultuur.jpg staan mensen (klein, niet herkenbaar in beeld). Unsplash geeft geen modeltoestemming; voor reclame met herkenbare personen is die soms nodig.

## Foto's bij 'Populaire plekken' (public/places/), van Unsplash

Unsplash-licentie (gratis, ook commercieel). Plek = wat de fotograaf op Unsplash als locatie opgeeft. Gedownload op 16 oktober 2026. Alle bronnen staan ook in data/place-photos.json.

| Bestand | Fotograaf | Plek | Bron |
|---|---|---|---|
| tarangire.webp | Tanzania Wild Sky | Tarangire National Park | https://unsplash.com/photos/NHQOJBbJgdk |
| manyara.webp | Tomáš Malík | Lake Manyara | https://unsplash.com/photos/eCT0UCyFhjA |
| ruaha.webp | Bob Brewer | Ruaha | https://unsplash.com/photos/vNFUqVRTPEE |
| mikumi.webp | Muhuji Mshana | Mikumi National Park | https://unsplash.com/photos/NEIBFVx_iK8 |
| nyerere.webp | Aron Marinelli | Nyerere National Park | https://unsplash.com/photos/bGJK-uwOpbQ |

## Video's van reizigers (app/[lang]/delen) — nodig voordat versturen aan kan

- [ ] Database + accounts (inzendingen opslaan, wie stuurde wat in)
- [ ] Moderatie: wie bekijkt inzendingen, binnen welke tijd, en wat gebeurt er bij twijfel
- [ ] Meldknop bij elke video + afhandeling van meldingen, met een reden voor de maker bij weghalen (EU Digital Services Act)
- [ ] Huisregels en voorwaarden juridisch laten nakijken (EU en Tanzania, o.a. regels voor online content in Tanzania)
- [ ] Privacyverklaring aanvullen: welke gegevens van inzenders we bewaren en hoe lang
- [ ] Label "Geboekt via Gnutube" zodra er boekingen zijn
- [ ] Leeftijdsgrens (nu 16+) laten bevestigen door een jurist
