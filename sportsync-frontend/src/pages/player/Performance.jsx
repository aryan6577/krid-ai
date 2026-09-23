import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Flame, Trophy, XCircle } from "lucide-react";
import { SectionHeading, Badge } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { performanceHistory, ratingTrend } from "../../data/players";
import { api } from "../../lib/api";

export default function Performance() {
  const { currentPlayer, session } = useApp();
  const [streakMonth, setStreakMonth] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadStreakMonth() {
      try {
        const data = await api.getStreakMonth(session.accessToken);
        if (!cancelled) setStreakMonth(data);
      } catch {
        if (!cancelled) setStreakMonth(null);
      }
    }
    if (session.accessToken) loadStreakMonth();
    return () => {
      cancelled = true;
    };
  }, [session.accessToken]);

  return (
    <div>
      <SectionHeading eyebrow="Performance & Rating · FR-22 / FR-23" title="Your performance" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatBlock label="Current rating" value={currentPlayer.rating} tone="turf" />
        <StatBlock label="Match win rate" value="—" tone="gold" />
        <StatBlock label="Current streak" value={streakMonth ? `${streakMonth.currentStreak}d` : "—"} tone="clay" icon={Flame} />
        <StatBlock label="Longest streak" value={streakMonth ? `${streakMonth.longestStreak}d` : "—"} tone="navy" icon={Trophy} />
      </div>

      <div className="bg-white rounded-2xl p-6 stitch-border mb-6">
        <SectionHeading eyebrow="Sample data" title="Example rating trend" />
        <p className="text-sm text-ink-soft mb-3">Illustrative demo data. Your completed sessions and streak above come from your account.</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ratingTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(18,32,27,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#3C4A42" }} />
              <YAxis domain={["dataMin - 20", "dataMax + 20"]} tick={{ fontSize: 11, fill: "#3C4A42" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(18,32,27,0.1)", fontSize: 12 }} />
              <Line type="monotone" dataKey="rating" stroke="#1F6F4A" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section className="bg-gold-light rounded-2xl p-5 stitch-border mb-6" aria-labelledby="streak-rules-heading">
        <h2 id="streak-rules-heading" className="font-display text-xl">How your streak counts</h2>
        <p className="text-sm text-ink-soft mt-2">Complete one exercise target in a day with reliable camera tracking to earn that day. If the target was detected but tracking quality was limited, it counts only after you explicitly confirm completion. An unfinished exercise does not count.</p>
        <p className="text-sm text-ink-soft mt-2">Each calendar day in your saved timezone counts once, even if you complete several exercises. A completed tutorial or eligible match can also earn the day's credit. Complete an activity on consecutive days to grow the streak; missing a full day resets the current run.</p>
        {streakMonth && <p role="status" className="text-sm font-semibold text-turf-deep mt-3">Today ({streakMonth.today.date}, {streakMonth.timezone}): {streakMonth.today.eventCount ? `counted through ${streakMonth.today.types.join(", ")}` : "still open — complete an exercise to count it"}.</p>}
      </section>

      <StreakCalendar data={streakMonth} />

      <div className="bg-white rounded-2xl p-6 stitch-border">
        <SectionHeading eyebrow="Sample data" title="Example match log" />
        <p className="text-sm text-ink-soft mb-3">Fictional matches for exploring the layout; these are not your results.</p>
        <div className="space-y-3">
          {performanceHistory.map((g) => (
            <div key={g.gameId} className="flex items-center justify-between p-3 rounded-xl bg-paper-dim flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <Badge tone={g.result === "Win" ? "turf" : g.result === "Loss" ? "clay" : "neutral"}>{g.result}</Badge>
                <div>
                  <p className="text-sm font-semibold">{g.sport} · {g.score}</p>
                  <p className="text-xs text-ink-soft">{g.date}</p>
                </div>
              </div>
              <span className={`scoreboard text-sm font-semibold ${g.ratingDelta >= 0 ? "text-turf" : "text-clay"}`}>
                {g.ratingDelta > 0 ? "+" : ""}{g.ratingDelta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StreakCalendar({ data }) {
  if (!data?.month?.days?.length) return null;
  const today = data.today?.date || new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-2xl p-6 stitch-border mb-6">
      <SectionHeading eyebrow="Streak calendar" title="Monthly activity" />
      <div className="grid grid-cols-7 gap-2">
        {data.month.days.map((day) => {
          const future = day.date > today;
          const state = day.qualifying ? "active" : day.date === today ? "today" : future ? "upcoming" : "missed";
          const Icon = state === "active" ? CheckCircle2 : state === "missed" ? XCircle : Circle;
          const label = state === "active" ? `${day.eventCount} qualifying activity event${day.eventCount === 1 ? "" : "s"}; one streak day` : state === "today" ? "Today still open" : state === "missed" ? "Missed" : "Upcoming";
          const classes =
            state === "active"
              ? "bg-turf text-white"
              : state === "today"
                ? "bg-gold-light text-ink"
                : state === "missed"
                  ? "bg-clay-light text-clay-deep"
                  : "bg-paper-dim text-ink-soft";
          return (
            <div
              key={day.date}
              title={`${day.date}: ${label}`}
              role="img"
              aria-label={`${day.date}: ${label}`}
              className={`min-w-0 min-h-[50px] sm:min-h-[58px] rounded-xl p-1 sm:p-2 flex flex-col items-center justify-center gap-1 ${classes}`}
            >
              <span className="scoreboard text-sm font-bold">{Number(day.date.slice(-2))}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
                <Icon size={11} aria-hidden="true" /><span className="hidden sm:inline">{state === "active" ? "Done" : state === "today" ? "Open" : state === "missed" ? "Missed" : "Next"}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1"><CheckCircle2 size={13} className="text-turf" /> Activity logged</span>
        <span className="inline-flex items-center gap-1"><Circle size={13} className="text-gold" /> Today still open</span>
        <span className="inline-flex items-center gap-1"><XCircle size={13} className="text-clay" /> Missed day</span>
        <span className="inline-flex items-center gap-1"><Circle size={13} /> Upcoming day</span>
      </div>
    </div>
  );
}

function StatBlock({ label, value, tone, icon: Icon }) {
  const tones = { turf: "bg-turf", gold: "bg-gold", clay: "bg-clay", navy: "bg-navy" };
  return (
    <div className={`rounded-2xl p-5 text-white ${tones[tone]}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest opacity-80">{label}</p>
        {Icon && <Icon size={16} />}
      </div>
      <p className="scoreboard text-2xl font-bold">{value}</p>
    </div>
  );
}
