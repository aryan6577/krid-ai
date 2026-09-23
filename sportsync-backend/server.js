import express from "express";
import cors from "cors";
import { createHmac } from "crypto";
import { resolve } from "path";
import "dotenv/config";
import { TOOLS } from "./tools.js";
import { evaluateExerciseSession } from "./rules/exerciseRuleEngine.js";
import { EXERCISE_CATALOG, exerciseCatalogForApi } from "./rules/exerciseCatalog.js";
import { evaluateTutorialSession } from "./rules/tutorialRuleEngine.js";
import { TUTORIAL_DRILL_CATALOG, tutorialCatalogForApi } from "./rules/tutorialCatalog.js";
import { recommendAlternativeSports } from "./rules/alternativeSportsEngine.js";
import {
  enrichAlternativeSportOpportunities,
  enrichTutorialDrills,
} from "./services/searchEnrichmentService.js";
import { externalContextService } from "./services/externalContextService.js";
import {
  AssistantProposalError,
  createAssistantProposalStore,
} from "./services/assistantProposalService.js";
import { bookingIdempotencyKey, createOnce } from "./services/idempotencyService.js";
import { validateOpportunity, validateArticle, validateApplication } from "./services/careerValidationService.js";
import { calculateStreakFromDates } from "./services/streakMath.js";
import { buildDemoCatalog } from "./services/demoCatalogService.js";
import { bookingPlanForVenue, connectionStatusForTarget, demoTeammateProblem } from "./services/demoFlowService.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const PORT = process.env.PORT || 5001;
const CV_SERVICE_URL = (process.env.CV_SERVICE_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
const CV_SERVICE_KEY = process.env.KRID_CV_API_KEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_API_URL = process.env.RAZORPAY_API_URL || "https://api.razorpay.com/v1";
const assistantProposalStore = createAssistantProposalStore();

// If the configured model gets deprecated/renamed by Groq, try these in order before giving up.
const FALLBACK_MODELS = ["llama-3.1-8b-instant", "openai/gpt-oss-120b", "openai/gpt-oss-20b"];

if (!GROQ_API_KEY) {
  console.warn(
    "⚠️  GROQ_API_KEY is not set. Add it to sportsync-backend/.env (see .env.example) and restart the server."
  );
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "Supabase is not fully configured. Auth/profile endpoints require SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY."
  );
}

const authHeaders = {
  apikey: SUPABASE_ANON_KEY || "",
  "Content-Type": "application/json",
};

const adminHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY || "",
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || ""}`,
  "Content-Type": "application/json",
};

function requireSupabaseConfig(res) {
  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY) return true;
  res.status(501).json({
    error:
      "Supabase is not configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in sportsync-backend/.env.",
  });
  return false;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function supabaseAuth(path, body) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    const message = data?.msg || data?.error_description || data?.message || "Supabase auth request failed.";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function supabaseDb(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: options.method || "GET",
    headers: {
      ...adminHeaders,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    const message = data?.message || data?.hint || "Supabase database request failed.";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : null;
}

async function getSupabaseUser(token) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    const error = new Error(data?.msg || data?.message || "Invalid or expired session.");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function requireUser(req, res, next) {
  try {
    if (!requireSupabaseConfig(res)) return;
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "Missing bearer token." });
    req.user = await getSupabaseUser(token);
    next();
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message || "Unauthorized." });
  }
}

function normalizeAuth(data) {
  return {
    accessToken: data?.access_token || data?.session?.access_token || null,
    refreshToken: data?.refresh_token || data?.session?.refresh_token || null,
    user: data?.user || null,
  };
}

function normalizeRole(role) {
  if (role === "player" || role === "Player") return "Player";
  if (role === "organisation" || role === "organization" || role === "Organisation" || role === "Organization") {
    return "Organisation";
  }
  return null;
}

function appRole(dbRole) {
  return dbRole === "Organisation" ? "organisation" : dbRole === "Player" ? "player" : null;
}

function contactFromUser(user, overrides = {}) {
  return {
    email: user?.email || "",
    phone: user?.phone || "",
    ...overrides,
  };
}

function playerToAppProfile(row) {
  if (!row) return null;
  return {
    id: row.player_id,
    name: row.name,
    contact: row.contact,
    location: typeof row.location === "string" ? row.location : row.location?.label || "",
    locationRaw: row.location,
    sports: row.sports || [],
    skill: row.skill || {},
    availability: row.availability?.slots || row.availability || [],
    preferences: row.preferences || {},
    competitivePreference: row.preferences?.competitivePreference || row.preferences?.style || "",
    rating: row.rating,
    streak: { current: row.streak, longest: row.streak },
    avatar: initials(row.name),
    demo: Boolean(row.is_demo),
  };
}

function organisationToAppProfile(row) {
  if (!row) return null;
  return {
    id: row.organisation_id,
    name: row.name,
    contact: row.contact,
    location: typeof row.location === "string" ? row.location : row.location?.label || "",
    locationRaw: row.location,
    type: row.type,
    verification: row.verification_status,
    verificationStatus: row.verification_status,
    avatar: initials(row.name),
    demo: Boolean(row.is_demo),
  };
}

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "KA";
}

async function getAccountProfile(accountId) {
  const rows = await supabaseDb(`/account_profiles?account_id=eq.${accountId}&limit=1`);
  const account = rows?.[0] || null;
  if (!account) return { account: null, player: null, organisation: null };

  if (account.role === "Player" && account.player_id) {
    const playerRows = await supabaseDb(`/players?player_id=eq.${account.player_id}&limit=1`);
    return { account, player: playerRows?.[0] || null, organisation: null };
  }

  if (account.role === "Organisation" && account.organisation_id) {
    const orgRows = await supabaseDb(`/organisations?organisation_id=eq.${account.organisation_id}&limit=1`);
    return { account, player: null, organisation: orgRows?.[0] || null };
  }

  return { account, player: null, organisation: null };
}

function accountPayload(bundle) {
  return {
    role: appRole(bundle.account?.role),
    accountProfile: bundle.account,
    player: playerToAppProfile(bundle.player),
    organisation: organisationToAppProfile(bundle.organisation),
  };
}

function locationJson(location) {
  if (typeof location === "object" && location !== null) return location;
  return { label: String(location || "").trim() };
}

function locationJsonWithCoordinates(input, existing = {}) {
  const base = locationJson(input ?? existing?.label ?? existing ?? "");
  const lat = input?.lat ?? input?.latitude ?? existing?.lat ?? existing?.latitude;
  const lng = input?.lng ?? input?.longitude ?? existing?.lng ?? existing?.longitude;
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return { ...base, lat: Number(lat), lng: Number(lng) };
  }
  return base;
}

function playerWritePayload(input, user, existing = {}) {
  const preferences = input.preferences ?? existing.preferences ?? {};
  if (preferences.timezone && !isValidTimeZone(preferences.timezone)) {
    const error = new Error("Use a valid IANA time zone, such as Asia/Kolkata.");
    error.status = 400;
    throw error;
  }
  return {
    name: input.name ?? existing.name ?? user.email ?? "Krid Player",
    contact: input.contact ?? existing.contact ?? contactFromUser(user),
    location: locationJsonWithCoordinates(input.location ?? existing.location?.label ?? existing.location ?? "", existing.location),
    sports: Array.isArray(input.sports) ? input.sports : existing.sports ?? [],
    skill: input.skill ?? existing.skill ?? {},
    availability: Array.isArray(input.availability)
      ? { slots: input.availability }
      : input.availability ?? existing.availability ?? { slots: [] },
    preferences,
    rating: existing.rating ?? 0,
    streak: existing.streak ?? 0,
  };
}

function organisationWritePayload(input, user, existing = {}) {
  return {
    name: input.name ?? existing.name ?? user.email ?? "Krid Organisation",
    contact: input.contact ?? existing.contact ?? contactFromUser(user),
    location: locationJsonWithCoordinates(input.location ?? existing.location?.label ?? existing.location ?? "", existing.location),
    type: input.type ?? existing.type ?? "Organisation",
    verification_status: existing.verification_status ?? "Pending",
  };
}

async function requirePlayerBundle(req, res) {
  const bundle = await getAccountProfile(req.user.id);
  if (bundle.account?.role !== "Player" || !bundle.player) {
    res.status(403).json({ error: "This endpoint is only available for Player accounts." });
    return null;
  }
  return bundle;
}

async function requireOrganisationBundle(req, res) {
  const bundle = await getAccountProfile(req.user.id);
  if (bundle.account?.role !== "Organisation" || !bundle.organisation) {
    res.status(403).json({ error: "This endpoint is only available for Organisation accounts." });
    return null;
  }
  return bundle;
}

function encodeFilterValue(value) {
  return encodeURIComponent(String(value));
}

function numericSkill(skill) {
  const normalized = String(skill || "").toLowerCase();
  if (normalized === "beginner") return 1;
  if (normalized === "intermediate") return 2;
  if (normalized === "advanced") return 3;
  return 2;
}

function coordinates(location) {
  if (!location || typeof location !== "object") return null;
  const lat = Number(location.lat ?? location.latitude);
  const lng = Number(location.lng ?? location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function distanceKm(a, b) {
  const from = coordinates(a);
  const to = coordinates(b);
  if (!from || !to) return null;
  const radius = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(hav));
}

function availabilityList(player) {
  const availability = player.availability;
  if (Array.isArray(availability)) return availability;
  if (Array.isArray(availability?.slots)) return availability.slots;
  return [];
}

function scoreCandidate(player, candidate, sport, connectionStatus) {
  const playerSports = player.sports || [];
  const candidateSports = candidate.sports || [];
  const sportMatch = playerSports.includes(sport) && candidateSports.includes(sport);
  const skillDelta = Math.abs(numericSkill(player.skill?.[sport]) - numericSkill(candidate.skill?.[sport]));
  const distance = distanceKm(player.location, candidate.location);
  const playerAvailability = availabilityList(player);
  const candidateAvailability = availabilityList(candidate);
  const overlap = playerAvailability.filter((slot) => candidateAvailability.includes(slot));

  const factors = {
    sportPreference: {
      weight: 35,
      raw: sportMatch ? 100 : 0,
      detail: sportMatch ? `both list ${sport}` : `${sport} is missing from one profile`,
    },
    skill: {
      weight: 25,
      raw: Math.max(0, 100 - skillDelta * 40),
      detail: skillDelta === 0 ? "same skill band" : `${skillDelta} skill-band difference`,
    },
    distance: {
      weight: 20,
      raw: distance == null ? 60 : Math.max(0, Math.round(100 - Math.min(distance, 20) * 5)),
      detail: distance == null ? "distance unavailable" : `${distance.toFixed(1)}km away`,
    },
    availability: {
      weight: 10,
      raw: playerAvailability.length && candidateAvailability.length ? Math.min(100, overlap.length * 50) : 40,
      detail: overlap.length ? `${overlap.length} shared availability slot${overlap.length === 1 ? "" : "s"}` : "no saved availability overlap",
    },
    connectionHistory: {
      weight: 10,
      raw: connectionStatus === "accepted" ? 100 : connectionStatus === "pending" ? 75 : 55,
      detail: connectionStatus ? `${connectionStatus} connection history` : "no prior connection",
    },
  };

  const totalWeight = Object.values(factors).reduce((sum, factor) => sum + factor.weight, 0);
  const score = Math.round(
    Object.values(factors).reduce((sum, factor) => sum + factor.raw * factor.weight, 0) / totalWeight
  );
  const reasons = [
    factors.skill.detail,
    factors.distance.detail,
    factors.availability.detail,
    factors.sportPreference.detail,
  ];

  return {
    player: playerToAppProfile(candidate),
    score,
    distanceKm: distance,
    reasons,
    factors,
    explanation:
      "Score uses only skill, distance, availability, sport preference, and existing connection history. Protected characteristics are not collected or scored.",
  };
}

function connectionStatusFor(connections, playerId, candidateId) {
  const row = connections.find(
    (connection) =>
      (connection.requester_player_id === playerId && connection.addressee_player_id === candidateId) ||
      (connection.requester_player_id === candidateId && connection.addressee_player_id === playerId)
  );
  return row?.status || null;
}

function normalizeGame(row, participants = []) {
  const date = row.date_time ? new Date(row.date_time) : null;
  return {
    id: row.game_id,
    sport: row.sport,
    dateTime: row.date_time,
    date: date ? date.toISOString().slice(0, 10) : "",
    time: date ? date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "",
    venueId: row.venue_id,
    venue: row.venues?.name || row.venue_id,
    venueName: row.venues?.name || null,
    capacity: row.capacity,
    participantCount: row.participant_count,
    participants,
    status: row.status,
    createdBy: row.created_by,
    demo: Boolean(row.is_demo),
  };
}

function availabilitySlots(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.slots)) return value.slots;
  return [];
}

function normalizeVenue(row, scoreData = {}) {
  const availability = availabilitySlots(row.availability_slots?.length ? row.availability_slots : row.availability);
  return {
    id: row.venue_id,
    name: row.name || `Venue ${String(row.venue_id).slice(0, 8)}`,
    organisationId: row.organisation_id,
    organisationName: row.organisations?.name || null,
    location: typeof row.location === "string" ? row.location : row.location?.label || "",
    locationRaw: row.location,
    supportedSports: row.supported_sports || [],
    sport: row.supported_sports?.[0] || "",
    pricePerHour: Number(row.price_per_hour ?? row.price ?? 0),
    facilities: Array.isArray(row.facilities) ? row.facilities : row.facilities?.items || [],
    availability,
    demo: Boolean(row.is_demo),
    ...scoreData,
  };
}

function venueWritePayload(input, organisationId, existing = {}) {
  const supportedSports = input.supportedSports || input.supported_sports || input.sports || existing.supported_sports || [];
  const price = Number(input.pricePerHour ?? input.price_per_hour ?? input.price ?? existing.price_per_hour ?? existing.price ?? 0);
  const availability = input.availability || input.availabilitySlots || existing.availability_slots || existing.availability || [];
  return {
    name: input.name ?? existing.name ?? null,
    organisation_id: organisationId,
    location: locationJsonWithCoordinates(input.location ?? existing.location?.label ?? existing.location ?? "", existing.location),
    supported_sports: supportedSports,
    price,
    price_per_hour: price,
    facilities: input.facilities ?? existing.facilities ?? [],
    availability: Array.isArray(availability) ? { slots: availability } : availability,
    availability_slots: Array.isArray(availability) ? availability : availabilitySlots(availability),
  };
}

function scoreVenue(player, venue, filters = {}) {
  const desiredSport = filters.sport || "";
  const maxPrice = Number(filters.maxPrice || filters.budget || 0);
  const desiredAvailability = filters.availability || "";
  const distance = distanceKm(player.location, venue.location);
  const price = Number(venue.price_per_hour ?? venue.price ?? 0);
  const slots = availabilitySlots(venue.availability_slots?.length ? venue.availability_slots : venue.availability);
  const supportedSports = venue.supported_sports || [];

  const factors = {
    sportSuitability: {
      weight: 35,
      raw: desiredSport ? (supportedSports.includes(desiredSport) ? 100 : 0) : 75,
      detail: desiredSport
        ? supportedSports.includes(desiredSport)
          ? `supports ${desiredSport}`
          : `does not list ${desiredSport}`
        : "no sport filter applied",
    },
    distance: {
      weight: 25,
      raw: distance == null ? 60 : Math.max(0, Math.round(100 - Math.min(distance, 20) * 5)),
      detail: distance == null ? "distance unavailable" : `${distance.toFixed(1)}km away`,
    },
    cost: {
      weight: 20,
      raw: maxPrice ? Math.max(0, Math.round(100 - Math.max(0, price - maxPrice) / Math.max(maxPrice, 1) * 100)) : 70,
      detail: maxPrice ? `${price <= maxPrice ? "within" : "above"} budget at Rs ${price}/hr` : `Rs ${price}/hr`,
    },
    availability: {
      weight: 20,
      raw: desiredAvailability ? (slots.includes(desiredAvailability) ? 100 : 0) : slots.length ? 75 : 30,
      detail: desiredAvailability
        ? slots.includes(desiredAvailability)
          ? `available ${desiredAvailability}`
          : `${desiredAvailability} not listed`
        : `${slots.length} available slot${slots.length === 1 ? "" : "s"}`,
    },
  };

  const totalWeight = Object.values(factors).reduce((sum, factor) => sum + factor.weight, 0);
  const score = Math.round(Object.values(factors).reduce((sum, factor) => sum + factor.raw * factor.weight, 0) / totalWeight);
  return {
    score,
    distanceKm: distance,
    reasons: Object.values(factors).map((factor) => factor.detail),
    factors,
  };
}

async function buildMatchCandidatesForPlayer(player, sport) {
  const playerId = player.player_id;
  const [players, actions, outboundConnections, inboundConnections] = await Promise.all([
    supabaseDb(`/players?player_id=neq.${encodeFilterValue(playerId)}`),
    supabaseDb(`/match_candidate_actions?player_id=eq.${encodeFilterValue(playerId)}&sport=eq.${encodeFilterValue(sport)}`),
    supabaseDb(`/player_connections?requester_player_id=eq.${encodeFilterValue(playerId)}`),
    supabaseDb(`/player_connections?addressee_player_id=eq.${encodeFilterValue(playerId)}`),
  ]);

  const hiddenCandidateIds = new Set(actions.map((action) => action.candidate_player_id));
  const connections = [...outboundConnections, ...inboundConnections];
  return players
    .filter((candidate) => candidate.sports?.includes(sport) && !hiddenCandidateIds.has(candidate.player_id))
    .map((candidate) => scoreCandidate(player, candidate, sport, connectionStatusFor(connections, playerId, candidate.player_id)))
    .sort((a, b) => b.score - a.score);
}

async function discoverVenuesForPlayer(player, filters = {}) {
  const { sport, location, maxPrice, availability } = filters;
  let path = "/venues?select=*,organisations(name)&order=venue_id.asc";
  if (sport) path += `&supported_sports=cs.{${encodeFilterValue(sport)}}`;
  const rows = await supabaseDb(path);
  const filtered = rows.filter((venue) => {
    const venueLocation = typeof venue.location === "string" ? venue.location : venue.location?.label || "";
    const price = Number(venue.price_per_hour ?? venue.price ?? 0);
    const slots = availabilitySlots(venue.availability_slots?.length ? venue.availability_slots : venue.availability);
    return (
      (!location || venueLocation.toLowerCase().includes(String(location).toLowerCase())) &&
      (!maxPrice || price <= Number(maxPrice)) &&
      (!availability || slots.includes(String(availability)))
    );
  });
  const scored = filtered
    .map((venue) => normalizeVenue(venue, scoreVenue(player, venue, { sport, maxPrice, availability })))
    .sort((a, b) => b.score - a.score)
    .map((venue, index) => ({ ...venue, bestMatch: index === 0 }));
  return Promise.all(
    scored.map(async (venue) => ({
      ...venue,
      travelContext: await externalContextService.getTravelContext(player.location, venue.locationRaw || venue.location),
    }))
  );
}

async function createGameForPlayer(player, { sport, dateTime, venueId, capacity }) {
  if (!sport || !dateTime || !venueId || !capacity) {
    const error = new Error("sport, dateTime, venueId, and capacity are required.");
    error.status = 400;
    throw error;
  }
  const venueRows = await supabaseDb(`/venues?venue_id=eq.${encodeFilterValue(venueId)}&limit=1`);
  const venue = venueRows?.[0];
  if (!venue || !venue.supported_sports?.includes(sport)) {
    const error = new Error("Choose a venue that supports this sport.");
    error.status = 400;
    throw error;
  }
  if (!Number.isFinite(Date.parse(dateTime)) || Date.parse(dateTime) <= Date.now()) {
    const error = new Error("Choose a future game date and time.");
    error.status = 400;
    throw error;
  }
  if (!Number.isInteger(Number(capacity)) || Number(capacity) < 2 || Number(capacity) > 22) {
    const error = new Error("Capacity must be between 2 and 22 players.");
    error.status = 400;
    throw error;
  }
  const gameRows = await supabaseDb("/games?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: {
      sport,
      date_time: dateTime,
      venue_id: venueId,
      capacity: Number(capacity),
      created_by: player.player_id,
      participants: [],
      teams: {},
      status: "Open",
      is_demo: Boolean(venue.is_demo),
    },
  });
  const game = gameRows?.[0];
  await supabaseDb("/game_participants", {
    method: "POST",
    body: { game_id: game.game_id, player_id: player.player_id, status: "confirmed" },
  });
  const freshRows = await supabaseDb(`/games?select=*,venues(name)&game_id=eq.${encodeFilterValue(game.game_id)}&limit=1`);
  return { ...normalizeGame(freshRows?.[0] || game), joined: true };
}

function proposalDateTime({ date, time }) {
  if (!date || !time) return null;
  const rawDate = String(date).trim().toLowerCase();
  const today = new Date();
  const datePart =
    rawDate === "today"
      ? today.toISOString().slice(0, 10)
      : rawDate === "tomorrow"
        ? new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : String(date).trim();
  const rawTime = String(time).trim();
  const twelveHour = rawTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  const timePart = twelveHour
    ? `${String(
        (Number(twelveHour[1]) % 12) + (twelveHour[3].toLowerCase() === "pm" ? 12 : 0)
      ).padStart(2, "0")}:${twelveHour[2] || "00"}`
    : rawTime;
  const value = new Date(`${datePart}T${timePart}`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function normalizeBooking(row, venue, player) {
  return {
    id: row.booking_id,
    venueId: row.venue_id,
    venue: venue ? normalizeVenue(venue) : null,
    playerId: row.player_id,
    player: player ? playerToAppProfile(player) : null,
    slot: row.slot,
    startAt: row.start_at,
    amount: Number(row.amount || 0),
    status: row.status,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    demo: Boolean(row.is_demo),
  };
}

function normalizePayment(row) {
  if (!row) return null;
  return {
    id: row.payment_id,
    bookingId: row.booking_id,
    gatewayReference: row.gateway_reference,
    idempotencyKey: row.idempotency_key,
    provider: row.provider,
    providerOrderId: row.provider_order_id,
    providerPaymentId: row.provider_payment_id,
    amount: Number(row.amount || 0),
    status: row.status,
    failureReason: row.failure_reason,
  };
}

async function writeAuditLog({ actorId, actorType = "user", action, entityType, entityId, beforeState, afterState, metadata = {} }) {
  await supabaseDb("/audit_logs", {
    method: "POST",
    body: {
      actor_id: actorId ? String(actorId) : null,
      actor_type: actorType,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      before_state: beforeState ?? null,
      after_state: afterState ?? null,
      metadata,
    },
  });
}

const ACTIVITY_SOURCE_BY_TYPE = {
  exercise: "exercise_session",
  tutorial: "tutorial_session",
  match: "match_result",
};

const STREAK_MILESTONES = [7, 10, 14, 21, 30];

function normalizeActivityEvent(row) {
  if (!row) return null;
  return {
    id: row.activity_id,
    playerId: row.player_id,
    type: row.type,
    localDate: row.local_date,
    sourceType: row.source_type,
    sourceId: row.source_id,
    qualifying: row.qualifying_flag,
    createdAt: row.created_at,
  };
}

function normalizeStreakRecord(row) {
  return {
    playerId: row.player_id,
    currentStreak: Number(row.current_streak || 0),
    longestStreak: Number(row.longest_streak || 0),
    lastQualifyingDate: row.last_qualifying_date,
    timezone: row.timezone,
  };
}

function isValidTimeZone(timezone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function configuredTimezone(player, _requestedTimezone) {
  const candidates = [
    player?.preferences?.timezone,
    player?.preferences?.timeZone,
    player?.location?.timezone,
    player?.location?.timeZone,
  ].filter(Boolean);
  return candidates.find(isValidTimeZone) || "UTC";
}

function localDateInTimezone(value, timezone) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const error = new Error("occurredAt must be a valid date/time.");
    error.status = 400;
    throw error;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addCalendarDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthBounds(year, month) {
  const numericYear = Number(year);
  const numericMonth = Number(month);
  if (!Number.isInteger(numericYear) || !Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12) {
    const error = new Error("year and month are required. Month must be 1-12.");
    error.status = 400;
    throw error;
  }
  const start = `${numericYear}-${String(numericMonth).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(numericYear, numericMonth, 0));
  const end = endDate.toISOString().slice(0, 10);
  return { year: numericYear, month: numericMonth, start, end, daysInMonth: endDate.getUTCDate() };
}

