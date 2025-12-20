-- Enable required extension for UUID generation (already enabled by default on Supabase)
-- create extension if not exists "uuid-ossp";

-- Custom Users table: syncs with Supabase auth for easier app-level access
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists users_email_idx on users(email);

alter table users enable row level security;

drop policy if exists "Users can read own profile" on users;
create policy "Users can read own profile" on users
  for select using (auth.uid() = id);

drop policy if exists "Users can insert self" on users;
create policy "Users can insert self" on users
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on users;
create policy "Users can update own profile" on users
  for update using (auth.uid() = id);

-- Profiles: stores subscription flags and scan counters (now references custom users table)
create table if not exists profiles (
  user_id uuid primary key references users(id) on delete cascade,
  is_pro boolean default false,
  scans_used_this_month integer default 0,
  max_scans_per_month integer default 5,
  month_reset_date timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists profiles_user_id_idx on profiles(user_id);

alter table profiles enable row level security;

drop policy if exists "Allow profile read" on profiles;
create policy "Allow profile read" on profiles
  for select using (auth.uid() = user_id);

drop policy if exists "Allow profile upsert" on profiles;
create policy "Allow profile upsert" on profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "Allow profile update" on profiles;
create policy "Allow profile update" on profiles
  for update using (auth.uid() = user_id);

-- Splits: top-level record per split session (now references custom users table)
create table if not exists splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  title text,
  currency text default 'USD',
  tax_percent numeric(12,2) default 0,
  tip numeric(12,2) default 0
);

create index if not exists splits_user_id_idx on splits(user_id);

alter table splits enable row level security;

drop policy if exists "Splits select" on splits;
create policy "Splits select" on splits
  for select using (auth.uid() = user_id);

drop policy if exists "Splits insert" on splits;
create policy "Splits insert" on splits
  for insert with check (auth.uid() = user_id);

drop policy if exists "Splits update" on splits;
create policy "Splits update" on splits
  for update using (auth.uid() = user_id);

drop policy if exists "Splits delete" on splits;
create policy "Splits delete" on splits
  for delete using (auth.uid() = user_id);

-- People: participants in a split
create table if not exists split_people (
  id uuid primary key default gen_random_uuid(),
  split_id uuid references splits(id) on delete cascade,
  name text not null,
  items_total numeric(12,2) default 0,
  tax_share numeric(12,2) default 0,
  tip_share numeric(12,2) default 0,
  grand_total numeric(12,2) default 0
);

create index if not exists split_people_split_id_idx on split_people(split_id);

alter table split_people enable row level security;

drop policy if exists "Split people select" on split_people;
create policy "Split people select" on split_people
  for select using (split_id in (select id from splits where user_id = auth.uid()));

drop policy if exists "Split people insert" on split_people;
create policy "Split people insert" on split_people
  for insert with check (split_id in (select id from splits where user_id = auth.uid()));

drop policy if exists "Split people update" on split_people;
create policy "Split people update" on split_people
  for update using (split_id in (select id from splits where user_id = auth.uid()));

drop policy if exists "Split people delete" on split_people;
create policy "Split people delete" on split_people
  for delete using (split_id in (select id from splits where user_id = auth.uid()));

-- Items: receipt line items per split
create table if not exists split_items (
  id uuid primary key default gen_random_uuid(),
  split_id uuid references splits(id) on delete cascade,
  description text not null,
  price numeric(12,2) not null,
  is_shared boolean default false
);

create index if not exists split_items_split_id_idx on split_items(split_id);

alter table split_items enable row level security;

drop policy if exists "Split items select" on split_items;
create policy "Split items select" on split_items
  for select using (split_id in (select id from splits where user_id = auth.uid()));

drop policy if exists "Split items insert" on split_items;
create policy "Split items insert" on split_items
  for insert with check (split_id in (select id from splits where user_id = auth.uid()));

drop policy if exists "Split items update" on split_items;
create policy "Split items update" on split_items
  for update using (split_id in (select id from splits where user_id = auth.uid()));

drop policy if exists "Split items delete" on split_items;
create policy "Split items delete" on split_items
  for delete using (split_id in (select id from splits where user_id = auth.uid()));

-- Item shares: each participant's share of an item
create table if not exists split_item_shares (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references split_items(id) on delete cascade,
  person_id uuid references split_people(id) on delete cascade,
  assigned_share numeric(12,2) not null
);

create index if not exists split_item_shares_item_id_idx on split_item_shares(item_id);
create index if not exists split_item_shares_person_id_idx on split_item_shares(person_id);

alter table split_item_shares enable row level security;

drop policy if exists "Split item shares select" on split_item_shares;
create policy "Split item shares select" on split_item_shares
  for select using (item_id in (
    select si.id from split_items si
    join splits s on si.split_id = s.id
    where s.user_id = auth.uid()
  ));

drop policy if exists "Split item shares insert" on split_item_shares;
create policy "Split item shares insert" on split_item_shares
  for insert with check (item_id in (
    select si.id from split_items si
    join splits s on si.split_id = s.id
    where s.user_id = auth.uid()
  ));

drop policy if exists "Split item shares update" on split_item_shares;
create policy "Split item shares update" on split_item_shares
  for update using (item_id in (
    select si.id from split_items si
    join splits s on si.split_id = s.id
    where s.user_id = auth.uid()
  ));

drop policy if exists "Split item shares delete" on split_item_shares;
create policy "Split item shares delete" on split_item_shares
  for delete using (item_id in (
    select si.id from split_items si
    join splits s on si.split_id = s.id
    where s.user_id = auth.uid()
  ));
