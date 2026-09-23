// Live display uses the same exercise thresholds and movement transitions as the
// saved evaluation. The server remains the authority for the final result.
const point = (frame, name) => frame.keypoints?.find((item) => item.name === name && item.confidence >= 0.3);

function angle(frame, a, b, c) {
  const first = point(frame, a);
  const middle = point(frame, b);
  const last = point(frame, c);
  if (!first || !middle || !last) return null;
  const ax = first.x - middle.x;
  const ay = first.y - middle.y;
  const cx = last.x - middle.x;
  const cy = last.y - middle.y;
  const length = Math.hypot(ax, ay) * Math.hypot(cx, cy);
  return length ? Math.acos(Math.max(-1, Math.min(1, (ax * cx + ay * cy) / length))) * 180 / Math.PI : null;
}

function distance(frame, a, b) {
  const first = point(frame, a);
  const last = point(frame, b);
  return first && last ? Math.hypot(first.x - last.x, first.y - last.y) : null;
}

function average(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function bodyLine(frame) {
  return average(["left", "right"].map((side) => {
    const value = angle(frame, `${side}_shoulder`, `${side}_hip`, `${side}_ankle`);
    return value === null ? null : Math.abs(180 - value);
  }));
}

export function createLivePoseTracker(exercise) {
  const name = exercise?.name;
  const thresholds = exercise?.thresholds || {};
  let reps = 0;
  let phase = "ready";
  let startMs = null;
  let bottom = 180;
  let holdStartMs = null;
  let holdSeconds = 0;

  return {
    update(frame) {
      if (frame.quality?.flag !== "sufficient" || !frame.keypoints) return this.snapshot();
      let value = null;
      let unit = "°";
      let cue = "Move into the camera view";

      if (name === "Plank") {
        value = bodyLine(frame);
        if (value === null) return this.snapshot();
        if (value <= thresholds.maxBodyLineDeviation) {
          if (holdStartMs === null) holdStartMs = frame.timestampMs;
          holdSeconds = Math.max(0, (frame.timestampMs - holdStartMs) / 1000);
          phase = "holding";
          cue = "Hold steady";
        } else {
          phase = "adjust";
          cue = "Line up shoulders, hips and ankles";
        }
        return { reps, phase, holdSeconds, value: Math.round(value), unit, cue };
      }

      if (name === "Jumping jack") {
        const hipWidth = distance(frame, "left_hip", "right_hip");
        const ankles = distance(frame, "left_ankle", "right_ankle");
        const wrists = distance(frame, "left_wrist", "right_wrist");
        if (!hipWidth || ankles === null || wrists === null) return this.snapshot();
        value = (ankles + wrists) / (2 * Math.max(hipWidth, 1));
        unit = "×";
        if (phase === "ready" && value > thresholds.closedSeparationRatio) phase = "opening";
        if ((phase === "opening" || phase === "open") && value >= thresholds.openSeparationRatio) phase = "open";
        else if (phase === "open" && value <= thresholds.closedSeparationRatio) {
          reps += 1;
          phase = "ready";
        }
        cue = phase === "open" ? "Bring arms and feet back in" : "Open arms and feet wide";
        return { reps, phase, holdSeconds, value: Math.round(value * 10) / 10, unit, cue };
      }

      if (name === "Push-up") {
        value = average(["left", "right"].map((side) => angle(frame, `${side}_shoulder`, `${side}_elbow`, `${side}_wrist`)));
      } else if (name === "Forward lunge" || name === "Bodyweight squat") {
        const knees = ["left", "right"].map((side) => angle(frame, `${side}_hip`, `${side}_knee`, `${side}_ankle`));
        value = name === "Forward lunge" ? Math.min(...knees.filter(Number.isFinite)) : average(knees);
        if (value === Infinity) value = null;
      }
      if (value === null) return this.snapshot();
      const top = name === "Push-up" ? thresholds.topElbowAngle : thresholds.topKneeAngle;
      const low = name === "Push-up" ? thresholds.bottomElbowAngle : thresholds.bottomKneeAngle;
      const range = name === "Push-up" ? thresholds.minElbowRange : thresholds.minKneeRange;
      if (!Number.isFinite(top) || !Number.isFinite(low) || !Number.isFinite(range)) return this.snapshot();

      if (phase === "ready" && value < top) {
        phase = "lowering";
        startMs = frame.timestampMs;
        bottom = value;
      }
      if (phase === "lowering" || phase === "bottom") {
        bottom = Math.min(bottom, value);
        if (value <= low) phase = "bottom";
        if (phase === "bottom" && value >= top) {
          if (value - bottom >= range && frame.timestampMs > startMs) reps += 1;
          phase = "ready";
          startMs = null;
        }
      }
      cue = phase === "bottom" ? "Push back up" : phase === "lowering" ? "Lower with control" : "Start the next rep";
      return { reps, phase, holdSeconds, value: Math.round(value), unit, cue };
    },
    snapshot() {
      return { reps, phase, holdSeconds, value: null, unit: "", cue: "Keep your full body visible" };
    },
  };
}
