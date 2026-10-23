-- Gnutube — datamodel uit BOUWOPDRACHT.md
-- Vertaalde teksten staan als jsonb-object per taal: {"en": "...", "nl": "...", ...}. Engels is verplicht; de site valt erop terug.
-- Nog niet toegepast: er is nog geen Supabase-project. Zie README.md.

create extension if not exists "pgcrypto";

-- ───────────── Redactie (publiek leesbaar) ─────────────

create table regions (
  id    text primary key,
  name  jsonb not null
);

create table countries (
  id         text primary key,                 -- ISO 3166-1 alpha-2, kleine letters
  region_id  text not null references regions(id),
  name       jsonb not null,
  airport    text
);

create table destinations (
  id              text primary key,
  country_id      text not null references countries(id),
  name            text not null,
  kind            text not null check (kind in ('safari', 'beach', 'nature', 'culture')),
  tagline         jsonb not null,
  lat             double precision not null,
  lon             double precision not null,
  default_nights  smallint not null default 1 check (default_nights between 1 and 30),
  can_fly         boolean not null default false,
  has_water       boolean not null default false,
  mountain        boolean not null default false,
  verified_at     timestamptz,                    -- null = nog niet door lokale kenners gecontroleerd
  verified_by     text
);

-- Reisadviezen apart, met bron en datum, zodat ze regelmatig te controleren zijn.
-- Een rij geldt voor een heel land (destination_id null) of voor één bestemming.
create table travel_advisories (
  id              uuid primary key default gen_random_uuid(),
  country_id      text not null references countries(id),
  destination_id  text references destinations(id),
  level           text not null check (level in ('avoid')),
  source_url      text,                           -- null = voorlopig, nog niet getoetst
  checked_at      timestamptz,
  note            text
);

create table activities (
  id    text primary key,
  name  jsonb not null
);

create table destination_activities (
  destination_id  text not null references destinations(id) on delete cascade,
  activity_id     text not null references activities(id),
  seasonal        boolean not null default false,
  primary key (destination_id, activity_id)
);

-- ───────────── Partners en verblijven ─────────────

create table partners (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('lodge', 'park', 'operator')),
  name        text not null,
  country_id  text references countries(id),
  email       text not null,
  phone       text,
  website     text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  sponsored   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table stays (
  id              uuid primary key default gen_random_uuid(),
  destination_id  text not null references destinations(id),
  partner_id      uuid references partners(id),
  type            text not null check (type in ('camp', 'lodge', 'luxe', 'hotel', 'bungalow', 'resort', 'villa')),
  name            text not null,
  price_from      numeric(10, 2),
  currency        text not null default 'EUR'
);

-- ───────────── Media en sociaal ─────────────

create table media (
  id                uuid primary key default gen_random_uuid(),
  destination_id    text references destinations(id),
  stay_id           uuid references stays(id),
  kind              text not null check (kind in ('video', 'photo')),
  source            text not null check (source in ('youtube', 'tiktok', 'upload')),
  url               text not null,
  creator           text not null,
  rights_confirmed  boolean not null default false,
  created_at        timestamptz not null default now(),
  check (destination_id is not null or stay_id is not null),
  check (source <> 'upload' or rights_confirmed)
);

create table posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references auth.users(id) on delete cascade,
  destination_id  text not null references destinations(id),
  media_id        uuid references media(id),
  note            text,
  status          text not null default 'pending' check (status in ('pending', 'published', 'removed')),
  created_at      timestamptz not null default now()
);

create table likes (
  user_id         uuid not null references auth.users(id) on delete cascade,
  post_id         uuid references posts(id) on delete cascade,
  destination_id  text references destinations(id) on delete cascade,
  created_at      timestamptz not null default now(),
  check ((post_id is null) <> (destination_id is null))
);
create unique index likes_post on likes (user_id, post_id) where post_id is not null;
create unique index likes_dest on likes (user_id, destination_id) where destination_id is not null;

create table reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  destination_id  text not null references destinations(id),
  stars           smallint not null check (stars between 1 and 5),
  text            text not null check (length(trim(text)) > 0),
  status          text not null default 'pending' check (status in ('pending', 'published', 'removed')),
  created_at      timestamptz not null default now()
);

