# Krid.ai — backend

The Express API for Krid.ai. It handles authenticated player workflows, Supabase persistence,
exercise/tutorial evaluation, and the private pose-service bridge. It also powers the optional
chat assistant.

## What it does

- `POST /api/chat` — takes the conversation so far (`messages`) plus a snapshot of the
  logged-in user's app data (`context`: venues, open games, friends, funding/career/
  sponsorship opportunities), calls Groq with that as a system prompt, and returns the
  model's reply. If the model wants to take an action (book a venue, join a game, message
  friends, apply to funding/career/sponsorship, or raise a new request), it comes back as a
  `tool_calls` entry on the message — the **frontend** executes that action against its own
  local demo data and reports the result back for a final natural-language confirmation.
- `GET /api/health` — quick check that the server is up and an API key is configured.

Player, game, booking, exercise, tutorial and streak records use Supabase. Some opportunity
and chat actions still use prototype data in the frontend.

Career opportunities, player articles, email-code proofs and CV applications use Supabase after `202609230001_career_flow.sql`. Demo opportunities stay in frontend sample data and cannot accept applications. The old direct `POST /api/activity-events` route now rejects client-authored qualifying claims; completed session workflows create events internally.

## Setup

```bash
cd sportsync-backend
npm install
npm start
```

The server starts on **http://localhost:5001** by default.

Copy `.env.example` to `.env` and enter your own service keys. The pose service key must match
the Python service's `KRID_CV_API_KEY`.

```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
PORT=5001
```

