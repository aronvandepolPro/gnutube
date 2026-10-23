-- Gnutube: database-opzet voor Supabase.
-- Uitvoeren in Supabase → SQL Editor → New query → plakken → Run. Kan veilig opnieuw worden uitgevoerd.
--
-- Tabellen
--   user_data      reis, likes, 'niet voor mij' en routekeuzes per account (zichtbaar op elk apparaat)
--   admins         wie de beheerpagina mag gebruiken (eigenaar)
--   reports        meldingen van video's (iedereen mag melden, ook zonder account)
--   hidden_videos  video's die na een melding zijn weggehaald (openbaar leesbaar, zodat de site ze verbergt)
--   submissions    video's die reizigers insturen (eerst beoordelen, dan pas zichtbaar)
--
-- Beveiliging: Row Level Security staat op elke tabel aan. Gebruikers zien alleen hun eigen gegevens;
-- alleen admins zien meldingen en inzendingen en mogen beslissen.

-- ─── Admins ────────────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

drop policy if exists "admins: zelf zien" on public.admins;
create policy "admins: zelf zien" on public.admins for select using (user_id = auth.uid());

-- ─── Gegevens per gebruiker ────────────────────────────────────────────────
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  trip text[] not null default '{}',
  liked text[] not null default '{}',
  nope text[] not null default '{}',
  route jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;

drop policy if exists "user_data: eigen rij lezen" on public.user_data;
drop policy if exists "user_data: eigen rij maken" on public.user_data;
drop policy if exists "user_data: eigen rij wijzigen" on public.user_data;
drop policy if exists "user_data: eigen rij wissen" on public.user_data;
create policy "user_data: eigen rij lezen" on public.user_data for select using (user_id = auth.uid());
create policy "user_data: eigen rij maken" on public.user_data for insert with check (user_id = auth.uid());
create policy "user_data: eigen rij wijzigen" on public.user_data for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_data: eigen rij wissen" on public.user_data for delete using (user_id = auth.uid());

-- ─── Meldingen ─────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  video_id text not null check (video_id ~ '^[0-9]{8,25}$'),
  place_id text not null check (char_length(place_id) <= 60),
  reason text not null check (reason in ('illegal', 'privacy', 'copyright', 'animals', 'hate', 'spam', 'wrong_place', 'other')),
  details text check (char_length(details) <= 1000),
  reporter_id uuid references auth.users (id) on delete set null,
  reporter_email text check (char_length(reporter_email) <= 200),
  status text not null default 'open' check (status in ('open', 'removed', 'kept')),
  decision_note text check (char_length(decision_note) <= 1000),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;

drop policy if exists "reports: iedereen mag melden" on public.reports;
drop policy if exists "reports: admins lezen" on public.reports;
drop policy if exists "reports: admins beslissen" on public.reports;
-- Melden mag zonder account; een nieuwe melding is altijd 'open' en zonder besluit
create policy "reports: iedereen mag melden" on public.reports for insert
  with check (status = 'open' and decided_by is null and decided_at is null and decision_note is null
              and (reporter_id is null or reporter_id = auth.uid()));
create policy "reports: admins lezen" on public.reports for select using (public.is_admin());
create policy "reports: admins beslissen" on public.reports for update using (public.is_admin()) with check (public.is_admin());

