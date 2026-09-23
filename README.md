# Krid.ai

Krid.ai is a responsive sports prototype with a React app, Express API, Supabase data, and a Python YOLOv8-Pose service. Player navigation is organised around **Home**, **Play**, **Scholarships**, and **Profile**. Play contains games, matchmaking, venues, friends, training, and performance.

## Local setup

1. Configure `sportsync-backend/.env` from `.env.example` with your own Supabase and optional provider keys. Apply the SQL migrations in `sportsync-backend/supabase/migrations` to your Supabase project.
2. Install Python dependencies from `sportsync-cv-service/requirements.txt`. Set the same `KRID_CV_API_KEY` in the CV service environment and backend `.env`. Start the CV service with `uvicorn app.main:app --host 127.0.0.1 --port 8001` from `sportsync-cv-service`.
3. Start the API from `sportsync-backend` with `npm install` and `npm start` (port 5001).
4. Start the web app from `sportsync-frontend` with `npm install` and `npm run dev` (port 5174).

### Career migration and email proof

Apply `sportsync-backend/supabase/migrations/202609230001_career_flow.sql` after the earlier migrations. It adds published organisation roles, player and organisation Markdown articles, private CV applications, and email-code proofs. The API stores CVs up to 750 KB as private database text and only returns them to the posting organisation after checking its account role. Existing player and organisation records are unchanged.

The configured Supabase project currently has email auto-confirmation enabled. That flag alone is not proof that an inbox is controlled by the applicant. Configure the Supabase **Magic Link** email template to include `{{ .Token }}` so `/auth/v1/otp` sends a six-digit code; a player enters that code on Career. The server verifies it with `/auth/v1/verify`, checks the returned Supabase user matches the logged-in account, then stores a proof tied to that email. Changing the account email invalidates the proof. Email delivery depends on Supabase Auth and its SMTP limits. Until the template and migration are configured, career applications remain unavailable rather than claiming verification.

### Fictional demo catalog

Apply `sportsync-backend/supabase/migrations/202609230002_demo_catalog.sql`, `202609230003_demo_catalog_alignment.sql`, and `202609230004_interactive_demo_records.sql` after the Career migration. They seed 24 fictional player profiles, 12 fictional organisations, 12 venues, and 10 example games. The final migration copies interactive examples into the primary `players`, `organisations`, `venues`, `games`, and `game_participants` tables with `is_demo` and stable `demo_catalog_id` markers; existing records keep `is_demo=false`. It does not create Supabase Auth users, applications, activity, awards, or verified organisations. The separate catalog remains the source for the public `/demo` preview and non-interactive career examples.

### Judge walkthrough with persisted demo records

Create a Player account and complete onboarding with Football, Badminton, Tennis, or Basketball. In **Play → Matchmaking**, accept a clearly labelled demo player for the chosen sport. The accepted demo teammate appears in **Play → Friends** immediately; real player connections still require the other player to accept. In **Play → Games**, join a labelled example game or create a new game and choose a named demo venue from the database. On a game you created at a demo venue, add an accepted demo teammate from the game detail page. In **Play → Venues**, choose a demo venue and save an example booking; it appears under your saved choices. A demo booking does not hold actual venue time or take payment. Real venues retain the existing payment flow. Sample organisations and opportunity examples have no login credentials, and sample career listings cannot accept applications.

To update the fixture, edit `sportsync-backend/scripts/buildDemoCatalog.mjs`, run it with Node, then add an additive migration for deployed databases. Keep demo records flagged and avoid using them as evidence of real player performance or venue availability.

On Windows, run these commands in separate PowerShell terminals after installing dependencies:


| Directory | Command |
| --- | --- |
| `sportsync-cv-service` | `$env:YOLO_CONFIG_DIR=(Get-Location).Path; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001` |
| `sportsync-backend` | `npm start` |
| `sportsync-frontend` | `npm run dev` |

Open `http://127.0.0.1:5174`. Use a Player account to see the Home, Play, Scholarships and Profile tabs. To test Career end to end, create an Organisation account, publish a role, then use a different Player account with a configured email OTP to save an article and apply with a PDF or DOCX CV. No real submission was made during this audit.

Camera access requires HTTPS or localhost. The browser asks permission only when the player chooses **Enable camera**. A session lasts up to 60 seconds and samples resized JPEG frames at 5 fps. The authenticated API forwards small batches to the private OpenCV/YOLO pose service. During exercise sessions, the preview draws detected joints and shows live reps, set progress, joint angle or plank hold time, and a movement cue. These are live estimates from the returned keypoints; the existing server rule engine computes and saves the final result when the session ends. Tutorial sessions continue to show pose and framing feedback. Raw continuous video is not saved by this flow.

The first YOLO run may need to download the configured pose weights. For offline deployments, set `KRID_CV_MODEL_PATH` to a local weights file. If the CV service is unavailable, training shows an error and does not invent an evaluation.

The live counter follows the joint-angle and movement-stage approach in [Nicholas Renotte's MediaPipe gym tracker tutorial](https://www.youtube.com/watch?v=06TE_U21FK4). It uses the app's existing [Ultralytics 17-keypoint pose output](https://docs.ultralytics.com/tasks/pose/) and exercise thresholds, so no second pose model is needed in the browser.

## Checks

- Frontend: `npm run build` and `npm run lint`
- Backend: `npm test`
- CV service: install `sportsync-cv-service/requirements-dev.txt`, then run `python -m pytest -q`

See each service's README for details. Scholarship and opportunity data in this prototype includes curated/demo entries; users should verify eligibility and deadlines with each provider.

## Deployment (Railway)

The root `Dockerfile` builds the React app and serves it from the Express API on one HTTPS origin. Create a Railway service from the repository root for this Dockerfile, expose its service domain, and set health check `/api/health`. Create a second service from `sportsync-cv-service` using its Dockerfile; keep this service private, listening on port 8001, with health check `/healthz`. The CV image includes the pinned local YOLO pose weights. The public service passes frame batches to the private service; the browser never calls the CV service directly.

On the public service, set `PORT=5001`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` if chat is desired, optional Razorpay test keys, and `KRID_CV_API_KEY`. Set `CV_SERVICE_URL` to `http://${{<cv-service-name>.RAILWAY_PRIVATE_DOMAIN}}:8001`, replacing the service name with the actual Railway service name. On the CV service, set the same `KRID_CV_API_KEY` and `KRID_CV_REQUIRE_HTTPS=false` because the service is reachable only over Railway's private network. Keep all secrets in Railway variables; `.env` files are excluded from Git and Docker builds.

Apply the SQL migrations, including the Career migration, to Supabase before trying account and Career flows. Configure the email OTP template as described above. A live deployment needs real Supabase and CV variables; a static-only publish would leave login and camera evaluation broken.
