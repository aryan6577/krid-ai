import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demoCatalogSeed } from "../scripts/buildDemoCatalog.mjs";
import { buildDemoCatalog } from "../services/demoCatalogService.js";

const rows = demoCatalogSeed.map(([kind, payload]) => ({ kind, payload }));
const catalog = buildDemoCatalog(rows, new Date("2026-09-23T00:00:00Z"));

test("demo seed has the requested population and connected examples", () => {
  assert.equal(catalog.players.length, 24);
  assert.equal(catalog.organisations.length, 12);
  assert.equal(catalog.venues.length, 12);
  assert.equal(catalog.opportunities.length, 12);
  assert.equal(catalog.games.length, 10);
  const ids = demoCatalogSeed.map(([, payload]) => payload.id);
  assert.equal(new Set(ids).size, ids.length);
  const orgs = new Map(catalog.organisations.map((org) => [org.id, org]));
  const venues = new Map(catalog.venues.map((venue) => [venue.id, venue]));
  const players = new Map(catalog.players.map((player) => [player.id, player]));
  for (const venue of catalog.venues) {
    assert.equal(venue.orgName, orgs.get(venue.orgId)?.name);
    assert.equal(venue.sport, orgs.get(venue.orgId)?.sport);
    assert.equal(venue.location, orgs.get(venue.orgId)?.location);
    assert.ok(!venue.name.includes("Courts Courts"));
  }
  for (const opportunity of catalog.opportunities) {
    assert.equal(opportunity.orgName, orgs.get(opportunity.orgId)?.name);
    assert.equal(opportunity.location, orgs.get(opportunity.orgId)?.location);
    assert.equal(opportunity.organisationVerified, false);
    assert.equal(opportunity.deadline, null);
  }
  for (const game of catalog.games) {
    assert.equal(game.venue, venues.get(game.venueId)?.name);
    assert.equal(game.sport, venues.get(game.venueId)?.sport);
    assert.match(game.date, /^2026-\d\d-\d\d$/);
    for (const playerId of game.participants) assert.ok(players.get(playerId)?.sports.includes(game.sport));
  }
});

test("sample profiles cannot be mistaken for authenticated accounts or verified activity", () => {
  for (const player of catalog.players) {
    assert.equal(player.demo, true);
    assert.equal(player.email, undefined);
    assert.equal(player.streak, undefined);
    assert.equal(player.performance, undefined);
  }
  for (const org of catalog.organisations) {
    assert.equal(org.demo, true);
    assert.equal(org.verification, "Fictional example");
  }
  const sql = readFileSync(new URL("../supabase/migrations/202609230003_demo_catalog_alignment.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.demo_catalog_entries/);
  assert.match(sql, /revoke all on public\.demo_catalog_entries from anon, authenticated/);
  for (const id of demoCatalogSeed.map(([, payload]) => payload.id)) assert.ok(sql.includes(id));
  for (const org of catalog.organisations) {
    const area = org.name.split(" ")[0];
    if (["Indiranagar", "Whitefield", "Koramangala", "HSR", "Malleshwaram", "Bellandur", "Jayanagar", "JP"].includes(area)) {
      assert.ok(org.location.startsWith(area), `${org.name} is placed in ${org.location}`);
    }
  }
});
