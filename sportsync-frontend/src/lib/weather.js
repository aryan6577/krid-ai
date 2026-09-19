// Weather Intelligence — SRS §4.1/§8.3, FR-63 to FR-70.
// Uses Open-Meteo (https://open-meteo.com) directly from the browser: it's a free,
// keyless public API, so this stays frontend-only per the current scope (no server-side
// key/proxy needed, unlike a metered provider). NFR-02/NFR-15 — failures degrade
// gracefully and never block core venue/booking flows (BR-28).

import { useEffect, useState } from "react";

const WMO_CONDITIONS = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Depositing rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Light showers", 81: "Showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
};

export function describeWeatherCode(code) {
  return WMO_CONDITIONS[code] || "Unknown conditions";
}

// FR-63/64/66 — current weather for a player or venue location
export async function fetchCurrentWeather(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather request failed");
  const data = await res.json();
  const c = data.current;
  return {
    temp: Math.round(c.temperature_2m),
    humidity: Math.round(c.relative_humidity_2m),
    windSpeed: Math.round(c.wind_speed_10m),
    condition: describeWeatherCode(c.weather_code),
    code: c.weather_code,
    retrievedAt: new Date().toISOString(),
  };
}

// FR-65 — match-time forecast for a specific future date (falls back gracefully if the
// date is outside the provider's forecast range, per FR-68 stale/unavailable handling)
export async function fetchForecastForDate(lat, lng, dateStr) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=16&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Forecast request failed");
  const data = await res.json();
  const idx = data.daily.time.indexOf(dateStr);
  if (idx === -1) return null; // outside supported forecast range — UI shows "unavailable"
  return {
    date: dateStr,
    tempMax: Math.round(data.daily.temperature_2m_max[idx]),
    tempMin: Math.round(data.daily.temperature_2m_min[idx]),
    precipitationChance: data.daily.precipitation_probability_max[idx],
    condition: describeWeatherCode(data.daily.weather_code[idx]),
    code: data.daily.weather_code[idx],
    retrievedAt: new Date().toISOString(),
  };
}

// FR-65/FR-69 — 7-day forecast strip (e.g. for the Dashboard / venue weekly view)
export async function fetchWeeklyForecast(lat, lng, days = 7) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=${days}&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weekly forecast request failed");
  const data = await res.json();
  return data.daily.time.map((date, i) => ({
    date,
    tempMax: Math.round(data.daily.temperature_2m_max[i]),
    tempMin: Math.round(data.daily.temperature_2m_min[i]),
    precipitationChance: data.daily.precipitation_probability_max[i],
    condition: describeWeatherCode(data.daily.weather_code[i]),
    code: data.daily.weather_code[i],
  }));
}

// FR-67 — small hook wrapper with cache-by-location-for-session, loading and error states
const weatherCache = new Map();
const weeklyCache = new Map();

export function useWeeklyForecast(lat, lng, days = 7) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    if (lat == null || lng == null) {
      setState({ loading: false, error: "No location", data: null });
      return;
    }
    const key = `${lat.toFixed(2)},${lng.toFixed(2)},${days}`;
    if (weeklyCache.has(key)) {
      setState({ loading: false, error: null, data: weeklyCache.get(key) });
      return;
    }
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    fetchWeeklyForecast(lat, lng, days)
      .then((data) => {
        if (cancelled) return;
        weeklyCache.set(key, data);
        setState({ loading: false, error: null, data });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, error: "Weekly forecast unavailable", data: null });
      });
    return () => { cancelled = true; };
  }, [lat, lng, days]);

  return state;
}

export function useCurrentWeather(lat, lng) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    if (lat == null || lng == null) {
      setState({ loading: false, error: "No location", data: null });
      return;
    }
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    if (weatherCache.has(key)) {
      setState({ loading: false, error: null, data: weatherCache.get(key) });
      return;
    }
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    fetchCurrentWeather(lat, lng)
      .then((data) => {
        if (cancelled) return;
        weatherCache.set(key, data);
        setState({ loading: false, error: null, data });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, error: "Weather unavailable", data: null });
      });
    return () => { cancelled = true; };
  }, [lat, lng]);

  return state;
}
