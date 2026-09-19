import express from "express";
import cors from "cors";
import "dotenv/config";
import { TOOLS } from "./tools.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const PORT = process.env.PORT || 5001;

// If the configured model gets deprecated/renamed by Groq, try these in order before giving up.
const FALLBACK_MODELS = ["llama-3.1-8b-instant", "openai/gpt-oss-120b", "openai/gpt-oss-20b"];

if (!GROQ_API_KEY) {
  console.warn(
    "⚠️  GROQ_API_KEY is not set. Add it to sportsync-backend/.env (see .env.example) and restart the server."
  );
}

function buildSystemPrompt(context = {}) {
  const {
    role,
    player,
    organisation,
    venues = [],
    games = [],
    friends = [],
    funding = [],
    career = [],
    sponsorships = [],
  } = context;

  return `You are "Krid.ai Assistant" — a friendly, concise AI helper built into the Krid.ai sports app (an Indian sports-community platform).

You help the logged-in user with:
- General sports knowledge/questions (rules, fitness tips, tournaments, techniques) — answer directly from your own knowledge.
- Booking a turf/court/venue for them (use the book_venue tool).
- Joining an already-listed open game (use the join_game tool).
- Sending a message to their friends, e.g. "tell everyone to reach the turf at 6" (use the message_friends tool).
- Funding, scholarships and grants — answer using the funding opportunities data below, and use apply_funding /
  submit_fund_request to act when asked.
- Career opportunities (trials, coaching roles, scouting programmes) — answer using the career data below, and use
  apply_career / submit_career_request to act when asked.
- Sponsorships — answer using the sponsorships data below, and use request_sponsorship / submit_sponsorship_request
  to act when asked.

Current session:
- Role: ${role || "unknown"}
${player ? `- Player: ${JSON.stringify(player)}` : ""}
${organisation ? `- Organisation: ${JSON.stringify(organisation)}` : ""}

Venues available:
${JSON.stringify(venues)}

Open games:
${JSON.stringify(games)}

Accepted friends:
${JSON.stringify(friends)}

Funding / scholarship opportunities:
${JSON.stringify(funding)}

Career opportunities:
${JSON.stringify(career)}

Sponsorship deals:
${JSON.stringify(sponsorships)}

Rules:
- Keep replies short (2-5 sentences), warm and specific — reference real names, ids, dates or numbers from the data
  above whenever relevant, instead of generic filler.
- Only call a tool when the user clearly wants an ACTION performed (booking, joining, messaging, applying, or
  submitting a request). For pure informational questions, just answer directly in text using the data provided.
- Never invent venues, games, friends, funding, career or sponsorship entries that are not in the lists above — if
  something isn't listed, say so honestly and suggest the closest real alternative.
- After a tool result comes back, confirm in plain, friendly language what actually happened.
- Everything here is a simulated hackathon prototype — you can mention that if it's relevant, but don't dwell on it.`;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, model: GROQ_MODEL, keyConfigured: Boolean(GROQ_API_KEY) });
});

async function callGroq(model, systemMessage, messages) {
  const groqRes = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [systemMessage, ...messages],
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0.4,
      max_tokens: 700,
    }),
  });

  const rawBody = await groqRes.text();
  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 502, error: "non_json_response", rawBody };
  }

  if (!groqRes.ok) {
    return { ok: false, status: groqRes.status, error: data?.error?.code || "request_failed", data };
  }

  return { ok: true, data };
}

app.post("/api/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error: "Server is missing GROQ_API_KEY. Add it to sportsync-backend/.env and restart the server.",
      });
    }

    const { messages = [], context = {} } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "`messages` must be an array." });
    }

    const systemMessage = { role: "system", content: buildSystemPrompt(context) };

    // Try the configured model first; if it's been deprecated/renamed (model_not_found),
    // fall through to the next candidate so a Groq-side change doesn't fully break the demo.
    const candidates = [GROQ_MODEL, ...FALLBACK_MODELS.filter((m) => m !== GROQ_MODEL)];
    let result;
    for (const model of candidates) {
      result = await callGroq(model, systemMessage, messages);
      if (result.ok || result.error !== "model_not_found") break;
      console.warn(`Model "${model}" unavailable (model_not_found) — trying next fallback…`);
    }

    if (!result.ok) {
      if (result.error === "non_json_response") {
        console.error("Groq API returned a non-JSON response:", result.rawBody.slice(0, 500));
        return res.status(502).json({
          error: "Couldn't reach the Groq API (got a non-JSON response — check network access to api.groq.com).",
        });
      }
      console.error("Groq API error:", result.data);
      return res.status(result.status).json({ error: result.data?.error?.message || "Groq API request failed." });
    }

    const message = result.data.choices?.[0]?.message;
    if (!message) {
      return res.status(502).json({ error: "Groq API returned an unexpected response." });
    }

    res.json({ message });
  } catch (err) {
    console.error("Unexpected /api/chat error:", err);
    res.status(500).json({ error: "Unexpected server error while contacting the AI service." });
  }
});

app.listen(PORT, () => {
  console.log(`Krid.ai backend listening on http://localhost:${PORT} (also try http://127.0.0.1:${PORT})`);
  console.log(`Using Groq model: ${GROQ_MODEL}`);
  console.log(`Health check: http://127.0.0.1:${PORT}/api/health`);
});
