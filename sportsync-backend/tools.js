// Tool definitions the LLM can call inside Krid.ai.
// The assistant is proposal-only: any action that creates a match, books a venue,
// or processes payment is intentionally outside this tool surface.

export const TOOLS = [
  {
    type: "function",
    function: {
      name: "prepare_match_proposal",
      description:
        "Prepare a match coordination proposal using platform matchmaking and venue ranking. This never creates a match, booking, or payment; it only returns options for explicit user confirmation.",
      parameters: {
        type: "object",
        properties: {
          sport: { type: "string", description: "Sport the user wants to play, e.g. Football or Cricket." },
          date: { type: "string", description: "Requested date in YYYY-MM-DD format when possible." },
          time: { type: "string", description: "Requested start time, e.g. 18:00 or 6:00 PM." },
          location: { type: "string", description: "Preferred area or city, if the user supplied one." },
          preferences: {
            type: "string",
            description: "Short summary of preferences such as friendly/competitive, budget, skill level, or surface.",
          },
          maxPrice: { type: "number", description: "Optional hourly budget cap for venue ranking." },
          availability: { type: "string", description: "Optional named availability slot to pass to venue ranking." },
          capacity: { type: "number", description: "Optional player capacity for the proposed match." },
        },
        required: ["sport", "date", "time"],
      },
    },
  },
];
