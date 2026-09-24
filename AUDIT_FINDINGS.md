# Krid.ai audit findings — 23 September 2026

Reference: `C:\Users\durla\Downloads\Krid_ai_SRS_v2_0_Revised.pdf` (23 pages), especially FR-24, FR-48–53, FR-63–70, FR-86–90, NFR-11/12/18/19, BR-20/21 and AC-10/19/28/31. The user's current direction takes precedence.

## Confirmed defects

| Severity | Evidence | User impact | Fix |
| --- | --- | --- | --- |
| High | `AppContext.jsx` keeps career posts, applications and profile in component state; both Career screens claim submission/live status immediately. | Data disappears on reload and another account cannot see it; status is misleading. | Add role-scoped API and database records; distinguish demo listings. |
| High | `player/Career.jsx` accepts an arbitrary typed contact email and has no CV; `org/Career.jsx` invents `@krid.demo` addresses. | Organisations cannot receive a credible application or establish contact ownership. | Use the authenticated Supabase email-confirmation state; accept validated private CV upload and a substantive article. Never display invented contact addresses. |
| High | `player/Dashboard.jsx` falls back to `currentPlayer.streak` (seeded as 6); `Performance.jsx` always renders seeded wins and trend as personal history. | New users see fabricated completed activity. | Drive personal streak and history from persisted records; label sample data separately. |
| High | `/api/activity-events` accepts client supplied `qualifies`, source IDs and time; `getOrCreateStreakRecord` initializes from a player counter; timezone can be chosen per request. | A caller can forge qualifying activity or move its local day; streak and event can disagree. | Require real owned completed source records, use configured timezone, derive streak from events. |
| Medium | Weather is rendered only down the Venues page; dashboard omits it. Player/venue weather sends location labels that may be imprecisely geocoded. | Mobile players miss conditions and can get weather for the wrong district. | Show home widget with loading/unavailable state and use saved coordinates when available. |
| Medium | Camera captures JPEG every 200 ms and batches three frames, so the first cue waits for capture plus an entire inference batch. CV processes the batch frame by frame without stage timings. | Feedback feels stalled and bottlenecks are opaque. | Instrument client/server stages, reduce first batch latency, retain backpressure and quality thresholds; compare quality before changing resolution. |

## Opportunities

- Seed pools cover a few sports and locations, but several sample dates have passed. Add clearly marked sample opportunities and useful empty states without making them personal records.
- Form fields rely heavily on placeholders. Add explicit labels, field constraints and status regions.
- Camera service can warm the model and report inference timing. Its process currently lacks a measured baseline, so quality or model settings should not be loosened speculatively.

## Assumptions and limits

- The configured Supabase project reports `mailer_autoconfirm: true` (read-only Auth settings check). Its `email_confirmed_at` field therefore cannot prove inbox ownership. Career applications now require a separate one-time email code check tied to the authenticated account. The Supabase email template must include `{{ .Token }}` to deliver a code, and this setting still needs deployment verification.
- Career CVs are private application documents, not public profile assets. The migration was applied to the linked Supabase project on 2026-09-23.
- Seeded entries are fictional examples, not verified real organisations, eligibility or awards.

## Implemented in this pass

- Career: role-scoped Supabase migration and API, organisation post fields and optional Markdown article, player article, private PDF/DOCX CV application (750 KB maximum), authenticated one-time email-code proof, applicant list/CV download for the posting organisation, and honest sample labels. Organisation verification is administrator controlled.
- Player: additional sample players, venues, opportunities and future example games; example games are non-joinable. Funding and sponsorship entries now identify sample content, and local interests/requests no longer claim to be applications under review. Home weather has loading, location, condition and play guidance. Personal streaks are derived from qualifying events; sample match history is explicitly labeled.
- Streak: direct client-created qualifying events are rejected, multiple events on the same date count once, configured local timezone is used, corrected incomplete sessions remove their event, and current/longest are recalculated from actual event dates. The home screen shows what counted today and a supported action to qualify.
- Camera: startup model warmup, immediate first-frame analysis, a six-frame waiting limit, frame skipping under load, and timing diagnostics across capture, JPEG encode/decode, network/CV round trip, pose processing and UI frame. Existing model, 320-pixel frame width, quality thresholds and rule engine remain intact.

## Verification and remaining limitations

- Frontend production build passed; focused lint passed. Full lint has pre-existing warnings in unrelated components and React compiler warnings around camera callback timing. Backend: 24 tests passed. CV: seven test functions passed through direct execution because `pytest` is absent from the existing virtual environment. A warmed local blank-frame request returned `insufficient_quality` in 46 ms end to end (37.4 ms pose/quality, 0.4 ms JPEG decode). Cold model prediction was approximately 2609 ms; warmed prediction approximately 77 ms on the same blank 320×240 input. These timings do not measure live person tracking accuracy.
- Browser: 390px mobile and 1280px desktop landing/login layouts inspected. Login inputs were labeled and rechecked in the accessibility tree. No authenticated player/organisation browser flow or physical browser camera session was verified: this environment has no detected camera, no test account credentials, and the configured remote Supabase endpoint is inaccessible under the normal network sandbox.
- The new SQL migration was applied to the linked remote Supabase project and confirmed in its migration list on 2026-09-23. Its Magic Link email template must include `{{ .Token }}` for the six-digit OTP flow; current `mailer_autoconfirm` is true, so its confirmation flag is deliberately not accepted as inbox proof. Supabase documents this OTP template requirement: https://supabase.com/docs/guides/auth/auth-email-passwordless
- A match-result acceptance write route is not present in this codebase, so match results cannot yet qualify through the UI. Session activity and corrections do qualify. Simultaneous independent activity writes still depend on database uniqueness and are not wrapped in a single database transaction for streak-record updates; the next streak read reconciles from authoritative events.
- The current Markdown subset supports headings, bold text, bullet lines and HTTPS links. There is no moderation queue, collaborative editor, CV malware scan, or delivery notification in this prototype.
