import { EXERCISE_CATALOG, exerciseByName } from "./exerciseCatalog.js";

const CV_SCHEMA_VERSION = "krid.cv.pose.v1";
const KEYPOINT_NAMES = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

export function evaluateExerciseSession({ exerciseName, pose, targets = {}, thresholdOverrides = {} }) {
  validateFrozenPoseContract(pose);
  const catalogEntry = exerciseByName(exerciseName);
  if (!catalogEntry) {
    const error = new Error(
      `Unsupported exercise. This phase supports exactly: ${EXERCISE_CATALOG.map((exercise) => exercise.name).join(", ")}.`
    );
    error.status = 400;
    throw error;
  }

  const thresholds = {
    ...catalogEntry.thresholds,
    ...(thresholdOverrides?.[catalogEntry.name] || thresholdOverrides || {}),
  };
  const frames = pose.frames.map(normalizeFrame);
  const sufficientFrames = frames.filter((frame) => frame.quality === "sufficient" && frame.keypoints);
  const insufficientCount = frames.length - sufficientFrames.length;
  const detectionQuality =
    sufficientFrames.length === 0 ? "Invalid" : insufficientCount > 0 || pose.status === "insufficient_quality" ? "Limited" : "Good";

  const raw =
    catalogEntry.name === "Bodyweight squat"
      ? evaluateSquat(sufficientFrames, thresholds)
      : catalogEntry.name === "Forward lunge"
        ? evaluateLunge(sufficientFrames, thresholds)
        : catalogEntry.name === "Push-up"
          ? evaluatePushup(sufficientFrames, thresholds)
          : catalogEntry.name === "Plank"
            ? evaluatePlank(sufficientFrames, thresholds, targets)
            : evaluateJumpingJack(sufficientFrames, thresholds);

  const target = normalizeTargets(targets, catalogEntry.name);
  const achieved = catalogEntry.name === "Plank" ? raw.holdDurationMs / 1000 : raw.reps.length;
  const targetValue = catalogEntry.name === "Plank" ? target.holdSeconds : target.reps * target.sets;
  const targetMet = achieved >= targetValue;
  const qualitySufficientThroughout = detectionQuality === "Good";
  const completed = targetMet && qualitySufficientThroughout;
  const completionPercent = targetValue > 0 ? Math.min(100, Math.round((achieved / targetValue) * 100)) : 0;
  const ruleResults = raw.ruleResults.map((rule) => ({
    ...rule,
    producedFeedback: !rule.passed,
  }));
  const cues = buildCues(ruleResults);

  if (detectionQuality !== "Good") {
    cues.unshift("Use the camera framing prompt before relying on this result.");
  }

  return {
    exercise: {
      name: catalogEntry.name,
      cameraView: catalogEntry.cameraView,
      primaryMetrics: catalogEntry.primaryMetrics,
    },
    sourceContract: {
      schemaVersion: pose.schemaVersion,
      frozen: true,
    },
    targets: target,
    completion: {
      completed,
      status: completed ? "complete" : detectionQuality === "Good" ? "incomplete" : "manual_confirmation_required",
      percentage: completionPercent,
      targetMet,
      manualConfirmationRequired: detectionQuality !== "Good",
      reason:
        detectionQuality !== "Good"
          ? "Detection quality was not sufficient throughout the session."
          : targetMet
            ? "Target achieved with sufficient detection quality."
            : "Target not reached yet.",
    },
    detectionQuality: {
      state: detectionQuality,
      insufficientFrameCount: insufficientCount,
      sufficientFrameCount: sufficientFrames.length,
      totalFrameCount: frames.length,
    },
    techniqueQualityScore: weightedScore(ruleResults, catalogEntry.weights),
    consistency: raw.consistency,
    counts: {
      reps: raw.reps.length,
      sets: target.sets,
      holdSeconds: Math.round((raw.holdDurationMs / 1000) * 10) / 10,
      cycles: raw.cycles?.length || 0,
    },
    metrics: raw.metrics,
    reps: raw.reps,
    rules: ruleResults,
    improvementCues: cues.slice(0, 2),
    coachingDisclaimer:
      "Feedback is informational coaching based on pose estimates, not a medical diagnosis or a guarantee of injury prevention.",
  };
}

