# Krid.ai — backend

A tiny Express server that powers the chat assistant bubble in the Krid.ai frontend.
It proxies chat requests to [Groq](https://groq.com)'s free, fast LLM API (OpenAI-compatible,
with function/tool calling) — no paid API needed.

## What it does

- `POST /api/chat` — takes the conversation so far (`messages`) plus a snapshot of the
  logged-in user's app data (`context`: venues, open games, friends, funding/career/
  sponsorship opportunities), calls Groq with that as a system prompt, and returns the
  model's reply. If the model wants to take an action (book a venue, join a game, message
  friends, apply to funding/career/sponsorship, or raise a new request), it comes back as a
  `tool_calls` entry on the message — the **frontend** executes that action against its own
  local demo data and reports the result back for a final natural-language confirmation.
- `GET /api/health` — quick check that the server is up and an API key is configured.

Nothing is persisted server-side — this backend is a stateless proxy. All "booking a turf",
"messaging friends", etc. happens against the frontend's existing in-memory demo data, same
as clicking the buttons in the UI would.

## Setup

```bash
cd sportsync-backend
npm install
npm start
```

The server starts on **http://localhost:5001** by default.

A `.env` file is already included with a working Groq API key so it runs out of the box for
this demo. For your own deployment, copy `.env.example` to `.env` and put your own key from
https://console.groq.com/keys — free to sign up, no card required.

```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
PORT=5001
```

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
- "Book Greenfield Turf 1 for tomorrow at 6 PM" — books a venue
- "Tell all my friends to reach the turf at 6" — messages every accepted friend
- "Any scholarships for badminton players?" — answers from the funding data
- "Apply me to the SmashCourt coaching assistant role" — applies to a career opportunity
- "Are there any football sponsorships I qualify for?" — answers from the sponsorship data

## Security note

The API key here is only ever used server-side (never sent to the browser). Keep `.env` out
of version control — it's already listed in `.gitignore`.
