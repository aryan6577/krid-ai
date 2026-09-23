import { isFiniteNumber, round, rule } from "./exerciseRuleEngine.js";

export function evaluateCheckpointDefinition(checkpoint, metrics) {
  const value = metrics[checkpoint.metric];
  const thresholds = checkpoint.thresholds || {};
  const evaluation = evaluateCompletionRule(checkpoint.completionRule, value, thresholds, metrics);

  return {
    checkpointId: checkpoint.id,
    label: checkpoint.label,
    type: checkpoint.type,
    metric: checkpoint.metric,
    completionRule: checkpoint.completionRule,
    keyJoints: checkpoint.keyJoints || [],
    value: round(value),
    threshold: evaluation.threshold,
    completed: evaluation.completed,
    status: evaluation.completed ? "completed" : isFiniteNumber(value) ? "weak" : "missed",
    cue: checkpoint.cue,
  };
}

export function evaluateCheckpointDefinitions(checkpoints, metrics) {
  return checkpoints.map((checkpoint) => evaluateCheckpointDefinition(checkpoint, metrics));
}

export function checkpointResultsToRules(checkpointResults) {
  return checkpointResults.map((checkpoint) => ({
    ...rule(checkpoint.checkpointId, checkpoint.checkpointId, checkpoint.value, checkpoint.threshold, checkpoint.completed, checkpoint.cue),
    type: checkpoint.type,
    label: checkpoint.label,
    producedFeedback: !checkpoint.completed,
  }));
}

function evaluateCompletionRule(completionRule, value, thresholds, metrics) {
  if (completionRule === "range") {
    return {
      completed: isFiniteNumber(value) && value >= thresholds.min && value <= thresholds.max,
      threshold: `${thresholds.min}-${thresholds.max}`,
    };
  }

  if (completionRule === "min") {
    return {
      completed: isFiniteNumber(value) && value >= thresholds.min,
      threshold: thresholds.min,
    };
  }

  if (completionRule === "max") {
    return {
      completed: isFiniteNumber(value) && value <= thresholds.max,
      threshold: thresholds.max,
    };
  }

  if (completionRule === "duration_window") {
    return {
      completed: isFiniteNumber(value) && value >= thresholds.minMs && value <= thresholds.maxMs,
      threshold: `${thresholds.minMs}-${thresholds.maxMs}ms`,
    };
  }

  if (completionRule === "variation_max") {
    return {
      completed: isFiniteNumber(value) && value <= thresholds.maxVariation,
      threshold: thresholds.maxVariation,
    };
  }

  if (completionRule === "baseline_then_displacement") {
    const baseline = metrics.baselineDisplacementRatio;
    const displacement = metrics.leadFootDisplacementRatio;
    return {
      completed: isFiniteNumber(baseline) && isFiniteNumber(displacement) && baseline <= thresholds.baselineMax && displacement >= thresholds.displacementMin,
      threshold: `baseline <= ${thresholds.baselineMax}, movement >= ${thresholds.displacementMin}`,
    };
  }

  if (completionRule === "center_side_center") {
    return {
      completed:
        isFiniteNumber(metrics.lateralDisplacementRatio) &&
        isFiniteNumber(metrics.returnToCenterRatio) &&
        metrics.lateralDisplacementRatio >= thresholds.sideDisplacementMin &&
        metrics.returnToCenterRatio <= thresholds.returnTolerance,
      threshold: `side >= ${thresholds.sideDisplacementMin}, return <= ${thresholds.returnTolerance}`,
    };
  }

  return { completed: false, threshold: "unsupported rule" };
}
