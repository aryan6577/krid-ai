import { Link } from "react-router-dom";
import { Flame, Trophy, Users, MapPinned, Briefcase, ArrowRight } from "lucide-react";
import { SectionHeading, ScoreboardStat, Badge, PrimaryButton } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { performanceHistory } from "../../data/players";
import WeatherChip from "../../components/WeatherChip";
import WeeklyForecast from "../../components/WeeklyForecast";

export default function Dashboard() {
  const { currentPlayer, gamesState, friendPlayers, streak } = useApp();
  const myGames = gamesState.filter((g) => g.participants.includes(currentPlayer.id));
  const acceptedFriends = friendPlayers.filter((f) => f.status === "accepted");
  const recent = performanceHistory.slice(0, 3);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay mb-1">Welcome back</p>
          <h1 className="font-display text-3xl md:text-4xl tracking-wide">{currentPlayer.name.split(" ")[0]}'s Game Day</h1>
          <p className="text-ink-soft mt-1">{currentPlayer.location} · {currentPlayer.sports.join(" & ")}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <ScoreboardStat label="Rating" value={currentPlayer.rating} />
          <ScoreboardStat label="Streak" value={streak.current} suffix="d" />
          <ScoreboardStat label="Best Streak" value={streak.longest} suffix="d" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
        <QuickCard to="/app/matchmaking" icon={Users} title="Find compatible players" body="AI-ranked players near you, ready to swipe." tone="turf" />
        <QuickCard to="/app/venues" icon={MapPinned} title="Book a venue" body="Ranked turfs & courts by distance and cost." tone="clay" />
        <QuickCard to="/app/games" icon={Trophy} title="Manage your games" body="Join, balance teams and record results." tone="gold" />
        <QuickCard to="/app/career" icon={Briefcase} title="Explore career opportunities" body="AI-matched trials, scouting & coaching roles." tone="navy" />
        <QuickCard to="/app/coaching" icon={Flame} title="Train & discover sports" body="Exercise Mode, Tutorial Mode and alternative sports." tone="clayDeep" />
      </div>

      <div className="bg-white rounded-2xl p-6 stitch-border mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <SectionHeading eyebrow="Weather Intelligence · FR-63" title="Your location" />
            <p className="text-sm text-ink-soft -mt-3">{currentPlayer.location}</p>
          </div>
          <WeatherChip lat={currentPlayer.lat} lng={currentPlayer.lng} size="lg" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">7-day forecast</p>
        <WeeklyForecast lat={currentPlayer.lat} lng={currentPlayer.lng} days={7} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 stitch-border">
          <SectionHeading eyebrow="Coming up" title="Your games" />
          {myGames.length === 0 ? (
            <p className="text-sm text-ink-soft">No games yet — join or create one to get started.</p>
          ) : (
            <div className="space-y-3">
              {myGames.map((g) => (
                <div key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-paper-dim">
                  <div>
                    <p className="font-semibold text-sm">{g.sport} · {g.venue}</p>
                    <p className="text-xs text-ink-soft">{g.date} · {g.time} · {g.participants.length}/{g.capacity} players</p>
                  </div>
                  <Badge tone={g.status === "Full" ? "clay" : "turf"}>{g.status}</Badge>
                </div>
              ))}
            </div>
          )}
          <Link to="/app/games" className="inline-flex items-center gap-1 text-sm font-semibold text-turf mt-4">
            View all games <ArrowRight size={14} />
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 stitch-border">
          <SectionHeading eyebrow="Circle" title="Friends" />
          <div className="space-y-3">
            {acceptedFriends.slice(0, 4).map(({ player }) => (
              <div key={player.id} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-turf-light text-turf-deep font-bold text-xs flex items-center justify-center">
                  {player.avatar}
                </span>
                <div>
                  <p className="text-sm font-semibold">{player.name}</p>
                  <p className="text-xs text-ink-soft">{player.sports.join(", ")}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/app/friends" className="inline-flex items-center gap-1 text-sm font-semibold text-turf mt-4">
            Manage friends <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 stitch-border mt-6">
        <SectionHeading eyebrow="Form" title="Recent results" />
        <div className="grid sm:grid-cols-3 gap-4">
          {recent.map((r) => (
            <div key={r.gameId} className="p-4 rounded-xl bg-paper-dim">
              <div className="flex items-center justify-between mb-2">
                <Badge tone={r.result === "Win" ? "turf" : r.result === "Loss" ? "clay" : "neutral"}>{r.result}</Badge>
                <span className="scoreboard text-xs text-ink-soft">{r.date}</span>
              </div>
              <p className="font-display text-xl tracking-wide">{r.score}</p>
              <p className="text-xs text-ink-soft mt-1">
                {r.sport} · {r.ratingDelta > 0 ? "+" : ""}
                {r.ratingDelta} rating
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickCard({ to, icon: Icon, title, body, tone }) {
  const tones = {
    turf: "bg-turf text-white",
    clay: "bg-clay text-white",
    gold: "bg-gold text-ink",
    navy: "bg-turf-deep text-white",
    clayDeep: "bg-clay-deep text-white",
  };
  return (
    <Link to={to} className={`rounded-2xl p-6 ${tones[tone]} flex flex-col justify-between min-h-[150px] hover:opacity-95 transition`}>
      <Icon size={26} />
      <div className="mt-4">
        <p className="font-display text-lg tracking-wide">{title}</p>
        <p className="text-sm opacity-80 mt-1">{body}</p>
      </div>
    </Link>
  );
}
