alter table activity_events
  drop constraint if exists activity_events_source_type_source_id_key;

alter table activity_events
  add constraint activity_events_player_source_unique unique (player_id, source_type, source_id);

create index if not exists activity_events_player_qualifying_date_idx
  on activity_events(player_id, qualifying_flag, local_date);
