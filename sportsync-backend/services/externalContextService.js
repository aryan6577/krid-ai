const WEATHER_TTL_MS = 30 * 60 * 1000;
const TRAVEL_TTL_MS = 24 * 60 * 60 * 1000;
const GEOCODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";

export function createExternalContextService({ fetchImpl = fetch, now = () => new Date() } = {}) {
  const weatherCache = new Map();
  const travelCache = new Map();
  const geocodeCache = new Map();

  async function getWeather(locationInput) {
    const requestedLocation = locationLabel(locationInput);
    const resolved = await resolveLocation(locationInput);
    if (!resolved.coordinates) {
      return unavailableWeather(requestedLocation, "Location coordinates are unavailable.");
    }

    const key = cacheKeyForCoords("weather", resolved.coordinates, roundedHour(now()));
    const locationPrefix = cacheKeyForCoords("weather", resolved.coordinates);
    const cached = weatherCache.get(key);
    if (cached && isFresh(cached.retrievedAt, WEATHER_TTL_MS, now)) {
      return { ...cached.value, cache: cacheMeta(cached, "fresh", now) };
    }

    try {
      const url = new URL(OPEN_METEO_FORECAST_URL);
      url.searchParams.set("latitude", String(resolved.coordinates.lat));
      url.searchParams.set("longitude", String(resolved.coordinates.lng));
      url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m");
      url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
      url.searchParams.set("forecast_days", "3");
      url.searchParams.set("timezone", "auto");

      const response = await fetchImpl(url);
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data?.reason || data?.error || `Weather provider returned HTTP ${response.status}.`);

      const value = normalizeWeather(data, requestedLocation, resolved);
      weatherCache.set(key, { retrievedAt: now().toISOString(), value });
      return { ...value, cache: { state: "fresh", ageSeconds: 0, retrievedAt: now().toISOString() } };
    } catch (err) {
      const fallbackCached = cached || latestCacheEntry(weatherCache, locationPrefix);
      if (fallbackCached) {
        return {
          ...fallbackCached.value,
          status: "stale",
          stale: true,
          advisory: "Weather data is stale and advisory only. Bookings are not blocked by weather.",
          message: err.message || "Weather refresh failed.",
          cache: cacheMeta(fallbackCached, "stale", now),
        };
      }
      return unavailableWeather(requestedLocation, err.message || "Weather provider is unavailable.", resolved);
    }
  }

  async function getTravelContext(fromInput, toInput) {
    const from = await resolveLocation(fromInput);
    const to = await resolveLocation(toInput);
    const straightLineKm = from.coordinates && to.coordinates ? haversineKm(from.coordinates, to.coordinates) : null;
    if (!from.coordinates || !to.coordinates) {
      return unavailableTravel(straightLineKm, "Travel-time coordinates are unavailable.");
    }

    const key = `${cacheKeyForCoords("travel-from", from.coordinates)}:${cacheKeyForCoords("to", to.coordinates)}`;
    const cached = travelCache.get(key);
    if (cached && isFresh(cached.retrievedAt, TRAVEL_TTL_MS, now)) {
      return { ...cached.value, cache: cacheMeta(cached, "fresh", now) };
    }

    try {
      const url = new URL(`${OSRM_ROUTE_URL}/${from.coordinates.lng},${from.coordinates.lat};${to.coordinates.lng},${to.coordinates.lat}`);
      url.searchParams.set("overview", "false");
      const response = await fetchImpl(url);
      const data = await parseJson(response);
      if (!response.ok || data?.code !== "Ok" || !data?.routes?.[0]) {
        throw new Error(data?.message || `Travel provider returned HTTP ${response.status}.`);
      }
      const route = data.routes[0];
      const value = {
        status: "current",
        provider: "osrm",
        mode: "driving",
        distanceKm: round(route.distance / 1000),
        durationMinutes: Math.round(route.duration / 60),
        straightLineDistanceKm: round(straightLineKm),
        advisory: "Travel time is advisory and does not reserve or block venue availability.",
      };
      travelCache.set(key, { retrievedAt: now().toISOString(), value });
      return { ...value, cache: { state: "fresh", ageSeconds: 0, retrievedAt: now().toISOString() } };
    } catch (err) {
      if (cached) {
        return {
          ...cached.value,
          status: "stale",
          message: err.message || "Travel-time refresh failed.",
          cache: cacheMeta(cached, "stale", now),
        };
      }
      return unavailableTravel(straightLineKm, err.message || "Travel-time provider is unavailable.");
    }
  }

  async function resolveLocation(input) {
    const coordinates = coordinatesFrom(input);
    if (coordinates) return { label: locationLabel(input), coordinates, source: "provided" };
    const label = locationLabel(input);
    if (!label) return { label: "", coordinates: null, source: "missing" };

    const key = `geocode:${label.toLowerCase()}`;
    const cached = geocodeCache.get(key);
    if (cached && isFresh(cached.retrievedAt, GEOCODE_TTL_MS, now)) return cached.value;

    try {
      const url = new URL(OPEN_METEO_GEOCODE_URL);
      url.searchParams.set("name", label);
      url.searchParams.set("count", "1");
      url.searchParams.set("language", "en");
      url.searchParams.set("format", "json");
      const response = await fetchImpl(url);
      const data = await parseJson(response);
      if (!response.ok) throw new Error(data?.reason || data?.error || `Geocoder returned HTTP ${response.status}.`);
      const result = data?.results?.[0];
      const value = {
        label,
        coordinates:
          result && Number.isFinite(Number(result.latitude)) && Number.isFinite(Number(result.longitude))
            ? { lat: Number(result.latitude), lng: Number(result.longitude) }
            : null,
        source: "open-meteo-geocoding",
      };
      geocodeCache.set(key, { retrievedAt: now().toISOString(), value });
      return value;
    } catch {
      return { label, coordinates: null, source: "unavailable" };
    }
  }

  return { getWeather, getTravelContext, resolveLocation };
}

