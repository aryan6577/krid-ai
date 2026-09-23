import { SPORT_ATTRIBUTE_WEIGHTS, SPORT_TAXONOMY } from "./alternativeSportsCatalog.js";

const DISCLAIMER =
  "Recommendations identify adjacent sports with shared characteristics. They are not predictions of success, selection, or competitive advancement.";

export function recommendAlternativeSports({ primarySport, player = {}, limit = 5 }) {
  const source = sportByName(primarySport || player.sports?.[0]);
  if (!source) {
    const error = new Error(
      `Unsupported primary sport. Supported taxonomy: ${SPORT_TAXONOMY.map((item) => item.sport).join(", ")}.`
    );
    error.status = 400;
    throw error;
  }

  const knownSports = new Set((player.sports || []).map((sport) => sport.toLowerCase()));
  knownSports.add(source.sport.toLowerCase());
  const profileContext = buildProfileContext(player, source.sport);

  const recommendations = SPORT_TAXONOMY.filter((candidate) => !knownSports.has(candidate.sport.toLowerCase()))
    .map((candidate) => scoreCandidate(source, candidate, profileContext))
    .sort((a, b) => b.score - a.score || a.sport.localeCompare(b.sport))
    .slice(0, Math.min(Math.max(Number(limit) || 5, 3), 5));

  return {
    primarySport: source.sport,
    profileContext,
    recommendations,
    opportunitySignals: [],
    disclaimer: DISCLAIMER,
  };
}

export function sportByName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  return SPORT_TAXONOMY.find((item) => item.sport.toLowerCase() === normalized) || null;
}

function scoreCandidate(source, candidate, profileContext) {
  const contributions = Object.entries(SPORT_ATTRIBUTE_WEIGHTS)
    .map(([key, config]) => {
      const sourceValue = Number(source.attributes[key] || 0);
      const candidateValue = Number(candidate.attributes[key] || 0);
      const shared = Math.min(sourceValue, candidateValue);
      return {
        key,
        label: config.label,
        sourceValue,
        candidateValue,
        contribution: shared * config.weight,
      };
    })
    .filter((item) => item.contribution > 0);

  const numerator = contributions.reduce((sum, item) => sum + item.sourceValue * item.candidateValue * SPORT_ATTRIBUTE_WEIGHTS[item.key].weight, 0);
  const sourceMagnitude = vectorMagnitude(source.attributes);
  const candidateMagnitude = vectorMagnitude(candidate.attributes);
  const baseScore = sourceMagnitude && candidateMagnitude ? numerator / (sourceMagnitude * candidateMagnitude) : 0;
  const preferenceFit = preferenceFitScore(candidate, profileContext);
  const score = Math.round(Math.min(0.99, baseScore * 0.92 + preferenceFit * 0.08) * 100);
  const topAttributes = contributions
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 4)
    .map(({ key, label, sourceValue, candidateValue, contribution }) => ({
      key,
      label,
      sourceValue: round(sourceValue),
      candidateValue: round(candidateValue),
      contribution: round(contribution),
    }));

  return {
    sport: candidate.sport,
    score,
    sharedAttributes: topAttributes.map((item) => item.label),
    similarityFactors: topAttributes,
    preferenceSignals: preferenceSignals(candidate, profileContext),
    opportunitySignals: [],
    rationale: `${candidate.sport} shares ${topAttributes.map((item) => item.label).join(", ")} with ${source.sport}.`,
    framing: "Adjacent sport with shared characteristics, not a talent prediction.",
  };
}

function vectorMagnitude(attributes) {
  const weightedSquares = Object.entries(SPORT_ATTRIBUTE_WEIGHTS).map(([key, config]) => {
    const value = Number(attributes[key] || 0);
    return value * value * config.weight;
  });
  return Math.sqrt(weightedSquares.reduce((sum, value) => sum + value, 0));
}

function buildProfileContext(player, primarySport) {
  const skill = player.skill?.[primarySport] || player.skill?.[String(primarySport).toLowerCase()] || "";
  const preference = player.preferences?.competitivePreference || player.preferences?.style || player.competitivePreference || "";
  return {
    skill: skill || "Unspecified",
    preference: preference || "Unspecified",
    location: player.location?.label || player.location || "",
  };
}

function preferenceFitScore(candidate, profileContext) {
  const preference = String(profileContext.preference || "").toLowerCase();
  if (!preference || preference === "unspecified") return 0.5;
  const tags = new Set(candidate.profileTags || []);
  if (preference.includes("friendly")) {
    return tags.has("individual-or-doubles") || tags.has("indoor") ? 0.75 : 0.55;
  }
  if (preference.includes("competitive")) {
    return tags.has("team") || tags.has("high-running") ? 0.75 : 0.58;
  }
  return 0.5;
}

function preferenceSignals(candidate, profileContext) {
  const signals = [];
  const preference = String(profileContext.preference || "").toLowerCase();
  if (preference.includes("friendly") && candidate.profileTags?.some((tag) => ["individual-or-doubles", "indoor"].includes(tag))) {
    signals.push("fits a lower-friction friendly play preference");
  }
  if (preference.includes("competitive") && candidate.profileTags?.some((tag) => ["team", "high-running"].includes(tag))) {
    signals.push("fits a competitive team or high-running preference");
  }
  if (profileContext.location) {
    signals.push(`location available for future opportunity enrichment: ${profileContext.location}`);
  }
  return signals;
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}