export function validateFrozenPoseContract(pose) {
  if (!pose || pose.schemaVersion !== CV_SCHEMA_VERSION || !Array.isArray(pose.frames)) {
    const error = new Error(`Exercise Mode requires frozen CV contract ${CV_SCHEMA_VERSION}.`);
    error.status = 400;
    throw error;
  }
  pose.frames.forEach((frame, frameIndex) => {
    if (typeof frame.timestampMs !== "number" || !frame.quality?.flag) {
      const error = new Error(`Pose frame ${frameIndex} is missing timestampMs or quality.flag.`);
      error.status = 400;
      throw error;
    }
    if (frame.quality.flag === "sufficient") {
      if (!Array.isArray(frame.keypoints) || frame.keypoints.length !== 17) {
        const error = new Error(`Pose frame ${frameIndex} must include exactly 17 keypoints when quality is sufficient.`);
        error.status = 400;
        throw error;
      }
      const names = frame.keypoints.map((keypoint) => keypoint.name);
      const missing = KEYPOINT_NAMES.filter((name) => !names.includes(name));
      if (missing.length) {
        const error = new Error(`Pose frame ${frameIndex} is missing keypoints: ${missing.join(", ")}.`);
        error.status = 400;
        throw error;
      }
    }
  });
}

export function normalizeFrame(frame) {
  return {
    timestampMs: frame.timestampMs,
    quality: frame.quality.flag,
    keypoints: Array.isArray(frame.keypoints)
      ? frame.keypoints.reduce((acc, keypoint) => {
          acc[keypoint.name] = keypoint;
          return acc;
        }, {})
      : null,
  };
}

function normalizeTargets(targets, exerciseName) {
  if (exerciseName === "Plank") {
    return {
      reps: 0,
      sets: 1,
      holdSeconds: Number(targets.holdSeconds || targets.hold_seconds || 30),
    };
  }
  return {
    reps: Number(targets.reps || 8),
    sets: Number(targets.sets || 1),
    holdSeconds: 0,
  };
}

function evaluateSquat(frames, thresholds) {
  const series = frames.map((frame) => {
    const kneeAngle = averageFinite([angle(frame, "left_hip", "left_knee", "left_ankle"), angle(frame, "right_hip", "right_knee", "right_ankle")]);
    const trunkAngle = averageFinite([
      trunkLean(frame, "left_shoulder", "left_hip"),
      trunkLean(frame, "right_shoulder", "right_hip"),
    ]);
    const stanceWidth = distance(frame, "left_ankle", "right_ankle") / Math.max(distance(frame, "left_hip", "right_hip"), 1);
    return { timestampMs: frame.timestampMs, kneeAngle, trunkAngle, stanceWidth };
  });
  const reps = detectAngleReps(series, "kneeAngle", {
    topAngle: thresholds.topKneeAngle,
    bottomAngle: thresholds.bottomKneeAngle,
    minRange: thresholds.minKneeRange,
  });
  const ranges = reps.map((rep) => rep.range);
  const trunkAngles = series.map((item) => item.trunkAngle).filter(isFiniteNumber);
  const stanceWidths = series.map((item) => item.stanceWidth).filter(isFiniteNumber);
  const avgTrunk = average(trunkAngles);
  const consistency = consistencyFromValues(ranges);
  const durationResults = repDurationRule(reps, thresholds.minRepDurationMs, thresholds.maxRepDurationMs);
  const ruleResults = [
    rule("squat.knee_range", "rangeOfMotion", average(ranges), thresholds.minKneeRange, average(ranges) >= thresholds.minKneeRange, "Increase range of motion."),
    rule("squat.depth_consistency", "consistency", standardDeviation(ranges), thresholds.maxDepthVariation, standardDeviation(ranges) <= thresholds.maxDepthVariation, "Keep squat depth more consistent."),
    rule("squat.trunk_angle", "trunkAngle", avgTrunk, thresholds.maxTrunkLean, avgTrunk <= thresholds.maxTrunkLean, "Keep your chest a little steadier."),
    durationResults,
  ];
  return {
    reps,
    holdDurationMs: 0,
    consistency,
    metrics: {
      averageKneeRange: round(average(ranges)),
      depthVariation: round(standardDeviation(ranges)),
      averageTrunkLean: round(avgTrunk),
      stanceVariation: round(standardDeviation(stanceWidths)),
    },
    ruleResults,
  };
}

