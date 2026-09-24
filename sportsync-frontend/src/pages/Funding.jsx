import { useMemo, useState } from "react";
import { Sparkles, Landmark, HeartHandshake, Plus, CheckCheck, Clock } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, GhostButton, EmptyState, Modal } from "../components/ui";
import { fundingOpportunities } from "../data/games";
import { rankFundingOpportunities, rankSponsorshipDeals } from "../lib/ai";
import { useApp } from "../context/AppContext";

const TAGS = ["infrastructure", "turf", "community", "scholarship", "youth", "training", "wellness", "participation", "lighting", "equipment"];

export default function Funding({ section = "all" }) {
  const {
    currentPlayer,
    fundRequests,
    submitFundRequest,
    appliedFundingIds,
    applyToFunding,
    sponsorshipDeals,
    requestedSponsorshipIds,
    requestSponsorship,
    sponsorshipRequests,
    submitSponsorshipRequest,
  } = useApp();
  const [form, setForm] = useState({ purpose: "", amount: "", deadline: "", tags: [] });
  const [submitted, setSubmitted] = useState(false);

  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({ title: "", purpose: "", amount: "", deadline: "" });
  const [justSubmitted, setJustSubmitted] = useState(false);

  const [sponsorRequestOpen, setSponsorRequestOpen] = useState(false);
  const [sponsorRequest, setSponsorRequest] = useState({ brand: "", sport: currentPlayer.sports[0] || "", details: "" });
  const [sponsorJustSubmitted, setSponsorJustSubmitted] = useState(false);

  const toggle = (t) => setForm((f) => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] }));

  const results = submitted ? rankFundingOpportunities(form.tags, fundingOpportunities) : [];
  const rankedSponsorships = useMemo(() => rankSponsorshipDeals(currentPlayer, sponsorshipDeals), [currentPlayer, sponsorshipDeals]);

  const handleSponsorRequestSubmit = (e) => {
    e.preventDefault();
    submitSponsorshipRequest(sponsorRequest);
    setSponsorRequestOpen(false);
    setSponsorRequest({ brand: "", sport: currentPlayer.sports[0] || "", details: "" });
    setSponsorJustSubmitted(true);
    setTimeout(() => setSponsorJustSubmitted(false), 4000);
  };

  const handleNewRequestSubmit = (e) => {
    e.preventDefault();
    submitFundRequest(newRequest);
    setNewRequestOpen(false);
    setNewRequest({ title: "", purpose: "", amount: "", deadline: "" });
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 4000);
  };

  return (
    <div>
      <div className={section === "sponsorships" ? "hidden" : ""}>
      <SectionHeading
        eyebrow="Funding Module · FR-26 / FR-27"
        title="Find funding opportunities"
        action={
          <PrimaryButton className="flex items-center gap-2" onClick={() => setNewRequestOpen(true)}>
            <Plus size={16} /> New fund request
          </PrimaryButton>
        }
      />
      <p className="text-sm text-ink-soft max-w-2xl mb-6">
        Fictional sample options for exploring matching. Confirm every provider, deadline and eligibility before applying outside Krid.ai.
      </p>

      {justSubmitted && (
        <div className="mb-6 bg-turf-light text-turf-deep rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCheck size={16} /> Fund request saved in this browser session. It has not been sent for review.
        </div>
      )}

      {fundRequests.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Local fund request drafts</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {fundRequests.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-4 stitch-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">{r.title || "Untitled request"}</p>
                  <Badge tone="gold">Local draft</Badge>
                </div>
                <p className="text-xs text-ink-soft mb-2">{r.purpose}</p>
                <p className="text-xs text-ink-soft">
                    {r.amount ? `₹${r.amount}` : "Amount TBD"} · Needed by {r.deadline || "—"} · Saved {r.submittedOn}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Sample funding options</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {fundingOpportunities.map((o) => {
            const applied = appliedFundingIds.includes(o.id);
            return (
              <div key={o.id} className="bg-white rounded-2xl p-5 stitch-border flex flex-col justify-between">
                <div>
                  <p className="font-display text-lg tracking-wide flex items-center gap-2 mb-1">
                    <Landmark size={16} className="text-turf" /> {o.provider} <Badge tone="gold">Sample</Badge>
                  </p>
                  <p className="text-sm text-ink-soft mb-2">{o.purpose}</p>
                  <p className="text-xs text-ink-soft mb-3">
                    {o.amountRange} · Deadline {o.deadline}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {o.tags.map((t) => (
                      <Badge key={t} tone="neutral">{t}</Badge>
                    ))}
                  </div>
                </div>
                {applied ? (
                  <GhostButton disabled className="!border-turf !text-turf w-full flex items-center justify-center gap-2 !cursor-default">
                    <CheckCheck size={15} /> Interest saved locally
                  </GhostButton>
                ) : (
                  <PrimaryButton className="w-full" onClick={() => applyToFunding(o.id)}>
                    Save interest
                  </PrimaryButton>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SectionHeading eyebrow="AI Fund Matching · FR-27" title="Search opportunities by need" />
      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="bg-white rounded-2xl p-6 stitch-border space-y-4 h-fit"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Purpose</p>
            <textarea required className="fld" rows={3} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Upgrading floodlights for evening games" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" placeholder="Amount (₹)" className="fld" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input required type="date" className="fld" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Relevant tags</p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => toggle(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 capitalize ${
                    form.tags.includes(t) ? "bg-turf border-turf text-white" : "border-ink/15 text-ink-soft"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <PrimaryButton type="submit" className="w-full" disabled={form.tags.length === 0}>
            Search opportunities
          </PrimaryButton>
        </form>

        <div>
          {!submitted ? (
            <EmptyState title="No search yet" body="Fill in your funding need and tags, then search to see AI-ranked opportunities." />
          ) : results.filter((r) => r.score > 0).length === 0 ? (
            <EmptyState title="No close matches" body="Try selecting different tags that describe your funding need." />
          ) : (
            <div className="space-y-4">
              {results.filter((r) => r.score > 0).map(({ opportunity, score, matchedTags }) => {
                const applied = appliedFundingIds.includes(opportunity.id);
                return (
                  <div key={opportunity.id} className="bg-white rounded-2xl p-5 stitch-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-display text-lg tracking-wide flex items-center gap-2">
                        <Landmark size={16} className="text-turf" /> {opportunity.provider}
                      </p>
                      <Badge tone="gold">{score}% match</Badge>
                    </div>
                    <p className="text-sm text-ink-soft mb-2">{opportunity.purpose}</p>
                    <p className="text-xs text-ink-soft mb-3">
                      {opportunity.amountRange} · Deadline {opportunity.deadline}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {matchedTags.map((t) => (
                        <span key={t} className="text-xs flex items-center gap-1 text-clay">
                          <Sparkles size={11} /> matched on "{t}"
                        </span>
                      ))}
                    </div>
                    {applied ? (
                      <GhostButton disabled className="!border-turf !text-turf !px-3 !py-1.5 text-xs flex items-center gap-1.5 !cursor-default">
                        <CheckCheck size={13} /> Interest saved locally
                      </GhostButton>
                    ) : (
                      <PrimaryButton className="!px-3 !py-1.5 text-xs" onClick={() => applyToFunding(opportunity.id)}>
                        Save interest
                      </PrimaryButton>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      </div>

      <div className={section === "funding" ? "hidden" : ""}>
        <SectionHeading
          eyebrow="Sponsorship Module"
          title="Sponsorships"
          action={
            <PrimaryButton className="flex items-center gap-2" onClick={() => setSponsorRequestOpen(true)}>
              <Plus size={16} /> Request a sponsorship
            </PrimaryButton>
          }
        />
        <p className="text-sm text-ink-soft max-w-2xl mb-6">
          Sample sponsorship deals matched to your sport and rating — save interest in any that fit, or raise a custom
          request below.
        </p>

        {sponsorJustSubmitted && (
          <div className="mb-6 bg-turf-light text-turf-deep rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <CheckCheck size={16} /> Sponsorship request saved in this browser session. It has not been sent for review.
          </div>
        )}

        {sponsorshipRequests.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Local sponsorship request drafts</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {sponsorshipRequests.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl p-4 stitch-border">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">{r.brand || "Any brand"}</p>
                    <Badge tone="gold">Local draft</Badge>
                  </div>
                  <p className="text-xs text-ink-soft mb-2">{r.sport}</p>
                  <p className="text-xs text-ink-soft">{r.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {rankedSponsorships.map(({ opportunity: d, score, reasons }) => {
            const requested = requestedSponsorshipIds.includes(d.id);
            return (
              <div key={d.id} className="bg-white rounded-2xl p-5 stitch-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-display text-lg tracking-wide flex items-center gap-2">
                      <HeartHandshake size={16} className="text-turf" /> {d.brand}
                    </p>
                    <Badge tone={score >= 75 ? "turf" : score >= 50 ? "gold" : "neutral"}>{score}% match</Badge>
                  </div>
                  <p className="text-sm text-ink-soft mb-2">{d.description}</p>
                  <p className="text-xs text-ink-soft mb-3">
                    {d.type} · {d.value} · Min rating {d.minRating} · Deadline {d.deadline}
                  </p>
                  <div className="space-y-1 mb-3">
                    {reasons.map((r, i) => (
                      <p key={i} className="text-xs flex items-center gap-1.5 text-clay">
                        <Sparkles size={11} /> {r}
                      </p>
                    ))}
                  </div>
                </div>
                {requested ? (
                  <GhostButton disabled className="!border-turf !text-turf w-full flex items-center justify-center gap-2 !cursor-default">
                    <CheckCheck size={15} /> Interest saved locally
                  </GhostButton>
                ) : (
                  <PrimaryButton className="w-full" onClick={() => requestSponsorship(d.id)}>
                    Save interest
                  </PrimaryButton>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={sponsorRequestOpen} onClose={() => setSponsorRequestOpen(false)} title="Request a sponsorship">
        <form onSubmit={handleSponsorRequestSubmit} className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Preferred brand (optional)</p>
            <input
              className="fld"
              placeholder="e.g. Puma, or leave blank for any brand"
              value={sponsorRequest.brand}
              onChange={(e) => setSponsorRequest({ ...sponsorRequest, brand: e.target.value })}
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Sport</p>
            <select
              className="fld"
              value={sponsorRequest.sport}
              onChange={(e) => setSponsorRequest({ ...sponsorRequest, sport: e.target.value })}
            >
              {["Football", "Badminton", "Tennis", "Basketball"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Details</p>
            <textarea
              required
              rows={3}
              className="fld"
              placeholder="What kind of sponsorship support are you looking for?"
              value={sponsorRequest.details}
              onChange={(e) => setSponsorRequest({ ...sponsorRequest, details: e.target.value })}
            />
          </div>
          <p className="text-xs text-ink-soft flex items-center gap-1.5">
            <Clock size={12} /> This draft stays in this browser session and is not delivered to a sponsor.
          </p>
          <PrimaryButton type="submit" className="w-full">Submit request</PrimaryButton>
        </form>
      </Modal>

      <Modal open={newRequestOpen} onClose={() => setNewRequestOpen(false)} title="New fund request">
        <form onSubmit={handleNewRequestSubmit} className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Request title</p>
            <input
              required
              className="fld"
              placeholder="e.g. New badminton racquets for the club"
              value={newRequest.title}
              onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Purpose / description</p>
            <textarea
              required
              rows={3}
              className="fld"
              placeholder="Describe what the funds will be used for"
              value={newRequest.purpose}
              onChange={(e) => setNewRequest({ ...newRequest, purpose: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              type="number"
              placeholder="Amount needed (₹)"
              className="fld"
              value={newRequest.amount}
              onChange={(e) => setNewRequest({ ...newRequest, amount: e.target.value })}
            />
            <input
              required
              type="date"
              className="fld"
              value={newRequest.deadline}
              onChange={(e) => setNewRequest({ ...newRequest, deadline: e.target.value })}
            />
          </div>
          <p className="text-xs text-ink-soft flex items-center gap-1.5">
            <Clock size={12} /> This draft stays in this browser session and is not delivered to a provider.
          </p>
          <PrimaryButton type="submit" className="w-full">
            Submit request
          </PrimaryButton>
        </form>
      </Modal>

      <style>{`.fld { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }`}</style>
    </div>
  );
}