async function getOrCreateStreakRecord(player, timezone) {
  const rows = await supabaseDb(`/streak_records?player_id=eq.${encodeFilterValue(player.player_id)}&limit=1`);
  if (rows?.[0]) {
    const existing = rows[0];
    if (existing.timezone === timezone) return existing;
    const updated = await supabaseDb(`/streak_records?player_id=eq.${encodeFilterValue(player.player_id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: { timezone },
    });
    return updated?.[0] || existing;
  }
  const inserted = await supabaseDb("/streak_records?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: {
      player_id: player.player_id,
      current_streak: 0,
      longest_streak: 0,
      last_qualifying_date: null,
      timezone,
    },
  });
  return inserted?.[0];
}

async function recordQualifyingActivityEvent({ player, type, sourceType, sourceId, occurredAt, qualifies, timezone }) {
  if (!["exercise", "tutorial", "match"].includes(type)) {
    const error = new Error("type must be exercise, tutorial, or match.");
    error.status = 400;
    throw error;
  }
  const expectedSourceType = ACTIVITY_SOURCE_BY_TYPE[type];
  if ((sourceType || expectedSourceType) !== expectedSourceType) {
    const error = new Error(`${type} activity must use sourceType ${expectedSourceType}.`);
    error.status = 400;
    throw error;
  }
  if (!sourceId) {
    const error = new Error("sourceId is required.");
    error.status = 400;
    throw error;
  }

  const resolvedTimezone = configuredTimezone(player, timezone);
  const streakRecord = await getOrCreateStreakRecord(player, resolvedTimezone);
  if (!qualifies) {
    return {
      created: false,
      discarded: true,
      reason: "Activity did not meet its qualifying threshold.",
      streak: normalizeStreakRecord(streakRecord),
    };
  }

  const localDate = localDateInTimezone(occurredAt, resolvedTimezone);
  const existingSource = await supabaseDb(
    `/activity_events?player_id=eq.${encodeFilterValue(player.player_id)}&source_type=eq.${expectedSourceType}&source_id=eq.${encodeFilterValue(sourceId)}&limit=1`
  );
  if (existingSource?.[0]) {
    return {
      created: false,
      idempotent: true,
      activityEvent: normalizeActivityEvent(existingSource[0]),
      streak: normalizeStreakRecord(streakRecord),
    };
  }

  const countedToday = await supabaseDb(
    `/activity_events?player_id=eq.${encodeFilterValue(player.player_id)}&local_date=eq.${localDate}&qualifying_flag=eq.true&limit=1`
  );
  const eventResult = await createOnce({
    findExisting: async () => {
      const rows = await supabaseDb(
        `/activity_events?player_id=eq.${encodeFilterValue(player.player_id)}&source_type=eq.${expectedSourceType}&source_id=eq.${encodeFilterValue(sourceId)}&limit=1`
      );
      return rows?.[0] || null;
    },
    insertRecord: async () => {
      const rows = await supabaseDb("/activity_events?on_conflict=player_id,source_type,source_id&select=*", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
        body: {
          player_id: player.player_id,
          type,
          local_date: localDate,
          source_type: expectedSourceType,
          source_id: sourceId,
          qualifying_flag: true,
        },
      });
      return rows?.[0] || null;
    },
  });
  const activityEvent = eventResult.record;
  if (eventResult.idempotent) {
    return {
      created: false,
      idempotent: true,
      activityEvent: normalizeActivityEvent(activityEvent),
      streak: normalizeStreakRecord(streakRecord),
    };
  }

  if (countedToday?.[0]) {
    return {
      created: true,
      streakChanged: false,
      activityEvent: normalizeActivityEvent(activityEvent),
      streak: normalizeStreakRecord(streakRecord),
    };
  }

  const allDays = await supabaseDb(`/activity_events?player_id=eq.${encodeFilterValue(player.player_id)}&qualifying_flag=eq.true&select=local_date`);
  const calculated = calculateStreakFromDates(allDays.map((row) => row.local_date), localDate);
  const currentStreak = calculated.current;
  const longestStreak = calculated.longest;
  const updatedRows = await supabaseDb(`/streak_records?player_id=eq.${encodeFilterValue(player.player_id)}&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_qualifying_date: localDate,
      timezone: resolvedTimezone,
    },
  });
  await supabaseDb(`/players?player_id=eq.${encodeFilterValue(player.player_id)}`, {
    method: "PATCH",
    body: { streak: currentStreak },
  });

  return {
    created: true,
    streakChanged: true,
    activityEvent: normalizeActivityEvent(activityEvent),
    streak: normalizeStreakRecord(updatedRows?.[0] || streakRecord),
  };
}

