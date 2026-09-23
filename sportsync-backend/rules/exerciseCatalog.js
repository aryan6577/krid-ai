export const EXERCISE_CATALOG = [
  {
    name: "Bodyweight squat",
    difficulty: "Foundation",
    cameraView: "Side/front",
    primaryMetrics: ["Knee flexion range", "Depth consistency", "Trunk angle", "Rep count"],
    targetMetrics: ["knee_flexion_range", "depth_consistency", "trunk_angle", "rep_count"],
    thresholds: {
      topKneeAngle: 155,
      bottomKneeAngle: 105,
      minKneeRange: 45,
      maxDepthVariation: 18,
      maxTrunkLean: 35,
      minRepDurationMs: 650,
      maxRepDurationMs: 5000,
    },
    weights: {
      rangeOfMotion: 0.36,
      consistency: 0.26,
      trunkAngle: 0.23,
      tempo: 0.15,
    },
    cues: ["Depth", "Tempo", "Stance consistency"],
  },
  {
    name: "Forward lunge",
    difficulty: "Foundation",
    cameraView: "Side/front",
    primaryMetrics: ["Front knee/hip angle", "Step consistency", "Rep count"],
    targetMetrics: ["front_knee_angle", "front_hip_angle", "step_consistency", "rep_count"],
    thresholds: {
      topKneeAngle: 155,
      bottomKneeAngle: 112,
      minKneeRange: 38,
      minStepLengthRatio: 1.15,
      maxStepVariation: 0.35,
      maxKneeTrackingOffsetRatio: 0.38,
      minRepDurationMs: 700,
      maxRepDurationMs: 5500,
    },
    weights: {
      rangeOfMotion: 0.32,
      stepConsistency: 0.26,
      kneeTracking: 0.22,
      tempo: 0.2,
    },
    cues: ["Step length", "Balance cue", "Knee tracking proxy"],
  },
  {
    name: "Push-up",
    difficulty: "Foundation",
    cameraView: "Side",
    primaryMetrics: ["Elbow angle", "Body-line proxy", "Rep count"],
    targetMetrics: ["elbow_angle", "body_line_proxy", "rep_count"],
    thresholds: {
      topElbowAngle: 155,
      bottomElbowAngle: 105,
      minElbowRange: 45,
      maxBodyLineDeviation: 24,
      minRepDurationMs: 650,
      maxRepDurationMs: 4500,
    },
    weights: {
      rangeOfMotion: 0.38,
      bodyLine: 0.34,
      tempo: 0.18,
      consistency: 0.1,
    },
    cues: ["Range of motion", "Tempo", "Hip position proxy"],
  },
  {
    name: "Plank",
    difficulty: "Foundation",
    cameraView: "Side",
    primaryMetrics: ["Body-line proxy", "Hold duration"],
    targetMetrics: ["body_line_proxy", "hold_duration"],
    thresholds: {
      maxBodyLineDeviation: 22,
      minAlignedFrameRatio: 0.75,
    },
    weights: {
      bodyLine: 0.72,
      holdDuration: 0.28,
    },
    cues: ["Alignment cue", "Hold duration"],
  },
  {
    name: "Jumping jack",
    difficulty: "Foundation",
    cameraView: "Front",
    primaryMetrics: ["Limb separation", "Cycle count"],
    targetMetrics: ["limb_separation", "cycle_count"],
    thresholds: {
      closedSeparationRatio: 1.15,
      openSeparationRatio: 2.1,
      minCycleDurationMs: 450,
      maxCycleDurationMs: 3500,
      maxSymmetryDifferenceRatio: 0.45,
    },
    weights: {
      cycleRange: 0.36,
      symmetry: 0.28,
      tempo: 0.2,
      consistency: 0.16,
    },
    cues: ["Tempo", "Symmetry"],
  },
];

export function exerciseByName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  return EXERCISE_CATALOG.find((exercise) => exercise.name.toLowerCase() === normalized) || null;
}

export function exerciseCatalogForApi() {
  return EXERCISE_CATALOG.map(({ name, difficulty, cameraView, primaryMetrics, targetMetrics, thresholds, cues }) => ({
    name,
    difficulty,
    cameraView,
    primaryMetrics,
    targetMetrics,
    thresholds,
    cues,
  }));
}