-- ─── Weggehaalde video's ───────────────────────────────────────────────────
create table if not exists public.hidden_videos (
  video_id text primary key,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.hidden_videos enable row level security;

drop policy if exists "hidden_videos: iedereen lezen" on public.hidden_videos;
drop policy if exists "hidden_videos: admins beheren" on public.hidden_videos;
create policy "hidden_videos: iedereen lezen" on public.hidden_videos for select using (true);
create policy "hidden_videos: admins beheren" on public.hidden_videos for all using (public.is_admin()) with check (public.is_admin());

-- ─── Ingestuurde video's ───────────────────────────────────────────────────
create table if not exists public.submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id text not null check (char_length(place_id) <= 60),
  url text not null check (char_length(url) <= 300 and url ~* '^https://([a-z]+\.)?tiktok\.com/'),
  tiktok_id text check (tiktok_id ~ '^[0-9]{8,25}$'),
  author text check (char_length(author) <= 60),
  visited text check (char_length(visited) <= 7),
  note text check (char_length(note) <= 280),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decision_note text check (char_length(decision_note) <= 1000),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.submissions enable row level security;

drop policy if exists "submissions: eigen inzenden" on public.submissions;
drop policy if exists "submissions: eigen of goedgekeurd lezen" on public.submissions;
drop policy if exists "submissions: admins beslissen" on public.submissions;
drop policy if exists "submissions: eigen wissen" on public.submissions;
create policy "submissions: eigen inzenden" on public.submissions for insert
  with check (user_id = auth.uid() and status = 'pending' and decision_note is null and decided_at is null);
-- Goedgekeurde video's zijn openbaar (ze staan op de site); je eigen inzendingen zie je altijd; admins zien alles
create policy "submissions: eigen of goedgekeurd lezen" on public.submissions for select
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "submissions: admins beslissen" on public.submissions for update using (public.is_admin()) with check (public.is_admin());
create policy "submissions: eigen wissen" on public.submissions for delete using (user_id = auth.uid() or public.is_admin());

-- Bezoekers zonder account zien alleen de openbare kolommen (geen gebruikers-id, notitie of besluit)
revoke select on public.submissions from anon;
grant select (id, place_id, tiktok_id, author, url, status, created_at) on public.submissions to anon;

-- Openbare weergave van goedgekeurde video's zonder gebruikers-id
create or replace view public.approved_videos with (security_invoker = true) as
  select id, place_id, tiktok_id, author, url, created_at from public.submissions
  where status = 'approved' and tiktok_id is not null;

-- ─── Account wissen (recht op verwijdering) ───────────────────────────────
-- Wist het eigen account; door 'on delete cascade' verdwijnen ook reis, likes en inzendingen.
-- Meldingen blijven bestaan zonder koppeling aan de persoon (reporter_id wordt leeg).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'niet ingelogd';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ─── Jezelf admin maken (eenmalig, met je eigen e-mailadres) ──────────────
-- Log eerst één keer in op de site, voer daarna dit uit (vervang het adres):
--   insert into public.admins (user_id) select id from auth.users where email = 'jouw@adres.nl' on conflict do nothing;

-- ─── Aanmeldingen van partners (lodges, organisatoren, gidsen, …) ─────────
create table if not exists public.partner_applications (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('stay', 'operator', 'guide', 'transport', 'activity', 'food', 'other')),
  business text not null check (char_length(business) between 2 and 120),
  contact text not null check (char_length(contact) between 2 and 120),
  email text not null check (char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 40),
  place_id text check (char_length(place_id) <= 60),
  website text check (char_length(website) <= 300),
  message text check (char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'accepted', 'rejected')),
  admin_note text check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now()
);
alter table public.partner_applications enable row level security;
-- Extra antwoorden uit het aanmeldformulier (capaciteit, prijs, boekingskanalen, commissie, betalen, beeld)
alter table public.partner_applications add column if not exists details jsonb;
alter table public.partner_applications drop constraint if exists partner_applications_details_check;
alter table public.partner_applications add constraint partner_applications_details_check
  check (details is null or (jsonb_typeof(details) = 'object' and pg_column_size(details) <= 40000));

-- Foto's bij een partneraanmelding: privé opslag. Iedereen mag uploaden in de map 'aanmelding/',
-- alleen beheerders kunnen ze bekijken of wissen. Max 5 MB per foto, alleen JPG/PNG/WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partner-photos', 'partner-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "partner-photos: uploaden bij aanmelding" on storage.objects;
drop policy if exists "partner-photos: admins lezen" on storage.objects;
drop policy if exists "partner-photos: admins wissen" on storage.objects;
create policy "partner-photos: uploaden bij aanmelding" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'partner-photos' and (storage.foldername(name))[1] = 'aanmelding');
create policy "partner-photos: admins lezen" on storage.objects for select using (bucket_id = 'partner-photos' and public.is_admin());
create policy "partner-photos: admins wissen" on storage.objects for delete using (bucket_id = 'partner-photos' and public.is_admin());

drop policy if exists "partners: iedereen mag aanmelden" on public.partner_applications;
drop policy if exists "partners: admins lezen" on public.partner_applications;
drop policy if exists "partners: admins wijzigen" on public.partner_applications;
create policy "partners: iedereen mag aanmelden" on public.partner_applications for insert
  with check (status = 'new' and admin_note is null);
create policy "partners: admins lezen" on public.partner_applications for select using (public.is_admin());
create policy "partners: admins wijzigen" on public.partner_applications for update using (public.is_admin()) with check (public.is_admin());

