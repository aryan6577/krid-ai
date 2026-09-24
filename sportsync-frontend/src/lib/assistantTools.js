import { api } from "./api";

export async function executeTool(name, args, ctx) {
  switch (name) {
    case "prepare_match_proposal": {
      if (!ctx.token) {
        return { ok: false, message: "Sign in is required before preparing a match proposal." };
      }
      const data = await api.createAssistantMatchProposal(ctx.token, args);
      return {
        ok: true,
        message:
          "Prepared a match proposal. It still requires explicit user confirmation before any match is created.",
        proposal: data.proposal,
      };
    }

    default:
      return { ok: false, message: `Unknown or unsupported assistant action "${name}".` };
  }
}
