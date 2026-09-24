import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPinned, Wallet, Landmark, Briefcase, ArrowRight, ShieldCheck } from "lucide-react";
import { SectionHeading, ScoreboardStat, Badge } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";

export default function OrgDashboard() {
  const { currentOrganisation, session, demoCatalog, demoLoading, demoError } = useApp();
  const [myVenues, setMyVenues] = useState([]);
  const [orgBookings, setOrgBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!session.accessToken) return;
    let active = true;
    setLoading(true);
    Promise.all([api.getOrgVenues(session.accessToken), api.getOrgBookings(session.accessToken)])
      .then(([venueData, bookingData]) => {
        if (active) { setMyVenues(venueData.venues || []); setOrgBookings(bookingData.bookings || []); }
      })
      .catch((err) => { if (active) setError(err.message || "Could not load organisation totals."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session.accessToken]);
  const pendingBookings = orgBookings.filter((b) => b.status === "pending").length;
  const totalRevenue = orgBookings.filter((b) => b.status === "confirmed").reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay mb-1">Organisation</p>
          <h1 className="font-display text-3xl md:text-4xl tracking-wide">{currentOrganisation.name}</h1>
          <p className="text-ink-soft mt-1 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-turf" /> {currentOrganisation.verification} · {currentOrganisation.location}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <ScoreboardStat label="Venues" value={loading ? "…" : myVenues.length} />
          <ScoreboardStat label="Pending" value={loading ? "…" : pendingBookings} />
          <ScoreboardStat label="Revenue" value={loading ? "…" : `₹${totalRevenue.toLocaleString("en-IN")}`} />
        </div>
      </div>
      {error && <p role="status" className="text-sm text-clay-deep bg-clay-light rounded-xl p-3 mb-6">{error}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <QuickCard to="/app/venues" icon={MapPinned} title="Manage venues" body="Register turfs/courts, pricing and availability." tone="turf" />
        <QuickCard to="/app/bookings" icon={Wallet} title="Bookings & payments" body="Track confirmed and pending venue payments." tone="clay" />
        <QuickCard to="/app/career" icon={Briefcase} title="Career & recruitment" body="Browse players and post career opportunities." tone="navy" />
        <QuickCard to="/app/fundraising" icon={Landmark} title="Fundraising" body="Create campaigns for upgrades and programmes." tone="gold" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 stitch-border">
          <SectionHeading eyebrow="Recent" title="Bookings" />
          <div className="space-y-3">
            {loading && <p role="status" className="text-sm text-ink-soft">Loading live bookings…</p>}
            {!loading && orgBookings.length === 0 && <p className="text-sm text-ink-soft">No bookings for your venues yet.</p>}
            {orgBookings.slice(0, 4).map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-paper-dim">
                <div>
                  <p className="text-sm font-semibold">{b.venue?.name || b.venueId}</p>
                  <p className="text-xs text-ink-soft">{b.player?.name || "Player"} · {b.slot}</p>
                </div>
                <div className="text-right">
                  <p className="scoreboard text-sm font-semibold">₹{b.amount}</p>
                  <Badge tone={b.status === "confirmed" ? "turf" : "gold"}>{b.status}</Badge>
                </div>
              </div>
            ))}
          </div>
          <Link to="/app/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-turf mt-4">
            View all bookings <ArrowRight size={14} />
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 stitch-border">
          <SectionHeading eyebrow="Campaign" title="Fundraising" />
          <p className="text-sm text-ink-soft">Campaign drafts are managed in your fundraising area. They are not published or funded until a real moderation and payment flow is available.</p>
          <Link to="/app/fundraising" className="inline-flex items-center gap-1 text-sm font-semibold text-turf mt-4">
            Manage fundraising <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <section className="mt-8" aria-labelledby="sample-org-heading">
        <h2 id="sample-org-heading" className="font-display text-xl mb-2">Example organisation network</h2>
        <p className="text-xs text-ink-soft mb-3">{demoCatalog.organisations.length} fictional organisations linked to the same sample venues, roles and games players can browse. They are not verified accounts.</p>
        {demoLoading ? <p role="status" className="text-sm text-ink-soft">Loading examples…</p> : demoError ? <p role="status" className="text-sm text-clay-deep">Examples unavailable: {demoError}</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{demoCatalog.organisations.map((org) => <article key={org.id} className="bg-white rounded-xl p-4 stitch-border"><Badge tone="gold">Sample</Badge><h3 className="font-semibold mt-2">{org.name}</h3><p className="text-xs text-ink-soft">{org.type} · {org.location} · {org.sport}</p></article>)}</div>}
      </section>
    </div>
  );
}

function QuickCard({ to, icon: Icon, title, body, tone }) {
  const tones = { turf: "bg-turf text-white", clay: "bg-clay text-white", gold: "bg-gold text-ink", navy: "bg-turf-deep text-white" };
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