function evaluateLunge(frames, thresholds) {
  const series = frames.map((frame) => {
    const leftKnee = angle(frame, "left_hip", "left_knee", "left_ankle");
    const rightKnee = angle(frame, "right_hip", "right_knee", "right_ankle");
    const side = (leftKnee || 180) < (rightKnee || 180) ? "left" : "right";
    const other = side === "left" ? "right" : "left";
    const kneeAngle = side === "left" ? leftKnee : rightKnee;
    const hipAngle = angle(frame, `${side}_shoulder`, `${side}_hip`, `${side}_knee`);
    const stepLength = distance(frame, `${side}_ankle`, `${other}_ankle`) / Math.max(distance(frame, "left_hip", "right_hip"), 1);
    const kneeTrackingOffset = Math.abs(point(frame, `${side}_knee`).x - point(frame, `${side}_ankle`).x) / Math.max(distance(frame, "left_hip", "right_hip"), 1);
    return { timestampMs: frame.timestampMs, kneeAngle, hipAngle, stepLength, kneeTrackingOffset };
  });
  const reps = detectAngleReps(series, "kneeAngle", {
    topAngle: thresholds.topKneeAngle,
    bottomAngle: thresholds.bottomKneeAngle,
    minRange: thresholds.minKneeRange,
  });
  const ranges = reps.map((rep) => rep.range);
  const steps = series.map((item) => item.stepLength).filter(isFiniteNumber);
  const trackingOffsets = series.map((item) => item.kneeTrackingOffset).filter(isFiniteNumber);
  const consistency = consistencyFromValues(steps);
  const durationResults = repDurationRule(reps, thresholds.minRepDurationMs, thresholds.maxRepDurationMs);
  const ruleResults = [
    rule("lunge.knee_range", "rangeOfMotion", average(ranges), thresholds.minKneeRange, average(ranges) >= thresholds.minKneeRange, "Increase lunge range of motion."),
    rule("lunge.step_length", "stepConsistency", average(steps), thresholds.minStepLengthRatio, average(steps) >= thresholds.minStepLengthRatio, "Take a slightly longer step."),
    rule("lunge.step_consistency", "stepConsistency", standardDeviation(steps), thresholds.maxStepVariation, standardDeviation(steps) <= thresholds.maxStepVariation, "Keep step length more consistent."),
    rule("lunge.knee_tracking", "kneeTracking", average(trackingOffsets), thresholds.maxKneeTrackingOffsetRatio, average(trackingOffsets) <= thresholds.maxKneeTrackingOffsetRatio, "Aim to keep the front knee tracking steadily over the foot."),
    durationResults,
  ];
  return {
    reps,
    holdDurationMs: 0,
    consistency,
    metrics: {
      averageKneeRange: round(average(ranges)),
      averageStepLengthRatio: round(average(steps)),
      stepVariation: round(standardDeviation(steps)),
      averageKneeTrackingOffsetRatio: round(average(trackingOffsets)),
    },
    ruleResults,
  };
}

