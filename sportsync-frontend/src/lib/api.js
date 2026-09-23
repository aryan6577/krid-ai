// Production uses the same origin when the UI and API are deployed together.
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:5001");

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Krid.ai API request failed.");
  }
  return data;
}

export const api = {
  register: (payload) => request("/api/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload }),
  me: (token) => request("/api/me", { token }),
  selectRole: (token, payload) => request("/api/onboarding/role", { method: "POST", token, body: payload }),
  updatePlayerProfile: (token, payload) => request("/api/profile/player", { method: "PUT", token, body: payload }),
  deletePlayerProfile: (token) => request("/api/profile/player", { method: "DELETE", token }),
  getAlternativeSports: (token, { primarySport, limit } = {}) => {
    const params = new URLSearchParams();
    if (primarySport) params.set("primarySport", primarySport);
    if (limit) params.set("limit", limit);
    return request(`/api/recommendations/alternative-sports?${params.toString()}`, { token });
  },
  updateOrganisationProfile: (token, payload) =>
    request("/api/profile/organisation", { method: "PUT", token, body: payload }),
  deleteOrganisationProfile: (token) => request("/api/profile/organisation", { method: "DELETE", token }),
  getMatchCandidates: (token, sport) => request(`/api/matchmaking/candidates?sport=${encodeURIComponent(sport)}`, { token }),
  saveMatchAction: (token, candidateId, payload) =>
    request(`/api/matchmaking/candidates/${candidateId}/action`, { method: "POST", token, body: payload }),
  getFriends: (token) => request("/api/friends", { token }),
  sendFriendRequest: (token, playerId) => request("/api/friends/request", { method: "POST", token, body: { playerId } }),
  acceptFriendRequest: (token, playerId) => request(`/api/friends/${playerId}/accept`, { method: "POST", token }),
  removeFriend: (token, playerId) => request(`/api/friends/${playerId}`, { method: "DELETE", token }),
  getGames: (token) => request("/api/games", { token }),
  createGame: (token, payload) => request("/api/games", { method: "POST", token, body: payload }),
  joinGame: (token, gameId) => request(`/api/games/${gameId}/join`, { method: "POST", token }),
  getGame: (token, gameId) => request(`/api/games/${gameId}`, { token }),
  balanceGameTeams: (token, gameId, payload) =>
    request(`/api/games/${gameId}/balance`, { method: "POST", token, body: payload }),
  recordActivityEvent: (token, payload) => request("/api/activity-events", { method: "POST", token, body: payload }),
  getStreakMonth: (token, { year, month, timezone } = {}) => {
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (month) params.set("month", month);
    if (timezone) params.set("timezone", timezone);
    return request(`/api/streaks/month?${params.toString()}`, { token });
  },
  getWeather: (token, { location, venueId } = {}) => {
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (venueId) params.set("venueId", venueId);
    return request(`/api/weather?${params.toString()}`, { token });
  },
  getCareerOpportunities: (token) => request("/api/career/opportunities", { token }),
  createCareerOpportunity: (token, payload) => request("/api/career/opportunities", { method: "POST", token, body: payload }),
  getCareerProfile: (token) => request("/api/career/profile", { token }),
  saveCareerProfile: (token, payload) => request("/api/career/profile", { method: "PUT", token, body: payload }),
  getCareerApplications: (token) => request("/api/career/applications", { token }),
  applyToCareerOpportunity: (token, id, payload) => request(`/api/career/opportunities/${encodeURIComponent(id)}/applications`, { method: "POST", token, body: payload }),
  resendEmailConfirmation: (token) => request("/api/auth/resend-confirmation", { method: "POST", token }),
  requestCareerEmailProof: (token) => request("/api/career/email-proof/request", { method: "POST", token }),
  verifyCareerEmailProof: (token, code) => request("/api/career/email-proof/verify", { method: "POST", token, body: { code } }),
  downloadCareerCv: async (token, id) => {
    const response = await fetch(`${API_URL}/api/career/applications/${encodeURIComponent(id)}/cv`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Could not download CV.");
    return response.blob();
  },
  getExerciseCatalog: (token) => request("/api/exercises/catalog", { token }),
  analyzePoseFrames: (token, frames) => request("/api/cv/pose/frames", { method: "POST", token, body: { frames } }),
  evaluateExerciseSession: (token, payload) =>
    request("/api/exercise-sessions/evaluate", { method: "POST", token, body: payload }),
  getExerciseEvaluations: (token, limit = 5) => request(`/api/exercise-sessions/recent?limit=${limit}`, { token }),
  updateExerciseSessionCorrections: (token, sessionId, payload) =>
    request(`/api/exercise-sessions/${sessionId}/corrections`, { method: "PATCH", token, body: payload }),
  getTutorialCatalog: (token) => request("/api/tutorials/catalog", { token }),
  evaluateTutorialSession: (token, payload) =>
    request("/api/tutorial-sessions/evaluate", { method: "POST", token, body: payload }),
  getTutorialEvaluations: (token, limit = 5) => request(`/api/tutorial-sessions/recent?limit=${limit}`, { token }),
  updateTutorialSessionCorrections: (token, sessionId, payload) =>
    request(`/api/tutorial-sessions/${sessionId}/corrections`, { method: "PATCH", token, body: payload }),
  getOrgVenues: (token) => request("/api/org/venues", { token }),
  createOrgVenue: (token, payload) => request("/api/org/venues", { method: "POST", token, body: payload }),
  updateOrgVenue: (token, venueId, payload) =>
    request(`/api/org/venues/${venueId}`, { method: "PATCH", token, body: payload }),
  updateOrgVenueAvailability: (token, venueId, slots) =>
    request(`/api/org/venues/${venueId}/availability`, { method: "PATCH", token, body: { slots } }),
  discoverVenues: (token, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") params.set(key, value);
    });
    return request(`/api/venues?${params.toString()}`, { token });
  },
  createBooking: (token, payload) => request("/api/bookings", { method: "POST", token, body: payload }),
  createPaymentOrder: (token, bookingId) =>
    request(`/api/bookings/${bookingId}/payment-order`, { method: "POST", token }),
  verifyRazorpayPayment: (token, payload) =>
    request("/api/payments/razorpay/verify", { method: "POST", token, body: payload }),
  cancelBooking: (token, bookingId) => request(`/api/bookings/${bookingId}/cancel`, { method: "PATCH", token }),
  getOrgBookings: (token) => request("/api/org/bookings", { token }),
  getBookingExpenseShares: (token, bookingId) => request(`/api/bookings/${bookingId}/expense-shares`, { token }),
  splitBookingExpense: (token, bookingId, payload) =>
    request(`/api/bookings/${bookingId}/expense-shares`, { method: "POST", token, body: payload }),
  updateBookingExpenseShare: (token, bookingId, playerId, status) =>
    request(`/api/bookings/${bookingId}/expense-shares/${playerId}`, {
      method: "PATCH",
      token,
      body: { status },
    }),
  createAssistantMatchProposal: (token, payload) =>
    request("/api/assistant/match-proposals", { method: "POST", token, body: payload }),
  confirmAssistantMatchProposal: (token, proposalId, payload) =>
    request(`/api/assistant/match-proposals/${proposalId}/confirm`, { method: "POST", token, body: payload }),
};
