import test from "node:test";
import assert from "node:assert/strict";
import { calculateStreakFromDates } from "../services/streakMath.js";

test("multiple qualifying events on one local day count once", () => {
  assert.deepEqual(calculateStreakFromDates(["2026-09-23", "2026-09-23", "2026-09-22"], "2026-09-23"), { current: 2, longest: 2, lastQualifyingDate: "2026-09-23" });
});

test("a missed day ends the current run and correction can lower historical longest", () => {
  assert.deepEqual(calculateStreakFromDates(["2026-09-20", "2026-09-19", "2026-09-18"], "2026-09-23"), { current: 0, longest: 3, lastQualifyingDate: "2026-09-20" });
  assert.equal(calculateStreakFromDates(["2026-09-20", "2026-09-18"], "2026-09-23").longest, 1);
});

test("yesterday retains a streak until today's opportunity to qualify", () => {
  assert.equal(calculateStreakFromDates(["2026-09-22", "2026-09-21"], "2026-09-23").current, 2);
});
