import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, Flame, MapPin, Play, Sparkles, Trophy } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import WeatherWidget from "../../components/WeatherWidget";

const actions = [
  { to: "/app/games", icon: Play, title: "Join a game", detail: "See who's playing" },
  { to: "/app/train", icon: Camera, title: "Train with camera", detail: "Track an exercise or drill" },
  { to: "/app/venues", icon: MapPin, title: "Find a venue", detail: "Choose where to play" },
  { to: "/app/scholarships", icon: Trophy, title: "Find support", detail: "Funding and opportunities" },
];

export default function Dashboard() {
  const { currentPlayer, session } = useApp();
  const [data, setData] = useState({ games: [], exercise: [], tutorials: [], sports: [], streak: null });
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const primarySport = currentPlayer.sports?.[0];

  useEffect(() => {
    if (!session.accessToken) return;
    let active = true;
    Promise.allSettled([
      api.getGames(session.accessToken),
      api.getExerciseEvaluations(session.accessToken, 3),
      api.getTutorialEvaluations(session.accessToken, 3),
      api.getAlternativeSports(session.accessToken, { primarySport, limit: 3 }),
      api.getStreakMonth(session.accessToken, { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }),
    ]).then(([games, exercise, tutorials, sports, streak]) => {
      if (!active) return;
      setData({
        games: games.status === "fulfilled" ? games.value.games || [] : [],
        exercise: exercise.status === "fulfilled" ? exercise.value.sessions || [] : [],
        tutorials: tutorials.status === "fulfilled" ? tutorials.value.sessions || [] : [],
        sports: sports.status === "fulfilled" ? sports.value.recommendations || [] : [],
        streak: streak.status === "fulfilled" ? streak.value : null,
      });
      if ([games, exercise, tutorials].every((item) => item.status === "rejected")) setError("Your live activity is unavailable right now. You can still explore Play and Scholarships.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [session.accessToken, primarySport]);

  useEffect(() => {
    if (!session.accessToken) return;
    let active = true;
    setWeatherLoading(true);
    api.getWeather(session.accessToken).then((result) => { if (active) setWeather(result.weather); })
      .catch(() => { if (active) setWeather({ status: "unavailable", location: { label: currentPlayer.location }, message: "Current weather could not be loaded." }); })
      .finally(() => { if (active) setWeatherLoading(false); });
    return () => { active = false; };
  }, [session.accessToken, currentPlayer.location]);

  const joined = data.games.filter((game) => game.joined);
  const nextGame = joined.sort((a, b) => new Date(a.dateTime || `${a.date}T${a.time}`) - new Date(b.dateTime || `${b.date}T${b.time}`))[0];
  const recent = [
    ...data.exercise.map((item) => ({ ...item, type: "Exercise", title: item.exercise?.name || "Training session" })),
    ...data.tutorials.map((item) => ({ ...item, type: "Drill", title: item.tutorial?.drillName || "Practice session" })),
  ].sort((a, b) => new Date(b.endAt || 0) - new Date(a.endAt || 0)).slice(0, 3);

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"><div><p className="text-xs uppercase tracking-[.2em] font-bold text-clay">Your home ground</p><h1 className="font-display text-4xl md:text-5xl mt-1">Hey {currentPlayer.name?.split(" ")[0] || "Player"}, ready to move?</h1><p className="text-ink-soft mt-2">Pick up where you left off, or find your next game.</p></div><span className="inline-flex items-center gap-2 rounded-full bg-turf-light text-turf-deep px-4 py-2 text-sm font-bold self-start"><Flame size={17} /> {data.streak ? `${data.streak.currentStreak} day streak` : "Streak unavailable"}</span></div>
    <section className="relative overflow-hidden rounded-3xl bg-turf-deep text-white p-7 md:p-9 grid md:grid-cols-[1fr_auto] gap-6 items-center"><div className="absolute -right-16 -top-20 w-72 h-72 rounded-full border border-white/15" /><div className="relative"><p className="uppercase tracking-[.2em] text-xs text-gold font-bold">Next move</p><h2 className="font-display text-3xl md:text-4xl mt-2">{nextGame ? `You're in for ${nextGame.sport}` : "Find your game"}</h2><p className="text-white/75 mt-2 max-w-xl">{nextGame ? `${nextGame.date || "Upcoming"} ${nextGame.time || ""} · ${nextGame.participantCount || 0}/${nextGame.capacity} players` : "See open games, discover teammates and choose a place to play."}</p></div><Link to={nextGame ? `/app/games/${nextGame.id}` : "/app/play"} className="relative inline-flex items-center justify-center gap-2 bg-clay hover:bg-clay-deep rounded-xl px-6 py-3 font-bold">{nextGame ? "View game" : "Explore Play"}<ArrowRight size={17} /></Link></section>
    <div className="lg:hidden"><WeatherWidget weather={weather} loading={weatherLoading} title="Weather near you" /></div>
    {error && <p role="status" className="rounded-xl bg-clay-light px-4 py-3 text-sm text-clay-deep">{error}</p>}
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5"><div className="space-y-5">
      <section className="rounded-2xl bg-white border border-ink/10 p-6"><div className="flex items-center justify-between gap-4 mb-5"><h2 className="font-display text-2xl">Do something today</h2><Link to="/app/play" className="text-sm font-bold text-turf">All play options →</Link></div><div className="grid sm:grid-cols-2 gap-3">{actions.map(({ to, icon: Icon, title, detail }) => <Link key={to} to={to} className="group flex items-center gap-3 rounded-xl bg-paper-dim hover:bg-turf-light p-4 transition"><span className="w-10 h-10 rounded-lg bg-white text-turf flex items-center justify-center shrink-0"><Icon size={19} /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="text-xs text-ink-soft">{detail}</span></span><ArrowRight size={16} className="text-turf opacity-0 group-hover:opacity-100" /></Link>)}</div></section>
      <section className="rounded-2xl bg-white border border-ink/10 p-6"><div className="flex items-center justify-between gap-4 mb-4"><h2 className="font-display text-2xl">Recent progress</h2><Link to="/app/performance" className="text-sm font-bold text-turf">View history →</Link></div>{loading ? <p className="text-ink-soft">Loading activity…</p> : recent.length ? <div className="divide-y divide-ink/10">{recent.map((item, index) => <div key={item.id || index} className="flex items-center justify-between gap-4 py-3"><div><p className="font-semibold">{item.title}</p><p className="text-sm text-ink-soft">{item.type} · {item.endAt ? new Date(item.endAt).toLocaleDateString() : "Recent"}</p></div><span className="text-sm font-bold text-turf">{item.completion || "Recorded"}</span></div>)}</div> : <div className="rounded-xl bg-paper-dim p-5"><p className="font-semibold">No sessions yet</p><p className="text-sm text-ink-soft mt-1">Start a camera session to see real progress here.</p><Link to="/app/train" className="inline-flex items-center gap-1 text-sm font-bold text-clay mt-3">Start training <ArrowRight size={15} /></Link></div>}</section>
    </div><aside className="space-y-5"><div className="hidden lg:block"><WeatherWidget weather={weather} loading={weatherLoading} title="Weather near you" /></div><section className="rounded-2xl bg-white border border-ink/10 p-6"><h2 className="font-display text-2xl">Your sport</h2><p className="text-ink-soft mt-1">{currentPlayer.sports?.join(" · ") || "Add a sport in your profile"}</p><p className="mt-5 text-sm font-bold uppercase tracking-wider text-ink-soft">Worth exploring</p>{data.sports.length ? <div className="mt-2 space-y-3">{data.sports.slice(0, 3).map((sport) => <div key={sport.sport} className="flex items-start gap-3 rounded-xl bg-paper-dim p-3"><Sparkles size={18} className="text-clay shrink-0 mt-1" /><div><p className="font-semibold">{sport.sport}</p><p className="text-xs text-ink-soft">{sport.sharedAttributes?.slice(0, 2).join(" · ") || "Related skills"}</p></div></div>)}</div> : <p className="text-sm text-ink-soft mt-3">Recommendations will appear when your sport profile is available.</p>}<Link to="/app/profile" className="inline-block text-sm font-bold text-turf mt-4">Update sports profile →</Link></section><section className="rounded-2xl bg-gold-light border border-gold/30 p-6"><h2 className="font-display text-2xl">Keep showing up</h2><p className="text-ink-soft mt-2">{data.streak?.today?.eventCount ? `Today counted: ${data.streak.today.types.join(", ")}. One day counts once.` : "Nothing has counted today. Complete a supported exercise or tutorial camera session to qualify."}</p><Link to="/app/performance" className="inline-block text-sm font-bold text-turf mt-4">See activity calendar →</Link></section></aside></div>
  </div>;
}
