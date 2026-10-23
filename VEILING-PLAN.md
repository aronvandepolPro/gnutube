# Plan: Gnutube wordt een veilingplatform

23 oktober 2026 · fase 1 tot en met 4 en de teksten zijn gebouwd (branch `veiling`); aanbetaling nog in testmodus

## Het idee in één alinea

Een reiziger stelt zelf een reis samen (route, data, reizigers, wensen), zet er een budget bij en plaatst hem "in de veiling". Goedgekeurde reisbedrijven zien de reis zonder persoonsgegevens en doen een gesloten bod in USD. Bedrijven zien alleen hun eigen bod. Als de veiling sluit, ziet de reiziger alle biedingen naast elkaar en zegt per veiling "ik doe het" of "nee". Bij "ik doe het" betaalt de reiziger via Gnutube een aanbetaling ter hoogte van de commissie (12,5% van het bod; bij een bod van 4.000 USD is dat 500 USD, en het bedrijf krijgt rechtstreeks 3.500 USD). Pas daarna zien reiziger en bedrijf elkaars gegevens. Het restbedrag gaat rechtstreeks naar het bedrijf. Gnutube is tussenpersoon, net als Booking: geen eigen aanbod, geen direct boeken.

## Besluiten die al genomen zijn

| Onderwerp | Besluit |
| --- | --- |
| Soort veiling | Gesloten: bedrijven zien alleen hun eigen bod |
| Wanneer ziet de klant de biedingen | Pas als de veiling sluit |
| Klant moet kiezen | Ja of nee, met een korte reden bij nee |
| Verdienmodel | Percentage van de prijs, betaald door het bedrijf (zit in het bod) en geïnd als aanbetaling via Gnutube |
| Direct boeken | Verdwijnt |
| Valuta | Alleen USD |
| Wie mag bieden | Elk bedrijf dat zich aanmeldt en door beheer is goedgekeurd (reisorganisatie, lodge, vervoerder, enz.), via de bestaande partneraanmelding. Een bod geldt altijd voor de hele reis |
| Budget | De reiziger kiest het aantal personen en een maximumbudget voor de hele groep; bedrijven zien dat maximum (en wat dat per persoon is) |
| Looptijd | Elke veiling loopt 3 dagen |
| Reis samenstellen | Blijft zoals het is: de reiziger stippelt de reis zelf uit |
| Commissie | 12,5% van het gekozen bod, standaard voor elk bedrijf (beheer kan per bedrijf afwijken) |

## Kleinere punten (het voorstel geldt, tenzij je iets anders zegt)

Let op bij het maximumbudget: veel bedrijven zullen net daaronder bieden. Vergelijken op inhoud en beoordelingen wordt daardoor belangrijker.

De punten hieronder hebben een voorstel; zonder tegenbericht bouwen we volgens het voorstel.

1. **Hoeveel open veilingen per reiziger?** Voorstel: maximaal 2 tegelijk, en alleen ingelogd.
2. **Wat gebeurt er met de aanbetaling als de reis niet doorgaat?** Moet in de voorwaarden. Laten opstellen door een jurist.
3. **Mag een bedrijf zijn bod aanpassen?** Voorstel: ja, tot de veiling sluit. Daarna staat het vast tot de "geldig tot"-datum van het bod.
4. **Blijven de vaste prijzen van partners zichtbaar als "vanafprijs"** bij het samenstellen van de reis? Voorstel: nee, dat verwart met het nieuwe model. Wel mogen partners hun profiel, foto's en verblijven laten zien.
5. **Hoe krijgen mensen bericht?** (nieuwe veiling voor bedrijven, veiling gesloten voor de reiziger). Daarvoor is een maildienst nodig. Nu is er alleen de inlogmail van Supabase.

## Eerst uitzoeken (buiten de code)

