import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui";
import { BrandMark, BrandWordmark } from "../components/Brand";
import { api } from "../lib/api";

const empty = { players: [], organisations: [], venues: [], opportunities: [], games: [] };
const sports = ["All", "Football", "Badminton", "Tennis", "Basketball"];

export default function DemoExplorer() {
  const [catalog, setCatalog] = useState(empty);
  const [sport, setSport] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.getDemoCatalog()
      .then((result) => { if (active) setCatalog(result.catalog); })
      .catch((err) => { if (active) setError(err.message || "Could not load examples."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const players = catalog.players.filter((player) => sport === "All" || player.sports.includes(sport));
  const organisations = catalog.organisations.filter((org) => sport === "All" || org.sport === sport);

  return <div className="min-h-screen bg-paper text-ink">
    <header className="max-w-7xl mx-auto px-5 sm:px-6 py-5 flex items-center justify-between gap-3">
      <Link to="/" className="flex items-center gap-2.5"><BrandMark className="w-9 h-9" tone="orange" /><BrandWordmark className="text-xl" accentClassName="text-clay" /></Link>
      <Link to="/auth?mode=register" className="text-sm font-bold text-turf underline">Create an account</Link>
    </header>
    <main className="max-w-7xl mx-auto px-5 sm:px-6 pb-14">
      <div className="rounded-3xl bg-turf-deep text-white p-6 md:p-10 mb-7">
        <p className="text-xs uppercase tracking-[.2em] font-bold text-gold">Read-only preview</p>
        <h1 className="font-display text-3xl md:text-5xl mt-2">Explore the sample community</h1>
        <p className="text-white/80 mt-3 max-w-3xl">These fictional profiles show how players, organisations, venues, roles and games relate across Krid.ai. They are not accounts, verified performance, available bookings or open applications.</p>
        {!loading && !error && <p className="text-sm font-semibold mt-4">{catalog.players.length} sample players · {catalog.organisations.length} sample organisations · {catalog.venues.length} venues · {catalog.opportunities.length} roles · {catalog.games.length} games</p>}
      </div>
      <div className="flex flex-wrap gap-2 mb-7" role="group" aria-label="Filter examples by sport">
        {sports.map((item) => <button key={item} type="button" aria-pressed={sport === item} onClick={() => setSport(item)} className={`px-3.5 py-2 rounded-full text-sm font-semibold border-2 ${sport === item ? "bg-turf border-turf text-white" : "border-ink/15 bg-white text-ink-soft"}`}>{item}</button>)}
      </div>
      {loading && <p role="status" className="text-ink-soft">Loading sample community…</p>}
      {error && <p role="alert" className="text-clay-deep bg-clay-light rounded-xl p-4">Sample community unavailable: {error}</p>}
      {!loading && !error && <div className="space-y-10">
        <section aria-labelledby="demo-players-heading"><h2 id="demo-players-heading" className="font-display text-2xl mb-2">Players ({players.length})</h2><p className="text-sm text-ink-soft mb-4">Skills and ratings are illustrative. These profiles cannot receive friend requests or count toward real matches.</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{players.map((player) => <article key={player.id} className="bg-white rounded-2xl p-4 stitch-border"><Badge tone="gold">Sample</Badge><h3 className="font-semibold mt-2">{player.name}</h3><p className="text-sm text-ink-soft">{player.sports.join(" · ")} · {player.location}</p><p className="text-xs text-ink-soft mt-2">Illustrative rating {player.rating} · {player.availability.join(", ")}</p></article>)}</div>{players.length === 0 && <p className="text-sm text-ink-soft">No examples for this sport.</p>}</section>
        <section aria-labelledby="demo-org-heading"><h2 id="demo-org-heading" className="font-display text-2xl mb-2">Organisations ({organisations.length})</h2><p className="text-sm text-ink-soft mb-4">Every card links its fictional organisation, venue and role from the same catalog.</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{organisations.map((org) => { const venue = catalog.venues.find((item) => item.orgId === org.id); const role = catalog.opportunities.find((item) => item.orgId === org.id); return <article key={org.id} className="bg-white rounded-2xl p-4 stitch-border"><Badge tone="gold">Sample</Badge><h3 className="font-semibold mt-2">{org.name}</h3><p className="text-sm text-ink-soft">{org.type} · {org.location}</p><p className="text-xs mt-3"><strong>Example venue:</strong> {venue?.name || "None"}</p><p className="text-xs mt-1"><strong>Example role:</strong> {role?.title || "None"}</p></article>; })}</div>{organisations.length === 0 && <p className="text-sm text-ink-soft">No examples for this sport.</p>}</section>
      </div>}
    </main>
  </div>;
}
