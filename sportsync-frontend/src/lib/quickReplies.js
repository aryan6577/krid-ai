// Produces a small set of ready-made, single-shot messages the user can tap instead of
// typing. Falls back to a general starter set; switches to a targeted set when the
// assistant's last reply is clearly asking for a venue, a date/time, or who to message —
// so the whole booking flow can be done in taps.

const DEFAULT_TIME = "6:00 PM";

function pickVenues(venues, sports) {
  const preferred = venues.filter((v) => sports?.includes(v.sport));
  const pool = preferred.length ? preferred : venues;
  return pool.slice(0, 3);
}

export function getQuickReplies({ lastBotText = "", role, currentPlayer, venues = [], friendPlayers = [], funding = [], career = [], sponsorships = [] }) {
  if (role === "organisation") {
    return [
      "What career opportunities have I posted?",
      "Show players available for sponsorship",
      "Any funding campaigns I should know about?",
      "What are the FIFA laws for offside?",
    ];
  }

  const sport = currentPlayer?.sports?.[0] || "Football";
  const text = lastBotText.toLowerCase();
  const topVenues = pickVenues(venues, currentPlayer?.sports);
  const acceptedFriends = friendPlayers.filter((f) => f.status === "accepted" && f.player).slice(0, 2);

  const asksVenue = /(which|what).{0,15}(venue|turf|court)/.test(text) || (text.includes("venue") && text.includes("book"));
  const asksDateTime = /(what|which).{0,10}(date|time)|when would you like|what time/.test(text);
  const asksWhoToMessage = /(who|which friends).{0,20}(message|notify|tell)/.test(text) || (text.includes("friend") && text.includes("message") && text.includes("?"));

  if (asksVenue && topVenues.length) {
    return topVenues.map((v) => `Book ${v.name} today at ${DEFAULT_TIME}`);
  }

  if (asksDateTime) {
    return [`Today at ${DEFAULT_TIME}`, "Tomorrow at 7:00 PM", "This Saturday at 6:30 PM"];
  }

  if (asksWhoToMessage) {
    return [
      "All my friends",
      ...acceptedFriends.map((f) => `Just ${f.player.name}`),
    ];
  }

  // General starter set — grounded in real data so it always maps to a working demo flow.
  const chips = [];
  if (topVenues[0]) chips.push(`Book ${topVenues[0].name} today at ${DEFAULT_TIME}`);
  chips.push(`Tell all my friends to reach at ${DEFAULT_TIME}`);
  if (funding.length) chips.push(`Any scholarships for ${sport} players?`);
  if (career.length) chips.push(`Any career opportunities for ${sport}?`);
  if (sponsorships.length) chips.push(`Any sponsorships for ${sport} players?`);
  chips.push(`What are the basic rules of ${sport}?`);

  return chips.slice(0, 5);
}