function evaluatePushup(frames, thresholds) {
  const series = frames.map((frame) => {
    const elbowAngle = averageFinite([
      angle(frame, "left_shoulder", "left_elbow", "left_wrist"),
      angle(frame, "right_shoulder", "right_elbow", "right_wrist"),
    ]);
    const bodyLineDeviation = averageFinite([
      bodyLineDeviationForSide(frame, "left"),
      bodyLineDeviationForSide(frame, "right"),
    ]);
    return { timestampMs: frame.timestampMs, elbowAngle, bodyLineDeviation };
  });
  const reps = detectAngleReps(series, "elbowAngle", {
    topAngle: thresholds.topElbowAngle,
    bottomAngle: thresholds.bottomElbowAngle,
    minRange: thresholds.minElbowRange,
  });
  const ranges = reps.map((rep) => rep.range);
  const bodyLines = series.map((item) => item.bodyLineDeviation).filter(isFiniteNumber);
  const consistency = consistencyFromValues(ranges);
  const durationResults = repDurationRule(reps, thresholds.minRepDurationMs, thresholds.maxRepDurationMs);
  const ruleResults = [
    rule("pushup.elbow_range", "rangeOfMotion", average(ranges), thresholds.minElbowRange, average(ranges) >= thresholds.minElbowRange, "Increase range of motion."),
    rule("pushup.body_line", "bodyLine", average(bodyLines), thresholds.maxBodyLineDeviation, average(bodyLines) <= thresholds.maxBodyLineDeviation, "Keep hips closer to a straight body line."),
    durationResults,
    rule("pushup.rep_consistency", "consistency", standardDeviation(ranges), thresholds.minElbowRange * 0.35, standardDeviation(ranges) <= thresholds.minElbowRange * 0.35, "Keep each rep range more consistent."),
  ];
  return {
    reps,
    holdDurationMs: 0,
    consistency,
    metrics: {
      averageElbowRange: round(average(ranges)),
      averageBodyLineDeviation: round(average(bodyLines)),
      rangeVariation: round(standardDeviation(ranges)),
    },
    ruleResults,
  };
}

function evaluatePlank(frames, thresholds) {
  const series = frames.map((frame) => ({
    timestampMs: frame.timestampMs,
    bodyLineDeviation: averageFinite([bodyLineDeviationForSide(frame, "left"), bodyLineDeviationForSide(frame, "right")]),
  }));
  const alignedFrames = series.filter((item) => isFiniteNumber(item.bodyLineDeviation) && item.bodyLineDeviation <= thresholds.maxBodyLineDeviation);
  const holdDurationMs = alignedFrames.length > 1 ? alignedFrames[alignedFrames.length - 1].timestampMs - alignedFrames[0].timestampMs : 0;
  const alignedRatio = series.length ? alignedFrames.length / series.length : 0;
  const bodyLines = series.map((item) => item.bodyLineDeviation).filter(isFiniteNumber);
  const ruleResults = [
    rule("plank.body_line", "bodyLine", average(bodyLines), thresholds.maxBodyLineDeviation, average(bodyLines) <= thresholds.maxBodyLineDeviation, "Bring shoulders, hips, and ankles closer to one line."),
    rule("plank.aligned_frame_ratio", "bodyLine", alignedRatio, thresholds.minAlignedFrameRatio, alignedRatio >= thresholds.minAlignedFrameRatio, "Hold alignment more steadily."),
  ];
  return {
    reps: [],
    holdDurationMs,
    consistency: {
      score: clampScore(100 - standardDeviation(bodyLines) * 3),
      variation: round(standardDeviation(bodyLines)),
      basis: "body-line deviation variation",
    },
    metrics: {
      averageBodyLineDeviation: round(average(bodyLines)),
      alignedFrameRatio: round(alignedRatio),
      holdDurationSeconds: round(holdDurationMs / 1000),
    },
    ruleResults,
  };
}

