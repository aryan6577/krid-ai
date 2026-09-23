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
