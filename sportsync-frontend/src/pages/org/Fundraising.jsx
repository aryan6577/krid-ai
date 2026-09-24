import { useMemo, useState } from "react";
import { Plus, ShieldAlert, Star, HeartHandshake } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, EmptyState, Modal, ProgressBar } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { fundraisingCampaigns as seed } from "../../data/games";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball"];

export default function OrgFundraising() {
  const { currentOrganisation, orgSponsorshipOffers, createSponsorshipOffer, demoCatalog, demoLoading, demoError } = useApp();
  const [campaigns, setCampaigns] = useState(seed.filter((c) => c.orgId === currentOrganisation.id));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ purpose: "", target: "", deadline: "", terms: "" });

  const [sponsorSport, setSponsorSport] = useState("All");
  const [sponsorMinRating, setSponsorMinRating] = useState(1300);

  const [offerOpen, setOfferOpen] = useState(false);
  const [offerForm, setOfferForm] = useState({ playerName: "", sport: SPORTS[0], value: "", details: "" });

  const submit = (e) => {
    e.preventDefault();
    setCampaigns((c) => [
      { id: `f${Date.now()}`, orgId: currentOrganisation.id, orgName: currentOrganisation.name, raised: 0, status: "Pending moderation", ...form, target: Number(form.target) },
      ...c,
    ]);
    setOpen(false);
    setForm({ purpose: "", target: "", deadline: "", terms: "" });
  };

  const sponsorablePlayers = useMemo(
    () =>
      demoCatalog.players
        .filter((p) => (sponsorSport === "All" ? true : p.sports.includes(sponsorSport)))
        .filter((p) => p.rating >= sponsorMinRating)
        .sort((a, b) => b.rating - a.rating),
    [demoCatalog.players, sponsorSport, sponsorMinRating]
  );

  const submitOffer = (e) => {
    e.preventDefault();
    createSponsorshipOffer(offerForm);
    setOfferOpen(false);
    setOfferForm({ playerName: "", sport: SPORTS[0], value: "", details: "" });
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Funding Module · FR-25"
        title="Fundraising campaigns"
        action={
          <PrimaryButton className="flex items-center gap-1.5" onClick={() => setOpen(true)}>
            <Plus size={16} /> New campaign
          </PrimaryButton>
        }
      />
      <p className="text-xs text-ink-soft flex items-center gap-1.5 mb-6">
        <ShieldAlert size={13} /> Campaign information is organisation-provided and subject to moderation before public
        publication in production (BR-12).
      </p>

      <div className="grid md:grid-cols-2 gap-5">
        {campaigns.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl p-5 stitch-border">
            <div className="flex items-center justify-between mb-3">
              <Badge tone={c.status === "Published" ? "turf" : "gold"}>{c.status}</Badge>
              <span className="text-xs text-ink-soft">Deadline {c.deadline}</span>
            </div>
            <p className="font-display text-lg tracking-wide mb-2">{c.purpose}</p>
            <ProgressBar value={(c.raised / c.target) * 100} tone="clay" />
            <p className="text-sm text-ink-soft mt-2">
              ₹{c.raised.toLocaleString("en-IN")} raised of ₹{c.target.toLocaleString("en-IN")}
            </p>
            {c.terms && <p className="text-xs text-ink-soft mt-2 italic">{c.terms}</p>}
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create fundraising campaign">
        <form onSubmit={submit} className="space-y-3">
          <textarea required rows={3} placeholder="Purpose of this campaign" className="fld" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" placeholder="Target amount (₹)" className="fld" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
            <input required type="date" className="fld" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <textarea rows={2} placeholder="Terms (how funds will be used)" className="fld" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          <PrimaryButton type="submit" className="w-full mt-2">Submit for moderation</PrimaryButton>
        </form>
      </Modal>

      <div className="mt-12">
        <SectionHeading
          eyebrow="Sponsorship Module"
          title="Sponsorships"
          action={
            <PrimaryButton className="flex items-center gap-2" onClick={() => setOfferOpen(true)}>
              <Plus size={16} /> Offer Sponsorship
            </PrimaryButton>
          }
        />
        <p className="text-xs text-ink-soft flex items-center gap-1.5 mb-6 max-w-2xl">
          <ShieldAlert size={13} /> Browse players available for sponsorship, or raise a request/offer for a
          specific player. Sample profiles are fictional and cannot receive offers. No contact details are provided.
        </p>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div>
            <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Example player profiles</p>
              <div className="flex gap-2 flex-wrap">
                <select className="fld-sm" value={sponsorSport} onChange={(e) => setSponsorSport(e.target.value)}>
                  <option value="All">All sports</option>
                  {SPORTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select className="fld-sm" value={sponsorMinRating} onChange={(e) => setSponsorMinRating(Number(e.target.value))}>
                  <option value={0}>Any rating</option>
                  <option value={1300}>1300+ rating</option>
                  <option value={1400}>1400+ rating</option>
                  <option value={1500}>1500+ rating</option>
                </select>
              </div>
            </div>

            {demoLoading && <p role="status" className="text-sm text-ink-soft">Loading sample players…</p>}
            {demoError && <p role="status" className="text-sm text-clay-deep">Sample players unavailable: {demoError}</p>}
            {!demoLoading && !demoError && (sponsorablePlayers.length === 0 ? (
              <EmptyState title="No players match" body="Try widening the sport or rating filter." />
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {sponsorablePlayers.map((p) => (
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
                      <Badge tone="gold">Sample</Badge><Badge tone="neutral"><Star size={11} className="inline -mt-0.5 mr-1" />Illustrative {p.rating}</Badge>
                      {p.sports.map((s) => (
                        <Badge key={s} tone="neutral">{s}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-ink-soft">No contact or verified performance attached to sample profiles.</p>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Your sponsorship requests</p>
            <div className="space-y-3">
              {orgSponsorshipOffers.length === 0 ? (
                <p className="text-sm text-ink-soft">No sponsorship requests raised yet.</p>
              ) : (
                orgSponsorshipOffers.map((o) => (
                  <div key={o.id} className="bg-white rounded-2xl p-4 stitch-border">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        <HeartHandshake size={13} className="text-turf" /> {o.playerName || "Open to any player"}
                      </p>
                      <Badge tone="gold">{o.status}</Badge>
                    </div>
                    <p className="text-xs text-ink-soft">{o.sport} · {o.value}</p>
                    <p className="text-xs text-ink-soft mt-1">{o.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal open={offerOpen} onClose={() => setOfferOpen(false)} title="Raise a sponsorship request">
        <form onSubmit={submitOffer} className="space-y-3">
          <input
            className="fld"
            placeholder="Player name (optional — leave blank for an open call)"
            value={offerForm.playerName}
            onChange={(e) => setOfferForm({ ...offerForm, playerName: e.target.value })}
          />
          <select className="fld" value={offerForm.sport} onChange={(e) => setOfferForm({ ...offerForm, sport: e.target.value })}>
            {SPORTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            required
            className="fld"
            placeholder="Sponsorship value (e.g. ₹20,000 kit + gear)"
            value={offerForm.value}
            onChange={(e) => setOfferForm({ ...offerForm, value: e.target.value })}
          />
          <textarea
            required
            rows={3}
            className="fld"
            placeholder="Describe the sponsorship terms and what you're looking for"
            value={offerForm.details}
            onChange={(e) => setOfferForm({ ...offerForm, details: e.target.value })}
          />
          <PrimaryButton type="submit" className="w-full mt-1">Submit request</PrimaryButton>
        </form>
      </Modal>

      <style>{`
        .fld { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }
        .fld-sm { padding: 0.4rem 0.75rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.8rem; }
      `}</style>
    </div>
  );
}
