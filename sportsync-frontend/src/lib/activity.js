// Unified Activity Event + Streak service — SRS §4.6 / FR-86, FR-87.
// A single Activity Event contract is shared by match results, exercise sessions and
// tutorial sessions (BR-... "same Activity Event contract... so streaks remain consistent",
// Principle 4 in SRS §3.3). Only one qualifying increment is counted per calendar day
// (BR-21); this uses the browser's local calendar date, matching "timezone-aware" (BR-10)
// for the single-user prototype.

export function localDateToday() {
  return new Date().toISOString().slice(0, 10);
}

export function buildActivityEvent(type, sourceId, extra = {}) {
  return {
    id: `ae-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type, // "match" | "exercise" | "tutorial"
    sourceId,
    localDate: localDateToday(),
    qualifying: true,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

// Computes { current, longest, lastQualifyingDate } from a list of Activity Events.
// Longest = longest run of consecutive calendar days anywhere in history.
// Current = run of consecutive days ending today or yesterday (0 if the streak is broken).
export function computeUnifiedStreak(events) {
  const dates = [...new Set(events.filter((e) => e.qualifying).map((e) => e.localDate))].sort();
  if (!dates.length) return { current: 0, longest: 0, lastQualifyingDate: null };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const diffDays = Math.round((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000);
    run = diffDays === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDate = new Date(dates[dates.length - 1]);
  const daysSinceLast = Math.round((today - lastDate) / 86400000);

  let current = 0;
  if (daysSinceLast <= 1) {
    current = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const diffDays = Math.round((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000);
      if (diffDays === 1) current++;
      else break;
    }
  }

  return { current, longest, lastQualifyingDate: dates[dates.length - 1] };
}

// AC-30 — merges match/exercise/tutorial records into one chronological timeline.
export function buildActivityTimeline({ performanceHistory = [], exerciseSessions = [], tutorialSessions = [] } = {}) {
  const items = [
    ...performanceHistory.map((g) => ({
      id: g.gameId,
      type: "match",
      date: g.date,
      title: `${g.sport} · ${g.score}`,
      subtitle: g.result,
    })),
    ...exerciseSessions.map((s) => ({
      id: s.id,
      type: "exercise",
      date: s.date,
      title: s.exerciseName,
      subtitle: s.completion === "complete" ? "Completed" : "Incomplete",
    })),
    ...tutorialSessions.map((s) => ({
      id: s.id,
      type: "tutorial",
      date: s.date,
      title: `${s.sport} · ${s.drillName}`,
      subtitle: `${s.checkpointsPassed}/${s.checkpointsTotal} checkpoints`,
    })),
  ];
  return items.sort((a, b) => (a.date < b.date ? 1 : -1));
}