- **Jurist:** is Gnutube met dit model bemiddelaar en geen organisator van pakketreizen? Dat hangt mede af van hoe de site het presenteert. Ook nodig: nieuwe gebruiksvoorwaarden voor reizigers en voor bedrijven, en regels voor de aanbetaling. Tot dat duidelijk is, bouwen we wel, maar gaat het niet live.
- **Betaaldienst** voor de aanbetaling: Gnutube ontvangt alleen geld van reizigers, het betaalt niets uit aan partners. Dat is eenvoudiger dan het oude plan. Zelf een dienst kiezen en de voorwaarden controleren.
- **Screening van bedrijven:** welke papieren vraag je (vergunning, verzekering, referenties)? Afspreken wie dat doet.
- **Eerste bedrijven:** begin met een kleine groep bedrijven die je kent, anders zijn er geen biedingen.

## Hoe het werkt, per rol

**Reiziger**
1. Stelt de reis samen in Mijn reizen (bestaat al).
2. Klikt op **In de veiling zetten**: kiest het aantal personen, een maximumbudget voor de groep en eventueel een notitie. De veiling loopt 3 dagen. Moet ingelogd zijn.
3. Ziet in **Mijn veilingen** hoeveel tijd er nog is en hoeveel biedingen er binnen zijn, maar nog niet de prijzen.
4. Na het sluiten: alle biedingen naast elkaar (prijs, wat inbegrepen is, wat het bedrijf aanpast, beoordelingen van het bedrijf), maar zonder bedrijfsnaam.
5. Kiest **Ik doe het** → betaalt de aanbetaling → ziet naam en contactgegevens van het bedrijf. Of **Nee, geen van allen**, met een reden.

**Bedrijf**
1. Meldt zich aan als partner en wordt goedgekeurd door beheer. Pas dan kan het bieden.
2. Ziet in het partnerportaal **Open veilingen**: route, data, aantal reizigers, maximumbudget, wensen. Geen naam, e-mail of telefoon.
3. Doet een bod (niet hoger dan het maximumbudget): prijs in USD voor de hele groep, wat inbegrepen is, wat niet, eventuele aanpassingen aan de route, geldig tot.
4. Ziet de status van eigen biedingen: open, gesloten, gekozen, niet gekozen (met de reden van de reiziger).
5. Bij een gekozen bod en betaalde aanbetaling: ziet de gegevens van de reiziger en neemt contact op.

**Beheer**
- Overzicht van alle veilingen en biedingen, kan een veiling of bod weghalen.
- Bedrijven goedkeuren voordat ze mogen bieden; commissie per bedrijf instellen.
- Ziet welke aanbetalingen binnen zijn en kan terugbetalen of een geschil afhandelen.

## Wat er technisch verandert

### Database (`supabase/schema.sql`)

Nieuw:
- **`auctions`**: vervangt `trip_requests`. Reis (momentopname), reizigers, startdatum, maximumbudget (USD), notitie, sluitmoment, status (`open`, `closed`, `accepted`, `declined`, `cancelled`), reden bij nee.
- **`bids`**: per bedrijf hoogstens één bod per veiling. Prijs (USD), inbegrepen, niet inbegrepen, aanpassingen, geldig tot, status.
- **`deals`**: het gekozen bod, met commissiebedrag, betaalstatus van de aanbetaling en het moment waarop de gegevens gedeeld zijn.

De regels voor wie wat ziet, in de database zelf en niet in de browser:
- Een bedrijf leest open veilingen alleen via een functie die **geen persoonsgegevens** teruggeeft.
- Een bedrijf ziet alleen eigen biedingen.
- Een reiziger ziet de biedingen pas als `sluitmoment < nu`, en ook dan zonder bedrijfsnaam.
- Contactgegevens van beide kanten komen pas vrij als de aanbetaling betaald is (gezet door de betaaldienst, niet door de browser).
- Een bod mag niet boven het maximumbudget liggen; alleen goedgekeurde, actieve partners kunnen bieden.
- Commissie: standaard 12,5% (`partners.commission_pct` krijgt 12,5 als standaard).
- Limieten (2 open veilingen, looptijd, één bod per bedrijf) worden in de database gecontroleerd.

