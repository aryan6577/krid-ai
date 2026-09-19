import { useMemo, useState } from "react";
import { Briefcase, Mail, Pencil, Sparkles, Plus, CheckCheck, Clock } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, GhostButton, EmptyState, Modal } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { rankCareerOpportunities } from "../../lib/ai";

export default function Career() {
  const {
    currentPlayer,
    careerOpportunities,
    appliedCareerIds,
    applyToCareer,
    careerRequests,
    submitCareerRequest,
    careerProfile,
    updateCareerProfile,
  } = useApp();

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(careerProfile);

  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState({ title: "", sport: currentPlayer.sports[0] || "", details: "" });
  const [justSubmitted, setJustSubmitted] = useState(false);

  const ranked = useMemo(() => rankCareerOpportunities(currentPlayer, careerOpportunities), [currentPlayer, careerOpportunities]);

  const saveProfile = () => {
    updateCareerProfile(draft);
    setEditOpen(false);
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    submitCareerRequest(request);
    setRequestOpen(false);
    setRequest({ title: "", sport: currentPlayer.sports[0] || "", details: "" });
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 4000);
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Career Module"
        title="Career opportunities"
        action={
          <PrimaryButton className="flex items-center gap-2" onClick={() => setRequestOpen(true)}>
            <Plus size={16} /> Raise a career request
          </PrimaryButton>
        }
      />
      <p className="text-sm text-ink-soft max-w-2xl mb-6">
        Opportunities below are AI-ranked against your sports and current rating — a match, not a guaranteed
        selection.
      </p>

      {justSubmitted && (
        <div className="mb-6 bg-turf-light text-turf-deep rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCheck size={16} /> Your career request was submitted and is now under review.
        </div>
      )}

      {/* Small "blog" about the player, with contact email */}
      <div className="bg-white rounded-2xl p-6 stitch-border mb-8">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-gold text-turf-deep font-display text-lg flex items-center justify-center shrink-0">
              {currentPlayer.avatar}
            </span>
            <div>
              <p className="font-display text-xl tracking-wide">{currentPlayer.name}</p>
              <p className="text-xs text-ink-soft flex items-center gap-1.5 mt-0.5">
                <Mail size={12} /> {careerProfile.email}
              </p>
            </div>
          </div>
          <GhostButton
            className="!px-4 !py-2 text-sm flex items-center gap-1.5 shrink-0"
            onClick={() => {
              setDraft(careerProfile);
              setEditOpen(true);
            }}
          >
            <Pencil size={14} /> Edit
          </GhostButton>
        </div>
        {!editOpen ? (
          <p className="text-sm text-ink-soft max-w-2xl">{careerProfile.blog}</p>
        ) : (
          <div className="space-y-3">
            <textarea
              className="w-full px-4 py-2.5 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-turf text-sm"
              rows={4}
              value={draft.blog}
              onChange={(e) => setDraft({ ...draft, blog: e.target.value })}
              placeholder="A short blog about yourself — sports, goals, what you're looking for"
            />
            <input
              type="email"
              className="w-full px-4 py-2.5 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-turf text-sm"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="Contact email for recruiters"
            />
            <div className="flex gap-2">
              <PrimaryButton className="!px-4 !py-2 text-sm" onClick={saveProfile}>Save</PrimaryButton>
              <GhostButton className="!px-4 !py-2 text-sm" onClick={() => setEditOpen(false)}>Cancel</GhostButton>
            </div>
          </div>
        )}
      </div>

      {careerRequests.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Your career requests</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {careerRequests.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-4 stitch-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">{r.title || "Untitled request"}</p>
                  <Badge tone="gold">{r.status}</Badge>
                </div>
                <p className="text-xs text-ink-soft mb-2">{r.sport}</p>
                <p className="text-xs text-ink-soft">{r.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">
        Opportunities matched to your performance
      </p>
      {ranked.length === 0 ? (
        <EmptyState title="No opportunities yet" body="Check back soon for new career opportunities from organisations." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {ranked.map(({ opportunity: o, score, eligible, reasons }) => {
            const applied = appliedCareerIds.includes(o.id);
            return (
              <div key={o.id} className="bg-white rounded-2xl p-5 stitch-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-display text-lg tracking-wide flex items-center gap-2">
                      <Briefcase size={16} className="text-turf" /> {o.title}
                    </p>
                    <Badge tone={score >= 75 ? "turf" : score >= 50 ? "gold" : "neutral"}>{score}% match</Badge>
                  </div>
                  <p className="text-xs text-ink-soft mb-2">{o.orgName} · {o.location}</p>
                  <p className="text-sm text-ink-soft mb-2">{o.description}</p>
                  <p className="text-xs text-ink-soft mb-3">
                    {o.type} · {o.stipend} · Min rating {o.minRating} · Deadline {o.deadline}
                  </p>
                  <div className="space-y-1 mb-3">
                    {reasons.map((r, i) => (
                      <p key={i} className="text-xs flex items-center gap-1.5 text-clay">
                        <Sparkles size={11} /> {r}
                      </p>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {o.tags?.map((t) => (
                      <Badge key={t} tone="neutral">{t}</Badge>
                    ))}
                  </div>
                </div>
                {applied ? (
                  <GhostButton disabled className="!border-turf !text-turf w-full flex items-center justify-center gap-2 !cursor-default">
                    <CheckCheck size={15} /> Joined
                  </GhostButton>
                ) : (
                  <PrimaryButton className="w-full" onClick={() => applyToCareer(o.id)} disabled={!eligible}>
                    {eligible ? "Join" : "Below requirement"}
                  </PrimaryButton>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title="Raise a new career request">
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">What are you looking for?</p>
            <input
              required
              className="fld"
              placeholder="e.g. Semi-pro football trials near Koramangala"
              value={request.title}
              onChange={(e) => setRequest({ ...request, title: e.target.value })}
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Sport</p>
            <select
              className="fld"
              value={request.sport}
              onChange={(e) => setRequest({ ...request, sport: e.target.value })}
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
              placeholder="Tell organisations more about what you're after"
              value={request.details}
              onChange={(e) => setRequest({ ...request, details: e.target.value })}
            />
          </div>
          <p className="text-xs text-ink-soft flex items-center gap-1.5">
            <Clock size={12} /> Requests are typically reviewed within 5–7 business days.
          </p>
          <PrimaryButton type="submit" className="w-full">Submit request</PrimaryButton>
        </form>
      </Modal>

      <style>{`.fld { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }`}</style>
    </div>
  );
}
