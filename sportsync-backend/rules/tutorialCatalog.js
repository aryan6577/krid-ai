export const TUTORIAL_DRILL_CATALOG = [
  {
    sport: "Cricket",
    drillName: "Batting stance + shadow front-foot movement",
    cameraView: "Front",
    scopeNote: "No claim of ball trajectory or full batting biomechanics.",
    checkpoints: [
      {
        id: "cricket.stance_width",
        type: "positional",
        label: "Stance width proxy",
        metric: "stanceWidthRatio",
        keyJoints: ["left_ankle", "right_ankle", "left_hip", "right_hip"],
        completionRule: "range",
        thresholds: { min: 1.15, max: 2.15 },
        weight: 0.2,
        cue: "Set feet a little wider and more evenly under the hips.",
      },
      {
        id: "cricket.knee_flexion",
        type: "positional",
        label: "Knee flexion",
        metric: "kneeFlexionAngle",
        keyJoints: ["left_hip", "left_knee", "left_ankle", "right_hip", "right_knee", "right_ankle"],
        completionRule: "range",
        thresholds: { min: 125, max: 170 },
        weight: 0.18,
        cue: "Keep a light athletic knee bend in the stance.",
      },
      {
        id: "cricket.trunk_orientation",
        type: "positional",
        label: "Trunk orientation",
        metric: "trunkLean",
        keyJoints: ["left_shoulder", "right_shoulder", "left_hip", "right_hip"],
        completionRule: "max",
        thresholds: { max: 32 },
        weight: 0.18,
        cue: "Keep the upper body steadier through the shadow movement.",
      },
      {
        id: "cricket.front_foot_sequence",
        type: "sequential",
        label: "Stance then front-foot movement",
        metric: "leadFootDisplacementRatio",
        keyJoints: ["left_ankle", "right_ankle", "left_hip", "right_hip"],
        completionRule: "baseline_then_displacement",
        thresholds: { baselineMax: 0.28, displacementMin: 0.45 },
        weight: 0.24,
        cue: "Show a clear front-foot movement after the starting stance.",
      },
      {
        id: "cricket.repetition_consistency",
        type: "consistency",
        label: "Repetition consistency",
        metric: "attemptDisplacementVariation",
        keyJoints: ["left_ankle", "right_ankle"],
        completionRule: "variation_max",
        thresholds: { maxVariation: 0.32 },
        weight: 0.2,
        cue: "Repeat the front-foot movement with more consistent step size.",
      },
    ],
    completion: { minCoverage: 0.75, minScore: 70 },
  },
  {
    sport: "Football",
    drillName: "Ready stance + lateral movement drill",
    cameraView: "Front",
    scopeNote: "No live match event detection in Tutorial Mode.",
    checkpoints: [
      {
        id: "football.ready_flexion",
        type: "positional",
        label: "Knee/hip flexion proxy",
        metric: "readyFlexionAngle",
        keyJoints: ["left_hip", "left_knee", "left_ankle", "right_hip", "right_knee", "right_ankle"],
        completionRule: "range",
        thresholds: { min: 120, max: 170 },
        weight: 0.22,
        cue: "Stay in a more ready athletic stance before moving.",
      },
      {
        id: "football.lateral_distance",
        type: "positional",
        label: "Side-to-side movement",
        metric: "lateralDisplacementRatio",
        keyJoints: ["left_hip", "right_hip", "left_ankle", "right_ankle"],
        completionRule: "min",
        thresholds: { min: 0.65 },
        weight: 0.26,
        cue: "Make the lateral movement more visible from side to side.",
      },
      {
        id: "football.timing_window",
        type: "temporal",
        label: "Timing consistency",
        metric: "attemptDurationMs",
        keyJoints: ["left_hip", "right_hip"],
        completionRule: "duration_window",
        thresholds: { minMs: 600, maxMs: 3500 },
        weight: 0.18,
        cue: "Use a steadier timing window for each lateral movement.",
      },
      {
        id: "football.center_side_center",
        type: "sequential",
        label: "Center-side-center sequence",
        metric: "centerSideCenter",
        keyJoints: ["left_hip", "right_hip"],
        completionRule: "center_side_center",
        thresholds: { sideDisplacementMin: 0.55, returnTolerance: 0.25 },
        weight: 0.2,
        cue: "Complete the side movement and return closer to the starting center.",
      },
      {
        id: "football.body_orientation",
        type: "positional",
        label: "Body orientation",
        metric: "shoulderTilt",
        keyJoints: ["left_shoulder", "right_shoulder"],
        completionRule: "max",
        thresholds: { max: 28 },
        weight: 0.14,
        cue: "Keep shoulders more level while moving laterally.",
      },
    ],
    completion: { minCoverage: 0.75, minScore: 70 },
  },
];

export function tutorialDrillByName(sport, drillName) {
  const normalizedSport = String(sport || "").trim().toLowerCase();
  const normalizedDrill = String(drillName || "").trim().toLowerCase();
  return (
    TUTORIAL_DRILL_CATALOG.find(
      (drill) => drill.sport.toLowerCase() === normalizedSport && drill.drillName.toLowerCase() === normalizedDrill
    ) || null
  );
}

export function tutorialCatalogForApi() {
  return TUTORIAL_DRILL_CATALOG.map(({ sport, drillName, cameraView, scopeNote, checkpoints, completion }) => ({
    sport,
    drillName,
    cameraView,
    scopeNote,
    checkpoints,
    completion,
  }));
}
