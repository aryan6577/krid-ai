import {
  angle,
  average,
  averageFinite,
  buildCues,
  consistencyFromValues,
  distance,
  normalizeFrame,
  point,
  round,
  standardDeviation,
  trunkLean,
  validateFrozenPoseContract,
  weightedScore,
} from "./exerciseRuleEngine.js";
import { checkpointResultsToRules, evaluateCheckpointDefinitions } from "./checkpointEvaluator.js";
import { TUTORIAL_DRILL_CATALOG, tutorialDrillByName } from "./tutorialCatalog.js";

export function evaluateTutorialSession({ sport, drillName, pose, previousSession = null }) {
  validateFrozenPoseContract(pose);
  const drill = tutorialDrillByName(sport, drillName);
  if (!drill) {
    const error = new Error(
      `Unsupported tutorial drill. This phase supports exactly: ${TUTORIAL_DRILL_CATALOG.map(
        (item) => `${item.sport}: ${item.drillName}`
      ).join("; ")}.`
    );
    error.status = 400;
    throw error;
  }

  const frames = pose.frames.map(normalizeFrame);
  const sufficientFrames = frames.filter((frame) => frame.quality === "sufficient" && frame.keypoints);
  const insufficientCount = frames.length - sufficientFrames.length;
  const detectionQuality =
    sufficientFrames.length === 0 ? "Invalid" : insufficientCount > 0 || pose.status === "insufficient_quality" ? "Limited" : "Good";

  const attempts = detectAttempts(sufficientFrames, drill);
  const metrics = deriveMetrics(sufficientFrames, attempts);
  const checkpointResults = evaluateCheckpointDefinitions(drill.checkpoints, metrics);
  const completedCount = checkpointResults.filter((checkpoint) => checkpoint.completed).length;
  const coverage = drill.checkpoints.length ? completedCount / drill.checkpoints.length : 0;
  const weights = Object.fromEntries(drill.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint.weight]));
  const ruleResults = checkpointResultsToRules(checkpointResults);
  const score = weightedScore(ruleResults, weights);
  const targetMet = coverage >= drill.completion.minCoverage && score >= drill.completion.minScore;
  const completed = targetMet && detectionQuality === "Good";
  const cues = buildCues(ruleResults);
  if (detectionQuality !== "Good") {
    cues.unshift("Use the camera framing prompt before relying on this result.");
  }

  return {
    tutorial: {
      sport: drill.sport,
      drillName: drill.drillName,
      cameraView: drill.cameraView,
      scopeNote: drill.scopeNote,
    },
    sourceContract: {
      schemaVersion: pose.schemaVersion,
      frozen: true,
    },
    completion: {
      completed,
      status: completed ? "complete" : detectionQuality === "Good" ? "incomplete" : "manual_confirmation_required",
      percentage: Math.round(coverage * 100),
      targetMet,
      manualConfirmationRequired: detectionQuality !== "Good",
      reason:
        detectionQuality !== "Good"
          ? "Detection quality was not sufficient throughout the tutorial session."
          : targetMet
            ? "Checkpoint coverage target achieved with sufficient detection quality."
            : "Checkpoint coverage target not reached yet.",
    },
    detectionQuality: {
      state: detectionQuality,
      insufficientFrameCount: insufficientCount,
      sufficientFrameCount: sufficientFrames.length,
      totalFrameCount: frames.length,
    },
    checkpointResults,
    missedCheckpoints: checkpointResults.filter((checkpoint) => checkpoint.status === "missed"),
    weakCheckpoints: checkpointResults.filter((checkpoint) => checkpoint.status === "weak"),
    rules: ruleResults,
    score,
    coverage: round(coverage),
    metrics: {
      ...metrics.summary,
      attemptCount: attempts.length,
    },
    consistency: consistencyFromValues(attempts.map((attempt) => attempt.displacementRatio)),
    attempts,
    trend: compareTrend(previousSession?.detected_result || previousSession?.detectedResult, score, coverage),
    improvementCues: cues.slice(0, 2),
    coachingDisclaimer:
      "Feedback is informational coaching based on pose estimates, not a medical diagnosis or a guarantee of injury prevention.",
  };
}

