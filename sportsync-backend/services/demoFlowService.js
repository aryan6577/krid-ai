export function connectionStatusForTarget(targetPlayer) {
  return targetPlayer.is_demo ? "accepted" : "pending";
}

export function bookingPlanForVenue(venue) {
  return venue.is_demo
    ? { amount: 0, status: "demo_reserved", is_demo: true }
    : { amount: Number(venue.price_per_hour ?? venue.price ?? 0), status: "pending", is_demo: false };
}

export function demoTeammateProblem({ game, requesterId, target, connection, alreadyJoined }) {
  if (game.created_by !== requesterId) return { status: 403, message: "Only the game creator can add a demo teammate." };
  if (!game.is_demo) return { status: 409, message: "Demo teammates can only join games at demo venues." };
  if (!target?.is_demo || !target.sports?.includes(game.sport)) return { status: 400, message: "Choose a demo teammate who plays this sport." };
  if (game.participant_count >= game.capacity) return { status: 409, message: "This game is full." };
  if (connection?.status !== "accepted") return { status: 403, message: "Add this demo teammate through matchmaking first." };
  if (alreadyJoined) return { status: 409, message: "This demo teammate is already in the game." };
  return null;
}
