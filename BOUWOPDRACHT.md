# knoetube – bouwopdracht voor Claude Code

Oct 12, 2026 · @kas steemers

## Hoe je dit document gebruikt in Claude Code

Plak dit hele document als eerste bericht in Claude Code en laat het eerst een plan maken, nog geen code. Dit is een bouwopdracht voor een echte website op basis van een klikbaar prototype.

Zet deze instructie bovenaan je eerste bericht:

```markdown
Je bouwt de website knoetube op basis van de bouwopdracht hieronder.
Werk in de fasen uit "Bouwvolgorde en fasen". Begin met een kort plan en een mappenstructuur, en wacht op mijn akkoord voordat je code schrijft.
Verzin geen prijzen, reviews, aantallen, lodgenamen of juridische teksten. Gebruik duidelijke placeholders zoals [prijs] en zet ze in een lijst.
Vraag het als iets in dit document onduidelijk is of elkaar tegenspreekt.
```

Werk daarna per fase. Laat Claude Code na elke fase vertellen wat er af is en wat nog open staat.

## Concept en doel van knoetube

knoetube is een reisplatform voor heel Afrika dat een reismagazine, een boekingssite en social media combineert. Reizigers kijken naar plekken, bewaren wat ze mooi vinden en stellen zelf een reis samen. Een lokale reisorganisatie maakt die reis rond via een offerte.

- **Social:** reizigers, gidsen en lodges delen video's en "veldnotities" van echte plekken. Je kunt liken, ervaringen lezen en schrijven, en plekken delen.
- **Zoeken en vergelijken:** zoeken op regio, land, soort reis en budget, met beoordelingen, verblijven en prijzen per plek.
- **Zelf plannen:** plekken bewaren in reismappen (één map per reis), volgorde kiezen, nachten en slaapplek per nacht kiezen, en een offerte aanvragen.
- **Dekking:** alle 54 Afrikaanse landen, in vijf regio's, met vijf soorten reizen: safari, eilanden en strand, natuur en bergen, cultuur en steden, en alles samen.
- **Partners:** lodges, camps, parken en reisorganisaties melden zich aan, leveren eigen beeld en ontvangen aanvragen.

**Identiteit:** knoetube is zichzelf, geen kopie van TikTok, Booking of TripAdvisor. De vorm is die van een reismagazine: elke plek is een reisaffiche, coördinaten zijn een vast stijlelement, en bewaren voelt als een stempel in je paspoort.

**Commercieel:** DollyEscape (een kleine lodge) wordt gepromoot, maar het platform blijft neutraal. Promotie staat altijd zichtbaar gemarkeerd als "Uitgelicht · betaald".

## Technische aanpak en stack

Bouw het als een webapp die op telefoon en computer goed werkt, met een database en accounts; een losse mobiele app komt later. Onderstaande keuzes zijn een voorstel. Claude Code mag een gelijkwaardig alternatief kiezen als het dat onderbouwt.

| Onderdeel | Voorstel | Waarom |
| --- | --- | --- |
| Framework | Next.js (App Router) met TypeScript | Snelle pagina's, goed voor vindbaarheid, één codebase |
| Opmaak | Tailwind CSS met eigen design tokens | Vaste kleuren en maten uit dit document |
| Database, accounts, opslag | Supabase (Postgres, Auth, Storage) | Reismappen, reviews en uploads van partners |
| Talen | next-intl | Vier talen met vertaalbestanden |
| Kaart | MapLibre GL met een kaartdienst naar keuze | Inzoomen; het prototype had alleen een schematische kaart |
| Video | Officiële embeds van YouTube en TikTok; eigen video's via een videohostingdienst | Rechten blijven bij de maker; eigen video's spelen soepel af |
| Hosting | Vercel of vergelijkbaar | Past bij Next.js |

Eisen voor de hele site:

- Werkt goed vanaf 360 px breed tot groot scherm. De kijkmodus is mobiel-eerst.
- Toegankelijk: echte knoppen en labels, toetsenbordbediening, voldoende contrast, alt-teksten.
- Animaties uit bij `prefers-reduced-motion`.
- Alle teksten via vertaalbestanden, nooit hardcoded in componenten.
- Seed-data voor bestemmingen in één bestand, zodat redactie die later kan beheren.

