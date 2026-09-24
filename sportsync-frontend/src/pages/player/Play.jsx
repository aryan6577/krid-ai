import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPinned, Users, Dumbbell, TrendingUp, UserRoundCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";

const ACTIONS = [
  { to: "/app/games", icon: CalendarDays, title: "Find a game", description: "Join an open game or create one for your sport.", action: "Browse games" },
  { to: "/app/matchmaking", icon: Users, title: "Find players", description: "Meet compatible players and build your team.", action: "Discover players" },
  { to: "/app/venues", icon: MapPinned, title: "Book a venue", description: "Compare available places to play near you.", action: "Explore venues" },
  { to: "/app/train", icon: Dumbbell, title: "Train with camera", description: "Get pose-based feedback on supported exercises and drills.", action: "Start training" },
  { to: "/app/friends", icon: UserRoundCheck, title: "Your teammates", description: "Manage friend requests and stay connected with players.", action: "View friends" },
];

export default function Play() {
  const { demoCatalog, demoLoading, demoError } = useApp();
  return <div className="space-y-7">
    <div><p className="text-xs uppercase tracking-[.2em] font-bold text-clay">Play</p><h1 className="font-display text-4xl mt-1">What are you up for today?</h1><p className="text-ink-soft mt-2">Pick one next step. Your games, venues, teammates and practice are all here.</p></div>
    <div className="grid md:grid-cols-2 gap-4">
      {ACTIONS.map(({ to, icon: Icon, title, description, action }) => <Link key={to} to={to} className="group rounded-2xl bg-white border border-ink/10 p-6 hover:shadow-lg hover:-translate-y-0.5 transition flex flex-col min-h-48">
        <span className="w-11 h-11 rounded-xl bg-turf-light text-turf flex items-center justify-center"><Icon size={22} /></span>
        <h2 className="font-display text-2xl mt-4">{title}</h2><p className="text-ink-soft mt-1 flex-1">{description}</p><span className="mt-4 inline-flex items-center gap-1 font-bold text-clay">{action} <ArrowRight size={16} /></span>
      </Link>)}
    </div>
    <Link to="/app/performance" className="flex items-center justify-between rounded-2xl bg-turf-deep text-white p-5"><span className="flex items-center gap-3"><TrendingUp size={22} /> See your performance and activity history</span><ArrowRight size={18} /></Link>
    <section className="rounded-2xl bg-white border border-ink/10 p-5" aria-labelledby="community-heading">
      <h2 id="community-heading" className="font-display text-xl">Explore the sample community</h2>
      <p className="text-sm text-ink-soft mt-1">{demoCatalog.players.length} fictional players and {demoCatalog.organisations.length} fictional organisations share the example games, venues and career listings across the app.</p>
      {demoLoading && <p role="status" className="text-sm text-ink-soft mt-2">Loading examples…</p>}
      {demoError && <p role="status" className="text-sm text-clay-deep mt-2">Examples unavailable: {demoError}</p>}
      {!demoLoading && !demoError && <details className="mt-3"><summary className="cursor-pointer text-sm font-bold text-turf">View sample organisations</summary><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">{demoCatalog.organisations.map((org) => <div key={org.id} className="rounded-xl bg-paper-dim p-3"><p className="text-sm font-semibold">{org.name}</p><p className="text-xs text-ink-soft">{org.sport} · {org.location}</p></div>)}</div></details>}
    </section>
  </div>;
}
