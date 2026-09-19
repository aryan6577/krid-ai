import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Flame, Trophy, Dumbbell, Target, Swords } from "lucide-react";
import { SectionHeading, Badge, ScoreboardStat, ProgressBar } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { performanceHistory, ratingTrend } from "../../data/players";
import { buildActivityTimeline } from "../../lib/activity";

export default function Performance() {
  const { currentPlayer, streak, exerciseSessions, tutorialSessions } = useApp();
  const wins = performanceHistory.filter((g) => g.result === "Win").length;
  const winRate = Math.round((wins / performanceHistory.length) * 100);
  const timeline = buildActivityTimeline({ performanceHistory, exerciseSessions, tutorialSessions });

  return (
    <div>
      <SectionHeading eyebrow="Performance & Rating · FR-22 / FR-23" title="Your performance" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatBlock label="Current rating" value={currentPlayer.rating} tone="turf" />
        <StatBlock label="Win rate (last 7)" value={`${winRate}%`} tone="gold" />
        <StatBlock label="Current streak" value={`${streak.current}d`} tone="clay" icon={Flame} />
        <StatBlock label="Longest streak" value={`${streak.longest}d`} tone="navy" icon={Trophy} />
      </div>

      <div className="bg-white rounded-2xl p-6 stitch-border mb-6">
        <SectionHeading eyebrow="Rating history" title="Dynamic rating trend" />
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

      <div className="bg-white rounded-2xl p-6 stitch-border">
        <SectionHeading eyebrow="History" title="Match log" />
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

      <div className="bg-white rounded-2xl p-6 stitch-border mt-6">
        <SectionHeading eyebrow="Unified Activity Event · FR-86 / AC-30" title="Activity timeline" />
        <p className="text-sm text-ink-soft -mt-4 mb-4">Match, exercise and tutorial sessions in one consistent history, feeding a single streak.</p>
        {timeline.length === 0 ? (
          <p className="text-sm text-ink-soft">No exercise or tutorial sessions logged yet — try Coaching mode.</p>
        ) : (
          <div className="space-y-2.5">
            {timeline.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 rounded-xl bg-paper-dim flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${
                    item.type === "match" ? "bg-navy" : item.type === "exercise" ? "bg-turf" : "bg-clay"
                  }`}>
                    {item.type === "match" ? <Swords size={14} /> : item.type === "exercise" ? <Dumbbell size={14} /> : <Target size={14} />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-ink-soft">{item.date} · {item.subtitle}</p>
                  </div>
                </div>
                <Badge tone="neutral">{item.type}</Badge>
              </div>
            ))}
          </div>
        )}
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
