// Seeds for the Unified Activity Event stream — SRS §4.6 / FR-86, FR-87.
// One activity event is created whenever a match result, exercise session or tutorial
// session qualifies (see src/lib/activity.js). Dates below are generated relative to
// "today" at load time so the demo streak always looks current, mirroring a longest
// historical run followed by a fresh current run (matching the previous static
// 6-day current / 14-day longest demo numbers).

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function buildSeedActivityEvents() {
  const events = [];

  // Historical longest streak: 14 consecutive qualifying days, ending ~20 days ago
  for (let i = 0; i < 14; i++) {
    const daysAgo = 20 + (13 - i);
    const type = i % 3 === 0 ? "exercise" : i % 3 === 1 ? "match" : "tutorial";
    events.push({
      id: `seed-long-${i}`,
      type,
      sourceId: "seed-history",
      localDate: isoDaysAgo(daysAgo),
      qualifying: true,
      createdAt: new Date().toISOString(),
    });
  }

  // Current streak: 6 consecutive qualifying days, ending today
  for (let i = 0; i < 6; i++) {
    const daysAgo = 5 - i;
    const type = i % 2 === 0 ? "match" : "exercise";
    events.push({
      id: `seed-current-${i}`,
      type,
      sourceId: "seed-recent",
      localDate: isoDaysAgo(daysAgo),
      qualifying: true,
      createdAt: new Date().toISOString(),
    });
  }

  return events;
}
