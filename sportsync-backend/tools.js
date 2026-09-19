// Tool definitions the LLM can call to perform actions inside Krid.ai.
// Every tool is *simulated* — the frontend executes the matching demo action
// against its local in-memory app state and reports back what happened.

export const TOOLS = [
  {
    type: "function",
    function: {
      name: "book_venue",
      description:
        "Book a turf/court/venue slot for the current player. Only use when the user clearly wants to book/reserve a venue.",
      parameters: {
        type: "object",
        properties: {
          venueName: {
            type: "string",
            description: "Name of the venue to book — must match (or closely match) one from the venues list provided.",
          },
          date: { type: "string", description: "Date for the booking, e.g. '2026-08-27' or 'tomorrow'." },
          time: { type: "string", description: "Time slot for the booking, e.g. '6:00 PM'." },
        },
        required: ["venueName", "date", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "join_game",
      description: "Join an already-listed open game for the current player.",
      parameters: {
        type: "object",
        properties: {
          gameId: { type: "string", description: "The id of the game to join, taken from the games list provided." },
        },
        required: ["gameId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "message_friends",
      description:
        "Send a chat message to the player's friends — e.g. telling everyone to reach a venue at a certain time.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "The exact message to send." },
          target: {
            type: "string",
            description:
              "Who to send it to: the word 'all' for every accepted friend, or a comma-separated list of friend names.",
          },
        },
        required: ["text", "target"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_funding",
      description: "Apply to an already-listed funding/scholarship/grant opportunity.",
      parameters: {
        type: "object",
        properties: {
          provider: { type: "string", description: "Provider name of the funding opportunity, from the funding list." },
        },
        required: ["provider"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_fund_request",
      description: "Raise a brand-new custom fund request when nothing already listed fits the user's need.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          purpose: { type: "string" },
          amount: { type: "string", description: "Amount needed, in rupees." },
          deadline: { type: "string", description: "YYYY-MM-DD, if known." },
        },
        required: ["title", "purpose"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_career",
      description: "Join/apply to an already-listed career opportunity (trial, coaching role, scouting programme, etc).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the career opportunity, from the career list provided." },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_career_request",
      description: "Raise a new custom career request describing what kind of opportunity the player is looking for.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          sport: { type: "string" },
          details: { type: "string" },
        },
        required: ["title", "sport", "details"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_sponsorship",
      description: "Request an already-listed brand sponsorship deal.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", description: "Brand name of the sponsorship deal, from the sponsorships list provided." },
        },
        required: ["brand"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_sponsorship_request",
      description: "Raise a new custom sponsorship request when nothing already listed fits.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", description: "Preferred brand, optional." },
          sport: { type: "string" },
          details: { type: "string" },
        },
        required: ["sport", "details"],
      },
    },
  },
];
