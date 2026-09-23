import { useEffect, useMemo, useState } from "react";
import { SectionHeading, Badge, PrimaryButton, EmptyState, Modal } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { rankCareerOpportunities } from "../../lib/ai";
import { careerOpportunities as demoOpportunities } from "../../data/career";
import { api } from "../../lib/api";
import CareerArticle from "../../components/CareerArticle";

const readCv = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Could not read the CV file."));
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.readAsDataURL(file);
});

export default function Career() {
  const { currentPlayer, session, careerRequests, submitCareerRequest } = useApp();
  const token = session.accessToken;
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState({ article: "", email: "", emailVerified: false });
  const [article, setArticle] = useState("");
  const [selected, setSelected] = useState(null);
  const [statement, setStatement] = useState("");
  const [cv, setCv] = useState(null);
  const [emailCode, setEmailCode] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState({ title: "", sport: "Football", details: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!token) return;
    let active = true;
    Promise.all([api.getCareerOpportunities(token), api.getCareerProfile(token), api.getCareerApplications(token)])
      .then(([list, own, applied]) => {
        if (!active) return;
        setOpportunities(list.opportunities || []); setProfile(own); setArticle(own.article || ""); setApplications(applied.applications || []);
      }).catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  const ranked = useMemo(() => rankCareerOpportunities(currentPlayer, [...opportunities, ...demoOpportunities.map((item) => ({ ...item, demo: true }))]), [currentPlayer, opportunities]);

  const saveArticle = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      await api.saveCareerProfile(token, { article });
      setProfile((old) => ({ ...old, article }));
      setMessage("Career article saved.");
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const apply = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      if (!cv || cv.size > 750 * 1024) throw new Error("Choose a PDF or DOCX CV no larger than 750 KB.");
      const type = cv.type || (cv.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const result = await api.applyToCareerOpportunity(token, selected.id, { statement, cv: { name: cv.name, type, base64: await readCv(cv) } });
      setApplications((old) => [result.application, ...old]); setSelected(null); setStatement(""); setCv(null);
      setMessage("Application received. Your verified account email and CV were saved privately.");
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const requestCode = async () => {
    setError("");
    try { const result = await api.requestCareerEmailProof(token); setMessage(result.message); }
    catch (err) { setError(err.message); }
  };
  const verifyCode = async (event) => {
    event.preventDefault(); setError("");
    try { const result = await api.verifyCareerEmailProof(token, emailCode); setProfile((old) => ({ ...old, ...result })); setEmailCode(""); setMessage("Account email verified for career applications."); }
    catch (err) { setError(err.message); }
  };

  return <div>
    <SectionHeading eyebrow="Career" title="Career opportunities" action={<PrimaryButton onClick={() => setRequestOpen(true)}>Career request</PrimaryButton>} />
    <p className="text-sm text-ink-soft mb-5">Published opportunities and sample listings. Matching is advisory; confirm requirements with the organisation.</p>
    {error && <p role="alert" className="rounded-xl bg-clay-light text-clay-deep p-3 mb-4">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-turf-light text-turf-deep p-3 mb-4">{message}</p>}
    <section className="bg-white rounded-2xl p-5 md:p-6 stitch-border mb-7" aria-labelledby="career-article-heading">
      <h2 id="career-article-heading" className="font-display text-2xl">Your career article</h2>
      <p className="text-sm text-ink-soft mt-1 mb-4">Describe your sports background, experience and goals. Use # headings, **bold**, - bullet lines, and HTTPS links; 80–12,000 characters.</p>
      <form onSubmit={saveArticle} className="space-y-3">
        <label className="block text-sm font-semibold" htmlFor="career-article">Article</label>
        <textarea id="career-article" className="fld w-full" rows={7} required minLength={80} maxLength={12000} value={article} onChange={(e) => setArticle(e.target.value)} />
        {article && <div className="rounded-xl bg-paper-dim p-3"><p className="text-xs font-bold uppercase text-ink-soft mb-2">Article preview</p><CareerArticle content={article} /></div>}
        <p className="text-sm text-ink-soft">Contact: {profile.email || "No account email"} · {profile.emailVerified ? "Email code verified" : "Email ownership not verified"}</p>
        {!profile.emailVerified && <button type="button" onClick={requestCode} className="text-sm font-semibold text-turf underline">Send one-time email code</button>}
        <div><PrimaryButton type="submit" disabled={saving}>Save article</PrimaryButton></div>
      </form>
      {!profile.emailVerified && <form onSubmit={verifyCode} className="flex flex-wrap items-end gap-2 mt-4"><label htmlFor="career-email-code" className="text-sm font-semibold">Six-digit email code</label><input id="career-email-code" className="fld" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={emailCode} onChange={(event) => setEmailCode(event.target.value)} /><PrimaryButton type="submit">Verify email</PrimaryButton></form>}
    </section>
    {careerRequests.length > 0 && <section className="mb-7"><h2 className="font-display text-xl mb-2">Career requests on this device</h2><p className="text-xs text-ink-soft mb-3">These prototype requests are local drafts and are not delivered to organisations.</p>{careerRequests.map((item) => <p key={item.id} className="bg-white rounded-xl p-3 stitch-border mb-2">{item.title} · {item.sport}</p>)}</section>}
    <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Opportunities</h2>
    {loading ? <p role="status">Loading career records…</p> : ranked.length === 0 ? <EmptyState title="No opportunities yet" body="Check back when organisations publish new opportunities." /> : <div className="grid sm:grid-cols-2 gap-4">{ranked.map(({ opportunity: item, score, reasons }) => {
      const applied = applications.find((application) => application.opportunityId === item.id);
      return <article key={item.id} className="bg-white rounded-2xl p-5 stitch-border flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2"><h3 className="font-display text-xl">{item.title}</h3><Badge tone={item.demo ? "gold" : "turf"}>{item.demo ? "Sample" : "Published"}</Badge></div>
        <p className="text-sm text-ink-soft">{item.orgName} · {item.location} · {item.sport}</p>{!item.demo && !item.organisationVerified && <p className="text-xs text-clay-deep">Organisation verification pending; check the publisher before sharing additional information.</p>}<p className="text-sm whitespace-pre-wrap">{item.description}</p>
        {item.article && <details className="rounded-xl bg-paper-dim p-3"><summary className="font-semibold text-sm cursor-pointer">Read organisation article</summary><CareerArticle content={item.article} /></details>}
        <p className="text-xs text-ink-soft">{item.type} · {item.stipend || "Terms on request"} · Deadline {item.deadline} · Indicative match {score}%</p>
        <p className="text-xs text-ink-soft">{reasons.join(" · ")}</p>
        {applied ? <p className="text-sm font-semibold text-turf">Application {applied.status}</p> : item.demo ? <p className="text-xs text-ink-soft">Sample listing: applications are unavailable.</p> : <PrimaryButton onClick={() => { setSelected(item); setError(""); }} disabled={!profile.emailVerified || !profile.article}>{!profile.emailVerified ? "Confirm email to apply" : !profile.article ? "Save article to apply" : "Apply with CV"}</PrimaryButton>}
      </article>;
    })}</div>}
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Apply: ${selected.title}` : "Apply"}>
      <form onSubmit={apply} className="space-y-4">
        <label className="block text-sm font-semibold" htmlFor="career-statement">Application statement</label><textarea id="career-statement" className="fld w-full" required minLength={40} maxLength={3000} rows={5} value={statement} onChange={(e) => setStatement(e.target.value)} />
        <label className="block text-sm font-semibold" htmlFor="career-cv">CV or resume (PDF or DOCX, 750 KB maximum)</label><input id="career-cv" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required onChange={(e) => setCv(e.target.files?.[0] || null)} />
        <p className="text-xs text-ink-soft">Your CV, statement and confirmed account email are available only to the posting organisation.</p><PrimaryButton type="submit" disabled={saving}>Submit application</PrimaryButton>
      </form>
    </Modal>
    <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title="Career request">
      <form onSubmit={(event) => { event.preventDefault(); submitCareerRequest(request); setRequestOpen(false); setRequest({ title: "", sport: "Football", details: "" }); setMessage("Request saved for this session. It has not been sent to an organisation."); }} className="space-y-3">
        <p className="text-xs text-ink-soft">Prototype draft only; organisations cannot review this request yet.</p>
        <label className="block text-sm font-semibold" htmlFor="career-request-title">What are you looking for?</label><input id="career-request-title" className="fld w-full" required value={request.title} onChange={(e) => setRequest({ ...request, title: e.target.value })} />
        <label className="block text-sm font-semibold" htmlFor="career-request-sport">Sport</label><select id="career-request-sport" className="fld w-full" value={request.sport} onChange={(e) => setRequest({ ...request, sport: e.target.value })}>{["Football", "Badminton", "Tennis", "Basketball"].map((sport) => <option key={sport}>{sport}</option>)}</select>
        <label className="block text-sm font-semibold" htmlFor="career-request-details">Details</label><textarea id="career-request-details" className="fld w-full" required rows={3} value={request.details} onChange={(e) => setRequest({ ...request, details: e.target.value })} /><PrimaryButton type="submit">Save request draft</PrimaryButton>
      </form>
    </Modal>
  </div>;
}