async function removeCorrectedActivity(player, sourceType, sourceId) {
  await supabaseDb(`/activity_events?player_id=eq.${encodeFilterValue(player.player_id)}&source_type=eq.${sourceType}&source_id=eq.${encodeFilterValue(sourceId)}`, { method: "DELETE" });
  const timezone = configuredTimezone(player);
  const rows = await supabaseDb(`/activity_events?player_id=eq.${encodeFilterValue(player.player_id)}&qualifying_flag=eq.true&order=local_date.desc&select=local_date`);
  const calculated = calculateStreakFromDates(rows.map((row) => row.local_date), localDateInTimezone(null, timezone));
  const existing = await getOrCreateStreakRecord(player, timezone);
  await supabaseDb(`/streak_records?player_id=eq.${encodeFilterValue(player.player_id)}`, { method: "PATCH", body: { current_streak: calculated.current, longest_streak: calculated.longest, last_qualifying_date: calculated.lastQualifyingDate } });
  await supabaseDb(`/players?player_id=eq.${encodeFilterValue(player.player_id)}`, { method: "PATCH", body: { streak: calculated.current } });
  return { ...normalizeStreakRecord(existing), currentStreak: calculated.current, longestStreak: calculated.longest, lastQualifyingDate: calculated.lastQualifyingDate };
}

async function buildStreakMonth(player, { year, month, timezone }) {
  const resolvedTimezone = configuredTimezone(player, timezone);
  const streakRecord = await getOrCreateStreakRecord(player, resolvedTimezone);
  const allDays = await supabaseDb(`/activity_events?player_id=eq.${encodeFilterValue(player.player_id)}&qualifying_flag=eq.true&select=local_date`);
  const authoritative = calculateStreakFromDates(allDays.map((row) => row.local_date), localDateInTimezone(null, resolvedTimezone));
  if (Number(streakRecord.current_streak) !== authoritative.current || Number(streakRecord.longest_streak) !== authoritative.longest || streakRecord.last_qualifying_date !== authoritative.lastQualifyingDate) {
    await supabaseDb(`/streak_records?player_id=eq.${encodeFilterValue(player.player_id)}`, { method: "PATCH", body: { current_streak: authoritative.current, longest_streak: authoritative.longest, last_qualifying_date: authoritative.lastQualifyingDate } });
    await supabaseDb(`/players?player_id=eq.${encodeFilterValue(player.player_id)}`, { method: "PATCH", body: { streak: authoritative.current } });
  }
  const bounds = monthBounds(year, month);
  const previousMonthDate = addCalendarDays(bounds.start, -1);
  const events = await supabaseDb(
    `/activity_events?player_id=eq.${encodeFilterValue(player.player_id)}&local_date=gte.${bounds.start}&local_date=lte.${bounds.end}&qualifying_flag=eq.true&order=local_date.asc`
  );
  const todayKey = localDateInTimezone(null, resolvedTimezone);
  const todayEvents = await supabaseDb(`/activity_events?player_id=eq.${encodeFilterValue(player.player_id)}&local_date=eq.${todayKey}&qualifying_flag=eq.true&select=type`);
  const previousRows = await supabaseDb(
    `/activity_events?player_id=eq.${encodeFilterValue(player.player_id)}&local_date=eq.${previousMonthDate}&qualifying_flag=eq.true&limit=1`
  );
  const eventsByDate = events.reduce((acc, event) => {
    acc[event.local_date] ||= [];
    acc[event.local_date].push(event);
    return acc;
  }, {});
  const activityMix = { exercise: 0, tutorial: 0, match: 0 };
  events.forEach((event) => {
    activityMix[event.type] = (activityMix[event.type] || 0) + 1;
  });

  let previousHadQualifying = Boolean(previousRows?.[0]);
  const days = Array.from({ length: bounds.daysInMonth }, (_, index) => {
    const date = `${bounds.year}-${String(bounds.month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
    const dayEvents = eventsByDate[date] || [];
    const qualifying = dayEvents.length > 0;
    const state = qualifying ? (previousHadQualifying ? "streak" : "start") : "missed";
    previousHadQualifying = qualifying;
    return {
      date,
      qualifying,
      state,
      eventCount: dayEvents.length,
      types: [...new Set(dayEvents.map((event) => event.type))],
    };
  });

  return {
    streak: { ...normalizeStreakRecord(streakRecord), currentStreak: authoritative.current, longestStreak: authoritative.longest, lastQualifyingDate: authoritative.lastQualifyingDate },
    currentStreak: authoritative.current,
    longestStreak: authoritative.longest,
    timezone: resolvedTimezone,
    today: {
      date: todayKey,
      types: [...new Set(todayEvents.map((event) => event.type))],
      eventCount: todayEvents.length,
    },
    month: {
      year: bounds.year,
      month: bounds.month,
      start: bounds.start,
      end: bounds.end,
      days,
      dayMap: days.reduce((acc, day) => ({ ...acc, [day.date]: day }), {}),
    },
    activityMix,
    milestones: STREAK_MILESTONES.map((daysRequired) => ({
      days: daysRequired,
      reached: authoritative.longest >= daysRequired,
    })),
  };
}

function normalizeExerciseSession(row, exercise) {
  const detected = row.detected_result || {};
  return {
    id: row.session_id,
    playerId: row.player_id,
    exercisePlanId: row.exercise_plan_id,
    exercise: exercise
      ? {
          id: exercise.exercise_id,
          name: exercise.name,
          cameraView: exercise.camera_view,
          targetMetrics: exercise.target_metrics,
          thresholds: exercise.thresholds,
          cues: exercise.cues,
        }
      : detected.exercise || null,
    startAt: row.start_at,
    endAt: row.end_at,
    setsReps: row.sets_reps,
    quality: Number(row.quality || 0),
    completion: row.completion,
    feedback: row.feedback,
    detectedResult: detected,
    correctionFlags: row.correction_flags || {},
  };
}

async function ensureExerciseCatalogEntry(name) {
  const catalogEntry = EXERCISE_CATALOG.find((exercise) => exercise.name === name);
  if (!catalogEntry) {
    const error = new Error("Unsupported exercise.");
    error.status = 400;
    throw error;
  }

  const existingRows = await supabaseDb(`/exercises?name=eq.${encodeFilterValue(catalogEntry.name)}&limit=1`);
  if (existingRows?.[0]) return existingRows[0];

  const rows = await supabaseDb("/exercises?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: {
      name: catalogEntry.name,
      difficulty: catalogEntry.difficulty,
      camera_view: catalogEntry.cameraView,
      target_metrics: catalogEntry.targetMetrics,
      thresholds: catalogEntry.thresholds,
      cues: catalogEntry.cues,
    },
  });
  return rows?.[0];
}

async function loadExerciseById(exerciseId) {
  if (!exerciseId) return null;
  const rows = await supabaseDb(`/exercises?exercise_id=eq.${encodeFilterValue(exerciseId)}&limit=1`);
  return rows?.[0] || null;
}

function normalizeTutorialSession(row, drill) {
  const detected = row.detected_result || {};
  return {
    id: row.session_id,
    playerId: row.player_id,
    drillId: row.drill_id,
    tutorial: drill
      ? {
          id: drill.drill_id,
          sport: drill.sport,
          drillName: drill.drill_name,
          cameraView: drill.camera_view,
          checkpoints: drill.checkpoints,
          thresholds: drill.thresholds,
        }
      : detected.tutorial || null,
    checkpointResults: row.checkpoint_results || detected.checkpointResults || [],
    score: Number(row.score || 0),
    feedback: row.feedback,
    completion: row.completion,
    startAt: row.start_at,
    endAt: row.end_at,
    detectedResult: detected,
    correctionFlags: row.correction_flags || {},
  };
}

async function ensureTutorialDrill(sport, drillName) {
  const catalogEntry = TUTORIAL_DRILL_CATALOG.find(
    (drill) => drill.sport === sport && drill.drillName === drillName
  );
  if (!catalogEntry) {
    const error = new Error("Unsupported tutorial drill.");
    error.status = 400;
    throw error;
  }
  const existingRows = await supabaseDb(
    `/tutorial_drills?sport=eq.${encodeFilterValue(catalogEntry.sport)}&drill_name=eq.${encodeFilterValue(catalogEntry.drillName)}&limit=1`
  );
  if (existingRows?.[0]) {
    const existing = existingRows[0];
    const hasCompleteCheckpointConfig = Array.isArray(existing.checkpoints) && existing.checkpoints.every((checkpoint) => checkpoint.label && checkpoint.thresholds && checkpoint.cue);
    const hasCompletionConfig = Boolean(existing.thresholds?.completion);
    if (hasCompleteCheckpointConfig && hasCompletionConfig) return existing;
    const updatedRows = await supabaseDb(`/tutorial_drills?drill_id=eq.${encodeFilterValue(existing.drill_id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: {
        camera_view: catalogEntry.cameraView,
        checkpoints: catalogEntry.checkpoints,
        thresholds: { completion: catalogEntry.completion, scopeNote: catalogEntry.scopeNote },
      },
    });
    return updatedRows?.[0] || existing;
  }

  const rows = await supabaseDb("/tutorial_drills?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: {
      sport: catalogEntry.sport,
      drill_name: catalogEntry.drillName,
      camera_view: catalogEntry.cameraView,
      checkpoints: catalogEntry.checkpoints,
      thresholds: { completion: catalogEntry.completion, scopeNote: catalogEntry.scopeNote },
    },
  });
  return rows?.[0];
}

async function loadTutorialDrillById(drillId) {
  if (!drillId) return null;
  const rows = await supabaseDb(`/tutorial_drills?drill_id=eq.${encodeFilterValue(drillId)}&limit=1`);
  return rows?.[0] || null;
}

async function loadPreviousTutorialSession(playerId, drillId) {
  const rows = await supabaseDb(
    `/tutorial_sessions?player_id=eq.${encodeFilterValue(playerId)}&drill_id=eq.${encodeFilterValue(drillId)}&order=start_at.desc&limit=1`
  );
  return rows?.[0] || null;
}

async function persistAlternativeSportRecommendations(playerId, result) {
  if (!playerId || !result?.recommendations?.length) return;
  try {
    await supabaseDb("/alternative_sport_recommendations?on_conflict=player_id,source_sport,candidate_sport", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: result.recommendations.map((recommendation) => ({
        player_id: playerId,
        source_sport: result.primarySport,
        candidate_sport: recommendation.sport,
        similarity_factors: {
          score: recommendation.score,
          sharedAttributes: recommendation.sharedAttributes,
          factors: recommendation.similarityFactors,
          preferenceSignals: recommendation.preferenceSignals,
          framing: recommendation.framing,
          disclaimer: result.disclaimer,
        },
        opportunity_signals: recommendation.opportunitySignals || [],
        source_refs: (recommendation.opportunitySignals || []).map((source) => ({
          provider: source.provider,
          url: source.url,
          title: source.title,
          retrievedAt: source.retrievedAt,
        })),
      })),
    });
  } catch (err) {
    console.warn("Could not persist alternative sport recommendations:", err.message);
  }
}

async function persistSearchSources(sources = []) {
  const cleanSources = sources.filter((source) => source?.url && source?.title);
  if (!cleanSources.length) return [];
  try {
    return await supabaseDb("/web_sources?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: cleanSources.map((source) => ({
        provider: source.provider,
        query: source.query,
        url: source.url,
        title: source.title,
        retrieved_at: source.retrievedAt || new Date().toISOString(),
        relevance_quality_status: source.relevanceQualityStatus || "unreviewed_search_result",
      })),
    });
  } catch (err) {
    console.warn("Could not persist search source metadata:", err.message);
    return [];
  }
}

function normalizeExpenseShare(row, player) {
  return {
    bookingId: row.booking_id,
    playerId: row.player_id,
    player: player ? playerToAppProfile(player) : null,
    amount: Number(row.amount || 0),
    status: row.share_status,
  };
}

async function getPlayerOwnedBooking(bookingId, playerId) {
  const rows = await supabaseDb(
    `/venue_bookings?booking_id=eq.${encodeFilterValue(bookingId)}&player_id=eq.${encodeFilterValue(playerId)}&limit=1`
  );
  return rows?.[0] || null;
}

async function loadBookingExpenseSplit(bookingId) {
  const shares = await supabaseDb(
    `/booking_expense_shares?booking_id=eq.${encodeFilterValue(bookingId)}&order=player_id.asc`
  );
  const playerIds = [...new Set(shares.map((share) => share.player_id))];
  const players = playerIds.length ? await supabaseDb(`/players?player_id=in.(${playerIds.join(",")})`) : [];
  const normalizedShares = shares.map((share) =>
    normalizeExpenseShare(
      share,
      players.find((player) => player.player_id === share.player_id)
    )
  );
  const totalAmount = normalizedShares.reduce((sum, share) => sum + share.amount, 0);
  const paidAmount = normalizedShares
    .filter((share) => share.status === "paid")
    .reduce((sum, share) => sum + share.amount, 0);
  return {
    bookingId,
    totalAmount: Math.round(totalAmount * 100) / 100,
    perPlayerShare: normalizedShares[0]?.amount || 0,
    paidAmount: Math.round(paidAmount * 100) / 100,
    pendingAmount: Math.round((totalAmount - paidAmount) * 100) / 100,
    shares: normalizedShares,
  };
}

