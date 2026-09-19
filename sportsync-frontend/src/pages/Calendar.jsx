import { CalendarDays } from "lucide-react";
import { SectionHeading, Badge } from "../components/ui";
import { sportsEvents } from "../data/games";

export default function Calendar() {
  return (
    <div>
      <SectionHeading eyebrow="Sports Calendar · FR-28" title="Upcoming sporting events" />
      <div className="space-y-4">
        {sportsEvents.map((e) => (
          <div key={e.id} className="bg-white rounded-2xl p-5 stitch-border flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-turf-deep text-white flex flex-col items-center justify-center shrink-0">
              <CalendarDays size={18} />
              <span className="scoreboard text-[10px] mt-1">{e.date.slice(5)}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge tone="navy">{e.type}</Badge>
                <span className="text-xs text-ink-soft">Source: {e.source}</span>
              </div>
              <p className="font-display text-lg tracking-wide">{e.name}</p>
              <p className="text-sm text-ink-soft">{e.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
