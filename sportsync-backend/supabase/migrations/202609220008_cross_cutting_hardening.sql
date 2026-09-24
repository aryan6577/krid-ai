alter table venue_bookings
  add column if not exists idempotency_key text;

update venue_bookings
set idempotency_key = 'legacy:' || booking_id::text
where idempotency_key is null;

alter table venue_bookings
  alter column idempotency_key set not null;

create unique index if not exists venue_bookings_idempotency_key_idx
  on venue_bookings(idempotency_key);

create table if not exists audit_logs (
  audit_id uuid primary key default gen_random_uuid(),
  actor_id text,
  actor_type text not null default 'user',
  action text not null,
  entity_type text not null,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on audit_logs(entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on audit_logs(actor_type, actor_id, created_at desc);