function evaluateJumpingJack(frames, thresholds) {
  const series = frames.map((frame) => {
    const hipWidth = Math.max(distance(frame, "left_hip", "right_hip"), 1);
    const ankleSeparation = distance(frame, "left_ankle", "right_ankle") / hipWidth;
    const wristSeparation = distance(frame, "left_wrist", "right_wrist") / hipWidth;
    const leftReach = distance(frame, "left_wrist", "left_hip") / hipWidth;
    const rightReach = distance(frame, "right_wrist", "right_hip") / hipWidth;
    return {
      timestampMs: frame.timestampMs,
      limbSeparation: averageFinite([ankleSeparation, wristSeparation]),
      symmetryDifference: Math.abs(leftReach - rightReach),
    };
  });
  const cycles = detectSeparationCycles(series, thresholds);
  const cycleRanges = cycles.map((cycle) => cycle.range);
  const symmetry = series.map((item) => item.symmetryDifference).filter(isFiniteNumber);
  const consistency = consistencyFromValues(cycleRanges);
  const tempo = cycleDurationRule(cycles, thresholds.minCycleDurationMs, thresholds.maxCycleDurationMs);
  const ruleResults = [
    rule("jumping_jack.cycle_range", "cycleRange", average(cycleRanges), thresholds.openSeparationRatio - thresholds.closedSeparationRatio, average(cycleRanges) >= thresholds.openSeparationRatio - thresholds.closedSeparationRatio, "Open arms and feet a little wider."),
    rule("jumping_jack.symmetry", "symmetry", average(symmetry), thresholds.maxSymmetryDifferenceRatio, average(symmetry) <= thresholds.maxSymmetryDifferenceRatio, "Keep both sides moving more evenly."),
    tempo,
    rule("jumping_jack.consistency", "consistency", standardDeviation(cycleRanges), 0.55, standardDeviation(cycleRanges) <= 0.55, "Keep cycle size more consistent."),
  ];
  return {
    reps: cycles,
    cycles,
    holdDurationMs: 0,
    consistency,
    metrics: {
      averageCycleRange: round(average(cycleRanges)),
      averageSymmetryDifference: round(average(symmetry)),
      cycleVariation: round(standardDeviation(cycleRanges)),
    },
    ruleResults,
  };
}

function detectAngleReps(series, metric, { topAngle, bottomAngle, minRange }) {
  const reps = [];
  let state = "top";
  let current = null;

  series.forEach((item) => {
    const value = item[metric];
    if (!isFiniteNumber(value)) return;
    if (state === "top" && value < topAngle) {
      state = "descending";
      current = {
        startMs: item.timestampMs,
        topAngle: value,
        bottomAngle: value,
        bottomMs: item.timestampMs,
      };
    }
    if (state === "descending" && current) {
      if (value < current.bottomAngle) {
        current.bottomAngle = value;
        current.bottomMs = item.timestampMs;
      }
      if (value <= bottomAngle) state = "bottom";
    }
    if (state === "bottom" && current) {
      if (value < current.bottomAngle) {
        current.bottomAngle = value;
        current.bottomMs = item.timestampMs;
      }
      if (value >= topAngle) {
        const range = value - current.bottomAngle;
        if (range >= minRange) {
          reps.push({
            index: reps.length + 1,
            startMs: current.startMs,
            bottomMs: current.bottomMs,
            endMs: item.timestampMs,
            durationMs: item.timestampMs - current.startMs,
            range: round(range),
            bottomAngle: round(current.bottomAngle),
            topAngle: round(value),
          });
        }
        state = "top";
        current = null;
      }
    }
  });

  return reps;
}

function detectSeparationCycles(series, thresholds) {
  const cycles = [];
  let state = "closed";
  let current = null;

  series.forEach((item) => {
    const value = item.limbSeparation;
    if (!isFiniteNumber(value)) return;
    if (state === "closed" && value > thresholds.closedSeparationRatio) {
      state = "opening";
      current = {
        startMs: item.timestampMs,
        minSeparation: value,
        maxSeparation: value,
      };
    }
    if ((state === "opening" || state === "open") && current) {
      current.maxSeparation = Math.max(current.maxSeparation, value);
      current.minSeparation = Math.min(current.minSeparation, value);
      if (value >= thresholds.openSeparationRatio) state = "open";
      if (state === "open" && value <= thresholds.closedSeparationRatio) {
        cycles.push({
          index: cycles.length + 1,
          startMs: current.startMs,
          endMs: item.timestampMs,
          durationMs: item.timestampMs - current.startMs,
          range: round(current.maxSeparation - current.minSeparation),
        });
        state = "closed";
        current = null;
      }
    }
  });

  return cycles;
}

