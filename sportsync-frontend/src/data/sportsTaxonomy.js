// Sport attribute taxonomy — SRS §6.4 Alternative Sports Recommendation Logic.
// Each sport maps to a configurable attribute vector (0-1 scale) describing broad movement
// demands and transferable skills. This is maintained as product/catalog data (not learned),
// matching the "transparent scoring" approach used elsewhere (SRS §7).

export const sportsTaxonomy = {
  Football: { handEyeCoordination: 0.4, agility: 0.85, endurance: 0.85, explosiveness: 0.75, rotationalMovement: 0.3, teamwork: 0.9, equipmentIntensity: 0.15 },
  Badminton: { handEyeCoordination: 0.9, agility: 0.85, endurance: 0.6, explosiveness: 0.7, rotationalMovement: 0.5, teamwork: 0.2, equipmentIntensity: 0.5 },
  Basketball: { handEyeCoordination: 0.75, agility: 0.8, endurance: 0.75, explosiveness: 0.8, rotationalMovement: 0.3, teamwork: 0.85, equipmentIntensity: 0.2 },
  Tennis: { handEyeCoordination: 0.9, agility: 0.75, endurance: 0.65, explosiveness: 0.65, rotationalMovement: 0.6, teamwork: 0.1, equipmentIntensity: 0.55 },
  Cricket: { handEyeCoordination: 0.85, agility: 0.5, endurance: 0.55, explosiveness: 0.55, rotationalMovement: 0.7, teamwork: 0.7, equipmentIntensity: 0.6 },

  // Candidate / adjacent sports used as alternative-sport recommendations
  "Field Hockey": { handEyeCoordination: 0.75, agility: 0.8, endurance: 0.85, explosiveness: 0.65, rotationalMovement: 0.4, teamwork: 0.9, equipmentIntensity: 0.45 },
  "Baseball / Softball": { handEyeCoordination: 0.85, agility: 0.5, endurance: 0.45, explosiveness: 0.6, rotationalMovement: 0.75, teamwork: 0.65, equipmentIntensity: 0.55 },
  "Table Tennis": { handEyeCoordination: 0.95, agility: 0.6, endurance: 0.4, explosiveness: 0.5, rotationalMovement: 0.55, teamwork: 0.1, equipmentIntensity: 0.4 },
  Squash: { handEyeCoordination: 0.85, agility: 0.9, endurance: 0.75, explosiveness: 0.75, rotationalMovement: 0.5, teamwork: 0.1, equipmentIntensity: 0.45 },
  Kabaddi: { handEyeCoordination: 0.3, agility: 0.85, endurance: 0.7, explosiveness: 0.85, rotationalMovement: 0.2, teamwork: 0.85, equipmentIntensity: 0.05 },
  Handball: { handEyeCoordination: 0.7, agility: 0.8, endurance: 0.8, explosiveness: 0.8, rotationalMovement: 0.4, teamwork: 0.9, equipmentIntensity: 0.15 },
  Volleyball: { handEyeCoordination: 0.75, agility: 0.75, endurance: 0.6, explosiveness: 0.85, rotationalMovement: 0.3, teamwork: 0.9, equipmentIntensity: 0.15 },
  Athletics: { handEyeCoordination: 0.15, agility: 0.6, endurance: 0.9, explosiveness: 0.85, rotationalMovement: 0.1, teamwork: 0.1, equipmentIntensity: 0.1 },
};

// Curated demo opportunity signals — SRS §4.5 "Pathway Signal" / FR-85, FR-88.
// In production these would be enriched via SerpAPI (SRS §6.5); here they are curated/demo
// data so the recommendation is inspectable without a live network dependency (BR-23).
export const opportunitySignals = {
  "Field Hockey": [
    { title: "Bengaluru Hockey Academy — Beginner Clinics", location: "Koramangala, Bengaluru", type: "Academy", sourceType: "curated", retrievedAt: "2026-09-15" },
    { title: "Karnataka Hockey Association — Open Try-outs", location: "Bengaluru", type: "Club", sourceType: "curated", retrievedAt: "2026-09-15" },
  ],
  "Baseball / Softball": [
    { title: "Bangalore Baseball League — Weekend Nets", location: "Whitefield, Bengaluru", type: "Club", sourceType: "curated", retrievedAt: "2026-09-14" },
  ],
  "Table Tennis": [
    { title: "Ace Table Tennis Academy", location: "Indiranagar, Bengaluru", type: "Academy", sourceType: "curated", retrievedAt: "2026-09-16" },
    { title: "Bengaluru TT Open — Amateur Category", location: "Bengaluru", type: "Event", sourceType: "curated", retrievedAt: "2026-09-16" },
  ],
  Squash: [
    { title: "KSA Squash Academy — Intro Sessions", location: "Koramangala, Bengaluru", type: "Academy", sourceType: "curated", retrievedAt: "2026-09-12" },
  ],
  Kabaddi: [
    { title: "Bengaluru Kabaddi Club — Community Matches", location: "Jayanagar, Bengaluru", type: "Club", sourceType: "curated", retrievedAt: "2026-09-13" },
  ],
  Handball: [
    { title: "Karnataka Handball Association — Beginner Camp", location: "Bengaluru", type: "Camp", sourceType: "curated", retrievedAt: "2026-09-11" },
  ],
  Volleyball: [
    { title: "HSR Volleyball Community — Evening Pickup Games", location: "HSR Layout, Bengaluru", type: "Community", sourceType: "curated", retrievedAt: "2026-09-17" },
  ],
  Athletics: [
    { title: "Bengaluru Track Club — Open Training Days", location: "Bengaluru", type: "Club", sourceType: "curated", retrievedAt: "2026-09-10" },
  ],
};
