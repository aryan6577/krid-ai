# Krid.ai Data Layer Schema

Target: Supabase Postgres.

Auth recommendation: Supabase Auth for registration/login, with email or phone handled by the provider. The public schema stores only the onboarding role mapping in `account_profiles`. The database enforces exactly one role per account: either one Player profile or one Organisation profile, never both.

No seed data, API routes, RLS policies, or business logic are included in this phase.

## Migration

- `supabase/migrations/202609220001_krid_core_schema.sql`
- `supabase/migrations/202609220002_matchmaking_games.sql`
- `supabase/migrations/202609220003_venues_bookings_payments.sql`
- `supabase/migrations/202609220004_razorpay_idempotency.sql`
- `supabase/migrations/202609220005_activity_streak_service.sql`
- `supabase/migrations/202609220006_exercise_rule_engine.sql`

## Tables

### Auth Boundary

- `account_profiles`
  - `account_id` references `auth.users(id)`
  - `role` is exactly `Player` or `Organisation`
  - `player_id` references `players(player_id)`
  - `organisation_id` references `organisations(organisation_id)`
  - `account_profiles_exactly_one_role` enforces the hard one-role constraint

### Domain Entities

- `players`
  - Player ID, name, contact, location, sports, skill, availability, preferences, rating, streak

- `organisations`
  - Organisation ID, name, contact, location, type, verification status

- `venues`
  - Venue ID, organisation FK, location, supported sports, price, facilities, availability

- `games`
  - Game ID, sport, date/time, venue FK, participants, teams, status
  - `game_participants` provides the normalized Player-to-Game participation FK relationship

- `match_results`
  - Game ID FK, score, winner, result status

- `performances`
  - Player ID FK, activity/match ID, metric, value, source, confidence, timestamp

- `exercises`
  - Exercise ID, name, difficulty, camera view, target metrics, thresholds, cues

- `exercise_sessions`
  - Session ID, player ID FK, exercise plan FK, start/end, sets/reps, quality, completion, feedback
  - `detected_result` stores the original deterministic rule-engine output
  - `correction_flags` stores user feedback/session corrections without overwriting detected data

- `tutorial_drills`
  - Drill ID, sport, drill name, camera view, checkpoints, thresholds

- `tutorial_sessions`
  - Session ID, player ID FK, drill ID FK, checkpoint results, score, feedback, completion

- `alternative_sport_recommendations`
  - Player ID FK, source sport, candidate sport, similarity factors, opportunity signals, source refs
  - `alternative_sport_recommendation_sources` links recommendations to cited `web_sources`

- `web_sources`
  - Source ID, provider, query, URL, title, retrieved_at, relevance/quality status

- `activity_events`
  - Activity ID, player FK, type, local date, source record, qualifying flag, created_at
  - Uses `source_type` + `source_id` for the polymorphic source reference
  - Source uniqueness is scoped to `(player_id, source_type, source_id)` so a shared match result can count once for each participant
  - Supports exercise sessions, tutorial sessions, and match result completions as one unified streak feed

- `streak_records`
  - Player ID FK, current streak, longest streak, last qualifying date, timezone
  - Updated only by the Activity Event / Streak service; `longest_streak` must never decrease

- `payment_expenses`
  - Booking/game ID FK, payer, amount, gateway reference, status/share status

- `match_candidate_actions`
  - Player FK, candidate player FK, sport, accepted/rejected/saved action, score, reason, created_at
  - Used to keep rejected/saved/accepted candidates from resurfacing immediately

- `player_connections`
  - Requester player FK, addressee player FK, pending/accepted status, timestamps
  - Used for friend request, accept, and remove flows

### Game Fill Counts

`games.participant_count` is maintained by database triggers on `game_participants`, so list views can show slot-fill state without loading participant profiles. A capacity trigger prevents inserting participants into a full game, while the API also checks capacity and duplicate joins before insert.

### Venue Booking And Payments

`venues` now includes registration/display fields used by the venue module: `name`, `price_per_hour`, and `availability_slots`.

- `venue_bookings`
  - Venue FK, Player FK, slot, optional start time, amount, pending/confirmed/cancelled status, timestamps, idempotency key
  - `idempotency_key` is unique and is derived from the same player/venue/slot/start time unless the client supplies an `Idempotency-Key` header

- `sandbox_payments`
  - Booking FK, idempotency key, Razorpay test order/payment/signature metadata, amount, created/verified/failed status
  - `idempotency_key` is `booking:<booking_id>` and is unique, so retrying payment order creation for the same booking reuses the existing transaction record
  - The backend confirms a booking only after verifying Razorpay's signed payment response against the server-created order and expected amount

- `booking_expense_shares`
  - Booking FK, Player FK, split amount, share status

- `audit_logs`
  - Actor, action, entity type/id, before/after JSON, metadata, and timestamp
  - Administrative verification changes, payment state changes, and CV feedback corrections append audit rows

### Activity Events And Streaks

Exercise Mode, Tutorial Mode, and Match completion must call the unified Activity Event
service rather than updating streaks directly. The service discards non-qualifying
completions, writes qualifying events with the player's timezone-local calendar date, and
then applies one daily streak increment at most. Multiple qualifying events on the same
local date are retained as events but do not multiply the streak.

`GET /api/streaks/month` returns the authoritative current streak, longest streak,
day-by-day qualifying state map, activity mix, and reached milestone badges for calendar UI.

### Exercise Mode Rule Engine

Exercise Mode consumes the frozen `krid.cv.pose.v1` keypoint contract from the standalone CV
service. It does not run learned rule models and does not change the CV schema. The supported
catalog is exactly: Bodyweight squat, Forward lunge, Push-up, Plank, and Jumping jack.
The API layer remains decoupled from CV inference/runtime deployment: it receives already
produced `krid.cv.pose.v1` JSON, evaluates deterministic rules, and stores results. No route
requires camera access, media processing, or a co-located pose model.

Each completed evaluation stores rule IDs, threshold values, metric values, technique score,
consistency, detection-quality state, and coaching cues in `exercise_sessions.detected_result`.
If detection quality was ever insufficient, the session is not silently marked complete and
the result asks for manual confirmation. User corrections are stored in `correction_flags`.
Manual completion can create an Activity Event only when the rule engine detected that the
target was met but quality required confirmation.

## Relationship Map

```txt
auth.users
  1 -> 1 account_profiles
          -> players OR organisations

organisations
  1 -> many venues

venues
  1 -> many games

players
  many -> many games through game_participants
  1 -> many exercise_sessions
  1 -> many tutorial_sessions
  1 -> many performances
  1 -> 1 streak_records
  1 -> many activity_events
  1 -> many alternative_sport_recommendations
  1 -> many payment_expenses as payer

games
  1 -> 1 match_results
  1 -> many payment_expenses

exercises
  1 -> many exercise_sessions

tutorial_drills
  1 -> many tutorial_sessions

alternative_sport_recommendations
  many -> many web_sources through alternative_sport_recommendation_sources

activity_events
  source_type + source_id -> exercise_sessions | tutorial_sessions | match_results
```
