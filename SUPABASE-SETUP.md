# Accounts en database aanzetten (Supabase)

De code is klaar. Zolang de stappen hieronder niet gedaan zijn, werkt de site zoals voorheen: alles alleen in de eigen browser, zonder inloggen. De namen van knoppen in Supabase kunnen iets afwijken; zoek dan op het woord.

## 1. Project maken (± 5 minuten)

1. Ga naar supabase.com en maak een account (dat doe je zelf).
2. **New project**. Kies als regio een datacenter in de **EU** (bijvoorbeeld Frankfurt): beter voor de privacyregels. Bewaar het databasewachtwoord in je wachtwoordmanager.
3. Kijk zelf welk abonnement past; ik noem geen prijzen of limieten die ik niet zeker weet.

## 2. Database inrichten

1. Supabase → **SQL Editor** → **New query**.
2. Plak de hele inhoud van [supabase/schema.sql](supabase/schema.sql) en klik **Run**.
   (Kan veilig opnieuw, als je later iets aanpast.)
3. Gebruik alleen `schema.sql`. Het bestand `supabase/migrations/0001_init.sql` is een oude, nooit gebruikte opzet; voer dat niet uit.

Let op: sinds de veilingen ruimt `schema.sql` de oude tabellen voor direct boeken op (`offers`, `booking_groups`, `booking_items`, `closed_days`, `trip_requests`). Stonden daar al testboekingen in, dan zijn die daarna weg.

## 3. Sleutels in de site zetten

1. Supabase → **Project Settings** → **API** (of **API Keys**). Kopieer:
   - de **Project URL**
   - de **publishable key** (of bij oudere projecten de **anon public** key). Niet de *secret/service_role* key: die hoort nooit in de website.
2. Maak in de projectmap een bestand `.env.local` met:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Dit bestand gaat niet mee naar GitHub (staat in .gitignore).
3. Herstart de dev-server.
4. **Vercel** → je project → **Settings → Environment Variables**: dezelfde twee regels toevoegen, daarna opnieuw deployen.

## 4. Inloggen per e-mail instellen

1. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: het adres van de live site.
   - **Redirect URLs**: `http://localhost:3000/**` en `https://jouw-domein/**`.
2. **Authentication → Emails** (templates) → **Magic Link**: zet `{{ .Token }}` in de mail, zodat mensen ook de code kunnen intypen (handig als ze de mail op een ander apparaat openen dan waar ze inloggen).
3. Voor echt gebruik: stel bij **Authentication → SMTP** een eigen mailprovider in. De ingebouwde mailer van Supabase is bedoeld om te testen en verstuurt maar weinig mails.

## 4b. Inloggen met Google (optioneel, aanrader)

De knop **Doorgaan met Google** verschijnt vanzelf op de site zodra Google in Supabase aanstaat. De namen van menu's kunnen iets afwijken; zoek dan op het woord.

1. **Supabase → Authentication → Providers → Google.** Laat dit scherm open: hier staat de **Callback URL** (iets als `https://jouw-project.supabase.co/auth/v1/callback`). Die heb je zo nodig.
2. **Google Cloud Console** (console.cloud.google.com), inloggen met je Google-account:
   1. Maak een nieuw project, bijvoorbeeld `Gnutube`.
   2. **OAuth consent screen** (of **Google Auth Platform → Branding**): kies **External**, vul de appnaam (Gnutube), een supportadres en de domeinnaam van de site in. Voeg je privacyverklaring toe (`https://jouw-domein/nl/privacy`).
   3. **Credentials → Create credentials → OAuth client ID → Web application**:
      - **Authorized JavaScript origins:** `http://localhost:3000` en `https://jouw-domein`
      - **Authorized redirect URIs:** de **Callback URL** uit stap 1
   4. Kopieer de **Client ID** en het **Client secret**.
3. **Terug in Supabase → Providers → Google:** zet Google **aan**, plak Client ID en Client secret, en sla op.
4. Klaar: herlaad de inlogpagina; de knop staat er nu. Test het een keer.

Let op: zolang de app bij Google in de testfase staat, kunnen alleen testgebruikers die je daar toevoegt inloggen. Zet hem op **In production** als je live gaat (Google kan dan om een controle vragen).

## 5. Jezelf beheerder maken

1. Log één keer in op de site (rechtsboven **Inloggen**).
2. Supabase → **SQL Editor**, voer uit (met je eigen adres):

   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'jouw@adres.nl' on conflict do nothing;
   ```

3. Log uit en weer in. Op **Mijn account** staat nu de knop **Beheer** (ook via `/nl/beheer`).

## Wat er dan werkt

- Inloggen met een link of code per mail (geen wachtwoorden).
- Liken en toevoegen aan je reis vraagt om inloggen; je keuze wordt na het inloggen alsnog bewaard.
- Reis, likes en routekeuzes staan in je account en dus op elk apparaat.
- Uitloggen wist de gegevens uit die browser (gedeelde computer).
- Meldknop bij elke video (ook zonder account). Beheer ziet de meldingen en kiest **Weghalen** of **Laten staan**, met een reden. Weggehaalde video's verdwijnen overal van de site en kunnen worden teruggezet.
- Reizigers kunnen een video insturen (ingelogd); beheer keurt goed of af. Goedgekeurde video's verschijnen bij de plek en tussen de video's, met het label "Reiziger".
- Op **Mijn account**: je ingestuurde video's met status, je gegevens downloaden, je account verwijderen.

## Veilingen

- Een reiziger zet in **Mijn reis** zijn reis in de veiling: aantal reizigers, maximumbudget (USD, hele groep), startdatum. De veiling loopt 3 dagen; maximaal 2 tegelijk per reiziger.
- Goedgekeurde partners (Beheer → Partners → 🔑 Maak partneraccount) zien op **/partner** de lopende veilingen zonder naam of contactgegevens van de reiziger, en doen een gesloten bod (niet boven het maximum).
- Na het sluiten ziet de reiziger op **/veilingen** alle biedingen zonder bedrijfsnaam en kiest er één of geen (met reden).
- Bij een keuze betaalt de reiziger de commissie (standaard 12,5%) als aanbetaling. Pas daarna zien beide kanten elkaars naam en e-mail. Nu nog in **testmodus**: zie LANCERING.md stap 3.

## Nog te regelen

- Privacyverklaring: de [rechte haken] invullen en juridisch laten nakijken (zie [lib/privacy.ts](lib/privacy.ts)).
- Verwerkersovereenkomsten met Supabase en Vercel (beide bieden er een aan; zelf afsluiten).
- Wie de meldingen bekijkt, en hoe snel. Meldingen moet je volgens de EU-regels zorgvuldig en tijdig afhandelen.
- Bescherming tegen spam bij melden zonder account (bijvoorbeeld een captcha), zodra het nodig blijkt.