export const externalContextService = createExternalContextService();

function normalizeWeather(data, requestedLocation, resolved) {
  const current = data.current || {};
  const daily = data.daily || {};
  return {
    status: "current",
    stale: false,
    provider: "open-meteo",
    location: {
      label: requestedLocation || resolved.label,
      coordinates: resolved.coordinates,
      source: resolved.source,
    },
    current: {
      observedAt: current.time || null,
      temperatureC: round(current.temperature_2m),
      humidityPercent: Number(current.relative_humidity_2m ?? 0),
      precipitationMm: round(current.precipitation),
      windKph: round(current.wind_speed_10m),
      weatherCode: current.weather_code,
      summary: weatherCodeSummary(current.weather_code),
    },
    forecast: (daily.time || []).slice(0, 3).map((date, index) => ({
      date,
      highC: round(daily.temperature_2m_max?.[index]),
      lowC: round(daily.temperature_2m_min?.[index]),
      precipitationProbability: Number(daily.precipitation_probability_max?.[index] ?? 0),
      weatherCode: daily.weather_code?.[index],
      summary: weatherCodeSummary(daily.weather_code?.[index]),
    })),
    advisory: "Weather is advisory only. It never automatically cancels or blocks a booking.",
  };
}

function unavailableWeather(label, reason, resolved = {}) {
  return {
    status: "unavailable",
    stale: false,
    provider: "open-meteo",
    location: { label, coordinates: resolved.coordinates || null, source: resolved.source || "unavailable" },
    current: null,
    forecast: [],
    message: reason,
    advisory: "Weather is advisory only. It never automatically cancels or blocks a booking.",
    cache: { state: "miss", ageSeconds: null, retrievedAt: null },
  };
}

function unavailableTravel(straightLineKm, reason) {
  return {
    status: "unavailable",
    provider: "osrm",
    mode: "driving",
    distanceKm: null,
    durationMinutes: null,
    straightLineDistanceKm: round(straightLineKm),
    message: reason,
    advisory: "Travel time is advisory and does not reserve or block venue availability.",
    cache: { state: "miss", ageSeconds: null, retrievedAt: null },
  };
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function locationLabel(input) {
  if (!input) return "";
  if (typeof input === "string") return input;
  return input.label || input.name || "";
}

function coordinatesFrom(input) {
  if (!input || typeof input !== "object") return null;
  const lat = Number(input.lat ?? input.latitude);
  const lng = Number(input.lng ?? input.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function isFresh(retrievedAt, ttlMs, now) {
  return now().getTime() - new Date(retrievedAt).getTime() <= ttlMs;
}

function cacheMeta(cached, state, now) {
  return {
    state,
    retrievedAt: cached.retrievedAt,
    ageSeconds: Math.max(0, Math.round((now().getTime() - new Date(cached.retrievedAt).getTime()) / 1000)),
  };
}

function roundedHour(date) {
  const copy = new Date(date);
  copy.setMinutes(0, 0, 0);
  return copy.toISOString();
}

function cacheKeyForCoords(prefix, coords, time = "") {
  return `${prefix}:${Number(coords.lat).toFixed(4)},${Number(coords.lng).toFixed(4)}:${time}`;
}

function latestCacheEntry(cache, keyPrefix) {
  return [...cache.entries()]
    .filter(([key]) => key.startsWith(keyPrefix))
    .map(([, value]) => value)
    .sort((a, b) => new Date(b.retrievedAt).getTime() - new Date(a.retrievedAt).getTime())[0];
}

function haversineKm(from, to) {
  if (!from || !to) return null;
  const radius = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const hav = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(hav));
}

function weatherCodeSummary(code) {
  const value = Number(code);
  if ([0].includes(value)) return "Clear";
  if ([1, 2, 3].includes(value)) return "Partly cloudy";
  if ([45, 48].includes(value)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(value)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(value)) return "Snow";
  if ([95, 96, 99].includes(value)) return "Thunderstorm";
  return "Weather update";
}

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value) * 10) / 10 : null;
}