export function rule(ruleId, category, value, threshold, passed, feedback) {
  return {
    ruleId,
    category,
    value: round(value),
    threshold,
    passed: Boolean(passed),
    feedback,
  };
}

function repDurationRule(reps, minMs, maxMs) {
  const durations = reps.map((rep) => rep.durationMs).filter(isFiniteNumber);
  const averageDuration = average(durations);
  return rule(
    "rep.tempo",
    "tempo",
    averageDuration,
    `${minMs}-${maxMs}ms`,
    durations.length > 0 && averageDuration >= minMs && averageDuration <= maxMs,
    "Use a steadier tempo."
  );
}

function cycleDurationRule(cycles, minMs, maxMs) {
  const durations = cycles.map((cycle) => cycle.durationMs).filter(isFiniteNumber);
  const averageDuration = average(durations);
  return rule(
    "cycle.tempo",
    "tempo",
    averageDuration,
    `${minMs}-${maxMs}ms`,
    durations.length > 0 && averageDuration >= minMs && averageDuration <= maxMs,
    "Use a steadier tempo."
  );
}

export function weightedScore(ruleResults, weights) {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (!totalWeight) return 0;
  const score = ruleResults.reduce((sum, result) => {
    const weight = weights[result.category] || 0;
    return sum + (result.passed ? 100 : 45) * weight;
  }, 0);
  return Math.round(score / totalWeight);
}

export function buildCues(ruleResults) {
  const failed = ruleResults.filter((result) => !result.passed && result.feedback);
  if (!failed.length) return ["Good control across the tracked cues."];
  return [...new Set(failed.map((result) => result.feedback))];
}

export function consistencyFromValues(values) {
  const clean = values.filter(isFiniteNumber);
  const avg = average(clean);
  const sd = standardDeviation(clean);
  const variation = avg ? sd / Math.abs(avg) : 0;
  return {
    score: clampScore(100 - variation * 100),
    variation: round(variation),
    basis: "variation across detected reps",
  };
}

export function angle(frame, aName, bName, cName) {
  const a = point(frame, aName);
  const b = point(frame, bName);
  const c = point(frame, cName);
  if (!a || !b || !c) return null;
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (!denominator) return null;
  const cosine = Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / denominator));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function trunkLean(frame, shoulderName, hipName) {
  const shoulder = point(frame, shoulderName);
  const hip = point(frame, hipName);
  if (!shoulder || !hip) return null;
  const dx = shoulder.x - hip.x;
  const dy = hip.y - shoulder.y;
  if (!isFiniteNumber(dx) || !isFiniteNumber(dy)) return null;
  return Math.abs((Math.atan2(dx, Math.max(Math.abs(dy), 1)) * 180) / Math.PI);
}

function bodyLineDeviationForSide(frame, side) {
  const shoulder = `${side}_shoulder`;
  const hip = `${side}_hip`;
  const ankle = `${side}_ankle`;
  const lineAngle = angle(frame, shoulder, hip, ankle);
  return isFiniteNumber(lineAngle) ? Math.abs(180 - lineAngle) : null;
}

export function distance(frame, aName, bName) {
  const a = point(frame, aName);
  const b = point(frame, bName);
  if (!a || !b) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function point(frame, name) {
  const value = frame.keypoints?.[name];
  if (!value || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return null;
  return value;
}

export function averageFinite(values) {
  return average(values.filter(isFiniteNumber));
}

export function average(values) {
  const clean = values.filter(isFiniteNumber);
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

export function standardDeviation(values) {
  const clean = values.filter(isFiniteNumber);
  if (clean.length < 2) return 0;
  const avg = average(clean);
  const variance = average(clean.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

export function isFiniteNumber(value) {
  return Number.isFinite(value);
}

export function round(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

export function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
