/**
 * Privacyverklaring (concept). Beschrijft wat de site op dit moment echt doet.
 * LET OP: de gegevens tussen [rechte haken] moeten worden ingevuld, en een jurist moet de tekst nakijken
 * voordat de site live gaat. Pas de tekst aan als er een dienst bij komt of verandert (bv. kaarten, veilingen).
 * Nederlands en Engels; de andere talen tonen de Engelse tekst.
 */
import type { Locale } from './i18n/config';

export type PrivacySection = { h: string; p?: string[]; list?: string[] };
export type PrivacyText = { title: string; intro: string; updated: string; draft: string; onlyIn?: string; sections: PrivacySection[] };

const nl: PrivacyText = {
  title: 'Privacyverklaring',
  intro: 'Wat Gnutube met je gegevens doet, waarom, en welke keuzes je hebt. In gewone taal.',
  updated: 'Laatst bijgewerkt: 23 oktober 2026',
  draft: 'Concept: deze verklaring wordt nog juridisch nagekeken voordat Gnutube officieel live gaat.',
  sections: [
    {
      h: 'Wie is verantwoordelijk?',
      p: [
        'Gnutube is een dienst van [bedrijfsnaam], [adres], [land], ingeschreven onder [registratienummer].',
        'Vragen over je gegevens? Mail naar [e-mailadres voor privacy].',
      ],
    },
    {
      h: 'Wat we bewaren en waarom',
      list: [
        'Zonder account: niets op onze servers. Je keuzes (je reis, wat je leuk vond, je routekeuzes, je cookiekeuze) staan alleen in de opslag van je eigen browser.',
        'Inloggen met Google (als je daarvoor kiest): Google stuurt ons je naam, e-mailadres en profielfoto, zodat we je account kunnen maken. Wat Google zelf doet, valt onder het privacybeleid van Google.',
        'Met een account: je e-mailadres (om in te loggen), en je reis, likes, "niet voor mij"-keuzes en routekeuzes (zodat ze op al je apparaten staan). Grondslag: de uitvoering van de dienst die je zelf aanzet.',
        'Ingestuurde video’s: de link naar je TikTok-video, je TikTok-naam, de plek, de maand van je bezoek en je korte tekst. Grondslag: jouw toestemming bij het insturen. Na goedkeuring zijn de link en je TikTok-naam openbaar op de site.',
        'Meldingen van video’s: de video, de reden, je toelichting en (als je die geeft) je e-mailadres, of je account als je bent ingelogd. Grondslag: onze wettelijke plicht om meldingen af te handelen en ons gerechtvaardigd belang om de site veilig te houden.',
        'Reacties bij video’s: je reactie, de naam die je zelf kiest en wanneer je reageerde. Je reactie en die naam zijn openbaar. Je kunt je reactie zelf verwijderen. Hoe vaak een video gedeeld is, tellen we zonder te bewaren wie deelde.',
        'Recensies van je reis en Mijn kaart: na een reis die je via Gnutube regelde (aanbetaling betaald) en die voorbij is, zie je op Mijn kaart welke plekken je bezocht (dat volgt uit je deal en is alleen voor jou zichtbaar). Schrijf je een recensie, dan bewaren we je beoordeling, je tekst en wanneer je die schreef. Je recensie is openbaar met de naam die je zelf kiest, de maand en het jaar van je reis en de plekken uit die reis; je e-mailadres en bedragen niet. Je kunt je recensie aanpassen of laten verwijderen. Grondslag: jouw keuze om een recensie te plaatsen.',
        'Veilingen: je naam, e-mailadres, eventueel telefoonnummer en wensen, en je reis (plekken, data, aantal reizigers, maximumbudget, verblijven, vervoer). Grondslag: jouw verzoek om biedingen (stappen vóór een overeenkomst). Goedgekeurde bedrijven zien je reis, je budget en je notitie, maar niet je naam, e-mailadres of telefoonnummer. Kies je een bod en betaal je de aanbetaling, dan krijgt alleen dat bedrijf je naam, e-mailadres en telefoonnummer, zodat het de reis met je kan regelen; vanaf dan is het bedrijf zelf verantwoordelijk voor wat het met je gegevens doet. Bewaard tot [bewaartermijn] na je reis of na het sluiten van de veiling.',
        'Aanbetalingen: het bedrag, het gekozen bod en of er betaald is. Grondslag: de overeenkomst met Gnutube over de bemiddeling. Betaalgegevens verwerkt [betaaldienst], niet Gnutube. Bewaard zolang de wet dat vraagt voor de administratie ([termijn]).',
        'Partneraccounts en biedingen: e-mailadres en bedrijfsnaam van goedgekeurde bedrijven, en hun biedingen (prijs, wat inbegrepen is, geldigheid). Reizigers zien een bod zonder bedrijfsnaam; pas na de aanbetaling ziet de reiziger de naam en het e-mailadres van het gekozen bedrijf. Grondslag: de samenwerkingsovereenkomst.',
        'Aanmeldingen van partners: bedrijfsnaam, contactpersoon, e-mailadres, en als je die geeft telefoonnummer, website, plek en je bericht. Grondslag: jouw verzoek om partner te worden (stappen vóór een overeenkomst). Bewaard tot [bewaartermijn, bv. 1 jaar] na het laatste contact als er geen samenwerking komt.',
        'Technische gegevens: onze hostingpartij houdt korte tijd technische logboeken bij (zoals IP-adres en tijdstip) om de site te laten werken en te beveiligen.',
      ],
    },
    {
      h: 'Video’s van TikTok',
      p: [
        'Video’s worden afgespeeld met de officiële speler van TikTok. Pas als je daar toestemming voor geeft, laadt de speler; TikTok kan dan cookies plaatsen en je bezoek volgen, volgens het privacybeleid van TikTok. Zonder toestemming maakt je browser geen verbinding met TikTok.',
        'Je keuze kun je altijd wijzigen via "Cookie-instellingen" onderaan elke pagina. Meer uitleg staat op de cookiepagina.',
      ],
    },
    {
      h: 'Wie je gegevens voor ons verwerkt',
      list: [
        'Supabase: database en inloggen. Opslag in een datacenter in [regio, bv. EU (Frankfurt)].',
        'Vercel: hosting van de website.',
        'TikTok: alleen als je video’s toestaat (zie hierboven).',
      ],
      p: ['Met deze partijen [zijn/worden] verwerkersafspraken gemaakt. Als gegevens buiten de EU komen, gebeurt dat alleen met de waarborgen die de wet vraagt.'],
    },
    {
      h: 'Hoe lang we het bewaren',
      list: [
        'Accountgegevens: zolang je account bestaat. Verwijder je je account, dan wissen we je reis, likes en inzendingen direct.',
        'Meldingen: [bewaartermijn, bv. 2 jaar] na het besluit, daarna gewist. Na het wissen van je account blijft een melding bestaan zonder koppeling aan jou.',
        'Technische logboeken: zo kort als de hostingpartij ze bewaart.',
      ],
    },
    {
      h: 'Je rechten',
      p: [
        'Je mag je gegevens inzien, laten verbeteren of wissen, bezwaar maken, de verwerking laten beperken en je gegevens meenemen.',
        'Op je accountpagina kun je zelf je gegevens downloaden en je account verwijderen. Voor de rest mail je naar [e-mailadres voor privacy]; we reageren binnen een maand.',
        'Ben je het niet eens met hoe we met je gegevens omgaan? Dan kun je een klacht indienen bij [toezichthouder, bv. de Autoriteit Persoonsgegevens als Gnutube in Nederland gevestigd is].',
      ],
    },
    {
      h: 'Leeftijd',
      p: ['Een account en het insturen van video’s zijn voor mensen van 16 jaar en ouder.'],
    },
    {
      h: 'Wijzigingen',
      p: ['Verandert er iets belangrijks, dan passen we deze verklaring aan en zie je de nieuwe datum bovenaan.'],
    },
  ],
};

