import { CloudSun, RefreshCw, TriangleAlert } from "lucide-react";
import { Badge } from "./ui";

export default function WeatherWidget({ weather, title = "Weather", loading = false }) {
  const state = loading ? "loading" : weather?.status || "unavailable";
  const current = weather?.current;
  const tone = state === "current" ? "turf" : state === "stale" ? "gold" : "clay";

  return (
    <div className="bg-white rounded-2xl p-5 stitch-border">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-1">{title}</p>
          <p className="font-display text-xl tracking-wide">{weather?.location?.label || "Location unavailable"}</p>
        </div>
        {state === "unavailable" ? <TriangleAlert className="text-clay" aria-hidden="true" /> : <CloudSun className="text-turf" aria-hidden="true" />}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Badge tone={tone}>{state === "loading" ? "Loading" : state === "current" ? "Current" : state === "stale" ? "Stale data" : "Unavailable"}</Badge>
        {weather?.cache?.ageSeconds != null && (
          <span className="text-xs text-ink-soft inline-flex items-center gap-1">
            <RefreshCw size={12} /> {Math.round(weather.cache.ageSeconds / 60)}m old
          </span>
        )}
      </div>
      {!loading && weather?.location?.source === "open-meteo-geocoding-city-fallback" && (
        <p className="text-xs text-ink-soft mt-2">Approximate city forecast near {weather.location.resolvedLabel}; this area could not be located precisely.</p>
      )}

      {loading ? <p role="status" className="text-sm text-ink-soft mt-4">Checking current conditions…</p> : current ? (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Metric label="Temp" value={current.temperatureC == null ? "—" : `${current.temperatureC} °C`} />
          <Metric label="Rain" value={current.precipitationMm == null ? "—" : `${current.precipitationMm} mm`} />
          <Metric label="Wind" value={current.windKph == null ? "—" : `${current.windKph} km/h`} />
          <Metric label="Sky" value={current.summary} />
        </div>
      ) : (
        <p className="text-sm text-ink-soft bg-paper-dim rounded-xl px-3 py-2 mt-4">
          {weather?.message || "Weather is unavailable for this location. You can still browse games and venues."}
        </p>
      )}

      {weather?.forecast?.length > 0 && (
        <div className="mt-4 space-y-2">
          {weather.forecast.slice(0, 3).map((day) => (
            <div key={day.date} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-ink-soft">
              <span>{day.date}</span>
              <span>{day.summary} · {day.lowC ?? "—"}–{day.highC ?? "—"} °C · {day.precipitationProbability == null ? "Rain chance unavailable" : `${day.precipitationProbability}% rain chance`}</span>
            </div>
          ))}
        </div>
      )}

      {current && <p className="text-sm font-semibold text-turf-deep mt-4">{Number(current.precipitationMm) > 0 || Number(weather?.forecast?.[0]?.precipitationProbability) >= 60 ? "Rain is possible. Check venue cover and bring suitable footwear." : Number(current.temperatureC) >= 32 ? "It is hot. Consider a cooler training time and carry water." : Number(current.windKph) >= 25 ? "Wind may affect outdoor drills. Consider a sheltered court." : "Conditions look suitable for a normal session; check the venue before leaving."}</p>}
      <p className="text-xs text-ink-soft mt-4">{weather?.advisory || "Weather is advisory only and never blocks booking."}</p>
      {weather?.provider === "open-meteo" && <p className="text-xs text-ink-soft mt-2">Forecast by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline">Open-Meteo</a>.</p>}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-paper-dim p-3">
      <p className="text-[10px] uppercase tracking-widest text-ink-soft font-bold">{label}</p>
      <p className="scoreboard text-lg font-bold mt-1">{value}</p>
    </div>
  );
}
