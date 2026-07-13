-- ============================================================
-- Cyber Brasil Arena — initial schema
-- ============================================================

-- Enums
create type public.user_role as enum ('customer', 'staff', 'admin');
create type public.package_type as enum ('hora_vale', 'hora_pico', 'pacote_3h', 'corujao');
create type public.session_status as enum ('active', 'completed', 'cancelled');
create type public.transaction_type as enum ('purchase', 'refund', 'credit_add', 'credit_use');
create type public.payment_method as enum ('pix', 'credit_card', 'debit_card', 'credits', 'cash');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.tournament_type as enum ('monthly', 'quarterly');
create type public.tournament_status as enum ('registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled');
create type public.team_status as enum ('registered', 'checked_in', 'eliminated', 'finalist');

-- ── profiles (extends auth.users) ──────────────────────────────────────────
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  full_name             text,
  phone                 text,
  cpf                   text unique,
  birth_date            date,
  role                  public.user_role not null default 'customer',
  is_founding_member    boolean not null default false,
  founding_discount_used boolean not null default false,
  credits_balance       integer not null default 0, -- stored in cents
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);
create policy "profiles: staff read" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);

-- ── pc_stations ────────────────────────────────────────────────────────────
create table public.pc_stations (
  id             uuid primary key default gen_random_uuid(),
  station_number integer not null unique,
  label          text,
  is_active      boolean not null default true,
  specs          jsonb,
  created_at     timestamptz not null default now()
);

alter table public.pc_stations enable row level security;
create policy "stations: all read"  on public.pc_stations for select using (true);
create policy "stations: staff write" on public.pc_stations for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);

-- Insert the 10 stations
insert into public.pc_stations (station_number, label, specs) values
  (1,  'PC-01', '{"cpu":"Ryzen 5 5600","gpu":"RX 7600","ram":"16GB","monitor":"144Hz","peripherals":{"keyboard":"HyperX","mouse":"Logitech G203","headset":"HyperX Cloud"}}'),
  (2,  'PC-02', '{"cpu":"Ryzen 5 5600","gpu":"RX 7600","ram":"16GB","monitor":"144Hz","peripherals":{"keyboard":"HyperX","mouse":"Logitech G203","headset":"HyperX Cloud"}}'),
  (3,  'PC-03', '{"cpu":"Ryzen 5 5600","gpu":"RX 7600","ram":"16GB","monitor":"144Hz","peripherals":{"keyboard":"HyperX","mouse":"Logitech G203","headset":"HyperX Cloud"}}'),
  (4,  'PC-04', '{"cpu":"Ryzen 5 5600","gpu":"RX 7600","ram":"16GB","monitor":"144Hz","peripherals":{"keyboard":"HyperX","mouse":"Logitech G203","headset":"HyperX Cloud"}}'),
  (5,  'PC-05', '{"cpu":"Ryzen 5 5600","gpu":"RX 7600","ram":"16GB","monitor":"144Hz","peripherals":{"keyboard":"HyperX","mouse":"Logitech G203","headset":"HyperX Cloud"}}'),
  (6,  'PC-06', '{"cpu":"Ryzen 5 5600","gpu":"RX 7600","ram":"16GB","monitor":"144Hz","peripherals":{"keyboard":"HyperX","mouse":"Logitech G203","headset":"HyperX Cloud"}}'),
  (7,  'PC-07', '{"cpu":"Ryzen 5 5600","gpu":"RX 7600","ram":"16GB","monitor":"144Hz","peripherals":{"keyboard":"HyperX","mouse":"Logitech G203","headset":"HyperX Cloud"}}'),
  (8,  'PC-08', '{"cpu":"Ryzen 5 5600","gpu":"RX 7600","ram":"16GB","monitor":"144Hz","peripherals":{"keyboard":"HyperX","mouse":"Logitech G203","headset":"HyperX Cloud"}}'),
  (9,  'PC-09', '{"cpu":"Ryzen 5 5600","gpu":"RX 7600","ram":"16GB","monitor":"144Hz","peripherals":{"keyboard":"HyperX","mouse":"Logitech G203","headset":"HyperX Cloud"}}'),
  (10, 'PC-10', '{"cpu":"Ryzen 5 5600","gpu":"RX 7600","ram":"16GB","monitor":"144Hz","peripherals":{"keyboard":"HyperX","mouse":"Logitech G203","headset":"HyperX Cloud"}}');

-- ── transactions ───────────────────────────────────────────────────────────
create table public.transactions (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.profiles(id),
  amount_cents        integer not null,
  type                public.transaction_type not null,
  payment_method      public.payment_method not null,
  status              public.payment_status not null default 'pending',
  asaas_payment_id    text,
  description         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.transactions enable row level security;
create policy "transactions: own read" on public.transactions for select using (auth.uid() = customer_id);
create policy "transactions: staff read" on public.transactions for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);
create policy "transactions: staff write" on public.transactions for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);

-- ── sessions ───────────────────────────────────────────────────────────────
create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references public.profiles(id),
  station_id      uuid not null references public.pc_stations(id),
  package_type    public.package_type not null,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  planned_end_at  timestamptz,
  status          public.session_status not null default 'active',
  price_cents     integer not null,
  transaction_id  uuid references public.transactions(id),
  created_at      timestamptz not null default now()
);

alter table public.sessions enable row level security;
create policy "sessions: own read" on public.sessions for select using (auth.uid() = customer_id);
create policy "sessions: staff all" on public.sessions for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);

-- ── tournaments ────────────────────────────────────────────────────────────
create table public.tournaments (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  type                public.tournament_type not null,
  game                text not null default 'CS2',
  status              public.tournament_status not null default 'registration_open',
  scheduled_date      date not null,
  max_teams           integer not null default 6,
  entry_fee_cents     integer not null default 15000,
  prize_pool_cents    integer not null default 0,
  carry_over_cents    integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.tournaments enable row level security;
create policy "tournaments: all read"   on public.tournaments for select using (true);
create policy "tournaments: staff write" on public.tournaments for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);

-- ── teams ──────────────────────────────────────────────────────────────────
create table public.teams (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references public.tournaments(id),
  name            text not null,
  captain_id      uuid not null references public.profiles(id),
  status          public.team_status not null default 'registered',
  placement       integer,
  transaction_id  uuid references public.transactions(id),
  created_at      timestamptz not null default now()
);

alter table public.teams enable row level security;
create policy "teams: all read" on public.teams for select using (true);
create policy "teams: captain write" on public.teams for update using (auth.uid() = captain_id);
create policy "teams: staff all" on public.teams for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);

-- ── team_members ───────────────────────────────────────────────────────────
create table public.team_members (
  team_id     uuid not null references public.teams(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id),
  joined_at   timestamptz not null default now(),
  primary key (team_id, profile_id)
);

alter table public.team_members enable row level security;
create policy "team_members: all read"  on public.team_members for select using (true);
create policy "team_members: own write" on public.team_members for insert using (auth.uid() = profile_id);
create policy "team_members: staff all" on public.team_members for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);

-- ── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at    before update on public.profiles    for each row execute function public.set_updated_at();
create trigger trg_transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger trg_tournaments_updated_at  before update on public.tournaments  for each row execute function public.set_updated_at();

-- ── auto-create profile on signup ─────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
