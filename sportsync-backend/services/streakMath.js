export function calculateStreakFromDates(inputDates, today) {
  const dates = [...new Set(inputDates)].sort().reverse();
  let longest = 0;
  let run = 0;
  let previous = null;
  for (const date of dates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const expected = previous && new Date(`${previous}T00:00:00Z`);
    if (expected) expected.setUTCDate(expected.getUTCDate() - 1);
    run = expected && expected.toISOString().slice(0, 10) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const current = dates[0] === today || dates[0] === yesterday.toISOString().slice(0, 10)
    ? (() => { let count = 0; let expected = dates[0]; for (const date of dates) { if (date !== expected) break; count++; const day = new Date(`${expected}T00:00:00Z`); day.setUTCDate(day.getUTCDate() - 1); expected = day.toISOString().slice(0, 10); } return count; })()
    : 0;
  return { current, longest, lastQualifyingDate: dates[0] || null };
}
