import { Link } from "react-router-dom";
import { MapPinned, Wallet, Landmark, Briefcase, ArrowRight, ShieldCheck } from "lucide-react";
import { SectionHeading, ScoreboardStat, Badge } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { venues, orgBookings } from "../../data/venues";
import { fundraisingCampaigns } from "../../data/games";

export default function OrgDashboard() {
  const { currentOrganisation } = useApp();
  const myVenues = venues.filter((v) => v.orgId === currentOrganisation.id);
  const pendingBookings = orgBookings.filter((b) => b.status === "Pending").length;
  const totalRevenue = orgBookings.filter((b) => b.status === "Confirmed").reduce((s, b) => s + b.amount, 0);
  const myCampaign = fundraisingCampaigns.find((f) => f.orgId === currentOrganisation.id);

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
          <ScoreboardStat label="Venues" value={myVenues.length} />
          <ScoreboardStat label="Pending" value={pendingBookings} />
          <ScoreboardStat label="Revenue" value={`₹${(totalRevenue / 1000).toFixed(1)}k`} />
        </div>
      </div>

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
            {orgBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-paper-dim">
                <div>
                  <p className="text-sm font-semibold">{b.venueName}</p>
                  <p className="text-xs text-ink-soft">{b.playerName} · {b.date} · {b.time}</p>
                </div>
                <div className="text-right">
                  <p className="scoreboard text-sm font-semibold">₹{b.amount}</p>
                  <Badge tone={b.status === "Confirmed" ? "turf" : "gold"}>{b.status}</Badge>
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
          {myCampaign ? (
            <div>
              <p className="font-display text-lg tracking-wide mb-1">{myCampaign.purpose}</p>
              <p className="text-sm text-ink-soft mb-3">Deadline {myCampaign.deadline}</p>
              <div className="w-full h-2.5 rounded-full bg-ink/10 overflow-hidden mb-2">
                <div className="h-full bg-clay rounded-full" style={{ width: `${Math.min(100, (myCampaign.raised / myCampaign.target) * 100)}%` }} />
              </div>
              <p className="text-sm text-ink-soft">
                ₹{myCampaign.raised.toLocaleString("en-IN")} raised of ₹{myCampaign.target.toLocaleString("en-IN")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">No active campaign yet.</p>
          )}
          <Link to="/app/fundraising" className="inline-flex items-center gap-1 text-sm font-semibold text-turf mt-4">
            Manage fundraising <ArrowRight size={14} />
          </Link>
        </div>
      </div>
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
