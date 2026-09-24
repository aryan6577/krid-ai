do $$
begin
  create type krid_booking_status as enum ('pending', 'confirmed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type krid_payment_status as enum ('created', 'verified', 'failed');
exception
  when duplicate_object then null;
end $$;

alter table venues
  add column if not exists name text,
  add column if not exists price_per_hour numeric(12, 2),
  add column if not exists availability_slots jsonb not null default '[]'::jsonb;

update venues
set price_per_hour = price
where price_per_hour is null;

update venues
set availability_slots = coalesce(availability->'slots', '[]'::jsonb)
where availability_slots = '[]'::jsonb
  and jsonb_typeof(availability) = 'object'
  and availability ? 'slots';

create table if not exists venue_bookings (
  booking_id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(venue_id) on delete restrict,
  player_id uuid not null references players(player_id) on delete cascade,
  slot text not null,
  start_at timestamptz,
  amount numeric(12, 2) not null check (amount >= 0),
  status krid_booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists sandbox_payments (
  payment_id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references venue_bookings(booking_id) on delete cascade,
  gateway_reference text not null unique,
  verification_token text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  status krid_payment_status not null default 'created',
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table if not exists booking_expense_shares (
  booking_id uuid not null references venue_bookings(booking_id) on delete cascade,
  player_id uuid not null references players(player_id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  share_status text not null default 'pending',
  primary key (booking_id, player_id)
);

create index if not exists venue_bookings_venue_status_idx on venue_bookings(venue_id, status);
create index if not exists venue_bookings_player_status_idx on venue_bookings(player_id, status);
create index if not exists venues_supported_sports_idx on venues using gin(supported_sports);
create index if not exists venues_availability_slots_idx on venues using gin(availability_slots);
