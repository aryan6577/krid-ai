import test from "node:test";
import assert from "node:assert/strict";
import { createLivePoseTracker } from "../src/lib/livePoseTracker.js";

const names = ["nose", "left_eye", "right_eye", "left_ear", "right_ear", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"];

function frame(timestampMs, overrides = {}, flag = "sufficient") {
  return {
    timestampMs,
    quality: { flag },
    keypoints: names.map((name) => ({ name, x: 0, y: 0, confidence: 0.9, ...overrides[name] })),
  };
}

function pushupFrame(time, elbowAngle) {
  const radians = elbowAngle * Math.PI / 180;
  const joints = {};
  for (const side of ["left", "right"]) {
    joints[`${side}_shoulder`] = { x: 1, y: 0 };
    joints[`${side}_elbow`] = { x: 0, y: 0 };
    joints[`${side}_wrist`] = { x: Math.cos(radians), y: Math.sin(radians) };
  }
  return frame(time, joints);
}

test("counts a complete push-up after returning from the bottom", () => {
  const tracker = createLivePoseTracker({ name: "Push-up", thresholds: { topElbowAngle: 155, bottomElbowAngle: 105, minElbowRange: 45 } });
  assert.equal(tracker.update(pushupFrame(0, 170)).reps, 0);
  assert.equal(tracker.update(pushupFrame(300, 90)).phase, "bottom");
  assert.equal(tracker.update(pushupFrame(700, 170)).reps, 1);
  assert.equal(tracker.update(pushupFrame(900, 170)).reps, 1);
});

test("ignores an incomplete movement and insufficient pose", () => {
  const tracker = createLivePoseTracker({ name: "Push-up", thresholds: { topElbowAngle: 155, bottomElbowAngle: 105, minElbowRange: 45 } });
  tracker.update(pushupFrame(0, 170));
  tracker.update(pushupFrame(300, 125));
  assert.equal(tracker.update(pushupFrame(700, 170)).reps, 0);
  const hidden = pushupFrame(900, 90);
  hidden.quality.flag = "insufficient";
  assert.equal(tracker.update(hidden).reps, 0);
});

test("plank hold begins with the first aligned frame", () => {
  const tracker = createLivePoseTracker({ name: "Plank", thresholds: { maxBodyLineDeviation: 22 } });
  const aligned = { left_shoulder: { x: 0, y: 0 }, left_hip: { x: 1, y: 0 }, left_ankle: { x: 2, y: 0 } };
  assert.equal(tracker.update(frame(100, aligned)).holdSeconds, 0);
  assert.equal(tracker.update(frame(2100, aligned)).holdSeconds, 2);
});

test("jumping jack counts only after opening and closing", () => {
  const tracker = createLivePoseTracker({ name: "Jumping jack", thresholds: { closedSeparationRatio: 1.15, openSeparationRatio: 2.1 } });
  const closed = { left_hip: { x: 0 }, right_hip: { x: 10 }, left_ankle: { x: 0 }, right_ankle: { x: 10 }, left_wrist: { x: 0 }, right_wrist: { x: 10 } };
  const open = { ...closed, left_ankle: { x: -10 }, right_ankle: { x: 20 }, left_wrist: { x: -10 }, right_wrist: { x: 20 } };
  tracker.update(frame(0, closed));
  assert.equal(tracker.update(frame(400, open)).reps, 0);
  assert.equal(tracker.update(frame(800, closed)).reps, 1);
});
