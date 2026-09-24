import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { currentPlayer as seedCurrentPlayer } from "../data/players";
import { currentOrganisation as seedCurrentOrganisation } from "../data/venues";
import { games as seedGames, fundingOpportunities as seedFundingOpportunities } from "../data/games";
import { friendChatSeeds, friendAutoReplies } from "../data/chats";
import { careerOpportunities as seedCareerOpportunities, defaultCareerProfile } from "../data/career";
import { sponsorshipDeals as seedSponsorshipDeals } from "../data/sponsorship";
import { api } from "../lib/api";

const AppContext = createContext(null);
const TOKEN_KEY = "krid_access_token";
const emptyDemoCatalog = { players: [], organisations: [], venues: [], opportunities: [], games: [] };

export function AppProvider({ children }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(() => ({
    accessToken: localStorage.getItem(TOKEN_KEY),
    user: null,
  }));
  const [profileState, setProfileState] = useState({ role: null, player: null, organisation: null });
  const [authed, setAuthed] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [role, setRole] = useState(null); // "player" | "organisation"
  const [onboarded, setOnboarded] = useState(false);
  const [demoCatalog, setDemoCatalog] = useState(emptyDemoCatalog);
  const [demoLoading, setDemoLoading] = useState(true);
  const [demoError, setDemoError] = useState("");

  useEffect(() => {
    if (!session.accessToken) { setDemoLoading(false); return; }
    let active = true;
    setDemoLoading(true);
    setDemoError("");
    api.getDemoCatalog()
      .then(({ catalog }) => { if (active) setDemoCatalog(catalog); })
      .catch((error) => { if (active) setDemoError(error.message || "Could not load examples."); })
      .finally(() => { if (active) setDemoLoading(false); });
    return () => { active = false; };
  }, [session.accessToken]);

  const [friendsState, setFriendsState] = useState([]);
  const [gamesState, setGamesState] = useState(seedGames);
  const [notificationsState, setNotificationsState] = useState([]);

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

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const data = await api.me(token);
        if (cancelled) return;
        applyAuthState({
          accessToken: token,
          user: data.user,
          profile: data.profile,
        });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) {
          setAuthed(false);
          setRole(null);
          setOnboarded(false);
          setSession({ accessToken: null, user: null });
          setProfileState({ role: null, player: null, organisation: null });
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyAuthState = ({ accessToken, user, profile }) => {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    setSession({ accessToken, user });
    setProfileState(profile || { role: null, player: null, organisation: null });
    setAuthed(Boolean(accessToken));
    setRole(profile?.role || null);
    setOnboarded(Boolean(profile?.role));
  };

  const login = async (credentials) => {
    const data = await api.login(credentials);
    if (!data.accessToken) {
      throw new Error("Login did not return a session. Check your Supabase Auth settings.");
    }
    applyAuthState(data);
    return data;
  };

  const register = async (credentials) => {
    const data = await api.register(credentials);
    if (data.accessToken) {
      applyAuthState({ ...data, profile: { role: null, player: null, organisation: null } });
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthed(false);
    setRole(null);
    setOnboarded(false);
    setSession({ accessToken: null, user: null });
    setProfileState({ role: null, player: null, organisation: null });
  };

  const completeOnboarding = async (selectedRole, profile) => {
    const data = await api.selectRole(session.accessToken, { role: selectedRole, profile });
    setProfileState(data);
    setRole(data.role);
    setOnboarded(true);
    return data;
  };

  const updatePlayerProfile = async (profile) => {
    const data = await api.updatePlayerProfile(session.accessToken, profile);
    setProfileState(data);
    return data.player;
  };

  const updateOrganisationProfile = async (profile) => {
    const data = await api.updateOrganisationProfile(session.accessToken, profile);
    setProfileState(data);
    return data.organisation;
  };

  const deleteProfile = async () => {
    if (role === "organisation") {
      await api.deleteOrganisationProfile(session.accessToken);
    } else {
      await api.deletePlayerProfile(session.accessToken);
    }
    setProfileState({ role: null, player: null, organisation: null });
    setRole(null);
    setOnboarded(false);
  };

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
      { id: `fr${Date.now()}`, status: "Local draft", submittedOn: new Date().toISOString().slice(0, 10), ...request },
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
      { id: `cr${Date.now()}`, status: "Local draft", submittedOn: new Date().toISOString().slice(0, 10), ...request },
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
      { id: `sr${Date.now()}`, status: "Local draft", submittedOn: new Date().toISOString().slice(0, 10), ...request },
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

  const friendPlayers = useMemo(
    () =>
      friendsState.map((f) => ({
        ...f,
        player: demoCatalog.players.find((p) => p.id === f.playerId),
      })),
    [friendsState, demoCatalog.players]
  );

  const currentPlayer = useMemo(
    () => ({
      ...seedCurrentPlayer,
      ...(profileState.player || {}),
      avatar: profileState.player?.avatar || seedCurrentPlayer.avatar,
      streak: profileState.player?.streak || seedCurrentPlayer.streak,
    }),
    [profileState.player]
  );

  const currentOrganisation = useMemo(
    () => ({
      ...seedCurrentOrganisation,
      ...(profileState.organisation || {}),
      avatar: profileState.organisation?.avatar || seedCurrentOrganisation.name.slice(0, 2).toUpperCase(),
    }),
    [profileState.organisation]
  );

  const value = {
    authLoading,
    session,
    authed,
    role,
    onboarded,
    login,
    register,
    logout,
    completeOnboarding,
    updatePlayerProfile,
    updateOrganisationProfile,
    deleteProfile,
    currentPlayer,
    currentOrganisation,
    demoCatalog,
    demoLoading,
    demoError,
    allPlayers: demoCatalog.players,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