function razorpayConfigured() {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

function razorpayAuthHeader() {
  return `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`;
}

async function createRazorpayOrder({ bookingId, amount }) {
  if (!razorpayConfigured()) {
    return { ok: false, unavailable: true, reason: "Razorpay test keys are not configured." };
  }

  try {
    const response = await fetch(`${RAZORPAY_API_URL}/orders`, {
      method: "POST",
      headers: {
        Authorization: razorpayAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(Number(amount) * 100),
        currency: "INR",
        receipt: `booking:${String(bookingId).slice(0, 30)}`,
        notes: { booking_id: bookingId, idempotency_key: `booking:${bookingId}` },
      }),
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      return {
        ok: false,
        unavailable: response.status >= 500,
        reason: data?.error?.description || data?.message || "Razorpay order creation failed.",
        status: response.status,
      };
    }
    return { ok: true, order: data };
  } catch (err) {
    return { ok: false, unavailable: true, reason: err.message || "Razorpay is unavailable." };
  }
}

function verifyRazorpaySignature({ providerOrderId, providerPaymentId, providerSignature }) {
  if (!razorpayConfigured()) return false;
  const expected = createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${providerOrderId}|${providerPaymentId}`)
    .digest("hex");
  return expected === providerSignature;
}

function balanceParticipants(players, teamCount = 2) {
  const safeTeamCount = Math.max(2, Number(teamCount) || 2);
  const teams = Array.from({ length: safeTeamCount }, (_, index) => ({
    name: `Team ${String.fromCharCode(65 + index)}`,
    players: [],
    totalRating: 0,
  }));

  const sorted = [...players].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  const assignments = [];
  for (const player of sorted) {
    teams.sort((a, b) => a.totalRating - b.totalRating || a.players.length - b.players.length);
    teams[0].players.push(player);
    teams[0].totalRating += Number(player.rating || 0);
    assignments.push(`${player.name} placed on ${teams[0].name} because it had the lowest rating total before assignment.`);
  }

  teams.sort((a, b) => a.name.localeCompare(b.name));
  const totals = teams.map((team) => team.totalRating);
  const difference = Math.max(...totals) - Math.min(...totals);
  const average = totals.reduce((sum, value) => sum + value, 0) / totals.length || 1;
  const balanceScore = Math.max(0, Math.round(100 - (difference / average) * 100));

  return {
    teams,
    balanceScore,
    ratingDifference: difference,
    factors: {
      rating: "Only confirmed participant ratings are used for team strength.",
      method: "Players are sorted by rating, then assigned one-by-one to the currently weakest team.",
      teamCount: safeTeamCount,
    },
    reasons: assignments,
  };
}

function buildSystemPrompt(context = {}) {
  const {
    role,
    player,
    organisation,
    venues = [],
    games = [],
    friends = [],
    funding = [],
    career = [],
    sponsorships = [],
  } = context;

  return `You are "Krid.ai Assistant" — a friendly, concise AI helper built into the Krid.ai sports app (an Indian sports-community platform).

You help the logged-in user with:
- General sports knowledge/questions (rules, fitness tips, tournaments, techniques) — answer directly from your own knowledge.
- Match coordination and discovery. Collect sport, date, time, location, and preferences conversationally; when those
  details are available, use prepare_match_proposal to prepare compatible players and venues from platform services.
- Funding, scholarships, grants, career opportunities and sponsorships — answer using the data below when those
  features exist, but do not submit applications or requests from chat.

Current session:
- Role: ${role || "unknown"}
${player ? `- Player: ${JSON.stringify(player)}` : ""}
${organisation ? `- Organisation: ${JSON.stringify(organisation)}` : ""}

Venues available:
${JSON.stringify(venues)}

Open games:
${JSON.stringify(games)}

Accepted friends:
${JSON.stringify(friends)}

Funding / scholarship opportunities:
${JSON.stringify(funding)}

Career opportunities:
${JSON.stringify(career)}

Sponsorship deals:
${JSON.stringify(sponsorships)}

Rules:
- Keep replies short (2-5 sentences), warm and specific. Entries marked sample are fictional examples; say so clearly.
- You must never claim to have booked a venue, processed payment, or created a match from a chat message.
- Only call prepare_match_proposal when the user has supplied sport, date and time, or when you can infer them from
  explicit user text. The tool prepares options only; the user must press a separate confirmation control in the app
  before any match can be created.
- For pure informational questions, answer directly in text using the data provided.
- Never invent venues, games, friends, funding, career or sponsorship entries that are not in the lists above. Do not
  present sample entries as real availability, eligibility, confirmed bookings, or live applications.
- After a proposal tool result comes back, explain that it is a proposal awaiting explicit confirmation.
- Everything here is a simulated hackathon prototype — you can mention that if it's relevant, but don't dwell on it.`;
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    model: GROQ_MODEL,
    keyConfigured: Boolean(GROQ_API_KEY),
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY),
  });
});

app.get("/api/demo/catalog", async (_req, res) => {
  try {
    if (!requireSupabaseConfig(res)) return;
    const rows = await supabaseDb("/demo_catalog_entries?select=kind,payload&order=entry_id.asc&limit=100");
    res.set("Cache-Control", "public, max-age=60");
    res.json({ catalog: buildDemoCatalog(rows) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load sample catalog." });
  }
});

app.get("/api/health/cv", async (req, res) => {
  try {
    const response = await fetch(`${CV_SERVICE_URL}/healthz`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`CV health returned ${response.status}`);
    const data = await response.json();
    if (data?.status !== "ok") throw new Error("CV health returned an invalid status");
    res.json({ ok: true, service: "cv", schemaVersion: data.schemaVersion });
  } catch {
    res.status(503).json({ ok: false, service: "cv", error: "Pose service is unavailable." });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    if (!requireSupabaseConfig(res)) return;
    const { email, phone, password } = req.body || {};
    if (!password || (!email && !phone)) {
      return res.status(400).json({ error: "Provide a password and either an email or phone." });
    }

    const body = { password };
    if (email) body.email = String(email).trim().toLowerCase();
    if (phone) body.phone = String(phone).trim();

    const data = await supabaseAuth("/signup", body);
    res.status(201).json(normalizeAuth(data));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Registration failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    if (!requireSupabaseConfig(res)) return;
    const { email, phone, password } = req.body || {};
    if (!password || (!email && !phone)) {
      return res.status(400).json({ error: "Provide a password and either an email or phone." });
    }

    const body = { password };
    if (email) body.email = String(email).trim().toLowerCase();
    if (phone) body.phone = String(phone).trim();

    const data = await supabaseAuth("/token?grant_type=password", body);
    const auth = normalizeAuth(data);
    const bundle = auth.user ? await getAccountProfile(auth.user.id) : { account: null, player: null, organisation: null };
    res.json({ ...auth, profile: accountPayload(bundle) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Login failed." });
  }
});

app.get("/api/me", requireUser, async (req, res) => {
  try {
    const bundle = await getAccountProfile(req.user.id);
    res.json({ user: req.user, profile: accountPayload(bundle) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load account." });
  }
});

app.post("/api/auth/resend-confirmation", requireUser, async (req, res) => {
  try {
    if (!req.user.email) return res.status(400).json({ error: "Add an account email to request confirmation." });
    if (req.user.email_confirmed_at) return res.json({ message: "Your account email is already confirmed." });
    await supabaseAuth("/resend", { type: "signup", email: req.user.email });
    res.json({ message: "If email confirmation is enabled, Supabase has sent a new confirmation link." });
  } catch (err) { res.status(err.status || 500).json({ error: err.message || "Could not request a confirmation email." }); }
});

app.post("/api/onboarding/role", requireUser, async (req, res) => {
  try {
    const role = normalizeRole(req.body?.role);
    if (!role) return res.status(400).json({ error: "Role must be Player or Organisation." });

    const existing = await getAccountProfile(req.user.id);
    if (existing.account) {
      return res.status(409).json({ error: "This account already has a role.", profile: accountPayload(existing) });
    }

    if (role === "Player") {
      const playerRows = await supabaseDb("/players?select=*", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: playerWritePayload(req.body?.profile || {}, req.user),
      });
      const player = playerRows?.[0];
      const accountRows = await supabaseDb("/account_profiles?select=*", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: {
          account_id: req.user.id,
          role,
          player_id: player.player_id,
          organisation_id: null,
        },
      });
      return res.status(201).json(accountPayload({ account: accountRows?.[0], player, organisation: null }));
    }

    const orgRows = await supabaseDb("/organisations?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: organisationWritePayload(req.body?.profile || {}, req.user),
    });
    const organisation = orgRows?.[0];
    const accountRows = await supabaseDb("/account_profiles?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: {
        account_id: req.user.id,
        role,
        player_id: null,
        organisation_id: organisation.organisation_id,
      },
    });
    res.status(201).json(accountPayload({ account: accountRows?.[0], player: null, organisation }));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not complete onboarding." });
  }
});

app.get("/api/profile", requireUser, async (req, res) => {
  try {
    const bundle = await getAccountProfile(req.user.id);
    if (!bundle.account) return res.status(404).json({ error: "No role/profile has been created for this account." });
    res.json(accountPayload(bundle));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load profile." });
  }
});

app.put("/api/profile/player", requireUser, async (req, res) => {
  try {
    const bundle = await getAccountProfile(req.user.id);
    if (bundle.account?.role !== "Player" || !bundle.player) {
      return res.status(403).json({ error: "This endpoint is only available for Player accounts." });
    }
    const requestedTimezone = req.body?.preferences?.timezone;
    if (requestedTimezone && requestedTimezone !== configuredTimezone(bundle.player)) {
      const existingEvents = await supabaseDb(`/activity_events?player_id=eq.${encodeFilterValue(bundle.player.player_id)}&limit=1&select=activity_id`);
      if (existingEvents.length) return res.status(409).json({ error: "Time zone cannot be changed after qualifying activity is recorded. Contact an administrator to migrate existing event dates." });
    }

    const rows = await supabaseDb(`/players?player_id=eq.${bundle.player.player_id}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: playerWritePayload(req.body || {}, req.user, bundle.player),
    });
    res.json(accountPayload({ ...bundle, player: rows?.[0] || bundle.player }));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not update player profile." });
  }
});

app.delete("/api/profile/player", requireUser, async (req, res) => {
  try {
    const bundle = await getAccountProfile(req.user.id);
    if (bundle.account?.role !== "Player" || !bundle.player) {
      return res.status(403).json({ error: "This endpoint is only available for Player accounts." });
    }

    await supabaseDb(`/account_profiles?account_id=eq.${req.user.id}`, { method: "DELETE" });
    await supabaseDb(`/players?player_id=eq.${bundle.player.player_id}`, { method: "DELETE" });
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not delete player profile." });
  }
});

app.get("/api/recommendations/alternative-sports", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const player = playerToAppProfile(bundle.player);
    const baseResult = recommendAlternativeSports({
      primarySport: req.query.primarySport || player.sports?.[0],
      player,
      limit: req.query.limit || 5,
    });
    const result = await enrichAlternativeSportOpportunities(baseResult);
    await persistSearchSources(result.recommendations.flatMap((recommendation) => recommendation.opportunitySignals || []));
    await persistAlternativeSportRecommendations(bundle.player.player_id, result);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not compute alternative sport recommendations." });
  }
});

app.put("/api/profile/organisation", requireUser, async (req, res) => {
  try {
    const bundle = await getAccountProfile(req.user.id);
    if (bundle.account?.role !== "Organisation" || !bundle.organisation) {
      return res.status(403).json({ error: "This endpoint is only available for Organisation accounts." });
    }

    const rows = await supabaseDb(`/organisations?organisation_id=eq.${bundle.organisation.organisation_id}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: organisationWritePayload(req.body || {}, req.user, bundle.organisation),
    });
    res.json(accountPayload({ ...bundle, organisation: rows?.[0] || bundle.organisation }));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not update organisation profile." });
  }
});

app.delete("/api/profile/organisation", requireUser, async (req, res) => {
  try {
    const bundle = await getAccountProfile(req.user.id);
    if (bundle.account?.role !== "Organisation" || !bundle.organisation) {
      return res.status(403).json({ error: "This endpoint is only available for Organisation accounts." });
    }

    await supabaseDb(`/account_profiles?account_id=eq.${req.user.id}`, { method: "DELETE" });
    await supabaseDb(`/organisations?organisation_id=eq.${bundle.organisation.organisation_id}`, { method: "DELETE" });
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not delete organisation profile." });
  }
});

app.patch("/api/admin/organisations/:id/verification-status", async (req, res) => {
  try {
    if (!requireSupabaseConfig(res)) return;
    if (!ADMIN_API_SECRET || req.headers["x-admin-secret"] !== ADMIN_API_SECRET) {
      return res.status(403).json({ error: "Admin verification status updates require x-admin-secret." });
    }
    const { verificationStatus, verification_status } = req.body || {};
    const status = verificationStatus || verification_status;
    if (!status) return res.status(400).json({ error: "verificationStatus is required." });

    const beforeRows = await supabaseDb(`/organisations?organisation_id=eq.${req.params.id}&limit=1`);
    const before = beforeRows?.[0] || null;
    const rows = await supabaseDb(`/organisations?organisation_id=eq.${req.params.id}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: { verification_status: status },
    });
    await writeAuditLog({
      actorId: req.headers["x-admin-actor"] || "admin-secret",
      actorType: "admin",
      action: "organisation.verification_status_updated",
      entityType: "organisation",
      entityId: req.params.id,
      beforeState: before,
      afterState: rows?.[0] || null,
      metadata: { requestedStatus: status },
    });
    res.json({ organisation: organisationToAppProfile(rows?.[0]) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not update verification status." });
  }
});

app.get("/api/matchmaking/candidates", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const sport = String(req.query.sport || bundle.player.sports?.[0] || "").trim();
    if (!sport) return res.status(400).json({ error: "sport is required." });

    const candidates = await buildMatchCandidatesForPlayer(bundle.player, sport);

    res.json({ sport, candidates });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not rank candidates." });
  }
});

