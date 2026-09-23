import { randomUUID } from "crypto";

const DEFAULT_TTL_MS = 30 * 60 * 1000;

export class AssistantProposalError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "AssistantProposalError";
    this.status = status;
  }
}

export function createAssistantProposalStore({ now = () => new Date(), ttlMs = DEFAULT_TTL_MS } = {}) {
  const proposals = new Map();

  function prepare({ playerId, input, candidates = [], venues = [] }) {
    if (!playerId) throw new AssistantProposalError("playerId is required.");
    if (!input?.sport || !input?.dateTime) {
      throw new AssistantProposalError("sport and dateTime are required.");
    }

    const createdAt = now();
    const proposal = {
      id: randomUUID(),
      playerId,
      status: "prepared",
      confirmationRequired: true,
      action: "create_match",
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + ttlMs).toISOString(),
      sport: input.sport,
      date: input.date || "",
      time: input.time || "",
      dateTime: input.dateTime,
      location: input.location || "",
      preferences: input.preferences || "",
      capacity: Number(input.capacity || 10),
      candidates,
      venues,
      forbiddenActions: ["booking", "payment", "match_creation_without_confirmation"],
    };

    proposals.set(proposal.id, proposal);
    return proposal;
  }

  function confirm({ playerId, proposalId, confirmed, venueId, capacity }) {
    const proposal = proposals.get(proposalId);
    if (!proposal) throw new AssistantProposalError("Proposal not found.", 404);
    if (proposal.playerId !== playerId) throw new AssistantProposalError("Proposal belongs to another player.", 403);
    if (proposal.status !== "prepared") throw new AssistantProposalError(`Proposal is already ${proposal.status}.`, 409);
    if (new Date(proposal.expiresAt).getTime() < now().getTime()) {
      proposal.status = "expired";
      throw new AssistantProposalError("Proposal has expired.", 410);
    }
    if (confirmed !== true) {
      throw new AssistantProposalError("Explicit confirmation is required before a match can be created.", 428);
    }
    if (!venueId) throw new AssistantProposalError("venueId is required for confirmation.");

    const selectedVenue = proposal.venues.find((venue) => venue.id === venueId);
    if (!selectedVenue) throw new AssistantProposalError("Selected venue is not part of this proposal.", 409);

    proposal.status = "confirmed";
    proposal.confirmedAt = now().toISOString();
    proposal.selectedVenueId = venueId;
    proposal.capacity = Number(capacity || proposal.capacity || 10);
    return { proposal, selectedVenue, capacity: proposal.capacity };
  }

  return {
    prepare,
    confirm,
    get: (proposalId) => proposals.get(proposalId) || null,
    clear: () => proposals.clear(),
  };
}
