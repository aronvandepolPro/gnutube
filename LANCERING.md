# Checklist vóór de lancering

Alles wat geregeld moet zijn voordat Gnutube live gaat. Vink af wat klaar is.

## 1. Accounts en database (Supabase) — VERPLICHT

Zonder dit werken inloggen, je reis op elk apparaat, de meldknop en de beheerpagina niet.
Stappen: [SUPABASE-SETUP.md](SUPABASE-SETUP.md).

- [ ] Supabase-project in de EU aangemaakt
- [ ] supabase/schema.sql uitgevoerd (de nieuwste versie: met veilingen, biedingen, deals, recensies en Mijn kaart). Let op: dit ruimt de oude tabellen voor direct boeken op (`offers`, `booking_groups`, `booking_items`, `closed_days`, `trip_requests`)
- [ ] Veiling testen: als reiziger een reis in de veiling zetten, met twee testpartners bieden, de veiling sluiten (in de SQL Editor `closes_at` in het verleden zetten), een bod kiezen, de test-aanbetaling doen en kijken of beide kanten elkaars gegevens zien
- [ ] Recensie testen: als beheerder een deal in testmodus met een einddatum in het verleden; kijk of Mijn kaart en 'Gemaakte reizen' hem tonen en of je een recensie kunt schrijven
- [ ] Sleutels in `.env.local` én in Vercel
- [ ] Inlogmail ingesteld (Site URL, Redirect URLs, code in de mail, eigen SMTP)
- [ ] Eigenaar is admin gemaakt
- [ ] Getest: inloggen, reis op twee apparaten, video melden, melding afhandelen in Beheer, video insturen en goedkeuren
- [ ] **Vercel-beveiliging uit:** Vercel → Settings → Deployment Protection → Vercel Authentication uitzetten. Anders moet iedere bezoeker eerst inloggen bij Vercel.
- [ ] **Wachtwoordslot uit:** in Vercel de variabele `SITE_PASSWORD` verwijderen en opnieuw deployen. Zolang die er staat, moet iedereen eerst het testwachtwoord invullen en vraagt de site zoekmachines om hem niet op te nemen.

## 2. Juridisch

- [ ] Privacyverklaring: [rechte haken] ingevuld (lib/privacy.ts) en nagekeken door een jurist
- [ ] Verwerkersovereenkomsten met Supabase en Vercel
- [ ] Eigenaar- en contactgegevens op de site
- [ ] Algemene voorwaarden / huisregels nagekeken (EU en Tanzania)
- [ ] Afgesproken wie meldingen afhandelt en hoe snel
- [ ] **Tussenpersoon of organisator:** Gnutube is nu opgezet als tussenpersoon (veiling, de afspraak over de reis is tussen reiziger en bedrijf). Laten bevestigen door een jurist dat Gnutube daarmee niet onder de EU-regels voor pakketreizen valt, en dat de teksten op de site daarbij passen
- [ ] **Voorwaarden** (/reisvoorwaarden, concept): [rechte haken] invullen en door een jurist laten nakijken, vooral de beperking van aansprakelijkheid (niet alles mag tegenover consumenten) en of de aanbetaling terugkomt als het bedrijf annuleert
- [ ] Voorwaarden voor bedrijven (commissie 12,5%, niet buiten Gnutube om, geen contactgegevens in biedingen) laten opstellen en laten tekenen bij goedkeuring
- [ ] Merknaam "Gnutube" gecontroleerd
- [ ] Bronnen van alle foto's vastgelegd (zie PLACEHOLDERS.md)

## 3. Veilingen en aanbetaling

- [ ] Betaaldienst gekozen voor de aanbetaling (Gnutube ontvangt alleen; uitbetalen aan partners is niet nodig) en gekoppeld. Tot die tijd zet beheer een aanbetaling met de hand op betaald (Beheer → Veilingen)
- [ ] **De testfunctie `test_pay_deposit` uit de database halen** (staat in supabase/schema.sql). Zolang die er is, kan een reiziger zonder te betalen de gegevens van het bedrijf zien
- [ ] Bedrijven gescreend en goedgekeurd; partneraccounts aangemaakt via Beheer → Partners (🔑 Maak partneraccount)
- [ ] Afgesproken wat er gebeurt als een veiling geen biedingen krijgt, en wie dat opvolgt
- [ ] Maildienst gekozen voor berichten (nieuwe veiling voor bedrijven, veiling gesloten voor reizigers). Nu moeten beide kanten zelf kijken

## 4. Vliegvelden

- [ ] Landingsbanen in data/airstrips.json laten bevestigen door een partner (bron: OurAirports; ourairports.com was in onderhoud bij het opzoeken)
- [ ] Ontbrekend: Mwiba en Chem Chem (geen coördinaten), Kigoma (voor Gombe), en de keuzes bij Singita, Dolly en Upper/Lower Selous

## 5. Overig

- [x] Kaartdienst: niet meer nodig, de kaart gebruikt eigen gegevens (Natural Earth)
- [ ] Openstaande punten in PLACEHOLDERS.md doorgelopen
