// Pilot Tutorial Scope — SRS §4.4 / FR-79 to FR-83.
// Two pilot sports, one camera-friendly drill each, with a small set of measurable checkpoints.
// Deliberately bounded per SRS §13.3 — no claim of full biomechanics or live match analysis.

export const tutorialCatalog = [
  {
    id: "tut-cricket-stance",
    sport: "Cricket",
    drillName: "Batting Stance + Shadow Front-Foot Movement",
    cameraView: "Side",
    scopeNote: "No claim of ball trajectory or full batting biomechanics.",
    checkpoints: [
      { id: "stance-width", label: "Stance width proxy", description: "Feet set at a consistent, shoulder-width stance." },
      { id: "knee-flexion", label: "Knee flexion", description: "Slight, even flexion in both knees through the stance." },
      { id: "trunk-orientation", label: "Trunk orientation", description: "Trunk facing side-on toward the imaginary bowler." },
      { id: "foot-placement", label: "Foot placement proxy", description: "Front foot steps toward the pitch of the ball." },
      { id: "rep-consistency", label: "Repetition consistency", description: "Movement repeats consistently across attempts." },
    ],
  },
  {
    id: "tut-football-ready",
    sport: "Football",
    drillName: "Ready Stance + Lateral Movement Drill",
    cameraView: "Front",
    scopeNote: "No live match event detection in Tutorial Mode.",
    checkpoints: [
      { id: "ready-stance", label: "Ready stance", description: "Knees bent, weight balanced on the balls of the feet." },
      { id: "knee-hip-flexion", label: "Knee/hip flexion proxy", description: "Consistent flexion angle held between shuffles." },
      { id: "lateral-movement", label: "Side-to-side movement", description: "Clean lateral shuffle without crossing the feet." },
      { id: "timing-consistency", label: "Timing / consistency", description: "Even timing between left and right shuffles." },
      { id: "body-orientation", label: "Body orientation", description: "Shoulders and hips stay square throughout." },
    ],
  },
];

export function getTutorialById(id) {
  return tutorialCatalog.find((t) => t.id === id) || null;
}
