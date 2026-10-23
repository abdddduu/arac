-- Note: the app server uses the service role / direct DATABASE_URL and enforces tenancy in code; RLS is defense in depth.

begin;

create type vehicle_status as enum ('draft', 'active', 'reserved', 'sold');
create type fuel_type as enum ('gasoline', 'diesel', 'lpg', 'hybrid', 'plugin_hybrid', 'electric');
create type transmission as enum ('manual', 'automatic', 'semi_automatic', 'cvt', 'dct');
create type drivetrain as enum ('fwd', 'rwd', 'awd', '4wd');
create type panel_code as enum (
  'hood',
  'roof',
  'trunk',
  'front_bumper',
  'rear_bumper',
  'front_left_fender',
  'front_right_fender',
  'rear_left_fender',
  'rear_right_fender',
  'front_left_door',
  'front_right_door',
  'rear_left_door',
  'rear_right_door'
);
create type panel_state as enum ('original', 'local_paint', 'painted', 'replaced', 'plastic_repair');
create type media_kind as enum ('photo', 'video_link', 'document');

create table dealerships (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  legal_name text,
  tax_number text,
  logo_url text,
  brand_color text default '#0F172A',
  phone text not null,
  whatsapp_phone text,
  email text,
  address text,
  city text,
  district text,
  geo_lat numeric(9, 6),
  geo_lng numeric(9, 6),
  working_hours jsonb,
  tramer_amber_threshold numeric(12, 2) default 20000,
  plan text not null default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  dealership_id uuid not null references dealerships(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null default 'sales' check (role in ('owner', 'manager', 'sales')),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships(id) on delete cascade,
  public_id text unique not null,
  status vehicle_status not null default 'draft',
  make text not null,
  model text not null,
  trim text,
  year smallint not null,
  vin varchar(17) not null,
  plate text,
  mileage_km integer not null,
  body_type text,
  color text,
  fuel fuel_type not null,
  transmission transmission not null,
  drivetrain drivetrain,
  engine_cc int,
  horsepower int,
  torque_nm int,
  battery_kwh numeric(5, 1),
  range_km int,
  previous_owners smallint,
  warranty_until date,
  price numeric(12, 2),
  currency varchar(3) default 'TRY',
  price_visible boolean default true,
  is_negotiable boolean default false,
  description text,
  features text[] default '{}',
  tuvturk_valid_until date,
  tramer_total_amount numeric(12, 2) default 0,
  has_heavy_damage boolean default false,
  view_count integer default 0,
  published_at timestamptz,
  sold_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint vehicles_dealership_id_vin_unique unique (dealership_id, vin)
);

create index vehicles_dealership_id_status_idx on vehicles (dealership_id, status);

create table vehicle_panels (
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  panel panel_code not null,
  state panel_state not null default 'original',
  paint_microns int,
  note text,
  primary key (vehicle_id, panel)
);

create table tramer_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  incident_date date,
  amount numeric(12, 2) not null,
  description text,
  created_at timestamptz default now()
);

create table tires (
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  position text not null check (position in ('FL', 'FR', 'RL', 'RR', 'SPARE')),
  brand text,
  size text,
  season text,
  tread_mm numeric(3, 1),
  dot_year smallint,
  primary key (vehicle_id, position)
);

create table mechanical_checks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  category text not null,
  status text not null check (status in ('ok', 'attention', 'fault')),
  note text
);

create table media (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  dealership_id uuid not null references dealerships(id) on delete cascade,
  kind media_kind not null,
  category text,
  storage_path text,
  variants jsonb,
  external_url text,
  provider text,
  title text,
  mime_type text,
  size_bytes bigint,
  width int,
  height int,
  sort_order int default 0,
  is_cover boolean default false,
  is_public boolean default true,
  created_at timestamptz default now()
);

create index media_vehicle_id_kind_sort_order_idx on media (vehicle_id, kind, sort_order);
create unique index one_cover_per_vehicle on media (vehicle_id) where is_cover;