## Pagina's en functies

De site heeft zeven hoofdonderdelen. Menu: Ontdek · Kijken · Zoek en boek · Kaart · Mijn reizen (met teller) · Voor partners · taalkeuze.

1. **Ontdek (home)**
   - Kop "Afrika, plek voor plek." met drie licht zwevende reisaffiches.
   - Lopende band met plaatsnamen en coördinaten.
   - Zoekbalk zoals bij een boekingssite: Waarheen (regio's en landen), Soort reis, Budget, knop Zoeken.
   - "Het logboek": veldnotities in kolommen. Per notitie: affiche met knop "Bekijk video", maker, korte tekst, like, score met aantal ervaringen, "Toevoegen aan reis". Knop "Meer veldnotities".
   - Index "Reizen per soort": grote regels met aantal plekken; bij hover verschijnt een klein affiche.
   - "Zo werkt het" in drie stappen, en een groene band voor partners.
2. **Kijken (social feed)**
   - Donkere, verticale feed: één video per scherm, scroll-snap, mobiel-eerst.
   - Op desktop staat de info naast de video; op mobiel schuift die onder in beeld.
   - Per video: coördinaten, naam, land en regio, maker, notitie, like, score met ervaringen, toevoegen aan reis, delen.
   - "In de buurt": drie dichtstbijzijnde plekken met afstand; klikken springt naar die video.
   - Filter op soort reis. Op desktop pijltjes voor vorige en volgende. Videonummer als "001 / 149".
   - Plekken met een negatief reisadvies komen niet in deze feed.
3. **Zoek en boek (resultaten)**
   - Filters: soort reis, regio, land, budget. Sorteren: best beoordeeld, A tot Z.
   - Bovenaan één gesponsorde rij voor DollyEscape met label "Uitgelicht · betaald".
   - Per resultaat: affiche, soort en coördinaten, naam, land, korte omschrijving, drie activiteiten, score, "Vanaf \[prijs\]", Toevoegen aan reis, Bekijk.
   - Reisadvies-label waar nodig, en "Meer tonen".
4. **Plekpagina**
   - Groot affiche (later echte foto of video), naam, omschrijving, score, knoppen: Toevoegen aan reis, like, Bekijk video, Delen, Kaart.
   - "In de buurt" met afstanden. Reisadvies-melding waar nodig.
   - Tabblad Overzicht: activiteiten, beste reistijd, aangeraden nachten, kaartje.
   - Tabblad Verblijven: drie opties passend bij de soort plek. Een keuze zet de plek in de actieve reismap en geldt voor alle nachten daar.
   - Tabblad Ervaringen: reviews lezen, zelf schrijven met 1 tot 5 sterren. Melding als sterren of tekst ontbreken.
5. **Kaart**
   - Kaart van Afrika met Madagaskar en eilanden, een punt per plek. Kleur per soort reis, eigen kleur voor "in je reis", rode rand bij reisadvies.
   - Filter op soort reis. Klik op een punt toont een paneel met affiche, info, Bekijk en Toevoegen aan reis.
6. **Mijn reizen (planner)**
   - Tabbladen per reismap, nieuwe map maken met naam.
   - Stops in de volgorde van de map, met pijltjes omhoog en omlaag, en "Slim sorteren" op land en geografie.
   - Waarschuwing als de route terug springt naar een eerder bezocht land.
   - Aankomst bij de luchthaven van het eerste land, vertrek vanaf die van het laatste.
   - Per stop: dagen, nachten (min en plus), activiteiten aan of uit, en per nacht een slaapplek kiezen.
   - Per etappe: rijden of vliegen; naar eilanden boot of vliegen; label "grensovergang" bij een landwissel.
   - Zijbalk: kaart met de route, takenlijst, uitgelicht blok DollyEscape, overzicht van dagen, nachten, slaapplekken en activiteiten, totaal \[bedrag\], knop Offerte aanvragen.
7. **Voor partners**
   - Kop, introductie, zes voordelen, proces in vier stappen (aanmelden, controle, online, aanvragen ontvangen), partnervragen.
   - Aanmeldformulier: soort (lodge of camp, park of reservaat, reisorganisatie), naam, land, e-mail, telefoon, website, foto's en video's uploaden, rechtenverklaring, akkoord met voorwaarden.
   - Validatie per veld. Na versturen een bevestiging met de melding dat elke aanmelding eerst wordt gecontroleerd.

Algemeen: bewaren opent altijd een keuzevenster met alle reismappen en "nieuwe map". Delen biedt link kopiëren, WhatsApp en e-mail.

## Datamodel

De kern is een bestemming die bij een land en regio hoort, met een soort reis, coördinaten en activiteiten. Alles wat een gebruiker doet (liken, bewaren, reviews, planning) hangt aan een account. Teksten die vertaald worden, staan als object per taal (`nl`, `en`, `de`, `fr`).

| Tabel | Belangrijkste velden | Opmerking |
| --- | --- | --- |
| regions | id, name (per taal) | Oost-Afrika, Zuidelijk Afrika, Centraal-Afrika, West-Afrika, Noord-Afrika |
| countries | id (ISO-code), region\_id, name (per taal), airport, advisory | Alle 54 landen; advisory = negatief reisadvies voor het hele land |
| destinations | id, country\_id, name, kind, tagline (per taal), lat, lon, default\_nights, can\_fly, has\_water, mountain, advisory | kind: safari, beach, nature, culture |
| activities | id, name (per taal) | Bijvoorbeeld game drive, snorkelen, trektocht |
| destination\_activities | destination\_id, activity\_id, seasonal | Seizoensgebonden activiteiten krijgen een label |
| stays | id, destination\_id, partner\_id, type, name, price\_from, currency | type: camp, lodge, luxe, hotel, bungalow, resort, villa |
| media | id, destination\_id of stay\_id, kind, source, url, creator, rights\_confirmed | source: embed (YouTube of TikTok) of upload |
| posts | id, author\_id, destination\_id, media\_id, note, created\_at | De veldnotities in logboek en kijkmodus |
| likes | user\_id, post\_id of destination\_id | Alleen "leuk vinden", geen effect op reizen |
| reviews | id, user\_id, destination\_id, stars (1 tot 5), text, status | status voor moderatie |
| trip\_folders | id, user\_id, name | Eén map per reis |
| trip\_items | folder\_id, destination\_id, position, nights, leg\_mode | leg\_mode: ground, boat, fly |
| trip\_nights | folder\_id, destination\_id, night\_index, stay\_id | Slaapplek per nacht |
| trip\_activities | folder\_id, destination\_id, activity\_id | Gekozen activiteiten |
| quote\_requests | id, folder\_id, user\_id, status, created\_at | Gaat naar een lokale operator |
| partners | id, kind, name, country, email, phone, website, status, sponsored | kind: lodge, park, operator; sponsored voor "Uitgelicht" |

Scores op de site komen alleen uit echte reviews; aantallen likes, bewaard en gedeeld uit echte tellingen.

## Ontwerp: kleuren, typografie, beweging

De stijl is een reismagazine: papierkleur, inkt, grote krantenkoppen, dunne lijnen en coördinaten. Geen afgeronde kaartjes, geen kleurverlopen, geen schaduwen en geen standaard AI-uitstraling.

| Token | Hex | Gebruik |
| --- | --- | --- |
| paper | #F3EFE6 | Achtergrond van de site |
| card | #FBF9F4 | Panelen, formulieren, affichekaders |
| ink | #151513 | Tekst, lijnen, knoppen met omlijning |
| muted | #3E3C36 | Bijtekst |
| subtle | #5B5850 | Kleine labels en coördinaten |
| rule | #D9D2C3 | Dunne scheidingslijnen |
| forest | #0E3B33 | Hoofdknoppen, partnerband, ticker |
| saffron | #E8A33D | Scores, nummers, accenten (altijd met donkere tekst) |
| terracotta | #C4532F | Hartje, route op de kaart |
| watch | #121210 | Achtergrond van de kijkmodus |
| warning | #FBE3D6 met tekst #7A2E0E | Reisadvies |
| dolly | #63482E | Alleen het uitgelichte blok van DollyEscape |

**Lettertypes:**

- Libre Caslon Display voor koppen en plaatsnamen.
- Schibsted Grotesk voor tekst en knoppen.
- IBM Plex Mono voor coördinaten, videonummers en kleine data.

Alle drie zijn Google Fonts. Koppen mogen groot zijn, tot ongeveer 100 px op desktop, met een regelhoogte van 0,95 tot 1,05.

**Vormen:**

- Hoeken zijn recht (0 px). Alleen avatars, stempels en kaartpunten zijn rond.
- Scheiding met lijnen van 1 px in plaats van kaartjes.
- Knoppen zijn minimaal 44 px hoog: gevuld forest-groen voor hoofdacties, ink-omlijning voor de rest.

**Beeld:**

- Echte foto's en video's van makers en partners zijn de hoofdzaak.
- Zolang die ontbreken, gebruikt de site een reisaffiche in vintage stijl als plaatsvervanger: platte kleurbanden, een grote zon, een silhouet per soort reis en een dun kader.

**Beweging (altijd uit bij `prefers-reduced-motion`):**

- Koppen en blokken schuiven zacht in beeld bij het laden.
- Affiches op de home zweven langzaam.
- Bij hover over een affiche komt de zon iets omhoog.
- In de index per soort verschijnt een klein affiche bij hover, en de pijl schuift op.
- Het hartje "popt" bij liken. Een stempel valt met een draai op een plek die je aan een reis toevoegt.
- In de kijkmodus loopt een voortgangsbalk mee, en een stilstaand beeld krijgt een langzame inzoom.

## Talen, regels en content

De site werkt in vier talen: Nederlands, Engels, Duits en Frans. Bedragen worden getoond in euro, met de notatie van de gekozen taal. Coördinaten gebruiken de windrichtingen van die taal, bijvoorbeeld N, Z, O, W in het Nederlands.

Regels die Claude Code moet inbouwen:

- **Gesponsord altijd zichtbaar.** Elke betaalde plaatsing krijgt het label "Uitgelicht · betaald". De volgorde van zoekresultaten wordt niet stiekem aangepast.
- **Reisadvies.**
  - Landen en gebieden met een negatief reisadvies krijgen een vlag.
  - Ze staan op de kaart en in de zoekresultaten met een waarschuwing.
  - Ze komen niet in de kijkmodus en niet in het logboek op de home.
  - De lijst wordt beheerd in de database en regelmatig gecontroleerd.
  - Voorlopige lijst van hele landen: Soedan, Zuid-Soedan, Somalië, Libië, Mali, Burkina Faso, Niger, Tsjaad en de Centraal-Afrikaanse Republiek.
  - Daarnaast gebieden in onder andere Ethiopië, Oost-Congo, Noord-Kameroen, Noord-Benin, Noord-Togo en Nigeria.
- **Geen verzonnen data.**
  - De voorbeeldscores, aantallen, reviews, veldnotities en makersnamen uit het prototype gaan er bij livegang uit.
  - Tot er echte data is, toont de site placeholders of niets.
- **Beeldrechten.**
  - Video's van anderen alleen via officiële embeds.
  - Uploads alleen met een rechtenverklaring van de uploader.
  - Er komt een duidelijke manier om beelden te laten verwijderen.
- **Moderatie.** Reviews en posts krijgen een status: in behandeling, gepubliceerd of verwijderd. Er is een meldknop en een eenvoudig beheerscherm.
- **Dierenwelzijn.** Geen activiteiten waarbij dieren worden achtervolgd of vastgehouden, zoals zwemmen met dolfijnen bij Zanzibar. Seizoensgebonden activiteiten krijgen het label "seizoen".
- **Offerte in plaats van directe verkoop.**
  - In de eerste versie verkoopt knoetube geen pakketreizen zelf.
  - De aanvraag gaat naar een lokale operator met de juiste vergunningen.
  - Laat dit juridisch toetsen voordat er betalingen bijkomen.
- **Privacy.**
  - Cookiemelding voor ingesloten video's en eventuele statistieken.
  - Een privacyverklaring.
  - Een vinkje voor toestemming bij formulieren.

## Externe koppelingen

In de eerste versie zijn alleen video-embeds, de kaart en e-mail nodig; vluchten en betalingen komen later. Laat Claude Code bij elke koppeling de actuele voorwaarden en API-documentatie van de aanbieder controleren, want die veranderen.

| Koppeling | Doel | Wanneer | Let op |
| --- | --- | --- | --- |
| YouTube- en TikTok-embeds | Video's van makers tonen | Fase 1 | Alleen openbare video's waarvan insluiten aan staat; maker en link tonen |
| Videohosting voor uploads | Eigen video's van partners soepel afspelen | Fase 2 | Rechtenverklaring verplicht bij upload |
| Kaartdienst (via MapLibre) | Kaart met inzoomen | Fase 1 | Kaartdienst en licentie nog kiezen |
| E-mail (transactioneel) | Bevestiging aanmelding, offerteaanvraag doorsturen | Fase 1 | Afzenderdomein instellen |
| WhatsApp-deellink | Plekken delen | Fase 1 | Alleen een link, geen API nodig |
| Vluchtzoeker (affiliate of API) | Vluchten bij een reis tonen | Fase 3 | Welke aanbieder nieuwe partners accepteert, nog uitzoeken |
| Betalingen | Pas als knoetube zelf gaat verkopen | Later | Eerst juridisch laten toetsen |

## Bouwvolgorde en fasen

Bouw in drie fasen, zodat er na fase 1 al iets bruikbaars staat om te testen met echte mensen.

1. **Fase 1: de basis**
   - Projectopzet, design tokens, lettertypes, vertaalstructuur.
   - Database met regio's, landen, bestemmingen en activiteiten (seed-data).
   - Pagina's Ontdek, Zoek en boek, Plekpagina en Kaart.
   - Kijkmodus met YouTube- en TikTok-embeds.
   - Accounts, liken, reismappen en delen.
   - Mijn reizen met volgorde, nachten, slaapplek per nacht, vervoer per etappe en offerteaanvraag per e-mail.
2. **Fase 2: social en partners**
   - Reviews met moderatie.
   - Posts en veldnotities van gebruikers, met uploads.
   - Partneraanmelding met controleproces en een eenvoudig partnerdashboard: eigen pagina, beeld en prijzen beheren, aanvragen zien.
   - Gesponsorde plaatsingen met label.
3. **Fase 3: groei**
   - Echte prijzen en het budgetfilter werkend.
   - Vluchten via een partner.
   - Statistieken voor partners.
   - Daarna eventueel een mobiele app.

Elke fase is af als alle teksten in de vier talen staan, de pagina's werken op telefoon en desktop, en er geen verzonnen gegevens in zitten.

## Open beslissingen en placeholders

Deze punten moeten jullie zelf invullen. Tot die tijd laat Claude Code ze als placeholder staan.

- [ ] Domeinnaam knoetube en de definitieve schrijfwijze van de naam
- [ ] Wat het platform kost voor reizigers, en de pakketprijzen voor partners (Basis en Uitgelicht, en wat erin zit)
- [ ] Contactgegevens van het partnerteam: naam, e-mail, WhatsApp
- [ ] Hoeveel werkdagen de controle van een partner duurt
- [ ] Welke lokale operator(s) de offerteaanvragen afhandelen, en met welke vergunningen
- [ ] Locatie van DollyEscape (land en bij welk park), zodat de lodge op de juiste plek als optie verschijnt
- [ ] Partnervoorwaarden, privacyverklaring en cookiebeleid (juridisch laten opstellen)
- [ ] Keuze van kaartdienst, videohosting en e-maildienst
- [ ] Controle van alle bestemmingen, activiteiten, seizoenen en luchthavens door mensen met lokale kennis
- [ ] Eerste set echte foto's en video's, plus afspraken met makers en lodges over het gebruik ervan
- [ ] Wie reviews en posts modereert, en binnen welke tijd

De bestemmingen, coördinaten en activiteiten uit het prototype zijn uit algemene kennis samengesteld en bij benadering. Gebruik ze als startpunt, niet als eindcontrole.
