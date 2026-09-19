import { CloudSun, Cloud, CloudRain, Sun, Wind, Droplets, TriangleAlert } from "lucide-react";
import { useCurrentWeather } from "../lib/weather";

function iconForCode(code) {
  if (code === 0 || code === 1) return Sun;
  if ([2, 3, 45, 48].includes(code)) return Cloud;
  if (code >= 51 && code <= 82) return CloudRain;
  return CloudSun;
}

// FR-63/64/66/69 — compact current-weather chip for a lat/lng location.
// Degrades gracefully (FR-68/NFR-02): shows a quiet "unavailable" state rather than blocking the page.
export default function WeatherChip({ lat, lng, size = "sm" }) {
  const { loading, error, data } = useCurrentWeather(lat, lng);

  if (loading) {
    return <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft/60"><CloudSun size={13} className="animate-pulse" /> Loading weather…</span>;
  }
  if (error || !data) {
    return <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft/50"><TriangleAlert size={12} /> Weather unavailable</span>;
  }

  const Icon = iconForCode(data.code);
  if (size === "lg") {
    return (
      <div className="flex items-center gap-4">
        <Icon size={34} className="text-turf-deep shrink-0" />
        <div>
          <p className="scoreboard text-2xl font-bold">{data.temp}°C</p>
          <p className="text-xs text-ink-soft">{data.condition}</p>
        </div>
        <div className="flex flex-col gap-1 text-xs text-ink-soft ml-2">
          <span className="flex items-center gap-1"><Droplets size={12} /> {data.humidity}%</span>
          <span className="flex items-center gap-1"><Wind size={12} /> {data.windSpeed} km/h</span>
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
      <Icon size={14} className="text-turf" /> {data.temp}°C · {data.condition}
    </span>
  );
}
