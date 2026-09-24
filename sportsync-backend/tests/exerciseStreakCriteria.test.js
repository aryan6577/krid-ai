import test from "node:test";
import assert from "node:assert/strict";
import { evaluateExerciseSession } from "../rules/exerciseRuleEngine.js";
import { calculateStreakFromDates } from "../services/streakMath.js";

const names = [
  "nose", "left_eye", "right_eye", "left_ear", "right_ear",
  "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle",
];

function poseFrame(timestampMs, sufficient = true) {
  const positions = {
    left_shoulder: [50, 100], right_shoulder: [50, 110],
    left_hip: [100, 100], right_hip: [100, 110],
    left_ankle: [150, 100], right_ankle: [150, 110],
  };
  return {
    frameIndex: Math.round(timestampMs / 200), timestampMs,
    quality: { flag: sufficient ? "sufficient" : "insufficient", reasons: sufficient ? [] : ["body_not_visible"] },
    keypoints: sufficient ? names.map((name) => ({ name, x: positions[name]?.[0] ?? 80, y: positions[name]?.[1] ?? 80, confidence: 0.9 })) : null,
  };
}

function evaluate(frames) {
  return evaluateExerciseSession({
    exerciseName: "Plank", targets: { holdSeconds: 1 },
    pose: {
      schemaVersion: "krid.cv.pose.v1",
      status: frames.every((frame) => frame.quality.flag === "sufficient") ? "ok" : "insufficient_quality",
      requestReframing: frames.some((frame) => frame.quality.flag !== "sufficient"),
      frames,
    },
  });
}

test("one completed, reliably tracked exercise earns one streak day", () => {
  const result = evaluate([poseFrame(0), poseFrame(600), poseFrame(1200)]);
  assert.equal(result.completion.completed, true);
  assert.equal(result.completion.targetMet, true);
  assert.equal(result.detectionQuality.state, "Good");
  assert.equal(calculateStreakFromDates(["2026-09-23"], "2026-09-23").current, 1);
  assert.equal(calculateStreakFromDates(["2026-09-22", "2026-09-23"], "2026-09-23").current, 2);
  assert.equal(calculateStreakFromDates(["2026-09-22", "2026-09-23", "2026-09-23"], "2026-09-23").current, 2);
});

test("short or poor-quality exercise does not automatically complete", () => {
  const short = evaluate([poseFrame(0), poseFrame(500)]);
  const unclear = evaluate([poseFrame(0), poseFrame(600, false), poseFrame(1200)]);
  assert.equal(short.completion.completed, false);
  assert.equal(short.completion.targetMet, false);
  assert.equal(unclear.completion.completed, false);
  assert.equal(unclear.completion.targetMet, true);
  assert.equal(unclear.completion.manualConfirmationRequired, true);
});
