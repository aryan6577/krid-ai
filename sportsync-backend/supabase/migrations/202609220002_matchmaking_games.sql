do $$
begin
  create type krid_match_action as enum ('accepted', 'rejected', 'saved');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type krid_connection_status as enum ('pending', 'accepted');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type krid_game_participant_status as enum ('confirmed');
exception
  when duplicate_object then null;
end $$;

alter table games
  add column if not exists capacity integer not null default 2 check (capacity >= 2),
  add column if not exists participant_count integer not null default 0 check (participant_count >= 0),
  add column if not exists created_by uuid references players(player_id) on delete set null;

alter table game_participants
  add column if not exists status krid_game_participant_status not null default 'confirmed',
  add column if not exists joined_at timestamptz not null default now();

update games
set participant_count = coalesce(counts.count, 0)
from (
  select game_id, count(*)::integer as count
  from game_participants
  group by game_id
) counts
where games.game_id = counts.game_id;

create table if not exists match_candidate_actions (
  player_id uuid not null references players(player_id) on delete cascade,
  candidate_player_id uuid not null references players(player_id) on delete cascade,
  sport text not null,
  action krid_match_action not null,
  score integer not null check (score >= 0 and score <= 100),
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (player_id, candidate_player_id, sport),
  constraint match_candidate_actions_not_self check (player_id <> candidate_player_id)
);

create table if not exists player_connections (
  requester_player_id uuid not null references players(player_id) on delete cascade,
  addressee_player_id uuid not null references players(player_id) on delete cascade,
  status krid_connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_player_id, addressee_player_id),
  constraint player_connections_not_self check (requester_player_id <> addressee_player_id)
);

create or replace function sync_game_participant_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update games
      set participant_count = participant_count + 1,
          status = case when participant_count + 1 >= capacity then 'Full' else status end
      where game_id = new.game_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update games
      set participant_count = greatest(participant_count - 1, 0),
          status = case when participant_count - 1 < capacity and status = 'Full' then 'Open' else status end
      where game_id = old.game_id;
    return old;
  end if;

  return null;
end $$;

create or replace function enforce_game_capacity()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
  max_capacity integer;
begin
  select participant_count, capacity
    into current_count, max_capacity
  from games
  where game_id = new.game_id
  for update;

  if current_count >= max_capacity then
    raise exception 'game is already full';
  end if;

  return new;
end $$;

drop trigger if exists game_participant_capacity_check on game_participants;
create trigger game_participant_capacity_check
before insert on game_participants
for each row execute function enforce_game_capacity();

drop trigger if exists game_participant_count_insert on game_participants;
create trigger game_participant_count_insert
after insert on game_participants
for each row execute function sync_game_participant_count();

drop trigger if exists game_participant_count_delete on game_participants;
create trigger game_participant_count_delete
after delete on game_participants
for each row execute function sync_game_participant_count();

create index if not exists match_candidate_actions_player_sport_idx on match_candidate_actions(player_id, sport, action);
create index if not exists player_connections_addressee_status_idx on player_connections(addressee_player_id, status);
create index if not exists games_sport_status_date_time_idx on games(sport, status, date_time);
