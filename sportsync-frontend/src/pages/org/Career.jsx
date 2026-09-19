import { useMemo, useState } from "react";
import { Briefcase, Mail, Plus, Star, ShieldAlert } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, EmptyState, Modal } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { currentPlayer, players as demoPlayers } from "../../data/players";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball"];

// Demo-only contact email derivation for browsing (no email stored against demo player records)
const demoEmail = (name) => `${name.toLowerCase().replace(/\s+/g, ".")}@krid.demo`;

export default function OrgCareer() {
  const { careerOpportunities, careerRequests, createCareerOpportunity } = useApp();

  const [sport, setSport] = useState("All");
  const [minRating, setMinRating] = useState(0);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    sport: SPORTS[0],
    type: "Trial → Contract",
    minRating: "",
    stipend: "",
    location: "",
    description: "",
    deadline: "",
  });

  // All players available to browse — includes the demo current player alongside the wider pool
  const allPlayers = useMemo(() => [currentPlayer, ...demoPlayers], []);

  const filtered = useMemo(
    () =>
      allPlayers
        .filter((p) => (sport === "All" ? true : p.sports.includes(sport)))
        .filter((p) => p.rating >= minRating)
        .sort((a, b) => b.rating - a.rating),
    [allPlayers, sport, minRating]
  );

  const myOpportunities = careerOpportunities.filter((o) => o.title); // shared pool, newest first via context

  const submit = (e) => {
    e.preventDefault();
    createCareerOpportunity(form);
    setOpen(false);
    setForm({
      title: "",
      sport: SPORTS[0],
      type: "Trial → Contract",
      minRating: "",
      stipend: "",
      location: "",
      description: "",
      deadline: "",
    });
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Career Module"
        title="Career & recruitment"
        action={
          <PrimaryButton className="flex items-center gap-2" onClick={() => setOpen(true)}>
            <Plus size={16} /> Raise a new career opportunity
          </PrimaryButton>
        }
      />
      <p className="text-xs text-ink-soft flex items-center gap-1.5 mb-6 max-w-2xl">
        <ShieldAlert size={13} /> Player performance data shown here is demo data — production matching would use
        verified game history only.
      </p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div>
          <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Players available</p>
            <div className="flex gap-2 flex-wrap">
              <select className="fld-sm" value={sport} onChange={(e) => setSport(e.target.value)}>
                <option value="All">All sports</option>
                {SPORTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select className="fld-sm" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                <option value={0}>Any rating</option>
                <option value={1300}>1300+ rating</option>
                <option value={1400}>1400+ rating</option>
                <option value={1500}>1500+ rating</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No players match" body="Try widening the sport or rating filter." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-4 stitch-border">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-10 h-10 rounded-full bg-turf-light text-turf-deep font-bold text-xs flex items-center justify-center shrink-0">
                      {p.avatar}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-ink-soft truncate">{p.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge tone="turf"><Star size={11} className="inline -mt-0.5 mr-1" />{p.rating}</Badge>
                    {p.sports.map((s) => (
                      <Badge key={s} tone="neutral">{s}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-ink-soft flex items-center gap-1.5">
                    <Mail size={11} /> {demoEmail(p.name)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Your live opportunities</p>
          <div className="space-y-3 mb-8">
            {myOpportunities.length === 0 ? (
              <p className="text-sm text-ink-soft">No opportunities posted yet.</p>
            ) : (
              myOpportunities.map((o) => (
                <div key={o.id} className="bg-white rounded-2xl p-4 stitch-border">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <Briefcase size={13} className="text-turf" /> {o.title}
                    </p>
                    <Badge tone="gold">{o.status || "Live"}</Badge>
                  </div>
                  <p className="text-xs text-ink-soft">{o.sport} · Min rating {o.minRating} · {o.orgName}</p>
                </div>
              ))
            )}
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Player career requests</p>
          <div className="space-y-3">
            {careerRequests.length === 0 ? (
              <p className="text-sm text-ink-soft">No player requests yet.</p>
            ) : (
              careerRequests.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl p-4 stitch-border">
                  <p className="text-sm font-semibold">{r.title}</p>
                  <p className="text-xs text-ink-soft">{r.sport} · {r.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Raise a new career opportunity" widthClass="max-w-lg">
        <form onSubmit={submit} className="space-y-3">
          <input required className="fld" placeholder="Opportunity title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="fld" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}>
              {SPORTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input className="fld" placeholder="Type (e.g. Trial, Tryout)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" className="fld" placeholder="Minimum rating" value={form.minRating} onChange={(e) => setForm({ ...form, minRating: e.target.value })} />
            <input className="fld" placeholder="Stipend / reward" value={form.stipend} onChange={(e) => setForm({ ...form, stipend: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input required className="fld" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <input required type="date" className="fld" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <textarea required rows={3} className="fld" placeholder="Describe what you're looking for" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <PrimaryButton type="submit" className="w-full mt-1">Post opportunity</PrimaryButton>
        </form>
      </Modal>

      <style>{`
        .fld { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }
        .fld-sm { padding: 0.4rem 0.75rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.8rem; }
      `}</style>
    </div>
  );
}