-- ───────────── Reizen plannen ─────────────

create table trip_folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table trip_items (
  folder_id       uuid not null references trip_folders(id) on delete cascade,
  destination_id  text not null references destinations(id),
  position        integer not null,
  nights          smallint not null default 1 check (nights between 1 and 60),
  leg_mode        text not null default 'ground' check (leg_mode in ('ground', 'boat', 'fly')),
  primary key (folder_id, destination_id)
);

create table trip_nights (
  folder_id       uuid not null references trip_folders(id) on delete cascade,
  destination_id  text not null references destinations(id),
  night_index     smallint not null,
  stay_id         uuid references stays(id),
  primary key (folder_id, destination_id, night_index)
);

create table trip_activities (
  folder_id       uuid not null references trip_folders(id) on delete cascade,
  destination_id  text not null references destinations(id),
  activity_id     text not null references activities(id),
  primary key (folder_id, destination_id, activity_id)
);

create table quote_requests (
  id          uuid primary key default gen_random_uuid(),
  folder_id   uuid not null references trip_folders(id),
  user_id     uuid not null references auth.users(id),
  status      text not null default 'new' check (status in ('new', 'sent', 'answered', 'closed')),
  created_at  timestamptz not null default now()
);

-- ───────────── Row Level Security ─────────────

alter table regions                enable row level security;
alter table countries              enable row level security;
alter table destinations           enable row level security;
alter table travel_advisories      enable row level security;
alter table activities             enable row level security;
alter table destination_activities enable row level security;
alter table partners               enable row level security;
alter table stays                  enable row level security;
alter table media                  enable row level security;
alter table posts                  enable row level security;
alter table likes                  enable row level security;
alter table reviews                enable row level security;
alter table trip_folders           enable row level security;
alter table trip_items             enable row level security;
alter table trip_nights            enable row level security;
alter table trip_activities        enable row level security;
alter table quote_requests         enable row level security;

-- Redactie: iedereen mag lezen, alleen de service role schrijft.
create policy "public read" on regions                for select using (true);
create policy "public read" on countries              for select using (true);
create policy "public read" on destinations           for select using (true);
create policy "public read" on travel_advisories      for select using (true);
create policy "public read" on activities             for select using (true);
create policy "public read" on destination_activities for select using (true);
create policy "public read" on media                  for select using (true);
create policy "public read approved" on stays         for select using (
  partner_id is null or exists (select 1 from partners p where p.id = partner_id and p.status = 'approved'));

-- Sociaal: gepubliceerd is openbaar; eigen items altijd zichtbaar.
create policy "read published or own" on posts   for select using (status = 'published' or author_id = auth.uid());
create policy "insert own" on posts              for insert with check (author_id = auth.uid() and status = 'pending');
create policy "read published or own" on reviews for select using (status = 'published' or user_id = auth.uid());
create policy "insert own" on reviews            for insert with check (user_id = auth.uid() and status = 'pending');
create policy "own likes" on likes               for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reizen: alleen de eigenaar.
create policy "own folders" on trip_folders for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own items" on trip_items for all
  using (exists (select 1 from trip_folders f where f.id = folder_id and f.user_id = auth.uid()))
  with check (exists (select 1 from trip_folders f where f.id = folder_id and f.user_id = auth.uid()));
create policy "own nights" on trip_nights for all
  using (exists (select 1 from trip_folders f where f.id = folder_id and f.user_id = auth.uid()))
  with check (exists (select 1 from trip_folders f where f.id = folder_id and f.user_id = auth.uid()));
create policy "own activities" on trip_activities for all
  using (exists (select 1 from trip_folders f where f.id = folder_id and f.user_id = auth.uid()))
  with check (exists (select 1 from trip_folders f where f.id = folder_id and f.user_id = auth.uid()));
create policy "own quotes" on quote_requests for select using (user_id = auth.uid());
create policy "create own quote" on quote_requests for insert with check (
  user_id = auth.uid() and exists (select 1 from trip_folders f where f.id = folder_id and f.user_id = auth.uid()));

-- Partners: aanmelden mag iedereen (status blijft pending); lezen alleen via de service role.
create policy "sign up" on partners for insert with check (status = 'pending' and sponsored = false);
