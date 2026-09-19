// Executes a tool call requested by the LLM against the app's local (demo) state.
// Each function returns a small JSON-serialisable result that gets fed back to the
// model so it can confirm what happened in natural language.

const norm = (s) => (s || "").toString().trim().toLowerCase();

export async function executeTool(name, args, ctx) {
  switch (name) {
    case "book_venue": {
      const wanted = norm(args.venueName);
      const venue =
        ctx.venues.find((v) => norm(v.name) === wanted) ||
        ctx.venues.find((v) => norm(v.name).includes(wanted) || wanted.includes(norm(v.name)));
      if (!venue) {
        return { ok: false, message: `Couldn't find a venue matching "${args.venueName}".` };
      }
      ctx.bookVenue({ venueName: venue.name, date: args.date, time: args.time });
      return { ok: true, message: `Booked ${venue.name} on ${args.date} at ${args.time}.` };
    }

    case "join_game": {
      const game = ctx.games.find((g) => g.id === args.gameId);
      if (!game) {
        return { ok: false, message: `Couldn't find a game with id "${args.gameId}".` };
      }
      ctx.joinGame(args.gameId);
      return { ok: true, message: `Joined ${game.sport} at ${game.venue} on ${game.date} (${game.time}).` };
    }

    case "message_friends": {
      const accepted = ctx.friends.filter((f) => f.status === "accepted" && f.player);
      let targets = accepted;
      const target = norm(args.target);
      if (target && target !== "all") {
        const names = target.split(",").map((s) => s.trim());
        targets = accepted.filter((f) => names.some((n) => norm(f.player.name).includes(n)));
      }
      if (targets.length === 0) {
        return { ok: false, message: "Couldn't find any matching friends to message." };
      }
      targets.forEach((f) => ctx.sendFriendMessage(f.playerId, args.text));
      return { ok: true, message: `Sent "${args.text}" to ${targets.map((t) => t.player.name).join(", ")}.` };
    }

    case "apply_funding": {
      const wanted = norm(args.provider);
      const opp = ctx.funding.find((o) => norm(o.provider).includes(wanted) || wanted.includes(norm(o.provider)));
      if (!opp) {
        return { ok: false, message: `Couldn't find a funding opportunity from "${args.provider}".` };
      }
      ctx.applyToFunding(opp.id);
      return { ok: true, message: `Applied to the ${opp.provider} funding opportunity.` };
    }

    case "submit_fund_request": {
      ctx.submitFundRequest({
        title: args.title,
        purpose: args.purpose,
        amount: args.amount || "",
        deadline: args.deadline || "",
      });
      return { ok: true, message: `Submitted a new fund request: "${args.title}".` };
    }

    case "apply_career": {
      const wanted = norm(args.title);
      const opp = ctx.career.find((o) => norm(o.title).includes(wanted) || wanted.includes(norm(o.title)));
      if (!opp) {
        return { ok: false, message: `Couldn't find a career opportunity matching "${args.title}".` };
      }
      ctx.applyToCareer(opp.id);
      return { ok: true, message: `Applied to "${opp.title}" at ${opp.orgName}.` };
    }

    case "submit_career_request": {
      ctx.submitCareerRequest({ title: args.title, sport: args.sport, details: args.details });
      return { ok: true, message: `Submitted a new career request: "${args.title}".` };
    }

    case "request_sponsorship": {
      const wanted = norm(args.brand);
      const deal = ctx.sponsorships.find((d) => norm(d.brand).includes(wanted) || wanted.includes(norm(d.brand)));
      if (!deal) {
        return { ok: false, message: `Couldn't find a sponsorship deal from "${args.brand}".` };
      }
      ctx.requestSponsorship(deal.id);
      return { ok: true, message: `Requested the ${deal.brand} sponsorship.` };
    }

    case "submit_sponsorship_request": {
      ctx.submitSponsorshipRequest({ brand: args.brand || "", sport: args.sport, details: args.details });
      return { ok: true, message: "Submitted a new sponsorship request." };
    }

    default:
      return { ok: false, message: `Unknown action "${name}".` };
  }
}
