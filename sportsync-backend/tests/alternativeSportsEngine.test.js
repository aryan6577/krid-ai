import assert from "node:assert/strict";
import test from "node:test";

import { recommendAlternativeSports } from "../rules/alternativeSportsEngine.js";

test("alternative sports recommendations are explainable and exclude current sports", () => {
  const result = recommendAlternativeSports({
    primarySport: "Cricket",
    player: {
      sports: ["Cricket"],
      skill: { Cricket: "Intermediate" },
      preferences: { competitivePreference: "Competitive" },
      location: "Bengaluru",
    },
    limit: 5,
  });

  assert.equal(result.primarySport, "Cricket");
  assert.ok(result.disclaimer.includes("not predictions of success"));
  assert.ok(result.recommendations.length >= 3);
  assert.ok(result.recommendations.length <= 5);
  assert.equal(result.recommendations.some((item) => item.sport === "Cricket"), false);

  const fieldHockey = result.recommendations.find((item) => item.sport === "Field hockey");
  assert.ok(fieldHockey);
  assert.ok(fieldHockey.sharedAttributes.includes("hand-eye coordination"));
  assert.ok(fieldHockey.sharedAttributes.length > 0);
  assert.ok(fieldHockey.similarityFactors.every((factor) => Number.isFinite(factor.contribution)));
  assert.deepEqual(fieldHockey.opportunitySignals, []);
  assert.equal(fieldHockey.framing, "Adjacent sport with shared characteristics, not a talent prediction.");
});

test("alternative sport limit is clamped to the product range", () => {
  const result = recommendAlternativeSports({
    primarySport: "Football",
    player: { sports: ["Football"], preferences: { competitivePreference: "Friendly" } },
    limit: 99,
  });

  assert.equal(result.recommendations.length, 5);
});

test("alternative sports reject unsupported primary sports", () => {
  assert.throws(
    () =>
      recommendAlternativeSports({
        primarySport: "Curling",
        player: { sports: ["Curling"] },
      }),
    /Unsupported primary sport/
  );
});
