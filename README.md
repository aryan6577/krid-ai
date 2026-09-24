# Krid.ai

### Find your people. Get in the game. Keep getting better.

Krid.ai is a responsive sports platform prototype that connects the parts of an athlete's journey: finding teammates, organising games, discovering places to play, training with camera feedback, tracking progress, and exploring opportunities. Organisations have their own workspace for venues, bookings, fundraising, and recruitment.

**Built with:** React · Vite · Tailwind CSS · Express · Supabase · FastAPI · OpenCV · YOLOv8-Pose

> **Try it first:** Open `/demo` for a public preview of the fictional community. For interactive flows, create a Player account and follow the [judge walkthrough](#judge-walkthrough).

## What you can do

| Journey | Experience |
| --- | --- |
| **Find your team** | See ranked player matches with a compatibility score and reasons based on sport, skill, distance, availability, and connection history. Send and accept friend requests. |
| **Make a game happen** | Create or join games, manage a roster, balance teams by rating, and calculate a simple per-player expense split. |
| **Find a place to play** | Browse venues ranked by fit, inspect weather context, and make a booking. Real venue payments use Razorpay test mode when configured; fictional demo venues save example bookings without reserving time or charging money. |
| **Train with feedback** | Choose an exercise or sport drill, enable the camera, and see detected joints, movement cues, live progress, and a saved evaluation. |
| **See your progress** | Review recent sessions, performance views, and a timezone-aware activity streak that counts at most one qualifying day per local date. |
| **Discover your next step** | Explore scholarships, grants, sponsorship examples, and career roles. Ranking shows the factors behind a match; published organisation roles support verified-email applications. |
| **Run a sports organisation** | Manage venues and availability, review bookings, publish career opportunities, and explore fundraising and sponsorship workflows. |

### The experience in one pass

```text
Player onboarding → Matchmaking → Friends → Games → Venues
                                     ↓
                         Camera training → Performance
                                     ↓
                    Scholarships · Sponsorships · Career
```

The main Player navigation is **Home**, **Play**, **Scholarships**, and **Profile**. **Play** brings together matchmaking, games, venues, friends, training, and performance. Organisation accounts have a separate dashboard and management views.

## Why the technical choices matter

- **Explainable recommendations.** Matchmaking, venue, funding, career, and adjacent-sport suggestions use weighted rules or attribute matching and expose reasons. A player can make their own choice; a score is guidance, not a claim of predicted success.
- **Pose detection with accountable results.** The browser sends bounded, resized JPEG frame batches through the Express API to a private Python service. OpenCV and YOLOv8-Pose return 17-keypoint pose data; server-side exercise and drill rules decide the final result. This flow does not save a continuous raw video stream.
- **Activity that earns its streak.** A completed exercise, tutorial, or eligible match can count for a local calendar day. Exercise completion must meet the target and camera-quality rules; limited-quality target detection needs the player's explicit confirmation. Corrections recalculate the streak.
- **Bookings with explicit payment state.** Real venue bookings and Razorpay test orders are verified on the server, with idempotency keys for retries. Missing payment credentials leave a booking pending rather than presenting it as paid.
- **Career applications with email proof.** An applicant verifies a six-digit Supabase email code before applying. PDF or DOCX CVs up to 750 KB are stored privately and returned only to the posting organisation after an account-role check. Email changes invalidate the proof.
- **Optional conversational help.** The Express API can use Groq to answer sports questions and prepare in-app proposals. Creating a proposed match requires the player's confirmation; provider-backed chat is optional.

## Judge walkthrough

These steps use database-backed, **clearly labelled fictional records** so the interactive journey can be tried without waiting for another participant.

1. Open `/demo` to preview the sample community. Create a **Player** account and complete onboarding with Football, Badminton, Tennis, or Basketball.
2. Go to **Play → Matchmaking**. Inspect a compatibility breakdown and accept a demo player for your sport. That teammate appears in **Friends** immediately; connections between real players still require the other person's acceptance.
3. In **Play → Games**, join an example game or create one. Choose a named demo venue, then add an accepted demo teammate to a game you created there.
4. In **Play → Venues**, save an example booking at a demo venue. It appears in your saved choices and does not hold actual venue time or take payment.
5. In **Play → Train**, try an exercise or a Cricket/Football tutorial drill. Grant camera permission when prompted, then inspect the live pose overlay, movement feedback, final result, and **Performance** streak.
6. In **Scholarships**, explore funding and sponsorship examples. To test **Career** end to end, create a separate **Organisation** account, publish a role, and apply from the Player account after configuring email OTP as described below.

The demo catalog contains **24 fictional players, 12 fictional organisations, 12 venues, and 10 example games**. Its migrations add stable `is_demo` and `demo_catalog_id` markers. Demo profiles have no Supabase Auth accounts; demo organisations are not verified, and sample career listings cannot receive applications. The public `/demo` view and non-interactive career examples use the separate sample catalog. The fixture does not create applications, awards, or real performance history.

## Architecture and stack

| Layer | Technologies | Responsibility |
| --- | --- | --- |
| Web app | React 19, Vite, React Router, Tailwind CSS, Recharts | Responsive player and organisation experiences, charts, camera capture, and recommendation explanations |
| API | Node.js, Express | Authenticated workflows, booking/payment rules, exercise evaluation, streaks, career applications, and private service bridge |
| Data and identity | Supabase Auth + Postgres | Accounts, profiles, games, venues, bookings, activity, career records, and demo fixtures |
| Pose service | Python, FastAPI, OpenCV, Ultralytics YOLOv8-Pose | Frame decoding and keypoint inference behind a service key |
| External context | Open-Meteo, OSRM; optional Groq, SerpAPI, Razorpay test mode | Weather/geocoding, advisory travel estimates, chat, attributed search links, and test payments |

```text
Browser (React)
    │ authenticated API requests + sampled camera frames
    ▼
Express API ──────────────► Supabase Auth + Postgres
    │
    ├──► Private FastAPI pose service ──► YOLOv8-Pose keypoints
    └──► Optional external providers
```

The browser never calls the pose service directly. Weather and travel estimates are advisory: provider outages do not block venue discovery or booking. Unavailable measurements are shown as unavailable, and cached weather is labelled stale.

## Run locally

### 1. Configure Supabase and the API

Copy `sportsync-backend/.env.example` to `sportsync-backend/.env`. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for your project. Set `CV_SERVICE_URL=http://127.0.0.1:8001` and choose a `KRID_CV_API_KEY` shared with the pose service. Groq, SerpAPI, and Razorpay test keys are optional for their respective features.

Apply the SQL files in `sportsync-backend/supabase/migrations` **in filename order**. The Career migration is `202609230001_career_flow.sql`; the three demo catalog migrations follow it. Without the Career migration and configured email-code delivery, applications remain unavailable.

### 2. Start the three services

Install dependencies in each service directory. On Windows, run these in **separate PowerShell terminals**:

| Terminal | Directory | Commands |
| --- | --- | --- |
| Pose service | `sportsync-cv-service` | `python -m venv .venv`<br>`./.venv/Scripts/python.exe -m pip install -r requirements.txt`<br>`$env:KRID_CV_API_KEY="same-key-as-backend"`<br>`$env:YOLO_CONFIG_DIR=(Get-Location).Path`<br>`./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001` |
| API | `sportsync-backend` | `npm install`<br>`npm start` |
| Web app | `sportsync-frontend` | `npm install`<br>`npm run dev` |

Open **http://127.0.0.1:5174**. The API runs on port **5001** and the pose service on **8001**. The pose service uses the bundled `yolov8n-pose.pt` weights; `KRID_CV_MODEL_PATH` can point to another local weights file. If the pose service is unavailable, training reports an error instead of inventing an evaluation.

### 3. Enable email-code applications

Configure the Supabase **Magic Link** email template to include `{{ .Token }}` so `/auth/v1/otp` delivers a six-digit code. The player enters that code in Career; the server verifies it with `/auth/v1/verify`, checks that the returned Supabase user matches the logged-in account, and stores proof for that email. Supabase Auth and SMTP limits govern delivery. Email auto-confirmation alone does not establish inbox control.

## Camera and data notes

Camera access requires **localhost or HTTPS** and begins only after **Enable camera**. Sessions run for up to 60 seconds. Capture samples resized JPEG frames at up to 5 fps, sends the first frame immediately, batches later frames, and skips capture if the queue is full. During exercise sessions, the preview shows detected joints, reps or hold time, set progress, joint angle, and a cue. Those live values are estimates from keypoints; the server's quality gate and rule engine save the final evaluation. Tutorial sessions show pose, framing, and checkpoint feedback.

The **Tracking speed details** panel separates capture/JPEG, request, CV round trip, inference, and UI timings. Network latency can make pose feedback trail the camera preview.

The live counter uses the joint-angle and movement-stage approach described in [Nicholas Renotte's gym tracker tutorial](https://www.youtube.com/watch?v=06TE_U21FK4), adapted to the app's [Ultralytics 17-keypoint pose output](https://docs.ultralytics.com/tasks/pose/) and exercise thresholds. Scholarship and opportunity examples include curated or demo entries; applicants should check eligibility and deadlines with the provider.

## Checks

| Service | Command |
| --- | --- |
| Frontend | `npm run build` and `npm run lint` |
| Backend | `npm test` |
| CV service | Install `requirements-dev.txt`, then run `python -m pytest -q` |

See the [frontend](sportsync-frontend/README.md), [backend](sportsync-backend/README.md), and [pose service](sportsync-cv-service/README.md) READMEs for service-level details.

## Deploy on Railway

The root `Dockerfile` builds the React app and serves it from Express on one HTTPS origin. Deploy that Dockerfile as the public service, expose its domain, and use `/api/health` as its health check. Deploy `sportsync-cv-service/Dockerfile` as a **private** service on port 8001 with `/healthz` as its health check. The CV image includes local pose weights.

Set `PORT=5001`, the Supabase variables, and `KRID_CV_API_KEY` on the public service. Add `GROQ_API_KEY` for chat and Razorpay **test** keys only if using those flows. Set `CV_SERVICE_URL` to `http://${{<cv-service-name>.RAILWAY_PRIVATE_DOMAIN}}:8001`, replacing the placeholder with your Railway service name. Set the same `KRID_CV_API_KEY` on the private CV service and `KRID_CV_REQUIRE_HTTPS=false` for Railway's private network.

Apply the SQL migrations and configure the Supabase email template before testing Career. Keep secrets in Railway variables; `.env` files are excluded from Git and Docker builds. The deployment needs live Supabase and CV services for login and camera evaluation.

---

**Krid.ai:** one place to find a game, build a team, train with feedback, and take the next step in sport.