create table vehicle_tags (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  type text not null check (type in ('qr', 'nfc')),
  nfc_uid text unique,
  token text unique not null,
  is_active boolean default true,
  written_at timestamptz,
  created_at timestamptz default now()
);

create table scan_events (
  id bigserial primary key,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  tag_id uuid references vehicle_tags(id) on delete set null,
  source text,
  user_agent text,
  ip_hash text,
  referrer text,
  created_at timestamptz default now()
);

create index scan_events_vehicle_id_created_at_idx on scan_events (vehicle_id, created_at);

create table leads (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  dealership_id uuid not null references dealerships(id),
  type text check (type in ('whatsapp_click', 'call_click', 'test_drive')),
  name text,
  phone text,
  preferred_at timestamptz,
  note text,
  status text default 'new',
  created_at timestamptz default now()
);

alter table dealerships enable row level security;
alter table users enable row level security;
alter table vehicles enable row level security;
alter table vehicle_panels enable row level security;
alter table tramer_records enable row level security;
alter table tires enable row level security;
alter table mechanical_checks enable row level security;
alter table media enable row level security;
alter table vehicle_tags enable row level security;
alter table scan_events enable row level security;
alter table leads enable row level security;

create or replace function public.current_dealership_id() returns uuid
language sql stable security definer set search_path = public as $$
  select dealership_id from public.users where id = auth.uid()
$$;

create policy dealerships_tenant_isolation on dealerships
  for all using (id = public.current_dealership_id())
  with check (id = public.current_dealership_id());

create policy users_tenant_isolation on users
  for all using (dealership_id = public.current_dealership_id())
  with check (dealership_id = public.current_dealership_id());

create policy vehicles_tenant_isolation on vehicles
  for all using (dealership_id = public.current_dealership_id())
  with check (dealership_id = public.current_dealership_id());

create policy media_tenant_isolation on media
  for all using (dealership_id = public.current_dealership_id())
  with check (dealership_id = public.current_dealership_id());

create policy leads_tenant_isolation on leads
  for all using (dealership_id = public.current_dealership_id())
  with check (dealership_id = public.current_dealership_id());

create policy vehicle_panels_tenant_isolation on vehicle_panels
  for all using (exists (
    select 1 from vehicles v
    where v.id = vehicle_panels.vehicle_id
      and v.dealership_id = public.current_dealership_id()
  ));

create policy tramer_records_tenant_isolation on tramer_records
  for all using (exists (
    select 1 from vehicles v
    where v.id = tramer_records.vehicle_id
      and v.dealership_id = public.current_dealership_id()
  ));

create policy tires_tenant_isolation on tires
  for all using (exists (
    select 1 from vehicles v
    where v.id = tires.vehicle_id
      and v.dealership_id = public.current_dealership_id()
  ));

create policy mechanical_checks_tenant_isolation on mechanical_checks
  for all using (exists (
    select 1 from vehicles v
    where v.id = mechanical_checks.vehicle_id
      and v.dealership_id = public.current_dealership_id()
  ));

create policy vehicle_tags_tenant_isolation on vehicle_tags
  for all using (exists (
    select 1 from vehicles v
    where v.id = vehicle_tags.vehicle_id
      and v.dealership_id = public.current_dealership_id()
  ));

create policy scan_events_tenant_isolation on scan_events
  for all using (exists (
    select 1 from vehicles v
    where v.id = scan_events.vehicle_id
      and v.dealership_id = public.current_dealership_id()
  ));

insert into storage.buckets (id, name, public)
values ('vehicle-media', 'vehicle-media', true)
on conflict do nothing;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dealerships_set_updated_at
  before update on dealerships
  for each row execute function public.set_updated_at();

create trigger vehicles_set_updated_at
  before update on vehicles
  for each row execute function public.set_updated_at();

commit;
