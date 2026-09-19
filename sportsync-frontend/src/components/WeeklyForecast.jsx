import { Sun, Cloud, CloudRain, CloudSun, TriangleAlert } from "lucide-react";
import { useWeeklyForecast } from "../lib/weather";

function iconForCode(code) {
  if (code === 0 || code === 1) return Sun;
  if ([2, 3, 45, 48].includes(code)) return Cloud;
  if (code >= 51 && code <= 82) return CloudRain;
  return CloudSun;
}

function dayLabel(dateStr, index) {
  if (index === 0) return "Today";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

// FR-65/FR-69 — 7-day forecast strip; degrades gracefully (FR-68/NFR-02) when unavailable.
export default function WeeklyForecast({ lat, lng, days = 7 }) {
  const { loading, error, data } = useWeeklyForecast(lat, lng, days);

  if (loading) {
    return <p className="text-sm text-ink-soft">Loading 7-day forecast…</p>;
  }
  if (error || !data) {
    return (
      <p className="text-sm text-ink-soft/70 flex items-center gap-1.5">
        <TriangleAlert size={14} /> Weekly forecast unavailable right now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
      {data.map((d, i) => {
        const Icon = iconForCode(d.code);
        return (
          <div key={d.date} className="bg-paper-dim rounded-xl p-3 text-center flex flex-col items-center gap-1">
            <p className="text-xs font-semibold text-ink-soft">{dayLabel(d.date, i)}</p>
            <Icon size={22} className="text-turf-deep my-1" />
            <p className="text-sm font-bold scoreboard">{d.tempMax}°</p>
            <p className="text-xs text-ink-soft/70">{d.tempMin}°</p>
          </div>
        );
      })}
    </div>
  );
}