async function connectPlayers(requesterId, targetPlayer) {
  const targetId = targetPlayer.player_id;
  const [outbound, inbound] = await Promise.all([
    supabaseDb(`/player_connections?requester_player_id=eq.${encodeFilterValue(requesterId)}&addressee_player_id=eq.${encodeFilterValue(targetId)}&limit=1`),
    supabaseDb(`/player_connections?requester_player_id=eq.${encodeFilterValue(targetId)}&addressee_player_id=eq.${encodeFilterValue(requesterId)}&limit=1`),
  ]);
  if (outbound[0] || inbound[0]) return outbound[0] || inbound[0];
  const rows = await supabaseDb("/player_connections?on_conflict=requester_player_id,addressee_player_id&select=*", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: {
      requester_player_id: requesterId,
      addressee_player_id: targetId,
      status: connectionStatusForTarget(targetPlayer),
    },
  });
  if (rows?.[0]) return rows[0];
  const fresh = await supabaseDb(`/player_connections?requester_player_id=eq.${encodeFilterValue(requesterId)}&addressee_player_id=eq.${encodeFilterValue(targetId)}&limit=1`);
  return fresh[0] || null;
}

app.post("/api/matchmaking/candidates/:candidateId/action", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const action = String(req.body?.action || "").toLowerCase();
    if (!["accepted", "rejected", "saved"].includes(action)) {
      return res.status(400).json({ error: "action must be accepted, rejected, or saved." });
    }
    const sport = String(req.body?.sport || "").trim();
    if (!sport) return res.status(400).json({ error: "sport is required." });

    const candidateRows = await supabaseDb(`/players?player_id=eq.${encodeFilterValue(req.params.candidateId)}&limit=1`);
    const candidate = candidateRows?.[0];
    if (!candidate || candidate.player_id === bundle.player.player_id || !candidate.sports?.includes(sport)) {
      return res.status(400).json({ error: "Choose another player who lists this sport." });
    }
    const connection = action === "accepted" ? await connectPlayers(bundle.player.player_id, candidate) : null;

    const rows = await supabaseDb("/match_candidate_actions?on_conflict=player_id,candidate_player_id,sport&select=*", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: {
        player_id: bundle.player.player_id,
        candidate_player_id: req.params.candidateId,
        sport,
        action,
        score: Number(req.body?.score || 0),
        reason: String(req.body?.reason || ""),
      },
    });
    res.status(201).json({ action: rows?.[0], connection, demoTeammate: Boolean(candidate.is_demo && connection?.status === "accepted") });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not save candidate action." });
  }
});

app.get("/api/friends", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const playerId = bundle.player.player_id;
    const [outbound, inbound] = await Promise.all([
      supabaseDb(`/player_connections?requester_player_id=eq.${encodeFilterValue(playerId)}`),
      supabaseDb(`/player_connections?addressee_player_id=eq.${encodeFilterValue(playerId)}`),
    ]);
    const rows = [...outbound, ...inbound];
    const ids = [...new Set(rows.map((row) => row.requester_player_id === playerId ? row.addressee_player_id : row.requester_player_id))];
    const people = ids.length ? await supabaseDb(`/players?player_id=in.(${ids.join(",")})`) : [];
    const friends = rows.map((row) => {
      const otherId = row.requester_player_id === playerId ? row.addressee_player_id : row.requester_player_id;
      return {
        ...row,
        direction: row.requester_player_id === playerId ? "outgoing" : "incoming",
        player: playerToAppProfile(people.find((person) => person.player_id === otherId)),
      };
    });
    res.json({ friends });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load friends." });
  }
});

app.post("/api/friends/request", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const targetPlayerId = req.body?.playerId;
    if (!targetPlayerId || targetPlayerId === bundle.player.player_id) {
      return res.status(400).json({ error: "A different playerId is required." });
    }

    const targetRows = await supabaseDb(`/players?player_id=eq.${encodeFilterValue(targetPlayerId)}&limit=1`);
    if (!targetRows?.[0]) return res.status(404).json({ error: "Player not found." });
    const connection = await connectPlayers(bundle.player.player_id, targetRows[0]);
    res.status(201).json({ connection, demoTeammate: Boolean(targetRows[0].is_demo && connection?.status === "accepted") });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not send friend request." });
  }
});

app.post("/api/friends/:requesterPlayerId/accept", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const rows = await supabaseDb(
      `/player_connections?requester_player_id=eq.${encodeFilterValue(req.params.requesterPlayerId)}&addressee_player_id=eq.${encodeFilterValue(bundle.player.player_id)}&select=*`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: { status: "accepted", updated_at: new Date().toISOString() },
      }
    );
    if (!rows?.[0]) return res.status(404).json({ error: "Friend request not found." });
    res.json({ connection: rows[0] });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not accept friend request." });
  }
});

app.delete("/api/friends/:playerId", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const playerId = bundle.player.player_id;
    const otherId = req.params.playerId;
    await Promise.all([
      supabaseDb(`/player_connections?requester_player_id=eq.${encodeFilterValue(playerId)}&addressee_player_id=eq.${encodeFilterValue(otherId)}`, { method: "DELETE" }),
      supabaseDb(`/player_connections?requester_player_id=eq.${encodeFilterValue(otherId)}&addressee_player_id=eq.${encodeFilterValue(playerId)}`, { method: "DELETE" }),
    ]);
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not remove connection." });
  }
});

app.get("/api/games", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const rows = await supabaseDb("/games?select=*,venues(name)&order=date_time.asc");
    const joinedRows = await supabaseDb(`/game_participants?player_id=eq.${encodeFilterValue(bundle.player.player_id)}`);
    const joinedIds = new Set(joinedRows.map((row) => row.game_id));
    const games = rows.map((row) => ({ ...normalizeGame(row), joined: joinedIds.has(row.game_id) }));
    res.json({ games });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load games." });
  }
});

app.post("/api/games", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const { sport, dateTime, venueId, capacity } = req.body || {};
    if (!sport || !dateTime || !venueId || !capacity) {
      return res.status(400).json({ error: "sport, dateTime, venueId, and capacity are required." });
    }

    const game = await createGameForPlayer(bundle.player, { sport, dateTime, venueId, capacity });
    res.status(201).json({ game });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not create game." });
  }
});

app.post("/api/games/:gameId/join", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const gameRows = await supabaseDb(`/games?game_id=eq.${encodeFilterValue(req.params.gameId)}&limit=1`);
    const game = gameRows?.[0];
    if (!game) return res.status(404).json({ error: "Game not found." });

    const existing = await supabaseDb(
      `/game_participants?game_id=eq.${encodeFilterValue(req.params.gameId)}&player_id=eq.${encodeFilterValue(bundle.player.player_id)}&limit=1`
    );
    if (existing[0]) return res.status(409).json({ error: "Player is already in this game." });
    if (game.participant_count >= game.capacity) return res.status(409).json({ error: "This game is already full." });

    await supabaseDb("/game_participants", {
      method: "POST",
      body: { game_id: req.params.gameId, player_id: bundle.player.player_id, status: "confirmed" },
    });
    const freshRows = await supabaseDb(`/games?select=*,venues(name)&game_id=eq.${encodeFilterValue(req.params.gameId)}&limit=1`);
    res.json({ game: { ...normalizeGame(freshRows?.[0] || game), joined: true } });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not join game." });
  }
});

app.post("/api/games/:gameId/demo-teammates", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const targetId = String(req.body?.playerId || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
      return res.status(400).json({ error: "Choose a demo teammate." });
    }
    const [games, targets] = await Promise.all([
      supabaseDb(`/games?select=*,venues(name)&game_id=eq.${encodeFilterValue(req.params.gameId)}&limit=1`),
      supabaseDb(`/players?player_id=eq.${encodeFilterValue(targetId)}&is_demo=eq.true&limit=1`),
    ]);
    const game = games?.[0];
    const target = targets?.[0];
    if (!game) return res.status(404).json({ error: "Game not found." });
    const connections = await supabaseDb(`/player_connections?requester_player_id=eq.${encodeFilterValue(bundle.player.player_id)}&addressee_player_id=eq.${encodeFilterValue(targetId)}&status=eq.accepted&limit=1`);
    const existing = await supabaseDb(`/game_participants?game_id=eq.${encodeFilterValue(game.game_id)}&player_id=eq.${encodeFilterValue(targetId)}&limit=1`);
    const problem = demoTeammateProblem({ game, requesterId: bundle.player.player_id, target, connection: connections?.[0], alreadyJoined: Boolean(existing?.[0]) });
    if (problem) return res.status(problem.status).json({ error: problem.message });
    await supabaseDb("/game_participants", { method: "POST", body: { game_id: game.game_id, player_id: targetId, status: "confirmed" } });
    const fresh = await supabaseDb(`/games?select=*,venues(name)&game_id=eq.${encodeFilterValue(game.game_id)}&limit=1`);
    res.status(201).json({ game: normalizeGame(fresh?.[0] || game), message: "Demo teammate added to this example game. No real person was invited." });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not add demo teammate." });
  }
});

app.get("/api/games/:gameId", requireUser, async (req, res) => {
  try {
    const gameRows = await supabaseDb(`/games?select=*,venues(name)&game_id=eq.${encodeFilterValue(req.params.gameId)}&limit=1`);
    const game = gameRows?.[0];
    if (!game) return res.status(404).json({ error: "Game not found." });
    const participantRows = await supabaseDb(`/game_participants?game_id=eq.${encodeFilterValue(req.params.gameId)}&order=joined_at.asc`);
    const ids = participantRows.map((row) => row.player_id);
    const people = ids.length ? await supabaseDb(`/players?player_id=in.(${ids.join(",")})`) : [];
    const participants = ids.map((id) => playerToAppProfile(people.find((person) => person.player_id === id))).filter(Boolean);
    res.json({ game: normalizeGame(game, participants), participants });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load game." });
  }
});

app.post("/api/games/:gameId/balance", requireUser, async (req, res) => {
  try {
    const participantRows = await supabaseDb(`/game_participants?game_id=eq.${encodeFilterValue(req.params.gameId)}&status=eq.confirmed`);
    const ids = participantRows.map((row) => row.player_id);
    if (ids.length < 2) return res.status(400).json({ error: "At least two confirmed participants are required." });
    const people = await supabaseDb(`/players?player_id=in.(${ids.join(",")})`);
    const participants = ids.map((id) => playerToAppProfile(people.find((person) => person.player_id === id))).filter(Boolean);
    res.json(balanceParticipants(participants, req.body?.teamCount || 2));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not balance teams." });
  }
});

app.post("/api/activity-events", requireUser, (_req, res) => {
  res.status(403).json({ error: "Activity events are created by accepted matches and completed session workflows, not submitted directly." });
});

app.get("/api/streaks/month", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const now = new Date();
    const year = req.query.year || now.getUTCFullYear();
    const month = req.query.month || now.getUTCMonth() + 1;
    const data = await buildStreakMonth(bundle.player, {
      year,
      month,
      timezone: req.query.timezone,
    });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load streak month." });
  }
});

app.post("/api/cv/pose/frames", requireUser, async (req, res) => {
  try {
    const started = performance.now();
    // Frame analysis only needs the account role; fetching the whole player
    // profile on every sample adds a separate database round trip.
    const accountRows = await supabaseDb(`/account_profiles?select=role,player_id&account_id=eq.${encodeFilterValue(req.user.id)}&limit=1`);
    if (accountRows?.[0]?.role !== "Player" || !accountRows[0].player_id) {
      return res.status(403).json({ error: "Complete Player onboarding before using camera tracking." });
    }
    const authProfileMs = performance.now() - started;
    const frames = req.body?.frames;
    if (!Array.isArray(frames) || frames.length < 1 || frames.length > 12 ||
        frames.some((frame) => !Number.isFinite(frame?.timestampMs) || frame.timestampMs < 0 ||
          typeof frame.imageBase64 !== "string" || frame.imageBase64.length > 160000 ||
          !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(frame.imageBase64))) {
      return res.status(400).json({ error: "Send 1 to 12 JPEG camera frames, each below 120 KB." });
    }
    const upstreamStarted = performance.now();
    const response = await fetch(`${CV_SERVICE_URL}/v1/pose/frames`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(CV_SERVICE_KEY ? { "X-Krid-CV-Key": CV_SERVICE_KEY } : {}) },
      body: JSON.stringify({ sampleFps: 5, frames }),
      signal: AbortSignal.timeout(30000),
    });
    const cvRoundTripMs = performance.now() - upstreamStarted;
    const data = await parseJsonResponse(response);
    if (!response.ok) return res.status(502).json({ error: data?.detail || "Pose service rejected the frames." });
    res.json({ ...data, timingsMs: { ...data.timingsMs, authProfile: Math.round(authProfileMs), cvRoundTrip: Math.round(cvRoundTripMs), backendTotal: Math.round(performance.now() - started) } });
  } catch (err) {
    res.status(503).json({ error: "Pose service is unavailable. Start the CV service and try again." });
  }
});

app.get("/api/exercises/catalog", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    res.json({ exercises: exerciseCatalogForApi() });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load exercise catalog." });
  }
});

app.post("/api/exercise-sessions/evaluate", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const body = req.body || {};
    const exerciseName = body.exerciseName || body.exercise;
    const evaluation = evaluateExerciseSession({
      exerciseName,
      pose: body.pose,
      targets: body.targets || {},
      thresholdOverrides: body.thresholdOverrides || {},
    });
    const exercise = await ensureExerciseCatalogEntry(evaluation.exercise.name);
    const startAt = body.startedAt || new Date().toISOString();
    const endAt = body.completedAt || new Date().toISOString();
    const completionStatus = evaluation.completion.completed
      ? "complete"
      : evaluation.completion.manualConfirmationRequired
        ? "manual_confirmation_required"
        : "incomplete";
    const rows = await supabaseDb("/exercise_sessions?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: {
        player_id: bundle.player.player_id,
        exercise_plan_id: exercise.exercise_id,
        start_at: startAt,
        end_at: endAt,
        sets_reps: {
          targets: evaluation.targets,
          counts: evaluation.counts,
        },
        quality: evaluation.techniqueQualityScore,
        completion: completionStatus,
        feedback: evaluation.improvementCues.join(" "),
        detected_result: evaluation,
        correction_flags: {},
      },
    });
    const session = rows?.[0];
    let activityEvent = null;
    if (evaluation.completion.completed) {
      activityEvent = await recordQualifyingActivityEvent({
        player: bundle.player,
        type: "exercise",
        sourceType: "exercise_session",
        sourceId: session.session_id,
        occurredAt: endAt,
        qualifies: true,
      });
    }
    res.status(201).json({
      session: normalizeExerciseSession(session, exercise),
      evaluation,
      activityEvent,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not evaluate exercise session." });
  }
});

