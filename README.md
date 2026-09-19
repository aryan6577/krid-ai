# Krid.ai

Two folders:

- **`sportsync-frontend/`** — the React (Vite) app.
- **`sportsync-backend/`** — a tiny Express server that powers the chat-assistant bubble,
  proxying to Groq's free LLM API (with function/tool calling) so the assistant can actually
  *do things* — not just answer questions.

## Quick start

**1. Backend** (in one terminal):

```bash
cd sportsync-backend
npm install
npm start
```

Runs on `http://localhost:5001`. A working Groq API key is already included in `.env` for
this demo — see `sportsync-backend/README.md` for details and how to swap in your own.

**2. Frontend** (in another terminal):

```bash
cd sportsync-frontend
npm install
npm run dev
```

Runs on `http://localhost:5174` (or whatever Vite reports). Log in and click the chat bubble
in the bottom-right corner of any page inside the app.

## What the assistant can do

The chat bubble is available on every page after login. It can:

- Answer general sports questions (rules, tips, tournaments) from its own knowledge.
- **Book a venue** — "Book Greenfield Turf 1 for tomorrow at 6 PM."
- **Join a game** — "Join the badminton game at SmashCourt tomorrow."
- **Message your friends** — "Tell all my friends to reach the turf at 6."
- **Answer questions about funding/scholarships, career opportunities, and sponsorships**
  using the same demo data shown on those pages.
- **Apply / raise requests** for funding, career opportunities, and sponsorships — e.g. "Apply
  me to the SmashCourt coaching assistant role" or "Raise a new sponsorship request for Puma."

All actions run against the app's existing in-memory demo data (same as clicking the buttons
in the UI) — nothing is sent to a real payment processor or messaging service.

If the backend isn't running or unreachable, the widget quietly falls back to a small set of
canned offline replies so it never feels fully broken.
