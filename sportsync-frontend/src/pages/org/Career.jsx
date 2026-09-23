import { useEffect, useMemo, useState } from "react";
import { SectionHeading, Badge, PrimaryButton, Modal, EmptyState } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import CareerArticle from "../../components/CareerArticle";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball"];
const emptyForm = { title: "", sport: "Football", type: "Trial", minRating: 0, stipend: "", location: "", description: "", article: "", deadline: "" };

export default function OrgCareer() {
  const { session, currentOrganisation, careerRequests, demoCatalog, demoLoading, demoError } = useApp();
  const token = session.accessToken;
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!token) return;
    let active = true;
    Promise.all([api.getCareerOpportunities(token), api.getCareerApplications(token)])
      .then(([list, applied]) => { if (active) { setOpportunities(list.opportunities || []); setApplications(applied.applications || []); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  const mine = opportunities.filter((item) => item.orgId === currentOrganisation.id);
  const filtered = useMemo(() => demoCatalog.players.filter((player) => (sport === "All" || player.sports.includes(sport)) && player.rating >= minRating).sort((a, b) => b.rating - a.rating), [demoCatalog.players, sport, minRating]);
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const result = await api.createCareerOpportunity(token, form);
      setOpportunities((old) => [result.opportunity, ...old]); setOpen(false); setForm(emptyForm);
      setMessage("Opportunity published. Players with confirmed account emails can apply.");
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const download = async (application) => {
    setError("");
    try {
      const blob = await api.downloadCareerCv(token, application.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = application.cvName; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.message); }
  };
  return <div>
    <SectionHeading eyebrow="Career" title="Career & recruitment" action={<PrimaryButton onClick={() => setOpen(true)}>Publish opportunity</PrimaryButton>} />
    <p className="text-sm text-ink-soft mb-5">Publish a role with clear requirements, location, terms and a deadline. Applicant CVs are private to your organisation.</p>
    {error && <p role="alert" className="rounded-xl bg-clay-light text-clay-deep p-3 mb-4">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-turf-light text-turf-deep p-3 mb-4">{message}</p>}
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      <section><h2 className="font-display text-2xl mb-3">Applicants</h2>
        {loading ? <p role="status">Loading applications…</p> : applications.length === 0 ? <EmptyState title="No applications yet" body="Publish an opportunity so players can apply with a CV and confirmed account email." /> : <div className="space-y-3">{applications.map((item) => <article key={item.id} className="bg-white rounded-2xl p-4 stitch-border">
          <h3 className="font-semibold">{item.opportunityTitle}</h3><p className="text-sm text-ink-soft mt-1">Applicant email: {item.email} · Confirmed when submitted</p>
          <p className="text-sm whitespace-pre-wrap mt-2">{item.statement}</p><p className="text-xs text-ink-soft mt-2">{item.status} · {new Date(item.createdAt).toLocaleDateString()}</p>
          <button type="button" onClick={() => download(item)} className="mt-2 text-sm font-semibold text-turf underline">Download {item.cvName}</button>
        </article>)}</div>}
        <h2 className="font-display text-2xl mt-8 mb-3">Sample player pool</h2>
        <p className="text-xs text-ink-soft mb-3">{demoCatalog.players.length} fictional demo profiles from the shared catalog. These are not applicant records or verified performance. Ratings are illustrative.</p>
        {demoLoading && <p role="status" className="text-sm text-ink-soft mb-3">Loading sample players…</p>}
        {demoError && <p role="status" className="text-sm text-clay-deep mb-3">Sample players unavailable: {demoError}</p>}
        <div className="flex gap-2 flex-wrap mb-3"><label className="text-sm">Sport <select className="fld ml-2" value={sport} onChange={(event) => setSport(event.target.value)}><option>All</option>{SPORTS.map((name) => <option key={name}>{name}</option>)}</select></label><label className="text-sm">Rating <select className="fld ml-2" value={minRating} onChange={(event) => setMinRating(Number(event.target.value))}>{[0, 1300, 1400, 1500].map((value) => <option key={value} value={value}>{value || "Any"}</option>)}</select></label></div>
        {!demoLoading && !demoError && (filtered.length === 0 ? <EmptyState title="No sample players match" body="Widen your filters." /> : <div className="grid sm:grid-cols-2 gap-3">{filtered.map((player) => <div key={player.id} className="bg-white rounded-xl p-4 stitch-border"><p className="font-semibold">{player.name} <Badge tone="gold">Sample</Badge></p><p className="text-xs text-ink-soft">{player.location} · {player.sports.join(", ")} · Illustrative rating {player.rating}</p></div>)}</div>)}
      </section>
      <aside><h2 className="font-display text-2xl mb-3">Your published roles</h2>{mine.length ? <div className="space-y-3">{mine.map((item) => <article key={item.id} className="bg-white rounded-2xl p-4 stitch-border"><h3 className="font-semibold">{item.title}</h3><p className="text-sm text-ink-soft">{item.sport} · {item.location} · Deadline {item.deadline}</p><Badge tone="turf">{item.status}</Badge>{item.article && <details className="mt-3"><summary className="text-sm font-semibold cursor-pointer">Read organisation article</summary><CareerArticle content={item.article} /></details>}</article>)}</div> : <p className="text-sm text-ink-soft">No roles published from this account yet.</p>}<h2 className="font-display text-xl mt-7 mb-2">Local player request drafts</h2><p className="text-xs text-ink-soft mb-2">Prototype drafts created in this browser session; they are not delivered applications.</p>{careerRequests.length ? careerRequests.map((item) => <p key={item.id} className="text-sm bg-white rounded-xl p-3 stitch-border mb-2">{item.title} · {item.sport} · {item.details}</p>) : <p className="text-sm text-ink-soft">No local request drafts.</p>}</aside>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title="Publish career opportunity" widthClass="max-w-lg">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-semibold" htmlFor="org-career-title">Role title</label><input id="org-career-title" className="fld w-full" required minLength={8} maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <div className="grid sm:grid-cols-2 gap-3"><div><label className="block text-sm font-semibold" htmlFor="org-career-sport">Sport</label><select id="org-career-sport" className="fld w-full" value={form.sport} onChange={(event) => setForm({ ...form, sport: event.target.value })}>{SPORTS.map((name) => <option key={name}>{name}</option>)}</select></div><div><label className="block text-sm font-semibold" htmlFor="org-career-type">Opportunity type</label><input id="org-career-type" className="fld w-full" required minLength={3} maxLength={60} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></div></div>
        <div className="grid sm:grid-cols-2 gap-3"><div><label className="block text-sm font-semibold" htmlFor="org-career-rating">Suggested minimum rating</label><input id="org-career-rating" type="number" min="0" max="3000" className="fld w-full" value={form.minRating} onChange={(event) => setForm({ ...form, minRating: event.target.value })} /></div><div><label className="block text-sm font-semibold" htmlFor="org-career-stipend">Pay or benefits</label><input id="org-career-stipend" className="fld w-full" maxLength={120} value={form.stipend} onChange={(event) => setForm({ ...form, stipend: event.target.value })} /></div></div>
        <label className="block text-sm font-semibold" htmlFor="org-career-location">Work or trial location</label><input id="org-career-location" className="fld w-full" required minLength={3} maxLength={160} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        <label className="block text-sm font-semibold" htmlFor="org-career-deadline">Application deadline</label><input id="org-career-deadline" type="date" min={new Date().toISOString().slice(0, 10)} className="fld w-full" required value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
        <label className="block text-sm font-semibold" htmlFor="org-career-description">Role, requirements and application details</label><textarea id="org-career-description" className="fld w-full" rows={7} required minLength={80} maxLength={10000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <label className="block text-sm font-semibold" htmlFor="org-career-article">Organisation article (optional, 80–12,000 characters)</label><p className="text-xs text-ink-soft">Use # for headings, **bold**, - for bullet lines, and [label](https://example.com) for links.</p><textarea id="org-career-article" className="fld w-full" rows={6} minLength={form.article ? 80 : undefined} maxLength={12000} value={form.article} onChange={(event) => setForm({ ...form, article: event.target.value })} />{form.article && <div className="rounded-xl bg-paper-dim p-3"><p className="text-xs font-bold uppercase text-ink-soft mb-2">Preview</p><CareerArticle content={form.article} /></div>}
        <PrimaryButton type="submit" disabled={saving}>Publish role</PrimaryButton>
      </form>
    </Modal>
  </div>;
}
