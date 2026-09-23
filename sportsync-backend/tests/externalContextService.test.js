import assert from "node:assert/strict";
import test from "node:test";

import { createExternalContextService } from "../services/externalContextService.js";

test("weather returns unavailable instead of throwing when provider is down", async () => {
  const service = createExternalContextService({
    fetchImpl: async () => {
      throw new Error("weather network down");
    },
  });

  const weather = await service.getWeather({ label: "Koramangala", lat: 12.9352, lng: 77.6146 });

  assert.equal(weather.status, "unavailable");
  assert.equal(weather.current, null);
  assert.match(weather.advisory, /never automatically cancels or blocks/i);
});

test("weather marks cached data stale when refresh fails", async () => {
  let nowValue = new Date("2026-09-22T10:00:00.000Z");
  let calls = 0;
  const service = createExternalContextService({
    now: () => nowValue,
    fetchImpl: async () => {
      calls += 1;
      if (calls > 1) throw new Error("refresh down");
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            current: {
              time: "2026-09-22T10:00",
              temperature_2m: 24,
              relative_humidity_2m: 70,
              precipitation: 0,
              weather_code: 1,
              wind_speed_10m: 8,
            },
            daily: {
              time: ["2026-09-22"],
              weather_code: [1],
              temperature_2m_max: [28],
              temperature_2m_min: [20],
              precipitation_probability_max: [10],
            },
          }),
      };
    },
  });

  const current = await service.getWeather({ label: "Koramangala", lat: 12.9352, lng: 77.6146 });
  nowValue = new Date("2026-09-22T11:00:01.000Z");
  const stale = await service.getWeather({ label: "Koramangala", lat: 12.9352, lng: 77.6146 });

  assert.equal(current.status, "current");
  assert.equal(stale.status, "stale");
  assert.equal(stale.cache.state, "stale");
  assert.equal(stale.current.temperatureC, 24);
});

test("Open-Meteo area and city search chooses the nearby location", async () => {
  const queries = [];
  const service = createExternalContextService({
    fetchImpl: async (url) => {
      const endpoint = new URL(url);
      if (endpoint.hostname === "geocoding-api.open-meteo.com") {
        const name = endpoint.searchParams.get("name");
        queries.push(name);
        const results = name === "Koramangala"
          ? [
              { name: "Koramangala", latitude: 13.29284, longitude: 77.7516, country_code: "IN" },
              { name: "Koramangala", latitude: 12.93204, longitude: 77.6227, country_code: "IN" },
            ]
          : name === "Bengaluru"
            ? [{ name: "Bengaluru", latitude: 12.97194, longitude: 77.59369, country_code: "IN" }]
            : [];
        return { ok: true, status: 200, text: async () => JSON.stringify({ results }) };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({
        current: { time: "2026-09-23T12:00", temperature_2m: 27, relative_humidity_2m: 70, precipitation: 0, weather_code: 2, wind_speed_10m: 9 },
        daily: { time: ["2026-09-23"], weather_code: [2], temperature_2m_max: [29], temperature_2m_min: [22], precipitation_probability_max: [20] },
      }) };
    },
  });
  const weather = await service.getWeather("Koramangala, Bengaluru");
  assert.equal(weather.status, "current");
  assert.equal(weather.location.source, "open-meteo-geocoding-area");
  assert.deepEqual(weather.location.coordinates, { lat: 12.93204, lng: 77.6227 });
  assert.deepEqual(queries, ["Koramangala, Bengaluru", "Koramangala", "Bengaluru"]);
});

test("city fallback is identified as approximate when the area is missing", async () => {
  const service = createExternalContextService({
    fetchImpl: async (url) => {
      const endpoint = new URL(url);
      const name = endpoint.searchParams.get("name");
      return { ok: true, status: 200, text: async () => JSON.stringify({
        results: name === "Bengaluru"
          ? [{ name: "Bengaluru", latitude: 12.97194, longitude: 77.59369, country_code: "IN" }]
          : [],
      }) };
    },
  });
  const resolved = await service.resolveLocation("HSR Layout, Bengaluru");
  assert.equal(resolved.source, "open-meteo-geocoding-city-fallback");
  assert.equal(resolved.resolvedLabel, "Bengaluru");
});

test("a weather response without current measurements stays unavailable", async () => {
  const service = createExternalContextService({ fetchImpl: async () => ({
    ok: true, status: 200, text: async () => JSON.stringify({ daily: {} }),
  }) });
  const weather = await service.getWeather({ label: "Venue", lat: 12.9352, lng: 77.6146 });
  assert.equal(weather.status, "unavailable");
  assert.equal(weather.current, null);
});

test("weather cache does not relabel another place at the same city fallback coordinates", async () => {
  let calls = 0;
  const service = createExternalContextService({ fetchImpl: async () => {
    calls += 1;
    return { ok: true, status: 200, text: async () => JSON.stringify({
      current: { time: "2026-09-23T12:00", temperature_2m: 25, weather_code: 1 },
      daily: { time: [] },
    }) };
  } });
  const coords = { lat: 12.97194, lng: 77.59369 };
  const first = await service.getWeather({ label: "Bengaluru", ...coords });
  const second = await service.getWeather({ label: "HSR Layout, Bengaluru", ...coords });
  assert.equal(first.location.label, "Bengaluru");
  assert.equal(second.location.label, "HSR Layout, Bengaluru");
  assert.equal(calls, 2);
});

test("travel-time outage returns unavailable while preserving internal distance context", async () => {
  const service = createExternalContextService({
    fetchImpl: async () => {
      throw new Error("route service down");
    },
  });

  const travel = await service.getTravelContext(
    { label: "Player", lat: 12.9352, lng: 77.6146 },
    { label: "Venue", lat: 12.9116, lng: 77.6389 }
  );

  assert.equal(travel.status, "unavailable");
  assert.equal(travel.durationMinutes, null);
  assert.ok(travel.straightLineDistanceKm > 0);
});
