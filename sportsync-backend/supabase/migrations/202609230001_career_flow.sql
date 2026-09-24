-- Private CV data is only accessed by the API's service role after an owner/role check.
create table if not exists career_opportunities (
  opportunity_id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(organisation_id) on delete cascade,
  title text not null, sport text not null, type text not null, location text not null,
  description text not null, article text not null default '', stipend text not null default '', min_rating integer not null default 0,
  deadline date not null, status text not null default 'published' check (status in ('published','closed')),
  created_at timestamptz not null default now()
);
alter table career_opportunities add column if not exists article text not null default '';
create index if not exists career_opportunities_status_deadline_idx on career_opportunities(status, deadline);

create table if not exists player_career_profiles (
  player_id uuid primary key references players(player_id) on delete cascade,
  article text not null default '', updated_at timestamptz not null default now()
);

create table if not exists career_email_proofs (
  account_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  verified_at timestamptz not null default now()
);

create table if not exists career_applications (
  application_id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references career_opportunities(opportunity_id) on delete cascade,
  player_id uuid not null references players(player_id) on delete cascade,
  statement text not null, cv_name text not null, cv_type text not null, cv_base64 text not null,
  email_at_submission text not null, email_verified_at timestamptz not null,
  status text not null default 'received' check (status in ('received','reviewing','closed')),
  created_at timestamptz not null default now(),
  unique(opportunity_id, player_id)
);
create index if not exists career_applications_organisation_idx on career_applications(opportunity_id, created_at desc);
revoke all on career_applications from anon, authenticated;
revoke all on player_career_profiles from anon, authenticated;
revoke all on career_email_proofs from anon, authenticated;