function detectAttempts(frames, drill) {
  if (frames.length < 2) return [];
  const baselineFrames = frames.slice(0, Math.max(1, Math.floor(frames.length * 0.2)));
  const baseline = baselineFrames.map((frame) => movementPoint(frame, drill));
  const baselineX = average(baseline.map((item) => item?.x));
  const baselineMotionRatio = standardDeviation(
    baseline.map((item) => (item ? item.x / Math.max(item.hipWidth, 1) : null))
  );
  const sequenceCheckpoint = drill.checkpoints.find((checkpoint) =>
    ["baseline_then_displacement", "center_side_center"].includes(checkpoint.completionRule)
  );
  const thresholds = sequenceCheckpoint?.thresholds || {};
  const movementThreshold = thresholds.displacementMin || thresholds.sideDisplacementMin || 0.5;
  const returnTolerance = thresholds.returnTolerance || thresholds.baselineMax || 0.28;
  const series = frames.map((frame) => {
    const movingPoint = movementPoint(frame, drill);
    const hipWidth = Math.max(movingPoint?.hipWidth || distance(frame, "left_hip", "right_hip") || 1, 1);
    const signedDisplacementRatio = ((movingPoint?.x || 0) - baselineX) / hipWidth;
    return {
      timestampMs: frame.timestampMs,
      x: movingPoint?.x || 0,
      signedDisplacementRatio,
      displacementRatio: Math.abs(signedDisplacementRatio),
    };
  });

  const attempts = [];
  let current = null;
  series.forEach((item) => {
    if (!current && item.displacementRatio >= returnTolerance) {
      current = {
        startMs: item.timestampMs,
        peakMs: item.timestampMs,
        peakDisplacementRatio: item.displacementRatio,
        signedPeakDisplacementRatio: item.signedDisplacementRatio,
      };
    }
    if (!current) return;
    if (item.displacementRatio > current.peakDisplacementRatio) {
      current.peakMs = item.timestampMs;
      current.peakDisplacementRatio = item.displacementRatio;
      current.signedPeakDisplacementRatio = item.signedDisplacementRatio;
    }
    const hasReachedMovement = current.peakDisplacementRatio >= movementThreshold;
    if (hasReachedMovement && item.timestampMs > current.peakMs && item.displacementRatio <= returnTolerance) {
      attempts.push(finalizeAttempt(current, item, attempts.length + 1));
      current = null;
    }
  });

  if (current && current.peakDisplacementRatio >= movementThreshold) {
    attempts.push(finalizeAttempt(current, series[series.length - 1], attempts.length + 1));
  }

  if (!attempts.length) {
    const maxItem = series.reduce((best, item) => (item.displacementRatio > best.displacementRatio ? item : best), series[0]);
    const endItem = series[series.length - 1];
    attempts.push({
      index: 1,
      startMs: series[0].timestampMs,
      peakMs: maxItem.timestampMs,
      endMs: endItem.timestampMs,
      durationMs: endItem.timestampMs - series[0].timestampMs,
      displacementRatio: round(maxItem.displacementRatio),
      signedDisplacementRatio: round(maxItem.signedDisplacementRatio),
      returnToCenterRatio: round(endItem.displacementRatio),
      baselineDisplacementRatio: round(baselineMotionRatio),
    });
  }

  return attempts.map((attempt) => ({
    ...attempt,
    baselineDisplacementRatio: round(baselineMotionRatio),
  }));
}

function movementPoint(frame, drill) {
  const hipWidth = Math.max(distance(frame, "left_hip", "right_hip") || 1, 1);
  if (drill.sport === "Cricket") {
    const leftAnkle = point(frame, "left_ankle");
    const rightAnkle = point(frame, "right_ankle");
    const leftHip = point(frame, "left_hip");
    const rightHip = point(frame, "right_hip");
    if (!leftAnkle && !rightAnkle) return null;
    if (!leftAnkle) return { x: rightAnkle.x, hipWidth };
    if (!rightAnkle) return { x: leftAnkle.x, hipWidth };
    const leftOffset = leftHip ? Math.abs(leftAnkle.x - leftHip.x) : Math.abs(leftAnkle.x);
    const rightOffset = rightHip ? Math.abs(rightAnkle.x - rightHip.x) : Math.abs(rightAnkle.x);
    return { x: leftOffset >= rightOffset ? leftAnkle.x : rightAnkle.x, hipWidth };
  }

  const center = bodyCenter(frame);
  return center ? { x: center.x, hipWidth } : null;
}

function finalizeAttempt(current, endItem, index) {
  return {
    index,
    startMs: current.startMs,
    peakMs: current.peakMs,
    endMs: endItem.timestampMs,
    durationMs: endItem.timestampMs - current.startMs,
    displacementRatio: round(current.peakDisplacementRatio),
    signedDisplacementRatio: round(current.signedPeakDisplacementRatio),
    returnToCenterRatio: round(endItem.displacementRatio),
  };
}