Weg: `offers`, `closed_days`, `booking_groups`, `booking_items`, `create_booking`, `trip_requests`.
Aanpassen: `trip_reviews`, `trip_is_done` en `my_done_trips` koppelen aan `deals` in plaats van aan boekingen.

Let op: `supabase/migrations/0001_init.sql` loopt achter op `schema.sql`. Bij deze ombouw maken we één duidelijke bron, zodat de koppeling tussen GitHub en Supabase niet per ongeluk een oude versie uitvoert.

Er is nog geen live database met echte boekingen, dus oude tabellen kunnen zonder overzetten weg. Controleren vlak voor het uitvoeren.

### Pagina's en code

| Wat | Nu | Straks |
| --- | --- | --- |
| `/reizen` (Mijn reizen) | Knoppen "Boeken" en "Laat Gnutube alles regelen" | Eén knop **In de veiling zetten** |
| `/veilingen` (nieuw) | — | Mijn veilingen: status, aftellen, biedingen vergelijken, ja/nee |
| `/boeken`, `lib/booking.ts`, `lib/checkout.ts` | Afrekenen met vaste prijzen | Weg. Komt terug als kleine pagina voor de aanbetaling |
| `/partner` (portaal) | Eigen aanbod en beschikbaarheid beheren | Open veilingen, bieden, eigen biedingen, gesloten deals |
| `/partners` en aanmelden | Aanmelden als partner | Uitleg over bieden; aanmelding blijft |
| `/beheer` | Reisaanvragen, partners, boekingen | Veilingen, biedingen, deals, aanbetalingen |
| `/reisvoorwaarden` | Gnutube als organisator | Gebruiksvoorwaarden als tussenpersoon (door jurist) |
| Homepage, "Zo werkt het" | Boeken | Uitleg in drie stappen: samenstellen, biedingen, kiezen |
| `messages/*.json` | 8 talen | Nieuwe teksten in alle 8 talen; Spaans, Italiaans, Portugees en Swahili laten nakijken |

## Bouwvolgorde

Elke fase op een testbranch met een Vercel-preview. Pas na jouw akkoord naar `main`.

1. **Database:** nieuwe tabellen, regels en functies; oude boekingstabellen weg; recensies omzetten.
2. **Reiziger:** "In de veiling zetten" en de pagina Mijn veilingen, met de biedingen na het sluiten.
3. **Bedrijf:** open veilingen, bieden, eigen biedingen in het partnerportaal.
4. **Beheer:** overzicht, bedrijven goedkeuren, ingrijpen.
5. **Aanbetaling:** betaaldienst in testmodus; na betaling gegevens vrijgeven.
6. **Opruimen en teksten:** direct boeken weg, homepage en partnerpagina herschrijven, vertalingen, LANCERING.md en CONCEPT.md bijwerken.
7. **Berichten per mail**, zodra er een maildienst is gekozen.

Fase 1 tot en met 4 kunnen zonder betaaldienst: de aanbetaling staat dan in testmodus, zoals nu ook bij boeken.

## Risico's en hoe we ze afvangen

| Risico | Maatregel |
| --- | --- |
| Reiziger en bedrijf regelen het buiten Gnutube om | Geen namen of contactgegevens vóór de aanbetaling; ook in vrije tekstvelden niet toegestaan (regel in de voorwaarden, beheer kan weghalen) |
| Bedrijven bieden niet meer omdat reizigers vaak nee zeggen | Alleen ingelogd, concreet budget en datum, maximaal 2 open veilingen, reden bij nee zichtbaar voor bedrijven |
| Race naar de laagste prijs | Alleen goedgekeurde bedrijven, beoordelingen bij elk bod, vergelijken op inhoud en niet alleen op prijs |
| Geen biedingen | Klein beginnen met bekende bedrijven; reiziger krijgt bericht en kan de veiling verlengen |
| Verkeerde juridische rol | Jurist vóór de lancering; teksten op de site sluiten aan op dat advies |
