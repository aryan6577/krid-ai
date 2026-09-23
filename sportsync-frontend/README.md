# Krid.ai — Frontend Prototype

Frontend-only implementation of the Krid.ai hackathon SRS (React + Vite + Tailwind CSS v4 + React Router).

This is UI + client-side logic only — no backend/API calls. All data (players, venues, games, funding, etc.)
is mock/seed data held in React state, matching the SRS's assumption that the prototype may use synthetic data.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. Build for production with `npm run build` (output in `dist/`).

## What's implemented

- **Auth & onboarding** — role selection (Player / Organisation), registration, login, profile setup (FR-01–07)
- **Player**
  - Tinder-style AI matchmaking with a transparent weighted compatibility score (FR-08, §7.1)
  - Friends: send / accept / decline / remove (FR-09)
  - Games: create, join, view roster (FR-10, FR-11)
  - AI team balancing by rating with a balance score (FR-12, §7.2)
  - Venue discovery with AI ranking by distance/cost/availability + sandboxed "Razorpay" payment flow (FR-15–18)
  - Expense splitting per game (FR-19, BR-09)
  - Match result & performance entry, rating history chart, streak dashboard (FR-20–24)
- **Organisation**
  - Venue/turf registration & availability management (FR-13, FR-14)
  - Bookings & payments table (FR-17, FR-18, BR-08)
  - Fundraising campaign creation (FR-25, BR-12)
- **Shared**
  - AI fund-matching search against a curated demo dataset (FR-26, FR-27)
  - Sports calendar (FR-28)
  - Notifications dropdown (FR-29)

AI logic lives in `src/lib/ai.js` as transparent, explainable weighted-scoring functions (per §7.5 Explainability
and BR-15 — users can always reject a recommendation and choose manually).

## Design

Palette and type system are defined as CSS variables in `src/index.css` (`@theme`): turf green / court-clay
orange / chalk paper background, "Anton" display type for headlines, "Work Sans" for body copy, and "IBM Plex
Mono" for scoreboard-style stats — grounded in the sports/turf subject matter rather than a generic template.

## Not included (by design)

No real backend, database, authentication, or payment gateway integration — those are backend/API
responsibilities outside this frontend deliverable. Razorpay is simulated with a sandbox-labelled mock flow only.
