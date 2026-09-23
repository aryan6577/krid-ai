-- Interactive examples in the ordinary discovery tables. They remain explicitly
-- flagged as demo, have no auth account, and cannot represent real availability.
alter table public.players alter column rating type numeric(7, 2);

alter table public.players add column if not exists is_demo boolean not null default false;
alter table public.players add column if not exists demo_catalog_id text unique;
alter table public.organisations add column if not exists is_demo boolean not null default false;
alter table public.organisations add column if not exists demo_catalog_id text unique;
alter table public.venues add column if not exists is_demo boolean not null default false;
alter table public.venues add column if not exists demo_catalog_id text unique;
alter table public.games add column if not exists is_demo boolean not null default false;
alter table public.games add column if not exists demo_catalog_id text unique;
alter table public.venue_bookings add column if not exists is_demo boolean not null default false;

alter type krid_booking_status add value if not exists 'demo_reserved';

create or replace function public.krid_demo_location(label text)
returns jsonb language sql immutable as $$
  select jsonb_build_object('label', label, 'lat', coords.lat, 'lng', coords.lng)
  from (values
    ('Koramangala, Bengaluru', 12.9352, 77.6146),
    ('HSR Layout, Bengaluru', 12.9116, 77.6389),
    ('Indiranagar, Bengaluru', 12.9719, 77.6412),
    ('Whitefield, Bengaluru', 12.9698, 77.7500),
    ('Jayanagar, Bengaluru', 12.9308, 77.5838),
    ('Marathahalli, Bengaluru', 12.9569, 77.7011),
    ('BTM Layout, Bengaluru', 12.9166, 77.6101),
    ('Malleshwaram, Bengaluru', 13.0040, 77.5686),
    ('Sarjapur Road, Bengaluru', 12.9121, 77.6908),
    ('Bellandur, Bengaluru', 12.9260, 77.6762),
    ('Yelahanka, Bengaluru', 13.1007, 77.5963),
    ('JP Nagar, Bengaluru', 12.9077, 77.5851)
  ) as coords(area, lat, lng)
  where coords.area = label
$$;

insert into public.players
  (player_id, name, contact, location, sports, skill, availability, preferences, rating, streak, is_demo, demo_catalog_id)
select
  md5('krid-player:' || entry_id)::uuid, payload->>'name', '{}'::jsonb,
  public.krid_demo_location(payload->>'location'),
  array(select jsonb_array_elements_text(payload->'sports')),
  payload->'skill', jsonb_build_object('slots', payload->'availability'),
  jsonb_build_object('competitivePreference', payload->>'competitivePreference'),
  (payload->>'rating')::numeric, 0, true, entry_id
from public.demo_catalog_entries where kind = 'player'
on conflict (player_id) do nothing;

insert into public.organisations
  (organisation_id, name, contact, location, type, verification_status, is_demo, demo_catalog_id)
select
  md5('krid-organisation:' || entry_id)::uuid, payload->>'name', '{}'::jsonb,
  public.krid_demo_location(payload->>'location'), payload->>'type', 'Sample', true, entry_id
from public.demo_catalog_entries where kind = 'organisation'
on conflict (organisation_id) do nothing;

insert into public.venues
  (venue_id, organisation_id, name, location, supported_sports, price, price_per_hour,
   facilities, availability, availability_slots, is_demo, demo_catalog_id)
select
  md5('krid-venue:' || e.entry_id)::uuid, o.organisation_id,
  e.payload->>'name', public.krid_demo_location(e.payload->>'location'),
  array[e.payload->>'sport'], (e.payload->>'pricePerHour')::numeric,
  (e.payload->>'pricePerHour')::numeric, e.payload->'facilities',
  jsonb_build_object('slots', e.payload->'availability'), e.payload->'availability',
  true, e.entry_id
from public.demo_catalog_entries e
join public.organisations o on o.demo_catalog_id = e.payload->>'orgId' and o.is_demo
where e.kind = 'venue'
on conflict (venue_id) do nothing;

insert into public.games
  (game_id, sport, date_time, venue_id, participants, teams, status, capacity,
   created_by, is_demo, demo_catalog_id)
select
  md5('krid-game:' || e.entry_id)::uuid, e.payload->>'sport',
  ((current_date + 10 + (e.payload->>'dayOffset')::integer)::text || ' ' || (e.payload->>'time'))::timestamp
    at time zone 'Asia/Kolkata',
  v.venue_id, '[]'::jsonb, '{}'::jsonb, 'Open', (e.payload->>'capacity')::integer,
  p.player_id, true, e.entry_id
from public.demo_catalog_entries e
join public.venues v on v.demo_catalog_id = e.payload->>'venueId' and v.is_demo
join public.players p on p.demo_catalog_id = e.payload->'participants'->>0 and p.is_demo
where e.kind = 'game'
on conflict (game_id) do nothing;

insert into public.game_participants (game_id, player_id, status)
select g.game_id, p.player_id, 'confirmed'
from public.demo_catalog_entries e
join public.games g on g.demo_catalog_id = e.entry_id and g.is_demo
cross join lateral jsonb_array_elements_text(e.payload->'participants') as participant(catalog_id)
join public.players p on p.demo_catalog_id = participant.catalog_id and p.is_demo
where e.kind = 'game'
on conflict (game_id, player_id) do nothing;
