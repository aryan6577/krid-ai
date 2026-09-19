import { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudSun, Droplets, TriangleAlert } from "lucide-react";
import { fetchForecastForDate } from "../lib/weather";

function iconForCode(code) {
  if (code === 0 || code === 1) return Sun;
  if ([2, 3, 45, 48].includes(code)) return Cloud;
  if (code >= 51 && code <= 82) return CloudRain;
  return CloudSun;
}

// FR-65/FR-68 — forecast for a specific planned match date; degrades to a clear
// "unavailable" state when the date is outside the provider's supported range.
export default function MatchForecast({ lat, lng, date }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    fetchForecastForDate(lat, lng, date)
      .then((data) => {
        if (cancelled) return;
        if (!data) setState({ loading: false, error: "Forecast not available for this date yet", data: null });
        else setState({ loading: false, error: null, data });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, error: "Weather service unavailable", data: null });
      });
    return () => { cancelled = true; };
  }, [lat, lng, date]);

  if (state.loading) {
    return <p className="text-sm text-ink-soft">Loading forecast…</p>;
  }
  if (state.error || !state.data) {
    return (
      <p className="text-sm text-ink-soft/70 flex items-center gap-1.5">
        <TriangleAlert size={14} /> {state.error} — booking is unaffected (BR-28).
      </p>
    );
  }

  const Icon = iconForCode(state.data.code);
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <Icon size={30} className="text-turf-deep" />
      <div>
        <p className="scoreboard text-xl font-bold">{state.data.tempMin}° – {state.data.tempMax}°C</p>
        <p className="text-xs text-ink-soft">{state.data.condition}</p>
      </div>
      <p className="text-xs text-ink-soft flex items-center gap-1.5">
        <Droplets size={13} /> {state.data.precipitationChance}% chance of rain
      </p>
    </div>
  );
}
