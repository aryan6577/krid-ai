import test from "node:test";
import assert from "node:assert/strict";
import { createAssistantProposalStore } from "../services/assistantProposalService.js";

const baseInput = {
  sport: "Football",
  date: "2026-10-01",
  time: "18:00",
  dateTime: "2026-10-01T18:00:00.000Z",
  capacity: 8,
};

test("assistant proposal cannot be confirmed without explicit user confirmation", () => {
  const store = createAssistantProposalStore();
  const proposal = store.prepare({
    playerId: "p1",
    input: baseInput,
    venues: [{ id: "v1", name: "Arena One" }],
  });

  assert.throws(
    () => store.confirm({ playerId: "p1", proposalId: proposal.id, confirmed: false, venueId: "v1" }),
    /Explicit confirmation is required/
  );
});

test("assistant proposal confirmation is scoped to the owning player and proposed venues", () => {
  const store = createAssistantProposalStore();
  const proposal = store.prepare({
    playerId: "p1",
    input: baseInput,
    venues: [{ id: "v1", name: "Arena One" }],
  });

  assert.throws(
    () => store.confirm({ playerId: "p2", proposalId: proposal.id, confirmed: true, venueId: "v1" }),
    /another player/
  );
  assert.throws(
    () => store.confirm({ playerId: "p1", proposalId: proposal.id, confirmed: true, venueId: "v2" }),
    /not part of this proposal/
  );
});

test("assistant proposal confirmation returns the selected venue for match creation", () => {
  const store = createAssistantProposalStore();
  const proposal = store.prepare({
    playerId: "p1",
    input: baseInput,
    candidates: [{ player: { id: "p2", name: "Asha" }, score: 91 }],
    venues: [{ id: "v1", name: "Arena One" }],
  });

  const result = store.confirm({ playerId: "p1", proposalId: proposal.id, confirmed: true, venueId: "v1" });

  assert.equal(result.proposal.status, "confirmed");
  assert.equal(result.selectedVenue.id, "v1");
  assert.equal(result.capacity, 8);
});