app.get("/api/exercise-sessions/recent", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const limit = Math.min(Math.max(Number(req.query.limit || 5), 1), 20);
    const rows = await supabaseDb(
      `/exercise_sessions?player_id=eq.${encodeFilterValue(bundle.player.player_id)}&order=start_at.desc&limit=${limit}`
    );
    const exerciseIds = [...new Set(rows.map((row) => row.exercise_plan_id).filter(Boolean))];
    const exercises = exerciseIds.length ? await supabaseDb(`/exercises?exercise_id=in.(${exerciseIds.join(",")})`) : [];
    res.json({
      sessions: rows.map((row) =>
        normalizeExerciseSession(
          row,
          exercises.find((exercise) => exercise.exercise_id === row.exercise_plan_id)
        )
      ),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load exercise sessions." });
  }
});

app.patch("/api/exercise-sessions/:sessionId/corrections", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const rows = await supabaseDb(
      `/exercise_sessions?session_id=eq.${encodeFilterValue(req.params.sessionId)}&player_id=eq.${encodeFilterValue(bundle.player.player_id)}&limit=1`
    );
    const current = rows?.[0];
    if (!current) return res.status(404).json({ error: "Exercise session not found." });

    const body = req.body || {};
    if (body.sessionIncomplete && body.manualCompletionConfirmed) {
      return res.status(400).json({ error: "Choose either sessionIncomplete or manualCompletionConfirmed, not both." });
    }
    const correctionFlags = current.correction_flags || {};
    const feedbackItems = correctionFlags.feedbackItems || {};
    if (body.feedbackItemId) {
      feedbackItems[body.feedbackItemId] = {
        incorrect: Boolean(body.feedbackIncorrect ?? true),
        note: body.note || "",
        correctedBy: bundle.player.player_id,
        correctedAt: new Date().toISOString(),
      };
    }
    const nextFlags = {
      ...correctionFlags,
      feedbackItems,
      sessionMarkedIncomplete: Boolean(body.sessionIncomplete ?? correctionFlags.sessionMarkedIncomplete ?? false),
      sessionIncompleteNote: body.sessionIncomplete ? body.note || correctionFlags.sessionIncompleteNote || "" : correctionFlags.sessionIncompleteNote,
      manualCompletionConfirmed: Boolean(body.manualCompletionConfirmed ?? correctionFlags.manualCompletionConfirmed ?? false),
      manualCompletionNote: body.manualCompletionConfirmed ? body.note || correctionFlags.manualCompletionNote || "" : correctionFlags.manualCompletionNote,
      updatedAt: new Date().toISOString(),
    };
    let activityEvent = null;
    if (body.manualCompletionConfirmed) {
      if (correctionFlags.sessionMarkedIncomplete) return res.status(409).json({ error: "This session was marked incomplete." });
      const detectedCompletion = current.detected_result?.completion || {};
      if (!detectedCompletion.targetMet || current.completion !== "manual_confirmation_required") {
        return res.status(409).json({
          error: "Manual completion is only available when the target was detected but quality required confirmation.",
        });
      }
      activityEvent = await recordQualifyingActivityEvent({
        player: bundle.player,
        type: "exercise",
        sourceType: "exercise_session",
        sourceId: current.session_id,
        occurredAt: current.end_at || new Date().toISOString(),
        qualifies: true,
      });
    }
    const updatedRows = await supabaseDb(`/exercise_sessions?session_id=eq.${encodeFilterValue(req.params.sessionId)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: { correction_flags: nextFlags },
    });
    if (body.sessionIncomplete) await removeCorrectedActivity(bundle.player, "exercise_session", current.session_id);
    await writeAuditLog({
      actorId: bundle.player.player_id,
      action: "cv_feedback.exercise_correction_updated",
      entityType: "exercise_session",
      entityId: req.params.sessionId,
      beforeState: current.correction_flags || {},
      afterState: nextFlags,
      metadata: {
        feedbackItemId: body.feedbackItemId || null,
        sessionIncomplete: Boolean(body.sessionIncomplete),
        manualCompletionConfirmed: Boolean(body.manualCompletionConfirmed),
      },
    });
    const exercise = await loadExerciseById(updatedRows?.[0]?.exercise_plan_id);
    res.json({ session: normalizeExerciseSession(updatedRows?.[0], exercise), activityEvent });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not save exercise correction." });
  }
});

app.get("/api/tutorials/catalog", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const drills = await enrichTutorialDrills(tutorialCatalogForApi());
    await persistSearchSources(drills.map((drill) => drill.educationalContent?.sources || []).flat());
    res.json({ drills });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load tutorial catalog." });
  }
});

app.post("/api/tutorial-sessions/evaluate", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const body = req.body || {};
    const drill = await ensureTutorialDrill(body.sport, body.drillName || body.drill);
    const previousSession = await loadPreviousTutorialSession(bundle.player.player_id, drill.drill_id);
    const evaluation = evaluateTutorialSession({
      sport: body.sport,
      drillName: body.drillName || body.drill,
      pose: body.pose,
      previousSession,
    });
    const completionStatus = evaluation.completion.completed
      ? "complete"
      : evaluation.completion.manualConfirmationRequired
        ? "manual_confirmation_required"
        : "incomplete";
    const rows = await supabaseDb("/tutorial_sessions?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: {
        player_id: bundle.player.player_id,
        drill_id: drill.drill_id,
        checkpoint_results: evaluation.checkpointResults,
        score: evaluation.score,
        feedback: evaluation.improvementCues.join(" "),
        completion: completionStatus,
        start_at: new Date().toISOString(),
        end_at: new Date().toISOString(),
        detected_result: evaluation,
        correction_flags: {},
      },
    });
    const session = rows?.[0];
    let activityEvent = null;
    if (evaluation.completion.completed) {
      activityEvent = await recordQualifyingActivityEvent({
        player: bundle.player,
        type: "tutorial",
        sourceType: "tutorial_session",
        sourceId: session.session_id,
        occurredAt: new Date().toISOString(),
        qualifies: true,
      });
    }
    res.status(201).json({
      session: normalizeTutorialSession(session, drill),
      evaluation,
      activityEvent,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not evaluate tutorial session." });
  }
});

app.get("/api/tutorial-sessions/recent", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const limit = Math.min(Math.max(Number(req.query.limit || 5), 1), 20);
    const rows = await supabaseDb(
      `/tutorial_sessions?player_id=eq.${encodeFilterValue(bundle.player.player_id)}&order=start_at.desc&limit=${limit}`
    );
    const drillIds = [...new Set(rows.map((row) => row.drill_id).filter(Boolean))];
    const drills = drillIds.length ? await supabaseDb(`/tutorial_drills?drill_id=in.(${drillIds.join(",")})`) : [];
    res.json({
      sessions: rows.map((row) =>
        normalizeTutorialSession(
          row,
          drills.find((drill) => drill.drill_id === row.drill_id)
        )
      ),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load tutorial sessions." });
  }
});

app.patch("/api/tutorial-sessions/:sessionId/corrections", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const rows = await supabaseDb(
      `/tutorial_sessions?session_id=eq.${encodeFilterValue(req.params.sessionId)}&player_id=eq.${encodeFilterValue(bundle.player.player_id)}&limit=1`
    );
    const current = rows?.[0];
    if (!current) return res.status(404).json({ error: "Tutorial session not found." });

    const body = req.body || {};
    if (body.sessionIncomplete && body.manualCompletionConfirmed) {
      return res.status(400).json({ error: "Choose either sessionIncomplete or manualCompletionConfirmed, not both." });
    }
    const correctionFlags = current.correction_flags || {};
    const checkpointItems = correctionFlags.checkpoints || {};
    if (body.checkpointId) {
      checkpointItems[body.checkpointId] = {
        incorrect: Boolean(body.feedbackIncorrect ?? true),
        note: body.note || "",
        correctedBy: bundle.player.player_id,
        correctedAt: new Date().toISOString(),
      };
    }
    const nextFlags = {
      ...correctionFlags,
      checkpoints: checkpointItems,
      sessionMarkedIncomplete: Boolean(body.sessionIncomplete ?? correctionFlags.sessionMarkedIncomplete ?? false),
      sessionIncompleteNote: body.sessionIncomplete ? body.note || correctionFlags.sessionIncompleteNote || "" : correctionFlags.sessionIncompleteNote,
      manualCompletionConfirmed: Boolean(body.manualCompletionConfirmed ?? correctionFlags.manualCompletionConfirmed ?? false),
      manualCompletionNote: body.manualCompletionConfirmed ? body.note || correctionFlags.manualCompletionNote || "" : correctionFlags.manualCompletionNote,
      updatedAt: new Date().toISOString(),
    };
    let activityEvent = null;
    if (body.manualCompletionConfirmed) {
      if (correctionFlags.sessionMarkedIncomplete) return res.status(409).json({ error: "This session was marked incomplete." });
      const detectedCompletion = current.detected_result?.completion || {};
      if (!detectedCompletion.targetMet || current.completion !== "manual_confirmation_required") {
        return res.status(409).json({
          error: "Manual completion is only available when checkpoint coverage was met but quality required confirmation.",
        });
      }
      activityEvent = await recordQualifyingActivityEvent({
        player: bundle.player,
        type: "tutorial",
        sourceType: "tutorial_session",
        sourceId: current.session_id,
        occurredAt: new Date().toISOString(),
        qualifies: true,
      });
    }
    const updatedRows = await supabaseDb(`/tutorial_sessions?session_id=eq.${encodeFilterValue(req.params.sessionId)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: { correction_flags: nextFlags },
    });
    if (body.sessionIncomplete) await removeCorrectedActivity(bundle.player, "tutorial_session", current.session_id);
    await writeAuditLog({
      actorId: bundle.player.player_id,
      action: "cv_feedback.tutorial_correction_updated",
      entityType: "tutorial_session",
      entityId: req.params.sessionId,
      beforeState: current.correction_flags || {},
      afterState: nextFlags,
      metadata: {
        checkpointId: body.checkpointId || null,
        sessionIncomplete: Boolean(body.sessionIncomplete),
        manualCompletionConfirmed: Boolean(body.manualCompletionConfirmed),
      },
    });
    const drill = await loadTutorialDrillById(updatedRows?.[0]?.drill_id);
    res.json({ session: normalizeTutorialSession(updatedRows?.[0], drill), activityEvent });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not save tutorial correction." });
  }
});

