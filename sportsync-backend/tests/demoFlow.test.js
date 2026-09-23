import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bookingPlanForVenue, connectionStatusForTarget, demoTeammateProblem } from "../services/demoFlowService.js";

test("demo contacts connect immediately while real people must accept", () => {
  assert.equal(connectionStatusForTarget({ is_demo: true }), "accepted");
  assert.equal(connectionStatusForTarget({ is_demo: false }), "pending");
});

test("demo venue choices never create a payable booking", () => {
  assert.deepEqual(bookingPlanForVenue({ is_demo: true, price_per_hour: 900 }), {
    amount: 0, status: "demo_reserved", is_demo: true,
  });
  assert.deepEqual(bookingPlanForVenue({ is_demo: false, price_per_hour: 900 }), {
    amount: 900, status: "pending", is_demo: false,
  });
});

test("only accepted demo friends can be placed in a creator's demo game", () => {
  const game = { created_by: "creator", is_demo: true, sport: "Football", participant_count: 1, capacity: 4 };
  const target = { is_demo: true, sports: ["Football"] };
  const valid = { game, requesterId: "creator", target, connection: { status: "accepted" }, alreadyJoined: false };
  assert.equal(demoTeammateProblem(valid), null);
  assert.equal(demoTeammateProblem({ ...valid, requesterId: "other" }).status, 403);
  assert.equal(demoTeammateProblem({ ...valid, game: { ...game, is_demo: false } }).status, 409);
  assert.equal(demoTeammateProblem({ ...valid, target: { is_demo: false, sports: ["Football"] } }).status, 400);
  assert.equal(demoTeammateProblem({ ...valid, target: { is_demo: true, sports: ["Tennis"] } }).status, 400);
  assert.equal(demoTeammateProblem({ ...valid, game: { ...game, participant_count: 4 } }).status, 409);
  assert.equal(demoTeammateProblem({ ...valid, connection: { status: "pending" } }).status, 403);
  assert.equal(demoTeammateProblem({ ...valid, alreadyJoined: true }).status, 409);
});

test("interactive fixtures are inserted into the primary tables without auth identities", () => {
  const sql = readFileSync(new URL("../supabase/migrations/202609230004_interactive_demo_records.sql", import.meta.url), "utf8");
  for (const table of ["players", "organisations", "venues", "games", "game_participants"]) {
    assert.match(sql, new RegExp(`insert into public\\.${table}\\b`));
  }
  assert.match(sql, /add column if not exists is_demo boolean not null default false/g);
  assert.doesNotMatch(sql, /insert into (?:auth\.users|public\.account_profiles)/);
});
