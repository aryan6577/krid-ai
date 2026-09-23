alter table sandbox_payments
  add column if not exists idempotency_key text,
  add column if not exists provider text not null default 'razorpay_test',
  add column if not exists provider_order_id text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_signature text,
  add column if not exists failure_reason text;

update sandbox_payments
set idempotency_key = 'booking:' || booking_id::text
where idempotency_key is null;

alter table sandbox_payments
  alter column idempotency_key set not null;

create unique index if not exists sandbox_payments_idempotency_key_idx on sandbox_payments(idempotency_key);
create unique index if not exists sandbox_payments_provider_order_id_idx on sandbox_payments(provider_order_id) where provider_order_id is not null;
