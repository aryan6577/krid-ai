// Alternative Sports Recommendation — SRS §6.4 / FR-84, FR-85.
// Transparent weighted-similarity scoring over a configurable sport-attribute taxonomy,
// matching the "AI Design Approach" (SRS §6.1): deterministic, inspectable, no learned model.

import { sportsTaxonomy, opportunitySignals } from "../data/sportsTaxonomy";

const ATTRS = ["handEyeCoordination", "agility", "endurance", "explosiveness", "rotationalMovement", "teamwork", "equipmentIntensity"];

const ATTR_LABELS = {
  handEyeCoordination: "hand-eye coordination",
  agility: "agility",
  endurance: "endurance",
  explosiveness: "explosive movement",
  rotationalMovement: "rotational movement",
  teamwork: "teamwork demand",
  equipmentIntensity: "equipment/skill transfer",
};

function similarity(a, b) {
  // 1 - normalised mean absolute difference across attributes
  const diffs = ATTRS.map((k) => Math.abs((a[k] ?? 0.5) - (b[k] ?? 0.5)));
  const meanDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  return 1 - meanDiff;
}

function matchedAttributes(a, b) {
  return ATTRS
    .map((k) => ({ key: k, gap: Math.abs((a[k] ?? 0.5) - (b[k] ?? 0.5)), value: b[k] ?? 0.5 }))
    .filter((x) => x.gap <= 0.15 && x.value >= 0.5)
    .sort((x, y) => x.gap - y.gap)
    .slice(0, 3)
    .map((x) => ATTR_LABELS[x.key]);
}

// Recommends related sports for a primary sport the player already plays.
// `excludeSports` — sports the player already plays, so we don't recommend sports they're already in.
export function recommendAlternativeSports(primarySport, excludeSports = [], { limit = 5 } = {}) {
  const base = sportsTaxonomy[primarySport];
  if (!base) return [];

  return Object.entries(sportsTaxonomy)
    .filter(([name]) => name !== primarySport && !excludeSports.includes(name))
    .map(([name, attrs]) => {
      const score = Math.round(similarity(base, attrs) * 100);
      const matched = matchedAttributes(base, attrs);
      return {
        sport: name,
        score,
        matchedAttributes: matched,
        opportunities: opportunitySignals[name] || [],
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export const availablePrimarySports = Object.keys(sportsTaxonomy).filter((s) =>
  ["Football", "Badminton", "Basketball", "Tennis", "Cricket"].includes(s)
);