For real authentication and profile CRUD, also configure Supabase:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ADMIN_API_SECRET=replace_with_a_local_admin_secret
SERPAPI_API_KEY=your_serpapi_key_for_server_side_search_enrichment
```

Run the SQL migration in `supabase/migrations` before using the auth/profile endpoints.
This phase only wires registration/login, first-login role selection, and Player /
Organisation profile CRUD. Matchmaking, games, venues, exercise/tutorial logic, CV service,
and weather are handled separately.

The next migration, `202609220002_matchmaking_games.sql`, adds transparent player
matchmaking actions, friend connections, game capacity/fill-count support, and database
capacity enforcement. The corresponding API routes cover:

- `GET /api/matchmaking/candidates?sport=...`
- `POST /api/matchmaking/candidates/:candidateId/action`
- `GET /api/friends`, `POST /api/friends/request`, `POST /api/friends/:id/accept`, `DELETE /api/friends/:id`
- `GET /api/games`, `POST /api/games`, `POST /api/games/:id/join`, `GET /api/games/:id`
- `POST /api/games/:id/balance`

`202609220003_venues_bookings_payments.sql` adds venue registration/discovery, bookings,
sandbox payment verification, and booking expense shares. `202609220004_razorpay_idempotency.sql`
adds Razorpay test-mode order metadata and the unique booking-scoped payment idempotency key.
`202609220008_cross_cutting_hardening.sql` adds booking idempotency keys and audit logs.
The corresponding routes cover:

- `GET /api/org/venues`, `POST /api/org/venues`, `PATCH /api/org/venues/:id`, `PATCH /api/org/venues/:id/availability`
- `GET /api/venues`
- `POST /api/bookings`, `PATCH /api/bookings/:id/cancel`
- `POST /api/bookings/:id/payment-order`
- `POST /api/payments/razorpay/verify`
- `GET /api/org/bookings`
- `GET /api/bookings/:id/expense-shares`, `POST /api/bookings/:id/expense-shares`, `PATCH /api/bookings/:id/expense-shares/:playerId`

Booking confirmation is intentionally server-side only: the frontend can request/retry a
Razorpay test order for a pending booking, but `/api/payments/razorpay/verify` checks the
server-created order, expected amount, and Razorpay signature before changing a booking
from `pending` to `confirmed`. Booking creation uses either the request `Idempotency-Key`
header or a stable server-derived key for the same player/venue/slot/start time. The payment
idempotency key is `booking:<booking_id>`, so retrying the payment-order request does not
create duplicate payment rows or duplicate Razorpay orders. Payment state changes are written
to `audit_logs`. If Razorpay is unavailable or test keys are missing, the route returns a
pending/unpaid booking state instead of confirming or failing the booking ambiguously.

`202609220005_activity_streak_service.sql` scopes Activity Event source uniqueness per
player, allowing a single match result to produce one event per participant while still
keeping each player's source event idempotent. The streak service routes cover:

- `POST /api/activity-events`
- `GET /api/streaks/month?year=2026&month=9`

Activity Events are the only write path for streak changes. Non-qualifying completions are
discarded without an event. Qualifying completions are stored with the player's timezone-local
calendar date, then the service applies the single daily increment rule and updates
`streak_records` without ever decreasing `longest_streak`. Activity Event writes are
idempotent per player/source type/source id, so retried Exercise/Tutorial/Match completion
events reuse the existing event.

`202609220006_exercise_rule_engine.sql` adds Exercise Mode persistence fields and the five
supported exercise catalog entries. The deterministic Exercise Mode routes cover:

- `GET /api/exercises/catalog`
- `POST /api/exercise-sessions/evaluate`
- `GET /api/exercise-sessions/recent`
- `PATCH /api/exercise-sessions/:id/corrections`

Exercise evaluation consumes the frozen `krid.cv.pose.v1` CV contract, stores detected output
separately from user corrections, and creates Activity Events only by calling the unified
streak service when a session is complete with sufficient detection quality.
The CV service remains independently deployable. `POST /api/cv/pose/frames` accepts bounded
JPEG batches from authenticated players, sends them to `CV_SERVICE_URL` with the private key,
and returns the frozen `krid.cv.pose.v1` contract. Exercise/Tutorial evaluation stays in this
API; model inference and camera frame decoding stay in the Python service.

`202609220007_tutorial_rule_engine.sql` adds Tutorial Mode for the pilot Cricket and
Football drills only. Drill checkpoints are stored as config data with camera view, key
joints, thresholds, and completion rules, then evaluated against the same frozen
`krid.cv.pose.v1` contract. Tutorial sessions report completed, weak, and missed checkpoints,
score/coverage, repetition or timing metrics, improvement cues, and same-drill trend deltas.
Completion still passes through the quality gate before creating Activity Events.
User correction patches for Exercise and Tutorial write actor-aware correction flags and
append an `audit_logs` entry with before/after state.

The Tutorial Mode routes cover:

- `GET /api/tutorials/catalog`
- `POST /api/tutorial-sessions/evaluate`
- `GET /api/tutorial-sessions/recent`
- `PATCH /api/tutorial-sessions/:id/corrections`

Alternative Sports Recommendations use a maintained sport taxonomy and weighted attribute
similarity, not an ML ranking model. The response exposes the shared attributes and factor
contributions behind each adjacent-sport suggestion, keeps opportunity signals empty until
search enrichment is wired, and frames results as shared characteristics rather than a
prediction of success.

The recommendation route is:

- `GET /api/recommendations/alternative-sports?primarySport=Cricket&limit=5`

Search enrichment is server-side only and uses predefined templates in
`services/searchEnrichmentService.js`:

- `tutorial_education` for Exercise/Tutorial educational links
- `sports_opportunities` for clubs, academies, and events around adjacent sports

The client never sends arbitrary search text and never receives the SerpAPI key. SerpAPI
results are stored as attributed `web_sources` metadata and shown as source links only.
If `SERPAPI_API_KEY` is missing, quota is exhausted, or the provider is unavailable, Tutorial
Mode and Alternative Sports continue with internal catalog data and empty enrichment.

Weather and location context are also server-side integrations. `services/externalContextService.js`
uses Open-Meteo for geocoding/weather and OSRM for advisory driving estimates. Responses are
cached by location/time and returned with explicit `current`, `stale`, or `unavailable` state.
Weather and travel context are advisory only: booking creation, payment, and cancellation rules
do not depend on these services, and provider outages leave venue discovery/booking usable.

The weather route is:

- `GET /api/weather?location=Bengaluru`
- `GET /api/weather?venueId=<venue_id>`

**Note on models:** this defaults to `llama-3.1-8b-instant`, which has by far the most
generous free-tier limits of any Groq model (30 requests/min, 14,400 requests/day, 500,000
tokens/day as of Aug 2026) — effectively unlimited for a demo chatbot, while still supporting
full tool-calling. Groq periodically deprecates older models — `llama-3.3-70b-versatile` was
retired in June 2026 — so this backend also auto-falls-back to `openai/gpt-oss-120b` then
`openai/gpt-oss-20b` if the configured model ever stops working. If you hit a `model_not_found`
error anyway, check https://console.groq.com/docs/models for the current catalog and update
`GROQ_MODEL` in `.env`.

## Connecting the frontend

The frontend chat widget calls `http://localhost:5001` by default (see
`sportsync-frontend/src/lib/aiChat.js`). If you run the backend on a different host/port, set
`VITE_API_URL` in `sportsync-frontend/.env` before starting the frontend dev server:

```
VITE_API_URL=http://localhost:5001
```

## Trying it out

With both servers running, log into the app and open the chat bubble (bottom-right). Try:

- "What are the rules of a badminton doubles match?" — general sports knowledge
- "Plan a football match tomorrow at 6 PM near Indiranagar" — prepares a match proposal using matchmaking and venue ranking
- Confirm the proposal card in the UI — creates the match only after explicit confirmation; it does not book the venue or process payment
- "Any scholarships for badminton players?" — answers from the funding data
- "Any coaching opportunities for badminton players?" — answers from the career data
- "Are there any football sponsorships I qualify for?" — answers from the sponsorship data

## Security note

The API key here is only ever used server-side (never sent to the browser). Keep `.env` out
of version control — it's already listed in `.gitignore`.
