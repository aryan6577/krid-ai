// Prototype Exercise Catalog — SRS §4.3 / FR-71 to FR-78.
// Each entry defines the camera view, primary metrics and feedback cues the (simulated)
// CV pipeline reports on. A real deployment swaps the simulated detector in
// ExerciseSession.jsx for the YOLOv8-Pose + rule-engine pipeline described in SRS §6.2 —
// the catalog shape below is designed to carry over unchanged.

export const exerciseCatalog = [
  {
    id: "ex-squat",
    name: "Bodyweight Squat",
    cameraView: "Side / Front",
    difficulty: "Beginner",
    goalTags: ["strength", "lower-body"],
    targetReps: 12,
    targetSets: 3,
    holdDurationSec: null,
    primaryMetrics: ["Knee flexion range", "Depth consistency", "Trunk angle", "Rep count"],
    feedbackCues: ["depth", "tempo", "stance consistency"],
    goodFeedback: [
      "Good depth — hips reaching below knee height consistently.",
      "Tempo is even across reps, nice control on the way down.",
      "Stance width is consistent rep to rep.",
    ],
    improvementFeedback: [
      "Try to reach a bit more depth on your squat.",
      "Slow the lowering phase for better control.",
      "Keep your stance width consistent between reps.",
    ],
  },
  {
    id: "ex-lunge",
    name: "Forward Lunge",
    cameraView: "Side / Front",
    difficulty: "Beginner",
    goalTags: ["strength", "lower-body", "balance"],
    targetReps: 10,
    targetSets: 3,
    holdDurationSec: null,
    primaryMetrics: ["Front knee/hip angle", "Step consistency", "Rep count"],
    feedbackCues: ["step length", "balance cue", "knee tracking proxy"],
    goodFeedback: [
      "Step length is consistent between reps — good stride control.",
      "Balance looks stable through the movement.",
      "Front knee is tracking well over the ankle.",
    ],
    improvementFeedback: [
      "Increase your step length slightly for a deeper lunge.",
      "Focus on balance — try to minimise side-to-side wobble.",
      "Keep the front knee tracking over the ankle, not past the toes.",
    ],
  },
  {
    id: "ex-pushup",
    name: "Push-up",
    cameraView: "Side",
    difficulty: "Intermediate",
    goalTags: ["strength", "upper-body"],
    targetReps: 15,
    targetSets: 3,
    holdDurationSec: null,
    primaryMetrics: ["Elbow angle", "Body-line proxy", "Rep count"],
    feedbackCues: ["range of motion", "tempo", "hip position proxy"],
    goodFeedback: [
      "Full range of motion on most reps — chest reaching close to the floor.",
      "Body-line stayed straight throughout the set.",
      "Tempo is controlled on both the up and down phase.",
    ],
    improvementFeedback: [
      "Increase range of motion — lower a bit further on each rep.",
      "Watch your hip position, it's dropping slightly through the set.",
      "Slow down the descent for better control.",
    ],
  },
  {
    id: "ex-plank",
    name: "Plank",
    cameraView: "Side",
    difficulty: "Beginner",
    goalTags: ["core", "endurance"],
    targetReps: null,
    targetSets: 1,
    holdDurationSec: 45,
    primaryMetrics: ["Body-line proxy", "Hold duration"],
    feedbackCues: ["alignment cue", "hold duration"],
    goodFeedback: [
      "Great alignment — shoulders, hips and ankles stayed in one line.",
      "Hold duration target reached with steady form.",
    ],
    improvementFeedback: [
      "Hips are dropping slightly — engage your core to flatten the line.",
      "Try to extend your hold duration a little further next session.",
    ],
  },
  {
    id: "ex-jumping-jack",
    name: "Jumping Jack",
    cameraView: "Front",
    difficulty: "Beginner",
    goalTags: ["cardio", "warm-up"],
    targetReps: 20,
    targetSets: 2,
    holdDurationSec: null,
    primaryMetrics: ["Limb separation", "Cycle count"],
    feedbackCues: ["tempo", "symmetry"],
    goodFeedback: [
      "Good symmetry — both arms and legs moving together.",
      "Tempo is consistent across the set.",
    ],
    improvementFeedback: [
      "Try to keep left and right side movement more symmetric.",
      "Aim for a steadier, even tempo across all reps.",
    ],
  },
];

export function getExerciseById(id) {
  return exerciseCatalog.find((e) => e.id === id) || null;
}
