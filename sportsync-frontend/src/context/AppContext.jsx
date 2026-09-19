import { createContext, useContext, useMemo, useState } from "react";
import { currentPlayer, players, friendships } from "../data/players";
import { currentOrganisation } from "../data/venues";
import { games as seedGames, notifications as seedNotifications, fundingOpportunities as seedFundingOpportunities } from "../data/games";
import { friendChatSeeds, friendAutoReplies } from "../data/chats";
import { careerOpportunities as seedCareerOpportunities, defaultCareerProfile } from "../data/career";
import { sponsorshipDeals as seedSponsorshipDeals } from "../data/sponsorship";
import { buildSeedActivityEvents } from "../data/activitySeed";
import { buildActivityEvent, computeUnifiedStreak, localDateToday } from "../lib/activity";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState(null); // "player" | "organisation"
  const [onboarded, setOnboarded] = useState(false);

  const [friendsState, setFriendsState] = useState(friendships);
  const [gamesState, setGamesState] = useState(seedGames);
  const [notificationsState, setNotificationsState] = useState(seedNotifications);

  // FR — Friend messaging (demo): per-friend message threads, seeded with sample history
  const [friendChats, setFriendChats] = useState(friendChatSeeds);

  // FR-26/27 — Funding: custom fund requests submitted by the player, and applications
  // to already-listed funding opportunities
  const [fundRequests, setFundRequests] = useState([]);
  const [appliedFundingIds, setAppliedFundingIds] = useState([]);
  const fundingOpportunities = seedFundingOpportunities;

  // Career module — opportunities are shared (orgs add to the pool), plus each side's own asks.
  const [careerOpportunitiesState, setCareerOpportunitiesState] = useState(seedCareerOpportunities);
  const [appliedCareerIds, setAppliedCareerIds] = useState([]);
  const [careerRequests, setCareerRequests] = useState([]); // player-raised "looking for" requests
  const [careerProfile, setCareerProfile] = useState(defaultCareerProfile); // player's own blog + email

  // Sponsorship module — deals are shared (brands/orgs), plus each side's own asks.
  const [sponsorshipDealsState, setSponsorshipDealsState] = useState(seedSponsorshipDeals);
  const [requestedSponsorshipIds, setRequestedSponsorshipIds] = useState([]);
  const [sponsorshipRequests, setSponsorshipRequests] = useState([]); // player-raised sponsorship asks
  const [orgSponsorshipOffers, setOrgSponsorshipOffers] = useState([]); // org-raised offers to sponsor players

  // FR-86/87 — Unified Activity Event stream feeding one authoritative streak (match + exercise + tutorial)
  const [activityEvents, setActivityEvents] = useState(() => buildSeedActivityEvents());
  const streak = useMemo(() => computeUnifiedStreak(activityEvents), [activityEvents]);

  // FR-71 to FR-78 — Exercise Mode sessions
  const [exerciseSessions, setExerciseSessions] = useState([]);
  // FR-79 to FR-83 — Tutorial Mode sessions
  const [tutorialSessions, setTutorialSessions] = useState([]);
  // FR-84/85 — Alternative Sports: player's saved/hidden candidates
  const [savedAltSportIds, setSavedAltSportIds] = useState([]);
  const [hiddenAltSportIds, setHiddenAltSportIds] = useState([]);

  const login = (selectedRole) => {
    setAuthed(true);
    setRole(selectedRole);
  };

  const logout = () => {
    setAuthed(false);
    setRole(null);
    setOnboarded(false);
  };

  const completeOnboarding = () => setOnboarded(true);

  const respondFriendRequest = (playerId, accept) => {
    setFriendsState((prev) =>
      accept
        ? prev.map((f) => (f.playerId === playerId ? { ...f, status: "accepted" } : f))
        : prev.filter((f) => f.playerId !== playerId)
    );
  };

  const sendFriendRequest = (playerId) => {
    setFriendsState((prev) => {
      if (prev.some((f) => f.playerId === playerId)) return prev;
      return [...prev, { playerId, status: "pending_outgoing" }];
    });
  };

  const removeFriend = (playerId) => {
    setFriendsState((prev) => prev.filter((f) => f.playerId !== playerId));
  };

  const joinGame = (gameId) => {
    setGamesState((prev) =>
      prev.map((g) =>
        g.id === gameId && !g.participants.includes(currentPlayer.id) && g.participants.length < g.capacity
          ? { ...g, participants: [...g.participants, currentPlayer.id], status: g.participants.length + 1 >= g.capacity ? "Full" : "Open" }
          : g
      )
    );
  };

  const createGame = (game) => {
    setGamesState((prev) => [
      { id: `g${Date.now()}`, participants: [currentPlayer.id], status: "Open", createdBy: currentPlayer.id, ...game },
      ...prev,
    ]);
  };

  const markAllRead = () => {
    setNotificationsState((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const pushNotification = (n) => {
    setNotificationsState((prev) => [{ id: `n${Date.now()}`, read: false, time: "Just now", ...n }, ...prev]);
  };

  // Book a venue slot (e.g. via the AI assistant) — simulated confirmation, mirrors the manual Venues booking flow
  const bookVenue = ({ venueName, date, time }) => {
    pushNotification({
      type: "payment",
      text: `${venueName} booked for ${date} at ${time} via Krid.ai Assistant.`,
    });
  };

  // Send a message to a friend; appends locally and simulates a short auto-reply for the demo
  const sendFriendMessage = (playerId, text) => {
    if (!text?.trim()) return;
    const outgoing = { from: "me", text: text.trim(), time: "Just now" };
    setFriendChats((prev) => ({ ...prev, [playerId]: [...(prev[playerId] || []), outgoing] }));

    setTimeout(() => {
      const reply = friendAutoReplies[Math.floor(Math.random() * friendAutoReplies.length)];
      setFriendChats((prev) => ({
        ...prev,
        [playerId]: [...(prev[playerId] || []), { from: "them", text: reply, time: "Just now" }],
      }));
    }, 1000 + Math.random() * 800);
  };

  const submitFundRequest = (request) => {
    setFundRequests((prev) => [
      { id: `fr${Date.now()}`, status: "Submitted", submittedOn: new Date().toISOString().slice(0, 10), ...request },
      ...prev,
    ]);
  };

  const applyToFunding = (opportunityId) => {
    setAppliedFundingIds((prev) => (prev.includes(opportunityId) ? prev : [...prev, opportunityId]));
  };

  // Player: join/apply to an already-listed career opportunity
  const applyToCareer = (opportunityId) => {
    setAppliedCareerIds((prev) => (prev.includes(opportunityId) ? prev : [...prev, opportunityId]));
  };

  // Player: raise a new career request ("looking for a career opportunity in X")
  const submitCareerRequest = (request) => {
    setCareerRequests((prev) => [
      { id: `cr${Date.now()}`, status: "Submitted", submittedOn: new Date().toISOString().slice(0, 10), ...request },
      ...prev,
    ]);
  };

  // Organisation: raise a new career opportunity — added to the shared pool players browse
  const createCareerOpportunity = (opportunity) => {
    setCareerOpportunitiesState((prev) => [
      {
        id: `co${Date.now()}`,
        orgId: currentOrganisation.id,
        orgName: currentOrganisation.name,
        status: "Live",
        ...opportunity,
        minRating: Number(opportunity.minRating) || 0,
      },
      ...prev,
    ]);
  };

  // Player: update their own career "blog" + contact email
  const updateCareerProfile = (profile) => {
    setCareerProfile((prev) => ({ ...prev, ...profile }));
  };

  // Player: request one of the already-listed sponsorship deals
  const requestSponsorship = (dealId) => {
    setRequestedSponsorshipIds((prev) => (prev.includes(dealId) ? prev : [...prev, dealId]));
  };

  // Player: raise a custom sponsorship request
  const submitSponsorshipRequest = (request) => {
    setSponsorshipRequests((prev) => [
      { id: `sr${Date.now()}`, status: "Submitted", submittedOn: new Date().toISOString().slice(0, 10), ...request },
      ...prev,
    ]);
  };

  // Organisation: raise a request/offer to sponsor a specific player (or an open call)
  const createSponsorshipOffer = (offer) => {
    setOrgSponsorshipOffers((prev) => [
      {
        id: `so${Date.now()}`,
        orgId: currentOrganisation.id,
        orgName: currentOrganisation.name,
        status: "Pending review",
        submittedOn: new Date().toISOString().slice(0, 10),
        ...offer,
      },
      ...prev,
    ]);
  };

  // FR-86 — create a unified Activity Event from any qualifying source (match/exercise/tutorial)
  const addActivityEvent = (type, sourceId, extra) => {
    setActivityEvents((prev) => [...prev, buildActivityEvent(type, sourceId, extra)]);
  };

  // FR-20/FR-86 — hook match-result recording into the unified activity/streak stream
  const recordMatchActivity = (gameId) => addActivityEvent("match", gameId);

  // FR-77/FR-78 — complete an Exercise Mode session; only qualifying completions count toward the streak (BR-20)
  const completeExerciseSession = (session) => {
    const record = { id: `exs-${Date.now()}`, date: localDateToday(), markedIncorrect: false, ...session };
    setExerciseSessions((prev) => [record, ...prev]);
    if (record.completion === "complete") addActivityEvent("exercise", record.id);
    return record;
  };

  // FR-89 — user can mark a CV feedback item / session as incorrect or incomplete
  const markExerciseFeedbackIncorrect = (sessionId) => {
    setExerciseSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, markedIncorrect: true } : s)));
  };

  // FR-82/FR-83 — complete a Tutorial Mode session; qualifies the streak once the checkpoint threshold is met (BR-20)
  const completeTutorialSession = (session) => {
    const record = { id: `tus-${Date.now()}`, date: localDateToday(), markedIncorrect: false, ...session };
    setTutorialSessions((prev) => [record, ...prev]);
    if (record.checkpointsPassed / Math.max(record.checkpointsTotal, 1) >= 0.6) addActivityEvent("tutorial", record.id);
    return record;
  };

  const markTutorialFeedbackIncorrect = (sessionId) => {
    setTutorialSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, markedIncorrect: true } : s)));
  };

  // FR-84/85 — save/hide an alternative-sport recommendation
  const saveAltSport = (sport) => setSavedAltSportIds((prev) => (prev.includes(sport) ? prev : [...prev, sport]));
  const hideAltSport = (sport) => setHiddenAltSportIds((prev) => (prev.includes(sport) ? prev : [...prev, sport]));

  const friendPlayers = useMemo(
    () =>
      friendsState.map((f) => ({
        ...f,
        player: players.find((p) => p.id === f.playerId),
      })),
    [friendsState]
  );

  const value = {
    authed,
    role,
    onboarded,
    login,
    logout,
    completeOnboarding,
    currentPlayer,
    currentOrganisation,
    allPlayers: players,
    friendsState,
    friendPlayers,
    respondFriendRequest,
    sendFriendRequest,
    removeFriend,
    gamesState,
    joinGame,
    createGame,
    notificationsState,
    markAllRead,
    pushNotification,
    bookVenue,
    friendChats,
    sendFriendMessage,
    fundingOpportunities,
    fundRequests,
    submitFundRequest,
    appliedFundingIds,
    applyToFunding,
    careerOpportunities: careerOpportunitiesState,
    appliedCareerIds,
    applyToCareer,
    careerRequests,
    submitCareerRequest,
    createCareerOpportunity,
    careerProfile,
    updateCareerProfile,
    sponsorshipDeals: sponsorshipDealsState,
    requestedSponsorshipIds,
    requestSponsorship,
    sponsorshipRequests,
    submitSponsorshipRequest,
    orgSponsorshipOffers,
    createSponsorshipOffer,
    activityEvents,
    addActivityEvent,
    recordMatchActivity,
    streak,
    exerciseSessions,
    completeExerciseSession,
    markExerciseFeedbackIncorrect,
    tutorialSessions,
    completeTutorialSession,
    markTutorialFeedbackIncorrect,
    savedAltSportIds,
    hiddenAltSportIds,
    saveAltSport,
    hideAltSport,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