-- ─── Verblijven (door beheer ingevoerd, met bron) ──────────────────────────
-- Echte lodges, kampen en hotels per plek. Alleen invoeren met een echte bron (partner, eigen website).
create table if not exists public.stays (
  id uuid primary key default gen_random_uuid(),
  place_id text not null check (char_length(place_id) <= 60),
  name text not null check (char_length(name) between 2 and 120),
  type text not null check (type in ('camp', 'lodge', 'luxe', 'hotel', 'bungalow', 'resort', 'villa')),
  price_from numeric check (price_from is null or price_from >= 0),
  currency text not null default 'EUR' check (currency in ('EUR', 'USD', 'GBP', 'TZS')),
  url text check (char_length(url) <= 300),
  source text not null check (char_length(source) between 2 and 300),
  recommended boolean not null default false,
  note text check (char_length(note) <= 300),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.stays enable row level security;
drop policy if exists "stays: iedereen leest actieve" on public.stays;
drop policy if exists "stays: admins beheren" on public.stays;
create policy "stays: iedereen leest actieve" on public.stays for select using (active or public.is_admin());
create policy "stays: admins beheren" on public.stays for all using (public.is_admin()) with check (public.is_admin());

-- ═══ Veilingen: reizigers zetten hun reis in de veiling, goedgekeurde bedrijven bieden ═══════════════════
-- Gnutube is tussenpersoon: geen eigen aanbod, geen boekingen. Een reiziger stelt de reis zelf samen, kiest het
-- aantal personen en een maximumbudget (USD, hele groep). De veiling loopt 3 dagen. Bedrijven zien alleen hun
-- eigen bod en nooit de naam of contactgegevens van de reiziger. Na het sluiten ziet de reiziger alle biedingen
-- (zonder bedrijfsnaam) en kiest er één of geen. Bij een keuze betaalt de reiziger de commissie als aanbetaling
-- aan Gnutube; pas daarna zien beide kanten elkaars gegevens. Het restbedrag gaat rechtstreeks naar het bedrijf.

-- Oude opzet (direct boeken en reisaanvragen) opruimen. Er staan nog geen echte boekingen in.
drop function if exists public.create_booking(text, text, text, int, date, jsonb, boolean);
drop view if exists public.trip_reviews_public;
do $$
begin
  -- Recensies hingen aan boekingen; die tabel opnieuw maken (gekoppeld aan deals)
  if exists (select 1 from information_schema.table_constraints tc
             join information_schema.constraint_column_usage cu on cu.constraint_name = tc.constraint_name
             where tc.table_schema = 'public' and tc.table_name = 'trip_reviews' and tc.constraint_type = 'FOREIGN KEY'
               and cu.table_name = 'booking_groups') then
    drop table public.trip_reviews;
  end if;
end $$;
drop table if exists public.booking_items;
drop table if exists public.booking_groups;
drop table if exists public.closed_days;
drop table if exists public.offers;
drop table if exists public.trip_requests;
drop function if exists public.is_my_group(uuid);
drop function if exists public.partner_in_group(uuid);

-- Partners (bedrijven die mogen bieden): aangemaakt door beheer na goedkeuring van de aanmelding,
-- gekoppeld aan het e-mailadres waarmee het bedrijf inlogt
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  business text not null check (char_length(business) between 2 and 120),
  kind text not null default 'operator' check (kind in ('stay', 'operator', 'guide', 'transport', 'activity', 'food', 'other')),
  place_id text check (char_length(place_id) <= 60),
  commission_pct numeric not null default 12.5 check (commission_pct >= 0 and commission_pct <= 50),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.partners alter column commission_pct set default 12.5;
alter table public.partners alter column kind set default 'operator';
alter table public.partners enable row level security;

create or replace function public.my_partner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.partners where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and active limit 1;
$$;

drop policy if exists "partners: eigen of admin lezen" on public.partners;
drop policy if exists "partners: admins beheren" on public.partners;
create policy "partners: eigen of admin lezen" on public.partners for select using (id = public.my_partner_id() or public.is_admin());
create policy "partners: admins beheren" on public.partners for all using (public.is_admin()) with check (public.is_admin());
-- Openbaar: alleen de naam van actieve partners
create or replace view public.partner_names with (security_invoker = false) as
  select id, business from public.partners where active;
grant select on public.partner_names to anon, authenticated;

-- Veilingen. Naam, e-mail en telefoon zijn alleen voor de reiziger zelf en beheer (en voor het gekozen bedrijf
-- na de aanbetaling, via partner_deals). Status: open (loopt, of gesloten en wacht op keuze), accepted, declined, cancelled.
create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 40),
  people int not null check (people between 1 and 100),
  start_day date not null,
  end_day date not null,
  max_budget numeric not null check (max_budget > 0 and max_budget <= 10000000),
  note text check (char_length(note) <= 2000),
  trip jsonb not null check (pg_column_size(trip) < 60000),
  closes_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'accepted', 'declined', 'cancelled')),
  decline_reason text check (char_length(decline_reason) <= 500),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_day >= start_day)
);
alter table public.auctions enable row level security;
drop policy if exists "auctions: eigen of admin lezen" on public.auctions;
drop policy if exists "auctions: admins wijzigen" on public.auctions;
create policy "auctions: eigen of admin lezen" on public.auctions for select using (user_id = auth.uid() or public.is_admin());
create policy "auctions: admins wijzigen" on public.auctions for update using (public.is_admin()) with check (public.is_admin());
-- Geen insert- of update-regels voor reizigers: dat gaat via start_auction, cancel_auction, decline_auction en accept_bid.

-- Biedingen: één per bedrijf per veiling, aan te passen tot de veiling sluit
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  partner_id uuid not null references public.partners (id) on delete cascade,
  price numeric not null check (price > 0),
  included text not null check (char_length(included) between 10 and 3000),
  excluded text check (char_length(excluded) <= 2000),
  changes text check (char_length(changes) <= 2000),
  valid_until date not null,
  status text not null default 'open' check (status in ('open', 'won', 'lost', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auction_id, partner_id)
);
alter table public.bids enable row level security;
drop policy if exists "bids: eigen of admin lezen" on public.bids;
drop policy if exists "bids: admins wijzigen" on public.bids;
create policy "bids: eigen of admin lezen" on public.bids for select using (partner_id = public.my_partner_id() or public.is_admin());
create policy "bids: admins wijzigen" on public.bids for update using (public.is_admin()) with check (public.is_admin());
-- Reizigers lezen biedingen alleen via auction_bids (pas na het sluiten, zonder bedrijfsnaam).

