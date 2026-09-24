import assert from "node:assert/strict";
import test from "node:test";

import { TUTORIAL_DRILL_CATALOG } from "../rules/tutorialCatalog.js";
import { evaluateTutorialSession } from "../rules/tutorialRuleEngine.js";

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

test("tutorial catalog is limited to the two pilot drills", () => {
  assert.deepEqual(
    TUTORIAL_DRILL_CATALOG.map((drill) => `${drill.sport}:${drill.drillName}`),
    [
      "Cricket:Batting stance + shadow front-foot movement",
      "Football:Ready stance + lateral movement drill",
    ]
  );
});

test("cricket tutorial evaluates configured positional, sequential, and consistency checkpoints", () => {
  const evaluation = evaluateTutorialSession({
    sport: "Cricket",
    drillName: "Batting stance + shadow front-foot movement",
    pose: pose([
      cricketFrame(0, 75),
      cricketFrame(400, 75),
      cricketFrame(900, 20),
      cricketFrame(1300, 75),
      cricketFrame(1900, 22),
      cricketFrame(2400, 75),
    ]),
  });

  assert.equal(evaluation.completion.completed, true);
  assert.equal(evaluation.score, 100);
  assert.equal(evaluation.checkpointResults.length, 5);
  assert.equal(evaluation.metrics.attemptCount, 2);
  assert.equal(evaluation.weakCheckpoints.length, 0);
  assert.equal(evaluation.missedCheckpoints.length, 0);
});

test("football tutorial requires the quality gate before completion", () => {
  const evaluation = evaluateTutorialSession({
    sport: "Football",
    drillName: "Ready stance + lateral movement drill",
    pose: pose(
      [
        footballFrame(0, 0),
        footballFrame(400, 0),
        footballFrame(900, 70),
        footballFrame(1400, 0),
        footballFrame(1900, -70),
        footballFrame(2400, 0),
      ],
      {
        status: "insufficient_quality",
        extraFrames: [
          {
            frameIndex: 6,
            timestampMs: 2800,
            quality: { flag: "insufficient", requestReframing: true, reasons: ["severe_occlusion"] },
            keypoints: null,
          },
        ],
      }
    ),
  });

  assert.equal(evaluation.completion.targetMet, true);
  assert.equal(evaluation.completion.completed, false);
  assert.equal(evaluation.completion.status, "manual_confirmation_required");
  assert.equal(evaluation.detectionQuality.state, "Limited");
});

test("tutorial mode rejects drills outside the pilot scope", () => {
  assert.throws(
    () =>
      evaluateTutorialSession({
        sport: "Badminton",
        drillName: "Serve timing",
        pose: pose([footballFrame(0, 0), footballFrame(500, 70)]),
      }),
    /Unsupported tutorial drill/
  );
});

function pose(frames, options = {}) {
  const allFrames = [...frames, ...(options.extraFrames || [])].map((frame, index) => ({ ...frame, frameIndex: index }));
  return {
    schemaVersion: "krid.cv.pose.v1",
    status: options.status || "ok",
    requestReframing: options.status === "insufficient_quality",
    sampling: {
      requestedFps: 5,
      sourceFps: 30,
      frameInterval: 6,
      maxSamples: 120,
      processedSamples: allFrames.length,
    },
    frames: allFrames,
  };
}

function cricketFrame(timestampMs, leftAnkleX) {
  return frame(timestampMs, {
    left_shoulder: [100, 100],
    right_shoulder: [200, 100],
    left_hip: [100, 200],
    right_hip: [200, 200],
    left_knee: [125, 280],
    right_knee: [175, 280],
    left_ankle: [leftAnkleX, 360],
    right_ankle: [225, 360],
  });
}

function footballFrame(timestampMs, lateralOffset) {
  return frame(timestampMs, {
    left_shoulder: [100 + lateralOffset, 100],
    right_shoulder: [200 + lateralOffset, 100],
    left_hip: [100 + lateralOffset, 200],
    right_hip: [200 + lateralOffset, 200],
    left_knee: [130 + lateralOffset, 280],
    right_knee: [170 + lateralOffset, 280],
    left_ankle: [75 + lateralOffset, 360],
    right_ankle: [225 + lateralOffset, 360],
  });
}

function frame(timestampMs, overrides) {
  const defaults = {
    nose: [150, 50],
    left_eye: [140, 45],
    right_eye: [160, 45],
    left_ear: [130, 50],
    right_ear: [170, 50],
    left_elbow: [80, 180],
    right_elbow: [220, 180],
    left_wrist: [70, 250],
    right_wrist: [230, 250],
    ...overrides,
  };

  return {
    timestampMs,
    quality: { flag: "sufficient", requestReframing: false, reasons: [] },
    keypoints: KEYPOINT_NAMES.map((name) => ({
      name,
      x: defaults[name][0],
      y: defaults[name][1],
      confidence: 0.95,
    })),
  };
}
