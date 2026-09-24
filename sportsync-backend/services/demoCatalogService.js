const plural = {
  player: "players",
  organisation: "organisations",
  venue: "venues",
  opportunity: "opportunities",
  game: "games",
};

function exampleDate(dayOffset, today = new Date()) {
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + dayOffset));
  return date.toISOString().slice(0, 10);
}

export function buildDemoCatalog(rows, today = new Date()) {
  const catalog = { players: [], organisations: [], venues: [], opportunities: [], games: [] };
  for (const row of rows) {
    const key = plural[row.kind];
    if (!key || !row.payload || typeof row.payload !== "object") continue;
    const item = { ...row.payload, demo: true };
    if (row.kind === "opportunity") item.organisationVerified = false;
    if (row.kind === "game") item.date = exampleDate(item.dayOffset, today);
    catalog[key].push(item);
  }
  for (const items of Object.values(catalog)) items.sort((a, b) => a.id.localeCompare(b.id));
  return catalog;
}