-- Deals: het gekozen bod. De aanbetaling is de commissie; payment 'pending' tot betaald.
-- 'test' = aanbetaling in testmodus (geen echt geld), zolang er geen betaaldienst gekoppeld is.
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null unique references public.auctions (id) on delete cascade,
  bid_id uuid not null unique references public.bids (id) on delete cascade,
  partner_id uuid not null references public.partners (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  price numeric not null,
  commission_pct numeric not null,
  deposit numeric not null,
  payment text not null default 'pending' check (payment in ('pending', 'test', 'paid', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.deals enable row level security;
drop policy if exists "deals: reiziger, partner of admin lezen" on public.deals;
drop policy if exists "deals: admins wijzigen" on public.deals;
create policy "deals: reiziger, partner of admin lezen" on public.deals for select
  using (user_id = auth.uid() or partner_id = public.my_partner_id() or public.is_admin());
create policy "deals: admins wijzigen" on public.deals for update using (public.is_admin()) with check (public.is_admin());

-- Reis in de veiling zetten. Ingelogd, maximaal 2 lopende veilingen tegelijk, startdatum in de toekomst.
create or replace function public.start_auction(
  p_name text, p_phone text, p_people int, p_start date, p_end date, p_max_budget numeric, p_note text, p_trip jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  aid uuid;
  mail text := coalesce(auth.jwt() ->> 'email', '');
begin
  if auth.uid() is null then raise exception 'niet ingelogd'; end if;
  if (select count(*) from auctions where user_id = auth.uid() and status = 'open') >= 2 then
    raise exception 'maximaal 2 veilingen tegelijk';
  end if;
  if p_start <= current_date then raise exception 'startdatum moet in de toekomst liggen'; end if;
  if jsonb_typeof(p_trip -> 'stops') <> 'array' or jsonb_array_length(p_trip -> 'stops') = 0 then raise exception 'reis is leeg'; end if;
  insert into auctions (user_id, name, email, phone, people, start_day, end_day, max_budget, note, trip, closes_at)
    values (auth.uid(), trim(p_name), mail, nullif(trim(coalesce(p_phone, '')), ''), p_people, p_start, p_end,
            round(p_max_budget, 0), nullif(trim(coalesce(p_note, '')), ''), p_trip, now() + interval '3 days')
    returning id into aid;
  return aid;
end;
$$;
revoke all on function public.start_auction(text, text, int, date, date, numeric, text, jsonb) from public, anon;
grant execute on function public.start_auction(text, text, int, date, date, numeric, text, jsonb) to authenticated;

-- Eigen lopende veiling stoppen (alleen zolang hij nog loopt)
create or replace function public.cancel_auction(aid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update auctions set status = 'cancelled'
    where id = aid and user_id = auth.uid() and status = 'open' and closes_at > now();
  if not found then raise exception 'kan niet meer stoppen'; end if;
  update bids set status = 'lost', updated_at = now() where auction_id = aid and status = 'open';
end;
$$;
revoke all on function public.cancel_auction(uuid) from public, anon;
grant execute on function public.cancel_auction(uuid) to authenticated;

-- Mijn veilingen, met het aantal biedingen (prijzen pas na het sluiten, via auction_bids)
create or replace function public.my_auctions() returns table (
  id uuid, people int, start_day date, end_day date, max_budget numeric, note text, trip jsonb, closes_at timestamptz,
  status text, decline_reason text, created_at timestamptz, bids int,
  deal_id uuid, deal_price numeric, deposit numeric, payment text, partner_business text, partner_email text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.people, a.start_day, a.end_day, a.max_budget, a.note, a.trip, a.closes_at, a.status, a.decline_reason, a.created_at,
         (select count(*)::int from bids b where b.auction_id = a.id and b.status <> 'withdrawn'),
         d.id, d.price, d.deposit, d.payment,
         case when d.payment in ('paid', 'test') then p.business end,
         case when d.payment in ('paid', 'test') then p.email end
  from auctions a
  left join deals d on d.auction_id = a.id
  left join partners p on p.id = d.partner_id
  where a.user_id = auth.uid()
  order by a.created_at desc;
$$;
revoke all on function public.my_auctions() from public, anon;
grant execute on function public.my_auctions() to authenticated;

-- Biedingen op mijn veiling: pas na het sluiten, zonder bedrijfsnaam. Wel de soort bedrijf, de recensies en de
-- aanbetaling (commissie van dat bedrijf) die je betaalt als je dit bod kiest.
drop function if exists public.auction_bids(uuid);
create or replace function public.auction_bids(aid uuid) returns table (
  id uuid, price numeric, deposit numeric, included text, excluded text, changes text, valid_until date, status text,
  partner_kind text, reviews int, rating numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from auctions a where a.id = aid and a.user_id = auth.uid() and (a.closes_at <= now() or a.status <> 'open')) then
    return;
  end if;
  return query
    select b.id, b.price, round(b.price * p.commission_pct / 100, 2), b.included, b.excluded, b.changes, b.valid_until, b.status, p.kind,
           (select count(*)::int from trip_reviews r join deals d on d.id = r.group_id where d.partner_id = b.partner_id and not r.hidden),
           (select round(avg(r.rating), 1) from trip_reviews r join deals d on d.id = r.group_id where d.partner_id = b.partner_id and not r.hidden)
    from bids b join partners p on p.id = b.partner_id
    where b.auction_id = aid and b.status <> 'withdrawn'
    order by b.price;
end;
$$;
revoke all on function public.auction_bids(uuid) from public, anon;
grant execute on function public.auction_bids(uuid) to authenticated;

-- Geen van de biedingen kiezen, met een reden (die zien de bedrijven)
create or replace function public.decline_auction(aid uuid, reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if char_length(trim(coalesce(reason, ''))) < 3 then raise exception 'reden nodig'; end if;
  update auctions set status = 'declined', decline_reason = left(trim(reason), 500)
    where id = aid and user_id = auth.uid() and status = 'open' and closes_at <= now();
  if not found then raise exception 'veiling niet gesloten of al afgehandeld'; end if;
  update bids set status = 'lost', updated_at = now() where auction_id = aid and status = 'open';
end;
$$;
revoke all on function public.decline_auction(uuid, text) from public, anon;
grant execute on function public.decline_auction(uuid, text) to authenticated;

-- Een bod kiezen: maakt de deal met de aanbetaling (commissie van dat bedrijf over de prijs)
create or replace function public.accept_bid(bid uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b record;
  did uuid;
begin
  select bi.*, p.commission_pct, a.user_id as owner, a.status as a_status, a.closes_at
    into b from bids bi join auctions a on a.id = bi.auction_id join partners p on p.id = bi.partner_id
    where bi.id = bid;
  if not found or b.owner <> auth.uid() then raise exception 'niet jouw veiling'; end if;
  if b.a_status <> 'open' or b.closes_at > now() then raise exception 'veiling niet gesloten of al afgehandeld'; end if;
  if b.status <> 'open' then raise exception 'bod niet beschikbaar'; end if;
  if b.valid_until < current_date then raise exception 'bod is verlopen'; end if;
  insert into deals (auction_id, bid_id, partner_id, user_id, price, commission_pct, deposit)
    values (b.auction_id, b.id, b.partner_id, auth.uid(), b.price, b.commission_pct, round(b.price * b.commission_pct / 100, 2))
    returning id into did;
  update auctions set status = 'accepted' where id = b.auction_id;
  update bids set status = case when id = b.id then 'won' else 'lost' end, updated_at = now()
    where auction_id = b.auction_id and status = 'open';
  return did;
end;
$$;
revoke all on function public.accept_bid(uuid) from public, anon;
grant execute on function public.accept_bid(uuid) to authenticated;

-- Aanbetaling in TESTMODUS: zet de deal op 'test' zodat de gegevens gedeeld worden, zonder echt geld.
-- VOOR DE LANCERING: deze functie verwijderen en de betaaldienst 'paid' laten zetten (zie LANCERING.md).
create or replace function public.test_pay_deposit(did uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update deals set payment = 'test', paid_at = now() where id = did and user_id = auth.uid() and payment = 'pending';
  if not found then raise exception 'niet te betalen'; end if;
end;
$$;
revoke all on function public.test_pay_deposit(uuid) from public, anon;
grant execute on function public.test_pay_deposit(uuid) to authenticated;

-- Voor bedrijven: lopende veilingen en veilingen waarop ze boden. Nooit naam, e-mail of telefoon van de reiziger.
create or replace function public.partner_auctions() returns table (
  id uuid, people int, start_day date, end_day date, max_budget numeric, note text, trip jsonb, closes_at timestamptz,
  status text, decline_reason text,
  bid_id uuid, bid_price numeric, bid_included text, bid_excluded text, bid_changes text, bid_valid_until date, bid_status text
)
language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.my_partner_id();
begin
  if me is null then return; end if;
  return query
    select a.id, a.people, a.start_day, a.end_day, a.max_budget, a.note, a.trip, a.closes_at, a.status,
           case when a.status = 'declined' then a.decline_reason end,
           b.id, b.price, b.included, b.excluded, b.changes, b.valid_until, b.status
    from auctions a
    left join bids b on b.auction_id = a.id and b.partner_id = me
    where not a.hidden
      and ((a.status = 'open' and a.closes_at > now()) or b.id is not null)
    order by (a.status = 'open' and a.closes_at > now()) desc, a.closes_at;
end;
$$;
revoke all on function public.partner_auctions() from public, anon;
grant execute on function public.partner_auctions() to authenticated;

-- Bieden of het eigen bod aanpassen, zolang de veiling loopt. Niet boven het maximumbudget.
create or replace function public.place_bid(
  aid uuid, p_price numeric, p_included text, p_excluded text, p_changes text, p_valid_until date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.my_partner_id();
  a record;
  bid uuid;
begin
  if me is null then raise exception 'geen goedgekeurd bedrijf'; end if;
  select * into a from auctions where id = aid;
  if not found or a.hidden or a.status <> 'open' or a.closes_at <= now() then raise exception 'veiling is gesloten'; end if;
  if p_price <= 0 or p_price > a.max_budget then raise exception 'bod boven het maximumbudget'; end if;
  if p_valid_until < (a.closes_at::date + 7) then raise exception 'bod moet minstens 7 dagen na het sluiten geldig zijn'; end if;
  insert into bids (auction_id, partner_id, price, included, excluded, changes, valid_until)
    values (aid, me, round(p_price, 0), trim(p_included), nullif(trim(coalesce(p_excluded, '')), ''),
            nullif(trim(coalesce(p_changes, '')), ''), p_valid_until)
    on conflict (auction_id, partner_id) do update
      set price = excluded.price, included = excluded.included, excluded = excluded.excluded, changes = excluded.changes,
          valid_until = excluded.valid_until, status = 'open', updated_at = now()
    returning id into bid;
  return bid;
end;
$$;
revoke all on function public.place_bid(uuid, numeric, text, text, text, date) from public, anon;
grant execute on function public.place_bid(uuid, numeric, text, text, text, date) to authenticated;

-- Eigen bod intrekken, zolang de veiling loopt
create or replace function public.withdraw_bid(aid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update bids b set status = 'withdrawn', updated_at = now()
    from auctions a
    where b.auction_id = aid and a.id = aid and b.partner_id = public.my_partner_id() and a.status = 'open' and a.closes_at > now();
  if not found then raise exception 'kan niet meer intrekken'; end if;
end;
$$;
revoke all on function public.withdraw_bid(uuid) from public, anon;
grant execute on function public.withdraw_bid(uuid) to authenticated;

-- Voor bedrijven: gewonnen deals. Gegevens van de reiziger pas na de aanbetaling.
create or replace function public.partner_deals() returns table (
  id uuid, auction_id uuid, price numeric, deposit numeric, payment text, created_at timestamptz,
  people int, start_day date, end_day date, trip jsonb, name text, email text, phone text
)
language sql stable security definer set search_path = public as $$
  select d.id, d.auction_id, d.price, d.deposit, d.payment, d.created_at, a.people, a.start_day, a.end_day, a.trip,
         case when d.payment in ('paid', 'test') then a.name end,
         case when d.payment in ('paid', 'test') then a.email end,
         case when d.payment in ('paid', 'test') then a.phone end
  from deals d join auctions a on a.id = d.auction_id
  where d.partner_id = public.my_partner_id()
  order by a.start_day;
$$;
revoke all on function public.partner_deals() from public, anon;
grant execute on function public.partner_deals() to authenticated;

-- ═══ Reacties en delen bij video's (eigen, los van TikTok) ════════════════════════════════════════════
-- Naam die anderen zien bij je reacties
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles: iedereen leest namen" on public.profiles;
drop policy if exists "profiles: eigen naam" on public.profiles;
create policy "profiles: iedereen leest namen" on public.profiles for select using (true);
create policy "profiles: eigen naam" on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reacties (alleen met account); beheer kan verbergen
create table if not exists public.video_comments (
  id bigint generated always as identity primary key,
  video_id text not null check (video_id ~ '^[0-9]{8,25}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.video_comments enable row level security;
drop policy if exists "comments: zichtbare lezen" on public.video_comments;
drop policy if exists "comments: eigen plaatsen" on public.video_comments;
drop policy if exists "comments: eigen of admin wissen" on public.video_comments;
drop policy if exists "comments: admins wijzigen" on public.video_comments;
create policy "comments: zichtbare lezen" on public.video_comments for select using (not hidden or user_id = auth.uid() or public.is_admin());
create policy "comments: eigen plaatsen" on public.video_comments for insert with check (user_id = auth.uid() and not hidden);
create policy "comments: eigen of admin wissen" on public.video_comments for delete using (user_id = auth.uid() or public.is_admin());
create policy "comments: admins wijzigen" on public.video_comments for update using (public.is_admin()) with check (public.is_admin());

create or replace view public.video_comments_public with (security_invoker = true) as
  select c.id, c.video_id, c.body, c.created_at, coalesce(p.display_name, 'Reiziger') as name, (c.user_id = auth.uid()) as mine
  from public.video_comments c left join public.profiles p on p.user_id = c.user_id
  where not c.hidden;
create or replace view public.video_comment_counts with (security_invoker = true) as
  select video_id, count(*)::int as n from public.video_comments where not hidden group by video_id;
grant select on public.video_comments_public, public.video_comment_counts to anon, authenticated;

-- Reacties melden (ook zonder account)
create table if not exists public.comment_flags (
  id bigint generated always as identity primary key,
  comment_id bigint not null references public.video_comments (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text check (char_length(reason) <= 300),
  created_at timestamptz not null default now()
);
alter table public.comment_flags enable row level security;
drop policy if exists "flags: iedereen mag melden" on public.comment_flags;
drop policy if exists "flags: admins lezen" on public.comment_flags;
create policy "flags: iedereen mag melden" on public.comment_flags for insert with check (reporter_id is null or reporter_id = auth.uid());
create policy "flags: admins lezen" on public.comment_flags for select using (public.is_admin());

-- Hoe vaak een video via Gnutube gedeeld is (alleen optellen via share_video)
create table if not exists public.video_shares (
  video_id text primary key check (video_id ~ '^[0-9]{8,25}$'),
  count int not null default 0
);
alter table public.video_shares enable row level security;
drop policy if exists "shares: iedereen lezen" on public.video_shares;
create policy "shares: iedereen lezen" on public.video_shares for select using (true);
create or replace function public.share_video(v text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if v !~ '^[0-9]{8,25}$' then raise exception 'ongeldige video'; end if;
  insert into video_shares (video_id, count) values (v, 1)
    on conflict (video_id) do update set count = video_shares.count + 1
    returning count into n;
  return n;
end;
$$;
grant execute on function public.share_video(text) to anon, authenticated;


-- ═══ Gemaakte reizen en recensies ══════════════════════════════════════════════════════════════════════
-- Een reis telt als gemaakt als de aanbetaling van de deal betaald is en de laatste dag voorbij is. Niemand kan
-- dat zelf aanvinken: het volgt uit de deal. Deals in testmodus tellen alleen voor beheerders (om te testen).
-- 'gid' en 'group_id' zijn hier het id van de deal (de namen zijn gebleven van de vroegere boekingen).
create or replace function public.trip_is_done(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from deals d join auctions a on a.id = d.auction_id
    where d.id = gid
      and (d.payment = 'paid' or (d.payment = 'test' and public.is_admin()))
      and a.end_day <= current_date
  );
$$;

-- Recensie van een hele reis: één per deal, alleen door de reiziger die de reis maakte
create table if not exists public.trip_reviews (
  id bigint generated always as identity primary key,
  group_id uuid not null unique references public.deals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 20 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.trip_reviews enable row level security;
drop policy if exists "trip_reviews: zichtbare lezen" on public.trip_reviews;
drop policy if exists "trip_reviews: eigen wissen" on public.trip_reviews;
drop policy if exists "trip_reviews: admins wijzigen" on public.trip_reviews;
create policy "trip_reviews: zichtbare lezen" on public.trip_reviews for select using (not hidden or user_id = auth.uid() or public.is_admin());
create policy "trip_reviews: eigen wissen" on public.trip_reviews for delete using (user_id = auth.uid() or public.is_admin());
create policy "trip_reviews: admins wijzigen" on public.trip_reviews for update using (public.is_admin()) with check (public.is_admin());
-- Schrijven alleen via review_trip (die controleert of je de reis echt gemaakt hebt)

create or replace function public.review_trip(gid uuid, p_rating int, p_body text) returns bigint
language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  if auth.uid() is null then raise exception 'niet ingelogd'; end if;
  if not exists (select 1 from deals where id = gid and user_id = auth.uid()) then raise exception 'niet jouw reis'; end if;
  if not public.trip_is_done(gid) then raise exception 'reis nog niet gemaakt'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'beoordeling'; end if;
  insert into trip_reviews (group_id, user_id, rating, body) values (gid, auth.uid(), p_rating, trim(p_body))
    on conflict (group_id) do update set rating = excluded.rating, body = excluded.body, hidden = false, created_at = now()
    returning id into rid;
  return rid;
end;
$$;
revoke all on function public.review_trip(uuid, int, text) from public, anon;
grant execute on function public.review_trip(uuid, int, text) to authenticated;

-- Plekken van een veiling (uit de momentopname van de reis)
create or replace function public.auction_place_ids(aid uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array(select distinct s ->> 'id' from auctions a, jsonb_array_elements(a.trip -> 'stops') s
                        where a.id = aid and s ->> 'id' is not null), '{}');
$$;

-- Mijn gemaakte reizen: datums, plekken, en of er al een recensie is
create or replace function public.my_done_trips() returns table (
  group_id uuid, start_day date, end_day date, people int, place_ids text[], test boolean, rating int, body text
)
language sql stable security definer set search_path = public as $$
  select d.id, a.start_day, a.end_day, a.people, public.auction_place_ids(a.id), d.payment = 'test', r.rating, r.body
  from deals d
  join auctions a on a.id = d.auction_id
  left join trip_reviews r on r.group_id = d.id
  where d.user_id = auth.uid() and public.trip_is_done(d.id)
  order by a.start_day desc;
$$;
revoke all on function public.my_done_trips() from public, anon;
grant execute on function public.my_done_trips() to authenticated;

-- Openbare recensies: met de naam die de reiziger zelf koos en de plekken van die reis (geen e-mail of bedragen)
create or replace view public.trip_reviews_public with (security_invoker = false) as
  select r.id, r.rating, r.body, r.created_at,
         p.display_name as name,
         (select public.auction_place_ids(d.auction_id) from deals d where d.id = r.group_id) as place_ids,
         (select a.start_day from deals d join auctions a on a.id = d.auction_id where d.id = r.group_id) as start_day
  from trip_reviews r
  left join profiles p on p.user_id = r.user_id
  where not r.hidden;
grant select on public.trip_reviews_public to anon, authenticated;


-- ═══ Overzicht voor beheer: alleen totalen, geen gegevens per persoon ═════════════════════════════════
-- Telt accounts, boekingen, aanvragen en populaire plekken. Alleen voor beheerders (anders een fout).
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'alleen voor beheerders';
  end if;
  select jsonb_build_object(
    'accounts', (select count(*) from auth.users),
    'accounts_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'accounts_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'with_trip', (select count(*) from user_data where cardinality(trip) > 0),
    -- 'bookings*' zijn sinds de veilingen de deals (gekozen biedingen); 'requests*' de veilingen
    'bookings', (select count(*) from deals where payment <> 'test'),
    'bookings_open', (select count(*) from deals where payment = 'pending'),
    'bookings_paid', (select count(*) from deals where payment = 'paid'),
    'bookings_test', (select count(*) from deals where payment = 'test'),
    'revenue', coalesce((
      select jsonb_build_object('USD', jsonb_build_object('amount', sum(price), 'commission', sum(deposit)))
      from deals where payment = 'paid' having count(*) > 0
    ), '{}'::jsonb),
    'requests', (select count(*) from auctions),
    'requests_new', (select count(*) from auctions where status = 'open'),
    'partners_new', (select count(*) from partner_applications where status = 'new'),
    'partners_active', (select count(*) from partners where active),
    'videos_pending', (select count(*) from submissions where status = 'pending'),
    'reports_open', (select count(*) from reports where status = 'open'),
    'reviews', (select count(*) from trip_reviews where not hidden),
    'hidden_videos', (select count(*) from hidden_videos),
    'comments', (select count(*) from video_comments where not hidden),
    -- Per dag, laatste 30 dagen (oudste eerst): voor de kleine grafiekjes
    'signups_by_day', (
      select jsonb_agg(n order by d) from (
        select d::date as d, (select count(*) from auth.users u where u.created_at::date = d::date) as n
        from generate_series(current_date - 29, current_date, interval '1 day') d
      ) x
    ),
    'active_by_day', (
      select jsonb_agg(n order by d) from (
        select d::date as d, (select count(*) from auth.users u where u.last_sign_in_at::date = d::date) as n
        from generate_series(current_date - 29, current_date, interval '1 day') d
      ) x
    ),
    'revenue_by_day', (
      select jsonb_agg(n order by d) from (
        select d::date as d, coalesce((
          select sum(x.deposit) from deals x where x.payment = 'paid' and x.paid_at::date = d::date
        ), 0) as n
        from generate_series(current_date - 29, current_date, interval '1 day') d
      ) x
    ),
    'requests_by_day', (
      select jsonb_agg(n order by d) from (
        select d::date as d, (select count(*) from auctions r where r.created_at::date = d::date) as n
        from generate_series(current_date - 29, current_date, interval '1 day') d
      ) x
    ),
    'top_places', coalesce((
      select jsonb_agg(jsonb_build_object('place_id', place_id, 'n', n) order by n desc)
      from (
        select p as place_id, count(*) as n from user_data, unnest(trip) as p
        group by p order by count(*) desc limit 8
      ) t
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- ═══ Beheer: wat er te doen is, en accounts beheren ══════════════════════════════════════════════════
-- Aantal openstaande zaken (voor het rode getal bij Beheer in de menubalk)
create or replace function public.admin_todo_count() returns int
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then return 0; end if;
  return (select count(*) from reports where status = 'open')
       + (select count(*) from submissions where status = 'pending')
       + (select count(*) from partner_applications where status = 'new')
       + (select count(*) from deals where payment = 'pending' and created_at < now() - interval '7 days')
       + (select count(distinct c.id) from video_comments c join comment_flags f on f.comment_id = c.id where not c.hidden);
end;
$$;
revoke all on function public.admin_todo_count() from public, anon;
grant execute on function public.admin_todo_count() to authenticated;

-- Accounts zoeken (op e-mail). Alleen wat nodig is om een account te beheren.
create or replace function public.admin_list_users(q text default '')
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, blocked boolean, admin boolean, comments int, bookings int)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'alleen voor beheerders'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at,
           coalesce(u.banned_until > now(), false),
           exists (select 1 from public.admins a where a.user_id = u.id),
           (select count(*)::int from public.video_comments c where c.user_id = u.id),
           (select count(*)::int from public.deals g where g.user_id = u.id)
    from auth.users u
    where coalesce(q, '') = '' or u.email ilike '%' || q || '%'
    order by u.created_at desc
    limit 100;
end;
$$;
revoke all on function public.admin_list_users(text) from public, anon;
grant execute on function public.admin_list_users(text) to authenticated;

-- Account blokkeren of weer toelaten (geblokkeerd = kan niet meer inloggen). Niet voor beheerders of jezelf.
create or replace function public.admin_block_user(target uuid, block boolean) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'alleen voor beheerders'; end if;
  if target = auth.uid() or exists (select 1 from public.admins where user_id = target) then
    raise exception 'beheerders kun je hier niet blokkeren';
  end if;
  update auth.users set banned_until = case when block then 'infinity'::timestamptz else null end where id = target;
  if block then delete from auth.sessions where user_id = target; end if;
end;
$$;
revoke all on function public.admin_block_user(uuid, boolean) from public, anon;
grant execute on function public.admin_block_user(uuid, boolean) to authenticated;

-- Account definitief verwijderen, met reis, likes en reacties. Niet als er een betaalde aanbetaling is
-- (boekhouding); dan eerst blokkeren en de deal afhandelen. Niet voor beheerders of jezelf.
create or replace function public.admin_delete_user(target uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'alleen voor beheerders'; end if;
  if target = auth.uid() or exists (select 1 from public.admins where user_id = target) then
    raise exception 'beheerders kun je hier niet verwijderen';
  end if;
  if exists (select 1 from public.deals where user_id = target and payment = 'paid') then
    raise exception 'dit account heeft betaalde aanbetalingen';
  end if;
  delete from auth.users where id = target;
end;
$$;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
