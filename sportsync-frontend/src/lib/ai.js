// Transparent weighted-scoring helpers for prototype modules that are still mock/local.

const R_EARTH_KM = 6371;

export function distanceKm(a, b) {
  if (!a || !b) return 8; // fallback assumed distance
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R_EARTH_KM * 2 * Math.asin(Math.sqrt(h));
}

// SRS §7.3 — AI Venue Recommendation
export function rankVenues(player, venueList, { sport, budget } = {}) {
  return venueList
    .filter((v) => (sport ? v.sport === sport : true))
    .map((v) => {
      const km = distanceKm(player, v);
      const travelMins = Math.round(km * 3.2 + 4);
      const distanceScore = Math.max(0, 1 - km / 15);
      const costScore = budget ? Math.max(0, 1 - v.pricePerHour / (budget * 1.5)) : 0.6;
      const availabilityScore = v.availability.some((a) => player.availability.includes(a)) ? 1 : 0.3;
      const sportScore = sport ? (v.sport === sport ? 1 : 0) : 0.7;
      const ratingScore = v.rating / 5;

      const total =
        distanceScore * 0.3 +
        costScore * 0.2 +
        availabilityScore * 0.25 +
        sportScore * 0.15 +
        ratingScore * 0.1;

      const reasons = [];
      if (km <= 5) reasons.push(`${km.toFixed(1)} km away, ~${travelMins} min travel`);
      if (availabilityScore === 1) reasons.push("Matches your usual availability");
      if (v.rating >= 4.5) reasons.push(`Highly rated (${v.rating}★)`);
      if (budget && v.pricePerHour <= budget) reasons.push(`Within your ₹${budget}/hr budget`);

      return { venue: v, score: Math.round(total * 100), travelMins, distanceKm: km, reasons: reasons.slice(0, 3) };
    })
    .sort((a, b) => b.score - a.score);
}

// SRS §7.4 — AI Fund Matching: simple keyword/tag overlap scoring
export function rankFundingOpportunities(requestTags, opportunities) {
  return opportunities
    .map((o) => {
      const overlap = o.tags.filter((t) => requestTags.includes(t));
      const score = Math.round((overlap.length / Math.max(o.tags.length, 1)) * 100);
      return { opportunity: o, score, matchedTags: overlap };
    })
    .sort((a, b) => b.score - a.score);
}

// AI Career Matching — scores career opportunities against a player's sport(s) and rating,
// mirroring the transparent weighted-scoring style used for funding/venue matching above.
export function rankCareerOpportunities(player, opportunities) {
  return opportunities
    .map((o) => {
      const sportMatch = o.sport === "Any" || player.sports.includes(o.sport) ? 1 : 0;
      const ratingGap = player.rating - o.minRating;
      const ratingScore = ratingGap >= 0 ? Math.min(1, 0.65 + ratingGap / 500) : Math.max(0, 0.5 + ratingGap / 400);
      const eligible = sportMatch === 1 && player.rating >= o.minRating;
      const total = sportMatch * 0.5 + ratingScore * 0.5;

      const reasons = [];
      if (sportMatch) reasons.push(o.sport === "Any" ? "Open to all sports" : `You play ${o.sport}`);
      if (player.rating >= o.minRating) reasons.push(`Rating ${player.rating} meets the ${o.minRating}+ requirement`);
      else reasons.push(`${o.minRating - player.rating} rating points short of the requirement`);

      return { opportunity: o, score: Math.round(total * 100), eligible, reasons: reasons.slice(0, 2) };
    })
    .sort((a, b) => b.score - a.score);
}

// AI Sponsorship Matching — same shape as career matching, applied to brand sponsorship deals.
export function rankSponsorshipDeals(player, deals) {
  return rankCareerOpportunities(player, deals);
}
