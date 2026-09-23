create extension if not exists pgcrypto;

do $$
begin
  create type krid_account_role as enum ('Player', 'Organisation');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type krid_activity_type as enum ('exercise', 'tutorial', 'match');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type krid_activity_source_type as enum ('exercise_session', 'tutorial_session', 'match_result');
exception
  when duplicate_object then null;
end $$;

create table players (
  player_id uuid primary key default gen_random_uuid(),
  name text not null,
  contact jsonb not null,
  location jsonb not null,
  sports text[] not null,
  skill jsonb not null,
  availability jsonb not null,
  preferences jsonb not null,
  rating numeric(5, 2) not null,
  streak integer not null check (streak >= 0)
);

create table organisations (
  organisation_id uuid primary key default gen_random_uuid(),
  name text not null,
  contact jsonb not null,
  location jsonb not null,
  type text not null,
  verification_status text not null
);

create table account_profiles (
  account_id uuid primary key references auth.users(id) on delete cascade,
  role krid_account_role not null,
  player_id uuid unique references players(player_id) on delete cascade,
  organisation_id uuid unique references organisations(organisation_id) on delete cascade,
  constraint account_profiles_exactly_one_role check (
    (
      role = 'Player'
      and player_id is not null
      and organisation_id is null
    )
    or
    (
      role = 'Organisation'
      and organisation_id is not null
      and player_id is null
    )
  )
);

create table venues (
  venue_id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(organisation_id) on delete restrict,
  location jsonb not null,
  supported_sports text[] not null,
  price numeric(12, 2) not null check (price >= 0),
  facilities jsonb not null,
  availability jsonb not null
);

create table games (
  game_id uuid primary key default gen_random_uuid(),
  sport text not null,
  date_time timestamptz not null,
  venue_id uuid not null references venues(venue_id) on delete restrict,
  participants jsonb not null default '[]'::jsonb,
  teams jsonb not null default '{}'::jsonb,
  status text not null
);

create table game_participants (
  game_id uuid not null references games(game_id) on delete cascade,
  player_id uuid not null references players(player_id) on delete cascade,
  primary key (game_id, player_id)
);

create table match_results (
  game_id uuid primary key references games(game_id) on delete cascade,
  score jsonb not null,
  winner text not null,
  result_status text not null
);

create table performances (
  player_id uuid not null references players(player_id) on delete cascade,
  activity_match_id uuid not null,
  metric text not null,
  value numeric not null,
  source text not null,
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  "timestamp" timestamptz not null,
  primary key (player_id, activity_match_id, metric, "timestamp")
);

create table exercises (
  exercise_id uuid primary key default gen_random_uuid(),
  name text not null,
  difficulty text not null,
  camera_view text not null,
  target_metrics jsonb not null,
  thresholds jsonb not null,
  cues text[] not null
);

create table exercise_sessions (
  session_id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(player_id) on delete cascade,
  exercise_plan_id uuid not null references exercises(exercise_id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz,
  sets_reps jsonb not null,
  quality numeric(5, 2) not null,
  completion text not null,
  feedback text not null
);

create table tutorial_drills (
  drill_id uuid primary key default gen_random_uuid(),
  sport text not null,
  drill_name text not null,
  camera_view text not null,
  checkpoints jsonb not null,
  thresholds jsonb not null
);

create table tutorial_sessions (
  session_id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(player_id) on delete cascade,
  drill_id uuid not null references tutorial_drills(drill_id) on delete restrict,
  checkpoint_results jsonb not null,
  score numeric(5, 2) not null,
  feedback text not null,
  completion text not null
);

create table alternative_sport_recommendations (
  player_id uuid not null references players(player_id) on delete cascade,
  source_sport text not null,
  candidate_sport text not null,
  similarity_factors jsonb not null,
  opportunity_signals jsonb not null,
  source_refs jsonb not null default '[]'::jsonb,
  primary key (player_id, source_sport, candidate_sport)
);

create table web_sources (
  source_id uuid primary key default gen_random_uuid(),
  provider text not null,
  query text not null,
  url text not null,
  title text not null,
  retrieved_at timestamptz not null,
  relevance_quality_status text not null
);

create table alternative_sport_recommendation_sources (
  player_id uuid not null,
  source_sport text not null,
  candidate_sport text not null,
  source_id uuid not null references web_sources(source_id) on delete cascade,
  primary key (player_id, source_sport, candidate_sport, source_id),
  foreign key (player_id, source_sport, candidate_sport)
    references alternative_sport_recommendations(player_id, source_sport, candidate_sport)
    on delete cascade
);

create table activity_events (
  activity_id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(player_id) on delete cascade,
  type krid_activity_type not null,
  local_date date not null,
  source_type krid_activity_source_type not null,
  source_id uuid not null,
  qualifying_flag boolean not null,
  created_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create table streak_records (
  player_id uuid primary key references players(player_id) on delete cascade,
  current_streak integer not null check (current_streak >= 0),
  longest_streak integer not null check (longest_streak >= 0),
  last_qualifying_date date,
  timezone text not null
);

create table payment_expenses (
  booking_game_id uuid not null references games(game_id) on delete cascade,
  payer uuid not null references players(player_id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  gateway_reference text not null,
  status text not null,
  share_status text not null,
  primary key (booking_game_id, payer, gateway_reference)
);

create index account_profiles_role_idx on account_profiles(role);
create index venues_organisation_id_idx on venues(organisation_id);
create index games_venue_id_date_time_idx on games(venue_id, date_time);
create index game_participants_player_id_idx on game_participants(player_id);
create index performances_player_id_timestamp_idx on performances(player_id, "timestamp");
create index exercise_sessions_player_id_start_at_idx on exercise_sessions(player_id, start_at);
create index tutorial_sessions_player_id_score_idx on tutorial_sessions(player_id, score);
create index activity_events_player_id_local_date_idx on activity_events(player_id, local_date);
create index payment_expenses_payer_idx on payment_expenses(payer);
