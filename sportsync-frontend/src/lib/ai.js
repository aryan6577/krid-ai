// Transparent weighted-scoring "AI" logic for the prototype, matching SRS §7.
// Real system would swap these for a learned model; the interface/shape stays the same.

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

const SKILL_ORDER = ["Beginner", "Intermediate", "Advanced"];

// SRS §7.1 — Matchmaking factor weights
export const MATCH_WEIGHTS = {
  sport: 0.25,
  skill: 0.25,
  availability: 0.2,
  location: 0.15,
  competitive: 0.1,
  form: 0.05,
};

export function compatibilityScore(me, candidate, sport) {
  const reasons = [];

  // Sport compatibility
  const sportMatch = candidate.sports.includes(sport) ? 1 : 0;
  if (sportMatch) reasons.push(`Both play ${sport}`);

  // Skill compatibility — closer skill tiers score higher
  const mySkillIdx = SKILL_ORDER.indexOf(me.skill?.[sport] ?? "Intermediate");
  const theirSkillIdx = SKILL_ORDER.indexOf(candidate.skill?.[sport] ?? "Intermediate");
  const skillGap = Math.abs(mySkillIdx - theirSkillIdx);
  const skillScore = Math.max(0, 1 - skillGap / 2);
  if (skillGap === 0) reasons.push(`Same ${sport} skill tier`);
  else if (skillGap === 1) reasons.push("Adjacent skill level — competitive game likely");

  // Availability overlap
  const overlap = candidate.availability.filter((a) => me.availability.includes(a));
  const availScore = overlap.length > 0 ? Math.min(1, overlap.length / 2) : 0;
  if (overlap.length > 0) reasons.push(`Free during ${overlap[0]}`);

  // Location / travel distance
  const km = distanceKm(me, candidate);
  const locationScore = Math.max(0, 1 - km / 15);
  if (km <= 3) reasons.push("Very close by (under 3 km)");
  else if (km <= 8) reasons.push(`${km.toFixed(1)} km away`);

  // Competitive preference match
  const compMatch = candidate.competitivePreference === me.competitivePreference ? 1 : 0.5;
  if (compMatch === 1) reasons.push(`Prefers ${candidate.competitivePreference.toLowerCase()} play, like you`);

  // Recent performance / consistency
  const formScore = candidate.recentForm ?? 0.5;

  const total =
    sportMatch * MATCH_WEIGHTS.sport +
    skillScore * MATCH_WEIGHTS.skill +
    availScore * MATCH_WEIGHTS.availability +
    locationScore * MATCH_WEIGHTS.location +
    compMatch * MATCH_WEIGHTS.competitive +
    formScore * MATCH_WEIGHTS.form;

  return {
    score: Math.round(total * 100),
    reasons: reasons.slice(0, 3),
    distanceKm: km,
  };
}

export function rankCandidates(me, candidates, sport) {
  return candidates
    .filter((c) => c.sports.includes(sport))
    .map((c) => ({ player: c, ...compatibilityScore(me, c, sport) }))
    .sort((a, b) => b.score - a.score);
}

// SRS §7.2 — AI Team Balancing: greedy snake-draft by rating to minimise strength gap
export function balanceTeams(participants) {
  const sorted = [...participants].sort((a, b) => b.rating - a.rating);
  const teamA = [];
  const teamB = [];
  let sumA = 0;
  let sumB = 0;
  sorted.forEach((p) => {
    if (sumA <= sumB) {
      teamA.push(p);
      sumA += p.rating;
    } else {
      teamB.push(p);
      sumB += p.rating;
    }
  });
  const maxSum = Math.max(sumA, sumB, 1);
  const balanceScore = Math.round((1 - Math.abs(sumA - sumB) / maxSum) * 100);
  return { teamA, teamB, sumA, sumB, balanceScore };
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

// FR-24 — Streak calculation from qualifying activity dates (consecutive days)
export function computeStreak(dates) {
  if (!dates.length) return { current: 0, longest: 0 };
  const sorted = [...new Set(dates)].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diffDays = Math.round((cur - prev) / 86400000);
    run = diffDays === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { current: run, longest };
}
