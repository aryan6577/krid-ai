// Lightweight rule-based reply engine for the Krid.ai assistant popup.
// Prototype stands in for a real LLM-backed assistant — the interface (getBotReply)
// is what a wired-up backend/model call would eventually replace.

const RULES = [
  {
    keywords: ["hi", "hello", "hey", "yo"],
    reply: "Hey! I'm the Krid.ai assistant. Ask me about finding players, booking venues, funding, or your streaks.",
  },
  {
    keywords: ["match", "player", "opponent", "find players", "matchmaking", "partner"],
    reply: "Head to Find Players — I rank candidates by sport, skill tier, availability and distance so you get the most compatible match first.",
  },
  {
    keywords: ["game", "join", "play", "team"],
    reply: "You can browse or create games under Games. Once a game fills up, teams are auto-balanced to keep both sides fair.",
  },
  {
    keywords: ["venue", "court", "turf", "book", "ground"],
    reply: "Check the Venues tab — I sort turfs and courts by distance, cost and availability so the top pick usually needs the least travel.",
  },
  {
    keywords: ["fund", "grant", "money", "scholarship", "sponsor"],
    reply: "The Funding page lets you search AI-matched grants by tag, submit a new fund request, or apply directly to already-listed schemes.",
  },
  {
    keywords: ["friend", "social"],
    reply: "On the Friends page you can accept requests, message friends directly, or send new ones from Find Players.",
  },
  {
    keywords: ["streak", "rating", "performance", "stats", "score"],
    reply: "Your Performance page tracks your rating trend, streaks and match history — keep playing to keep the streak alive!",
  },
  {
    keywords: ["profile", "account", "settings"],
    reply: "You can view and update your player profile by clicking your avatar in the top-right corner.",
  },
  {
    keywords: ["thanks", "thank you", "great", "cool"],
    reply: "Anytime! Let me know if there's anything else you want help finding.",
  },
];

const FALLBACK =
  "I can help with matchmaking, venues, funding, friends or your performance stats — try asking about one of those!";

export function getBotReply(userText) {
  const text = userText.toLowerCase();
  const hit = RULES.find((r) => r.keywords.some((k) => text.includes(k)));
  return hit ? hit.reply : FALLBACK;
}

export const botWelcomeMessage =
  "Hi, I'm your Krid.ai assistant. Ask me about matches, venues, funding or your stats!";