function deriveMetrics(frames, attempts) {
  const baselineFrames = frames.slice(0, Math.max(1, Math.floor(frames.length * 0.2)));
  const hipWidths = frames.map((frame) => distance(frame, "left_hip", "right_hip")).filter(Number.isFinite);
  const stanceWidths = ratioSeries(frames, "left_ankle", "right_ankle");
  const baselineStanceWidths = ratioSeries(baselineFrames, "left_ankle", "right_ankle");
  const kneeAngles = jointAngleSeries(frames, "hip", "knee", "ankle");
  const baselineKneeAngles = jointAngleSeries(baselineFrames, "hip", "knee", "ankle");
  const hipAngles = jointAngleSeries(frames, "shoulder", "hip", "knee");
  const baselineHipAngles = jointAngleSeries(baselineFrames, "shoulder", "hip", "knee");
  const trunkAngles = frames
    .map((frame) => averageFinite([trunkLean(frame, "left_shoulder", "left_hip"), trunkLean(frame, "right_shoulder", "right_hip")]))
    .filter(Number.isFinite);
  const shoulderTilts = frames
    .map((frame) =>
      shoulderTilt(frame)
    )
    .filter(Number.isFinite);
  const displacements = attempts.map((attempt) => attempt.displacementRatio).filter(Number.isFinite);
  const durations = attempts.map((attempt) => attempt.durationMs).filter(Number.isFinite);
  const firstAttempt = attempts[0] || {};
  const maxAttempt = attempts.reduce((best, attempt) => (attempt.displacementRatio > (best.displacementRatio || 0) ? attempt : best), firstAttempt);
  return {
    stanceWidthRatio: average(baselineStanceWidths),
    kneeFlexionAngle: average(baselineKneeAngles),
    readyFlexionAngle: averageFinite([average(baselineKneeAngles), average(baselineHipAngles)]),
    trunkLean: average(trunkAngles),
    shoulderTilt: average(shoulderTilts),
    leadFootDisplacementRatio: maxAttempt.displacementRatio || 0,
    lateralDisplacementRatio: maxAttempt.displacementRatio || 0,
    returnToCenterRatio: maxAttempt.returnToCenterRatio || 0,
    baselineDisplacementRatio: firstAttempt.baselineDisplacementRatio || 0,
    attemptDurationMs: average(durations),
    attemptDisplacementVariation: standardDeviation(displacements),
    centerSideCenter: firstAttempt.returnToCenterRatio || 0,
    summary: {
      averageHipWidthPx: round(average(hipWidths)),
      averageStanceWidthRatio: round(average(stanceWidths)),
      averageKneeAngle: round(average(kneeAngles)),
      averageTrunkLean: round(average(trunkAngles)),
      averageShoulderTilt: round(average(shoulderTilts)),
      averageAttemptDurationMs: round(average(durations)),
      displacementVariation: round(standardDeviation(displacements)),
      maxDisplacementRatio: round(maxAttempt.displacementRatio || 0),
      averageReturnToCenterRatio: round(average(attempts.map((attempt) => attempt.returnToCenterRatio))),
    },
  };
}

function ratioSeries(frames, leftName, rightName) {
  return frames
    .map((frame) => (distance(frame, leftName, rightName) || 0) / Math.max(distance(frame, "left_hip", "right_hip") || 1, 1))
    .filter(Number.isFinite);
}

function jointAngleSeries(frames, proximal, center, distal) {
  return frames
    .map((frame) =>
      averageFinite([
        angle(frame, `left_${proximal}`, `left_${center}`, `left_${distal}`),
        angle(frame, `right_${proximal}`, `right_${center}`, `right_${distal}`),
      ])
    )
    .filter(Number.isFinite);
}

function shoulderTilt(frame) {
  const left = point(frame, "left_shoulder");
  const right = point(frame, "right_shoulder");
  if (!left || !right) return null;
  return Math.abs((Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI);
}

function compareTrend(previousDetected, score, coverage) {
  if (!previousDetected) {
    return { available: false, message: "No previous session for this drill yet." };
  }
  const scoreDelta = score - Number(previousDetected.score || 0);
  const coverageDelta = coverage - Number(previousDetected.coverage || 0);
  return {
    available: true,
    scoreDelta: round(scoreDelta),
    coverageDelta: round(coverageDelta),
    message:
      scoreDelta >= 0
        ? `Score improved by ${round(scoreDelta)} points compared with the previous session.`
        : `Score is ${Math.abs(round(scoreDelta))} points below the previous session.`,
  };
}

function bodyCenter(frame) {
  const leftHip = point(frame, "left_hip");
  const rightHip = point(frame, "right_hip");
  if (!leftHip && !rightHip) return null;
  if (!leftHip) return rightHip;
  if (!rightHip) return leftHip;
  return { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
}