const en: PrivacyText = {
  title: 'Privacy policy',
  intro: 'What Gnutube does with your data, why, and what choices you have. In plain language.',
  updated: 'Last updated: 23 October 2026',
  draft: 'Draft: this policy will be reviewed by a lawyer before Gnutube officially goes live.',
  onlyIn: 'This policy is available in English and Dutch.',
  sections: [
    {
      h: 'Who is responsible?',
      p: [
        'Gnutube is a service of [company name], [address], [country], registered under [registration number].',
        'Questions about your data? Email [privacy email address].',
      ],
    },
    {
      h: 'What we store and why',
      list: [
        'Without an account: nothing on our servers. Your choices (your trip, what you liked, your route choices, your cookie choice) are stored only in your own browser.',
        'Signing in with Google (if you choose it): Google sends us your name, email address and profile picture so we can create your account. What Google does itself is covered by Google’s privacy policy.',
        'With an account: your email address (to log in), and your trip, likes, "not for me" choices and route choices (so they are on all your devices). Legal basis: providing the service you switch on yourself.',
        'Submitted videos: the link to your TikTok video, your TikTok name, the place, the month of your visit and your short text. Legal basis: your consent when submitting. Once approved, the link and your TikTok name are public on the site.',
        'Video reports: the video, the reason, your explanation and (if you give it) your email address, or your account if you are logged in. Legal basis: our legal obligation to handle reports and our legitimate interest in keeping the site safe.',
        'Comments on videos: your comment, the name you choose and when you posted. Your comment and that name are public. You can delete your comment yourself. We count how often a video is shared without storing who shared it.',
        'Trip reviews and My map: after a trip arranged through Gnutube has ended (deposit paid), My map shows which places you visited (this follows from your deal and is visible only to you). If you write a review, we store your rating, your text and when you wrote it. Your review is public with the name you choose, the month and year of your trip and the places in that trip; your email address and amounts are not. You can edit your review or have it removed. Legal basis: your choice to post a review.',
        'Auctions: your name, email address, optionally phone number and wishes, and your trip (places, dates, number of travellers, maximum budget, stays, transport). Legal basis: your request for bids (steps before a contract). Approved companies see your trip, your budget and your note, but not your name, email address or phone number. If you choose a bid and pay the deposit, only that company receives your name, email address and phone number so it can arrange the trip with you; from then on the company itself is responsible for what it does with your data. Kept until [retention period] after your trip or after the auction closes.',
        'Deposits: the amount, the chosen bid and whether it has been paid. Legal basis: your agreement with Gnutube about the introduction. Payment details are processed by [payment provider], not Gnutube. Kept as long as the law requires for bookkeeping ([period]).',
        'Partner accounts and bids: email address and business name of approved companies, and their bids (price, what is included, validity). Travellers see a bid without the company name; only after the deposit does the traveller see the name and email address of the chosen company. Legal basis: the partnership agreement.',
        'Partner applications: business name, contact person, email address, and if you give them phone number, website, place and your message. Legal basis: your request to become a partner (steps before a contract). Kept until [retention period, e.g. 1 year] after the last contact if no partnership follows.',
        'Technical data: our hosting provider keeps technical logs (such as IP address and time) for a short period to run and secure the site.',
      ],
    },
    {
      h: 'Videos from TikTok',
      p: [
        'Videos play in TikTok’s official player. The player only loads once you allow it; TikTok may then set cookies and track your visit, under TikTok’s privacy policy. Without your permission your browser does not connect to TikTok.',
        'You can change your choice at any time via "Cookie settings" at the bottom of every page. More on the cookie page.',
      ],
    },
    {
      h: 'Who processes your data for us',
      list: [
        'Supabase: database and login. Stored in a data centre in [region, e.g. EU (Frankfurt)].',
        'Vercel: website hosting.',
        'TikTok: only if you allow videos (see above).',
      ],
      p: ['Data processing agreements [are/will be] in place with these parties. If data leaves the EU, this only happens with the safeguards the law requires.'],
    },
    {
      h: 'How long we keep it',
      list: [
        'Account data: as long as your account exists. If you delete your account, we delete your trip, likes and submissions immediately.',
        'Reports: [retention period, e.g. 2 years] after the decision, then deleted. After you delete your account, a report remains without a link to you.',
        'Technical logs: as briefly as the hosting provider keeps them.',
      ],
    },
    {
      h: 'Your rights',
      p: [
        'You may access, correct or delete your data, object, restrict processing and take your data with you.',
        'On your account page you can download your data and delete your account yourself. For anything else, email [privacy email address]; we reply within one month.',
        'Not happy with how we handle your data? You can complain to [supervisory authority, e.g. the Dutch Autoriteit Persoonsgegevens if Gnutube is established in the Netherlands].',
      ],
    },
    { h: 'Age', p: ['An account and submitting videos are for people aged 16 and over.'] },
    { h: 'Changes', p: ['If something important changes, we update this policy and you will see the new date at the top.'] },
  ],
};

export function getPrivacy(locale: Locale): PrivacyText {
  if (locale === 'nl') return nl;
  return locale === 'en' ? { ...en, onlyIn: undefined } : en;
}