app.get("/api/org/venues", requireUser, async (req, res) => {
  try {
    const bundle = await requireOrganisationBundle(req, res);
    if (!bundle) return;
    const rows = await supabaseDb(`/venues?organisation_id=eq.${encodeFilterValue(bundle.organisation.organisation_id)}&order=venue_id.asc`);
    res.json({ venues: rows.map((row) => normalizeVenue(row)) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load organisation venues." });
  }
});

app.post("/api/org/venues", requireUser, async (req, res) => {
  try {
    const bundle = await requireOrganisationBundle(req, res);
    if (!bundle) return;
    const body = req.body || {};
    if (!body.location || !(body.supportedSports || body.supported_sports || body.sports)?.length || body.pricePerHour == null) {
      return res.status(400).json({ error: "location, supportedSports, and pricePerHour are required." });
    }
    const rows = await supabaseDb("/venues?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: venueWritePayload(body, bundle.organisation.organisation_id),
    });
    res.status(201).json({ venue: normalizeVenue(rows?.[0]) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not register venue." });
  }
});

app.patch("/api/org/venues/:venueId", requireUser, async (req, res) => {
  try {
    const bundle = await requireOrganisationBundle(req, res);
    if (!bundle) return;
    const currentRows = await supabaseDb(
      `/venues?venue_id=eq.${encodeFilterValue(req.params.venueId)}&organisation_id=eq.${encodeFilterValue(bundle.organisation.organisation_id)}&limit=1`
    );
    const current = currentRows?.[0];
    if (!current) return res.status(404).json({ error: "Venue not found for this organisation." });

    const rows = await supabaseDb(`/venues?venue_id=eq.${encodeFilterValue(req.params.venueId)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: venueWritePayload(req.body || {}, bundle.organisation.organisation_id, current),
    });
    res.json({ venue: normalizeVenue(rows?.[0] || current) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not update venue." });
  }
});

app.patch("/api/org/venues/:venueId/availability", requireUser, async (req, res) => {
  try {
    const bundle = await requireOrganisationBundle(req, res);
    if (!bundle) return;
    const slots = req.body?.availability || req.body?.slots;
    if (!Array.isArray(slots)) return res.status(400).json({ error: "slots array is required." });

    const rows = await supabaseDb(
      `/venues?venue_id=eq.${encodeFilterValue(req.params.venueId)}&organisation_id=eq.${encodeFilterValue(bundle.organisation.organisation_id)}&select=*`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: { availability: { slots }, availability_slots: slots },
      }
    );
    if (!rows?.[0]) return res.status(404).json({ error: "Venue not found for this organisation." });
    res.json({ venue: normalizeVenue(rows[0]) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not update venue availability." });
  }
});

app.get("/api/venues", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const { sport, location, maxPrice, availability } = req.query;
    const ranked = await discoverVenuesForPlayer(bundle.player, { sport, location, maxPrice, availability });
    res.json({ venues: ranked });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not discover venues." });
  }
});

app.post("/api/assistant/match-proposals", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const { sport, date, time, location, preferences, maxPrice, availability, capacity } = req.body || {};
    const dateTime = proposalDateTime({ date, time });
    if (!sport || !date || !time || !dateTime) {
      return res.status(400).json({ error: "sport, date, and time are required to prepare a match proposal." });
    }

    const [candidates, venues] = await Promise.all([
      buildMatchCandidatesForPlayer(bundle.player, sport),
      discoverVenuesForPlayer(bundle.player, { sport, location, maxPrice, availability }),
    ]);
    const proposal = assistantProposalStore.prepare({
      playerId: bundle.player.player_id,
      input: { sport, date, time, dateTime, location, preferences, capacity },
      candidates: candidates.slice(0, 5),
      venues: venues.slice(0, 5),
    });

    res.status(201).json({
      proposal,
      confirmationRequired: true,
      message:
        "Proposal prepared only. A separate explicit confirmation request is required before creating a match.",
    });
  } catch (err) {
    const status = err instanceof AssistantProposalError ? err.status : err.status || 500;
    res.status(status).json({ error: err.message || "Could not prepare assistant proposal." });
  }
});

app.post("/api/assistant/match-proposals/:proposalId/confirm", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const { confirmed, venueId, capacity } = req.body || {};
    const result = assistantProposalStore.confirm({
      playerId: bundle.player.player_id,
      proposalId: req.params.proposalId,
      confirmed,
      venueId,
      capacity,
    });
    const game = await createGameForPlayer(bundle.player, {
      sport: result.proposal.sport,
      dateTime: result.proposal.dateTime,
      venueId: result.selectedVenue.id,
      capacity: result.capacity,
    });
    res.status(201).json({
      proposal: result.proposal,
      game,
      booking: null,
      payment: null,
      message: "Match created after explicit confirmation. No booking or payment was created by the assistant.",
    });
  } catch (err) {
    const status = err instanceof AssistantProposalError ? err.status : err.status || 500;
    res.status(status).json({ error: err.message || "Could not confirm assistant proposal." });
  }
});

app.get("/api/weather", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const { venueId, location } = req.query;
    let targetLocation = location || bundle.player.location;
    if (venueId) {
      const venueRows = await supabaseDb(`/venues?venue_id=eq.${encodeFilterValue(venueId)}&limit=1`);
      if (!venueRows?.[0]) return res.status(404).json({ error: "Venue not found." });
      targetLocation = venueRows[0].location;
    }
    const weather = await externalContextService.getWeather(targetLocation);
    res.json({ weather });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load weather." });
  }
});

const careerError = (res, err) => res.status(err.status || 500).json({ error: err.message || "Career request failed." });
const careerOpportunity = (row) => ({
  id: row.opportunity_id, orgId: row.organisation_id, orgName: row.organisations?.name || "Organisation",
  organisationVerified: row.organisations?.verification_status === "Verified",
  title: row.title, sport: row.sport, type: row.type, location: row.location,
  description: row.description, stipend: row.stipend, minRating: row.min_rating,
  article: row.article || "",
  deadline: row.deadline, status: row.status, createdAt: row.created_at, demo: false,
});

app.get("/api/career/opportunities", requireUser, async (_req, res) => {
  try {
    const rows = await supabaseDb("/career_opportunities?select=*,organisations(name,verification_status)&status=eq.published&order=created_at.desc");
    res.json({ opportunities: rows.map(careerOpportunity) });
  } catch (err) { careerError(res, err); }
});

app.post("/api/career/opportunities", requireUser, async (req, res) => {
  try {
    const bundle = await requireOrganisationBundle(req, res);
    if (!bundle) return;
    const payload = validateOpportunity(req.body || {});
    const rows = await supabaseDb("/career_opportunities?select=*,organisations(name,verification_status)", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: { ...payload, organisation_id: bundle.organisation.organisation_id },
    });
    res.status(201).json({ opportunity: careerOpportunity(rows[0]) });
  } catch (err) { careerError(res, err); }
});

app.get("/api/career/profile", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const rows = await supabaseDb(`/player_career_profiles?player_id=eq.${bundle.player.player_id}&limit=1`);
    const proofs = await supabaseDb(`/career_email_proofs?account_id=eq.${encodeFilterValue(req.user.id)}&limit=1`);
    const proof = proofs[0]?.email?.toLowerCase() === req.user.email?.toLowerCase() ? proofs[0] : null;
    res.json({ article: rows[0]?.article || "", email: req.user.email || "", emailVerified: Boolean(proof), emailVerifiedAt: proof?.verified_at || null });
  } catch (err) { careerError(res, err); }
});

app.post("/api/career/email-proof/request", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    if (!req.user.email) return res.status(400).json({ error: "Add an account email before requesting a code." });
    await supabaseAuth("/otp", { email: req.user.email, create_user: false });
    res.json({ message: "If email OTP is configured, a one-time code has been sent to your account email. Check your inbox." });
  } catch (err) { careerError(res, err); }
});

app.post("/api/career/email-proof/verify", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const code = String(req.body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "Enter the six-digit email code." });
    const proofSession = await supabaseAuth("/verify", { email: req.user.email, token: code, type: "email" });
    if (!proofSession.access_token) return res.status(403).json({ error: "Email code could not be verified." });
    const provedUser = await getSupabaseUser(proofSession.access_token);
    if (provedUser.id !== req.user.id || provedUser.email?.toLowerCase() !== req.user.email?.toLowerCase()) return res.status(403).json({ error: "The code does not belong to this account email." });
    const verifiedAt = new Date().toISOString();
    await supabaseDb("/career_email_proofs?on_conflict=account_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: { account_id: req.user.id, email: req.user.email, verified_at: verifiedAt } });
    res.json({ emailVerified: true, emailVerifiedAt: verifiedAt });
  } catch (err) { careerError(res, err); }
});

app.put("/api/career/profile", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const { article } = validateArticle(req.body || {});
    await supabaseDb("/player_career_profiles?on_conflict=player_id", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates" },
      body: { player_id: bundle.player.player_id, article, updated_at: new Date().toISOString() },
    });
    res.json({ article });
  } catch (err) { careerError(res, err); }
});

app.get("/api/career/applications", requireUser, async (req, res) => {
  try {
    const bundle = await getAccountProfile(req.user.id);
    if (bundle.player) {
      const rows = await supabaseDb(`/career_applications?select=application_id,opportunity_id,status,created_at&player_id=eq.${bundle.player.player_id}`);
      return res.json({ applications: rows.map((row) => ({ id: row.application_id, opportunityId: row.opportunity_id, status: row.status, createdAt: row.created_at })) });
    }
    if (bundle.organisation) {
      const rows = await supabaseDb(`/career_applications?select=application_id,opportunity_id,player_id,statement,cv_name,status,created_at,email_at_submission,email_verified_at,career_opportunities!inner(organisation_id,title)&career_opportunities.organisation_id=eq.${bundle.organisation.organisation_id}`);
      return res.json({ applications: rows.map((row) => ({ id: row.application_id, opportunityId: row.opportunity_id, opportunityTitle: row.career_opportunities?.title, playerId: row.player_id, statement: row.statement, cvName: row.cv_name, status: row.status, createdAt: row.created_at, email: row.email_at_submission, emailVerifiedAt: row.email_verified_at })) });
    }
    res.status(403).json({ error: "Complete onboarding first." });
  } catch (err) { careerError(res, err); }
});

app.post("/api/career/opportunities/:id/applications", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const proofs = await supabaseDb(`/career_email_proofs?account_id=eq.${encodeFilterValue(req.user.id)}&limit=1`);
    const proof = proofs[0]?.email?.toLowerCase() === req.user.email?.toLowerCase() ? proofs[0] : null;
    if (!proof) return res.status(403).json({ error: "Verify your account email with the career one-time code before applying." });
    const rows = await supabaseDb(`/career_opportunities?opportunity_id=eq.${encodeFilterValue(req.params.id)}&status=eq.published&limit=1`);
    if (!rows[0] || rows[0].deadline < new Date().toISOString().slice(0, 10)) return res.status(404).json({ error: "This opportunity is unavailable or closed." });
    const profile = await supabaseDb(`/player_career_profiles?player_id=eq.${bundle.player.player_id}&limit=1`);
    if (!profile[0]?.article) return res.status(400).json({ error: "Save your career article before applying." });
    const payload = validateApplication(req.body || {});
    const inserted = await supabaseDb("/career_applications?select=application_id,status,created_at", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: { ...payload, opportunity_id: rows[0].opportunity_id, player_id: bundle.player.player_id, email_at_submission: req.user.email, email_verified_at: proof.verified_at },
    });
    res.status(201).json({ application: { id: inserted[0].application_id, opportunityId: rows[0].opportunity_id, status: inserted[0].status, createdAt: inserted[0].created_at } });
  } catch (err) { if (err.data?.code === "23505") return res.status(409).json({ error: "You already applied to this opportunity." }); careerError(res, err); }
});

app.get("/api/career/applications/:id/cv", requireUser, async (req, res) => {
  try {
    const bundle = await requireOrganisationBundle(req, res);
    if (!bundle) return;
    const rows = await supabaseDb(`/career_applications?select=cv_name,cv_type,cv_base64,career_opportunities!inner(organisation_id)&application_id=eq.${encodeFilterValue(req.params.id)}&career_opportunities.organisation_id=eq.${bundle.organisation.organisation_id}&limit=1`);
    if (!rows[0]) return res.status(404).json({ error: "Application not found." });
    res.set("Content-Type", rows[0].cv_type);
    res.set("Content-Disposition", `attachment; filename="${rows[0].cv_name.replace(/[\r\n"\\]/g, "_")}"`);
    res.send(Buffer.from(rows[0].cv_base64, "base64"));
  } catch (err) { careerError(res, err); }
});

app.get("/api/bookings/mine", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const rows = await supabaseDb(`/venue_bookings?select=*,venues(*)&player_id=eq.${encodeFilterValue(bundle.player.player_id)}&order=created_at.desc&limit=20`);
    res.json({ bookings: rows.map((row) => normalizeBooking(row, row.venues)) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load bookings." });
  }
});

app.post("/api/bookings", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const { venueId, slot, startAt } = req.body || {};
    if (!venueId || !slot) return res.status(400).json({ error: "venueId and slot are required." });

    const venueRows = await supabaseDb(`/venues?venue_id=eq.${encodeFilterValue(venueId)}&limit=1`);
    const venue = venueRows?.[0];
    if (!venue) return res.status(404).json({ error: "Venue not found." });
    const slots = availabilitySlots(venue.availability_slots?.length ? venue.availability_slots : venue.availability);
    if (!slots.includes(slot)) return res.status(409).json({ error: "That slot is not available for this venue." });

    const idempotencyKey =
      req.headers["idempotency-key"] ||
      bookingIdempotencyKey({ playerId: bundle.player.player_id, venueId, slot, startAt });
    const bookingResult = await createOnce({
      findExisting: async () => {
        const rows = await supabaseDb(
          `/venue_bookings?idempotency_key=eq.${encodeFilterValue(idempotencyKey)}&player_id=eq.${encodeFilterValue(bundle.player.player_id)}&limit=1`
        );
        return rows?.[0] || null;
      },
      insertRecord: async () => {
        const rows = await supabaseDb("/venue_bookings?on_conflict=idempotency_key&select=*", {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
          body: {
            venue_id: venueId,
            player_id: bundle.player.player_id,
            slot,
            start_at: startAt || null,
            ...bookingPlanForVenue(venue),
            idempotency_key: idempotencyKey,
          },
        });
        return rows?.[0] || null;
      },
    });
    const booking = bookingResult.record;
    res.status(bookingResult.created ? 201 : 200).json({
      booking: normalizeBooking(booking, venue, bundle.player),
      payment: null,
      paymentStatus: "unpaid",
      idempotent: bookingResult.idempotent,
      message: venue.is_demo ? "Demo booking saved. No real venue time was held and no payment was taken." : "Booking pending payment verification.",
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not create booking." });
  }
});

app.post("/api/bookings/:bookingId/payment-order", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const bookingId = req.params.bookingId;
    const bookingRows = await supabaseDb(
      `/venue_bookings?booking_id=eq.${encodeFilterValue(bookingId)}&player_id=eq.${encodeFilterValue(bundle.player.player_id)}&limit=1`
    );
    const booking = bookingRows?.[0];
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (booking.is_demo) return res.status(409).json({ error: "Demo bookings do not use Razorpay or reserve real venue time." });
    if (booking.status === "confirmed") {
      const existingPaymentRows = await supabaseDb(`/sandbox_payments?booking_id=eq.${encodeFilterValue(bookingId)}&limit=1`);
      return res.json({
        booking: normalizeBooking(booking),
        payment: normalizePayment(existingPaymentRows?.[0]),
        paymentStatus: "verified",
        idempotent: true,
      });
    }
    if (booking.status !== "pending") return res.status(409).json({ error: `Booking is ${booking.status}.` });

    const idempotencyKey = `booking:${bookingId}`;
    const existingPaymentRows = await supabaseDb(`/sandbox_payments?idempotency_key=eq.${encodeFilterValue(idempotencyKey)}&limit=1`);
    const existingPayment = existingPaymentRows?.[0];
    if (existingPayment?.status === "created" && existingPayment.provider_order_id) {
      return res.json({
        booking: normalizeBooking(booking),
        payment: normalizePayment(existingPayment),
        razorpayKeyId: RAZORPAY_KEY_ID || null,
        providerUnavailable: false,
        idempotent: true,
      });
    }
    if (existingPayment?.status === "verified") {
      return res.json({
        booking: normalizeBooking(booking),
        payment: normalizePayment(existingPayment),
        paymentStatus: "verified",
        idempotent: true,
      });
    }
    if (existingPayment?.status === "created" && !existingPayment.provider_order_id) {
      return res.status(202).json({
        booking: normalizeBooking(booking),
        payment: normalizePayment(existingPayment),
        providerUnavailable: true,
        paymentStatus: "unpaid",
        idempotent: true,
        message:
          "A payment-order request for this booking is already pending or uncertain. Booking remains pending/unpaid.",
      });
    }
    if (existingPayment?.status === "failed") {
      return res.status(202).json({
        booking: normalizeBooking(booking),
        payment: normalizePayment(existingPayment),
        providerUnavailable: true,
        paymentStatus: "unpaid",
        idempotent: true,
        message: existingPayment.failure_reason || "Previous payment-order attempt failed. Booking remains pending/unpaid.",
      });
    }

    const paymentCreateResult = await createOnce({
      findExisting: async () => {
        const rows = await supabaseDb(`/sandbox_payments?idempotency_key=eq.${encodeFilterValue(idempotencyKey)}&limit=1`);
        return rows?.[0] || null;
      },
      insertRecord: async () => {
        const rows = await supabaseDb("/sandbox_payments?on_conflict=idempotency_key&select=*", {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
          body: {
            booking_id: bookingId,
            gateway_reference: `PENDING-${bookingId}`,
            verification_token: idempotencyKey,
            idempotency_key: idempotencyKey,
            provider: "razorpay_test",
            amount: booking.amount,
            status: "created",
          },
        });
        return rows?.[0] || null;
      },
    });
    const localPayment = paymentCreateResult.record;
    if (paymentCreateResult.idempotent && localPayment.provider_order_id) {
      return res.json({
        booking: normalizeBooking(booking),
        payment: normalizePayment(localPayment),
        razorpayKeyId: RAZORPAY_KEY_ID || null,
        providerUnavailable: false,
        idempotent: true,
      });
    }
    if (paymentCreateResult.idempotent && !localPayment.provider_order_id) {
      return res.status(202).json({
        booking: normalizeBooking(booking),
        payment: normalizePayment(localPayment),
        providerUnavailable: true,
        paymentStatus: "unpaid",
        idempotent: true,
        message:
          "A payment-order request for this booking is already pending or uncertain. Booking remains pending/unpaid.",
      });
    }
    if (paymentCreateResult.created) {
      await writeAuditLog({
        actorId: bundle.player.player_id,
        action: "payment.created",
        entityType: "sandbox_payment",
        entityId: localPayment.payment_id,
        beforeState: null,
        afterState: { status: "created", bookingId },
        metadata: { idempotencyKey },
      });
    }

    const orderResult = await createRazorpayOrder({ bookingId, amount: booking.amount });
    if (!orderResult.ok) {
      const failedRows = await supabaseDb(`/sandbox_payments?payment_id=eq.${encodeFilterValue(localPayment.payment_id)}&select=*`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: { status: "failed", failure_reason: orderResult.reason || "Razorpay unavailable" },
      });
      await writeAuditLog({
        actorId: bundle.player.player_id,
        action: "payment.failed",
        entityType: "sandbox_payment",
        entityId: localPayment.payment_id,
        beforeState: normalizePayment(localPayment),
        afterState: normalizePayment(failedRows?.[0]),
        metadata: { reason: orderResult.reason || "Razorpay unavailable" },
      });
      return res.status(202).json({
        booking: normalizeBooking(booking),
        payment: normalizePayment(failedRows?.[0] || { ...localPayment, status: "failed", failure_reason: orderResult.reason }),
        providerUnavailable: true,
        paymentStatus: "unpaid",
        message: orderResult.reason || "Payment provider unavailable. Booking remains pending/unpaid.",
      });
    }

    const gatewayReference = orderResult.order.id;
    const rows = await supabaseDb(`/sandbox_payments?payment_id=eq.${encodeFilterValue(localPayment.payment_id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: {
        gateway_reference: gatewayReference,
        provider_order_id: orderResult.order.id,
        status: "created",
        failure_reason: null,
      },
    });
    await writeAuditLog({
      actorId: bundle.player.player_id,
      action: "payment.provider_order_created",
      entityType: "sandbox_payment",
      entityId: localPayment.payment_id,
      beforeState: normalizePayment(localPayment),
      afterState: normalizePayment(rows?.[0]),
      metadata: { providerOrderId: orderResult.order.id },
    });
    res.status(201).json({
      booking: normalizeBooking(booking),
      payment: normalizePayment(rows?.[0]),
      razorpayKeyId: RAZORPAY_KEY_ID,
      providerUnavailable: false,
      idempotent: false,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not create payment order." });
  }
});

app.post("/api/payments/razorpay/verify", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
    if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        error: "bookingId, razorpayOrderId, razorpayPaymentId, and razorpaySignature are required.",
      });
    }

    const bookingRows = await supabaseDb(
      `/venue_bookings?booking_id=eq.${encodeFilterValue(bookingId)}&player_id=eq.${encodeFilterValue(bundle.player.player_id)}&limit=1`
    );
    const booking = bookingRows?.[0];
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (booking.status === "confirmed") {
      const paymentRows = await supabaseDb(`/sandbox_payments?booking_id=eq.${encodeFilterValue(bookingId)}&limit=1`);
      return res.json({ booking: normalizeBooking(booking), payment: normalizePayment(paymentRows?.[0]), idempotent: true });
    }
    if (booking.status !== "pending") return res.status(409).json({ error: `Booking is ${booking.status}.` });

    const paymentRows = await supabaseDb(
      `/sandbox_payments?booking_id=eq.${encodeFilterValue(bookingId)}&provider_order_id=eq.${encodeFilterValue(razorpayOrderId)}&status=eq.created&limit=1`
    );
    const payment = paymentRows?.[0];
    if (!payment) return res.status(402).json({ error: "No pending server-created payment order found for this booking." });
    if (Number(payment.amount) !== Number(booking.amount)) return res.status(402).json({ error: "Payment amount mismatch." });
    const verified = verifyRazorpaySignature({
      providerOrderId: razorpayOrderId,
      providerPaymentId: razorpayPaymentId,
      providerSignature: razorpaySignature,
    });
    if (!verified) {
      const failedRows = await supabaseDb(`/sandbox_payments?payment_id=eq.${encodeFilterValue(payment.payment_id)}&select=*`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: {
          status: "failed",
          provider_payment_id: razorpayPaymentId,
          provider_signature: razorpaySignature,
          failure_reason: "Razorpay signature verification failed.",
        },
      });
      await writeAuditLog({
        actorId: bundle.player.player_id,
        action: "payment.verification_failed",
        entityType: "sandbox_payment",
        entityId: payment.payment_id,
        beforeState: normalizePayment(payment),
        afterState: normalizePayment(failedRows?.[0]),
        metadata: { bookingId, providerOrderId: razorpayOrderId },
      });
      return res.status(402).json({ error: "Razorpay signature verification failed. Booking remains pending/unpaid." });
    }

    const verifiedPaymentRows = await supabaseDb(`/sandbox_payments?payment_id=eq.${encodeFilterValue(payment.payment_id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: {
        status: "verified",
        provider_payment_id: razorpayPaymentId,
        provider_signature: razorpaySignature,
        verified_at: new Date().toISOString(),
        failure_reason: null,
      },
    });
    const confirmedRows = await supabaseDb(`/venue_bookings?booking_id=eq.${encodeFilterValue(bookingId)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: { status: "confirmed", confirmed_at: new Date().toISOString() },
    });
    await writeAuditLog({
      actorId: bundle.player.player_id,
      action: "payment.verified",
      entityType: "sandbox_payment",
      entityId: payment.payment_id,
      beforeState: normalizePayment(payment),
      afterState: normalizePayment(verifiedPaymentRows?.[0]),
      metadata: { bookingId, providerOrderId: razorpayOrderId },
    });
    await writeAuditLog({
      actorId: bundle.player.player_id,
      action: "booking.confirmed_by_payment",
      entityType: "venue_booking",
      entityId: bookingId,
      beforeState: normalizeBooking(booking),
      afterState: normalizeBooking(confirmedRows?.[0]),
      metadata: { paymentId: payment.payment_id },
    });
    const venueRows = await supabaseDb(`/venues?venue_id=eq.${encodeFilterValue(booking.venue_id)}&limit=1`);
    const freshPaymentRows = await supabaseDb(`/sandbox_payments?payment_id=eq.${encodeFilterValue(payment.payment_id)}&limit=1`);
    res.json({
      booking: normalizeBooking(confirmedRows?.[0], venueRows?.[0], bundle.player),
      payment: normalizePayment(freshPaymentRows?.[0]),
      paymentStatus: "verified",
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not verify Razorpay payment." });
  }
});

app.patch("/api/bookings/:bookingId/cancel", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const rows = await supabaseDb(
      `/venue_bookings?booking_id=eq.${encodeFilterValue(req.params.bookingId)}&player_id=eq.${encodeFilterValue(bundle.player.player_id)}&select=*`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: { status: "cancelled", cancelled_at: new Date().toISOString() },
      }
    );
    if (!rows?.[0]) return res.status(404).json({ error: "Booking not found." });
    res.json({ booking: normalizeBooking(rows[0]) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not cancel booking." });
  }
});

app.get("/api/org/bookings", requireUser, async (req, res) => {
  try {
    const bundle = await requireOrganisationBundle(req, res);
    if (!bundle) return;
    const venues = await supabaseDb(`/venues?organisation_id=eq.${encodeFilterValue(bundle.organisation.organisation_id)}`);
    const venueIds = venues.map((venue) => venue.venue_id);
    if (!venueIds.length) return res.json({ bookings: [] });
    const bookings = await supabaseDb(`/venue_bookings?venue_id=in.(${venueIds.join(",")})&order=created_at.desc`);
    const playerIds = [...new Set(bookings.map((booking) => booking.player_id))];
    const players = playerIds.length ? await supabaseDb(`/players?player_id=in.(${playerIds.join(",")})`) : [];
    res.json({
      bookings: bookings.map((booking) =>
        normalizeBooking(
          booking,
          venues.find((venue) => venue.venue_id === booking.venue_id),
          players.find((player) => player.player_id === booking.player_id)
        )
      ),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load organisation bookings." });
  }
});

app.post("/api/bookings/:bookingId/expense-shares", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const booking = await getPlayerOwnedBooking(req.params.bookingId, bundle.player.player_id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    const requestedParticipants = Array.isArray(req.body?.participants)
      ? req.body.participants.map((playerId) => String(playerId).trim()).filter(Boolean)
      : [];
    const participants = [...new Set([bundle.player.player_id, ...requestedParticipants])];
    const amount = Number(req.body?.amount || 0);
    if (amount <= 0) return res.status(400).json({ error: "amount must be greater than zero." });
    if (!participants.length) return res.status(400).json({ error: "At least one participant is required." });

    const existingShares = await supabaseDb(
      `/booking_expense_shares?booking_id=eq.${encodeFilterValue(req.params.bookingId)}`
    );
    const perPerson = Math.round((amount / participants.length) * 100) / 100;
    await supabaseDb("/booking_expense_shares?on_conflict=booking_id,player_id&select=*", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: participants.map((playerId) => {
        const existing = existingShares.find((share) => share.player_id === playerId);
        return {
          booking_id: req.params.bookingId,
          player_id: playerId,
          amount: perPerson,
          share_status: existing?.share_status || (playerId === bundle.player.player_id ? "paid" : "pending"),
        };
      }),
    });
    await supabaseDb(
      `/booking_expense_shares?booking_id=eq.${encodeFilterValue(req.params.bookingId)}&player_id=not.in.(${participants.join(",")})`,
      { method: "DELETE" }
    );
    res.status(201).json(await loadBookingExpenseSplit(req.params.bookingId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not split expense." });
  }
});

app.get("/api/bookings/:bookingId/expense-shares", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const booking = await getPlayerOwnedBooking(req.params.bookingId, bundle.player.player_id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    res.json(await loadBookingExpenseSplit(req.params.bookingId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load expense split." });
  }
});

app.patch("/api/bookings/:bookingId/expense-shares/:playerId", requireUser, async (req, res) => {
  try {
    const bundle = await requirePlayerBundle(req, res);
    if (!bundle) return;
    const booking = await getPlayerOwnedBooking(req.params.bookingId, bundle.player.player_id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    const status = req.body?.status || req.body?.shareStatus;
    if (!["paid", "pending"].includes(status)) {
      return res.status(400).json({ error: "status must be paid or pending." });
    }
    const rows = await supabaseDb(
      `/booking_expense_shares?booking_id=eq.${encodeFilterValue(req.params.bookingId)}&player_id=eq.${encodeFilterValue(req.params.playerId)}&select=*`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: { share_status: status },
      }
    );
    if (!rows?.[0]) return res.status(404).json({ error: "Expense share not found." });
    res.json(await loadBookingExpenseSplit(req.params.bookingId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not update expense share." });
  }
});

async function callGroq(model, systemMessage, messages) {
  const groqRes = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [systemMessage, ...messages],
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0.4,
      max_tokens: 700,
    }),
  });

  const rawBody = await groqRes.text();
  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 502, error: "non_json_response", rawBody };
  }

  if (!groqRes.ok) {
    return { ok: false, status: groqRes.status, error: data?.error?.code || "request_failed", data };
  }

  return { ok: true, data };
}

app.post("/api/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error: "Server is missing GROQ_API_KEY. Add it to sportsync-backend/.env and restart the server.",
      });
    }

    const { messages = [], context = {} } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "`messages` must be an array." });
    }

    const systemMessage = { role: "system", content: buildSystemPrompt(context) };

    // Try the configured model first; if it's been deprecated/renamed (model_not_found),
    // fall through to the next candidate so a Groq-side change doesn't fully break the demo.
    const candidates = [GROQ_MODEL, ...FALLBACK_MODELS.filter((m) => m !== GROQ_MODEL)];
    let result;
    for (const model of candidates) {
      result = await callGroq(model, systemMessage, messages);
      if (result.ok || result.error !== "model_not_found") break;
      console.warn(`Model "${model}" unavailable (model_not_found) — trying next fallback…`);
    }

    if (!result.ok) {
      if (result.error === "non_json_response") {
        console.error("Groq API returned a non-JSON response:", result.rawBody.slice(0, 500));
        return res.status(502).json({
          error: "Couldn't reach the Groq API (got a non-JSON response — check network access to api.groq.com).",
        });
      }
      console.error("Groq API error:", result.data);
      return res.status(result.status).json({ error: result.data?.error?.message || "Groq API request failed." });
    }

    const message = result.data.choices?.[0]?.message;
    if (!message) {
      return res.status(502).json({ error: "Groq API returned an unexpected response." });
    }

    res.json({ message });
  } catch (err) {
    console.error("Unexpected /api/chat error:", err);
    res.status(500).json({ error: "Unexpected server error while contacting the AI service." });
  }
});

// In deployment, serve the built React app from the same origin as the API.
// Local Vite development remains separate when STATIC_DIR is unset.
if (process.env.STATIC_DIR) {
  const staticDir = resolve(process.env.STATIC_DIR);
  app.use(express.static(staticDir));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API route not found." });
    return res.sendFile(resolve(staticDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Krid.ai backend listening on http://localhost:${PORT} (also try http://127.0.0.1:${PORT})`);
  console.log(`Using Groq model: ${GROQ_MODEL}`);
  console.log(`Health check: http://127.0.0.1:${PORT}/api/health`);
});
