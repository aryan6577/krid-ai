import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Bot, CalendarDays, Compass, LogOut, MapPin, Save, Trash2, Users } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, GhostButton, ProgressBar } from "../components/ui";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball", "Cricket"];
const SKILLS = ["Beginner", "Intermediate", "Advanced"];
const SLOTS = ["Weekday Mornings", "Weekday Evenings", "Sunday Morning", "Weekend Evenings"];
const ORG_TYPES = ["Turf & Court Operator", "Sports Academy", "Community Club", "Event Organiser"];

export default function Profile() {
  const {
    role,
    currentPlayer,
    currentOrganisation,
    logout,
    updatePlayerProfile,
    updateOrganisationProfile,
    deleteProfile,
    session,
  } = useApp();
  const navigate = useNavigate();
  const isOrg = role === "organisation";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [alternativeSports, setAlternativeSports] = useState(null);

  const [playerDraft, setPlayerDraft] = useState(() => ({
    name: currentPlayer.name || "",
    location: currentPlayer.location || "",
    sports: currentPlayer.sports || [],
    skill: currentPlayer.skill || {},
    availability: currentPlayer.availability || [],
    preferences: {
      competitivePreference: currentPlayer.preferences?.competitivePreference || currentPlayer.competitivePreference || "Competitive",
      timezone: currentPlayer.preferences?.timezone || "UTC",
    },
  }));

  const [orgDraft, setOrgDraft] = useState(() => ({
    name: currentOrganisation.name || "",
    contact: currentOrganisation.contact || { email: "", phone: "" },
    location: currentOrganisation.location || "",
    type: currentOrganisation.type || ORG_TYPES[0],
    verificationStatus: currentOrganisation.verificationStatus || currentOrganisation.verification || "Pending",
  }));

  const display = isOrg ? currentOrganisation : currentPlayer;
  const avatar = isOrg ? currentOrganisation.avatar : currentPlayer.avatar;

  const contactLines = useMemo(() => {
    const contact = isOrg ? currentOrganisation.contact : currentPlayer.contact;
    if (!contact || typeof contact === "string") return [contact].filter(Boolean);
    return [contact.email, contact.phone].filter(Boolean);
  }, [currentOrganisation.contact, currentPlayer.contact, isOrg]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    let cancelled = false;
    async function loadAlternativeSports() {
      try {
        const data = await api.getAlternativeSports(session.accessToken, {
          primarySport: currentPlayer.sports?.[0],
          limit: 5,
        });
        if (!cancelled) setAlternativeSports(data);
      } catch {
        if (!cancelled) setAlternativeSports(null);
      }
    }
    if (!isOrg && session.accessToken && currentPlayer.sports?.[0]) loadAlternativeSports();
    return () => {
      cancelled = true;
    };
  }, [currentPlayer.sports, isOrg, session.accessToken]);

  const save = async () => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      if (isOrg) {
        await updateOrganisationProfile(orgDraft);
      } else {
        await updatePlayerProfile(playerDraft);
      }
      setEditing(false);
      setMessage("Profile saved.");
    } catch (err) {
      setError(err.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const confirmed = window.confirm("Delete this role profile? Your account will return to onboarding.");
    if (!confirmed) return;
    setError("");
    setSaving(true);
    try {
      await deleteProfile();
      navigate("/onboarding");
    } catch (err) {
      setError(err.message || "Could not delete profile.");
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Account"
        title="Your profile"
        action={
          <div className="flex gap-2 flex-wrap">
            {!isOrg && (
              <GhostButton
                className="flex items-center gap-1.5"
                onClick={() => window.dispatchEvent(new Event("open-krid-assistant"))}
              >
                <Bot size={15} /> AI Assistant
              </GhostButton>
            )}
            <GhostButton className="flex items-center gap-1.5" onClick={handleLogout}>
              <LogOut size={15} /> Log out
            </GhostButton>
          </div>
        }
      />

      <div className="bg-white rounded-2xl p-6 stitch-border mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <span className="w-20 h-20 rounded-full bg-gold text-turf-deep font-display text-2xl flex items-center justify-center shrink-0">
            {avatar}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-2xl tracking-wide">{display.name}</p>
              <Badge tone={isOrg ? "turf" : "navy"}>{isOrg ? display.verification : "Player"}</Badge>
            </div>
            <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1">
              <MapPin size={14} /> {display.location || "No location set"}
            </p>
            {!isOrg && <p className="text-xs text-ink-soft/70 mt-1">{currentPlayer.sports?.join(" · ") || "Add your sports to get better matches and recommendations."}</p>}
          </div>
          <div className="flex gap-2 self-start">
            <GhostButton className="!px-4 !py-2 text-sm" onClick={() => setEditing((value) => !value)}>
              {editing ? "Cancel" : "Edit"}
            </GhostButton>
            <GhostButton className="!px-4 !py-2 text-sm flex items-center gap-1.5 text-clay-deep" onClick={remove} disabled={saving}>
              <Trash2 size={14} /> Delete
            </GhostButton>
          </div>
        </div>

        {message && <p className="text-sm text-turf-deep bg-turf-light rounded-xl px-3 py-2 mt-5">{message}</p>}
        {error && <p className="text-sm text-clay-deep bg-clay-light rounded-xl px-3 py-2 mt-5">{error}</p>}
      </div>

      {!isOrg && <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[ ["/app/performance", Activity, "Performance", "Training and match history"], ["/app/friends", Users, "Teammates", "Friends and requests"], ["/app/calendar", CalendarDays, "Activity calendar", "Your consistency at a glance"] ].map(([to, Icon, title, detail]) => <Link key={to} to={to} className="flex items-center gap-3 rounded-xl bg-white border border-ink/10 p-4 hover:bg-turf-light transition"><Icon size={20} className="text-turf" /><span><strong className="block text-sm">{title}</strong><small className="text-ink-soft">{detail}</small></span></Link>)}
      </div>}

      {editing ? (
        isOrg ? (
          <OrganisationEditor draft={orgDraft} setDraft={setOrgDraft} onSave={save} saving={saving} />
        ) : (
          <PlayerEditor draft={playerDraft} setDraft={setPlayerDraft} onSave={save} saving={saving} />
        )
      ) : isOrg ? (
        <OrganisationRead profile={currentOrganisation} contactLines={contactLines} />
      ) : (
        <PlayerRead profile={currentPlayer} contactLines={contactLines} alternativeSports={alternativeSports} />
      )}
    </div>
  );
}

function PlayerRead({ profile, contactLines, alternativeSports }) {
  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Contact">
          {contactLines.length ? contactLines.map((line) => <p key={line} className="text-sm">{line}</p>) : <p className="text-sm text-ink-soft">No contact saved.</p>}
        </Panel>
        <Panel title="Sports & skill">
          <div className="space-y-3">
            {profile.sports.map((sport) => (
              <div key={sport}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{sport}</span>
                  <span className="text-xs text-ink-soft">{profile.skill?.[sport]}</span>
                </div>
                <ProgressBar value={profile.skill?.[sport] === "Advanced" ? 90 : profile.skill?.[sport] === "Intermediate" ? 60 : 30} tone="turf" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Availability">
          <ChipList items={profile.availability || []} />
        </Panel>
        <Panel title="Preferences">
          <ChipList items={[profile.preferences?.competitivePreference || profile.competitivePreference].filter(Boolean)} />
        </Panel>
      </div>
      <AlternativeSportsResults data={alternativeSports} />
    </>
  );
}

function AlternativeSportsResults({ data }) {
  const recommendations = data?.recommendations || [];
  if (!recommendations.length) return null;

  return (
    <div className="bg-white rounded-2xl p-5 stitch-border mt-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-1">Sports You Might Like</p>
          <h3 className="font-display text-2xl tracking-wide">Adjacent sports from {data.primarySport}</h3>
          <p className="text-sm text-ink-soft mt-1">{data.disclaimer}</p>
        </div>
        <Compass className="text-turf shrink-0" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {recommendations.map((item) => (
          <div key={item.sport} className="rounded-xl bg-paper-dim p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl tracking-wide">{item.sport}</p>
                <p className="text-xs text-ink-soft mt-1">{item.framing}</p>
              </div>
              <Badge tone="turf">{item.score}% shared</Badge>
            </div>
            <p className="text-sm mt-3">{item.rationale}</p>
            <div className="space-y-2 mt-4">
              {item.similarityFactors.map((factor) => (
                <div key={factor.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold">{factor.label}</span>
                    <span className="text-ink-soft">source {factor.sourceValue} · candidate {factor.candidateValue}</span>
                  </div>
                  <ProgressBar value={Math.min(100, factor.contribution * 70)} tone="gold" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {item.preferenceSignals.map((signal) => <Badge key={signal} tone="neutral">{signal}</Badge>)}
            </div>
            {item.opportunitySignals.length ? (
              <div className="mt-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Opportunity sources</p>
                {item.opportunitySignals.map((source) => (
                  <a
                    key={`${source.provider}-${source.url}`}
                    className="block text-sm font-semibold text-turf"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-soft mt-4">Nearby opportunity signals are not attached yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrganisationRead({ profile, contactLines }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel title="Contact">
        {contactLines.length ? contactLines.map((line) => <p key={line} className="text-sm">{line}</p>) : <p className="text-sm text-ink-soft">No contact saved.</p>}
      </Panel>
      <Panel title="Organisation">
        <p className="text-sm font-semibold">{profile.type}</p>
        <p className="text-sm text-ink-soft mt-2">Verification status: {profile.verification}</p>
      </Panel>
    </div>
  );
}

function PlayerEditor({ draft, setDraft, onSave, saving }) {
  const toggle = (arr, val) => (arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  return (
    <div className="bg-white rounded-2xl p-6 stitch-border space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Full name">
          <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Location">
          <input className="input" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
        </Field>
      </div>
      <Field label="Sports">
        <ToggleGrid items={SPORTS} active={draft.sports} onToggle={(sport) => setDraft({ ...draft, sports: toggle(draft.sports, sport) })} />
      </Field>
      <div className="grid md:grid-cols-2 gap-4">
        {draft.sports.map((sport) => (
          <Field key={sport} label={`${sport} skill`}>
            <select className="input" value={draft.skill[sport] || ""} onChange={(e) => setDraft({ ...draft, skill: { ...draft.skill, [sport]: e.target.value } })}>
              <option value="">Choose skill</option>
              {SKILLS.map((skill) => <option key={skill}>{skill}</option>)}
            </select>
          </Field>
        ))}
      </div>
      <Field label="Availability">
        <ToggleGrid items={SLOTS} active={draft.availability} onToggle={(slot) => setDraft({ ...draft, availability: toggle(draft.availability, slot) })} />
      </Field>
      <Field label="Preference">
        <select
          className="input"
          value={draft.preferences.competitivePreference}
          onChange={(e) => setDraft({ ...draft, preferences: { ...draft.preferences, competitivePreference: e.target.value } })}
        >
          <option>Competitive</option>
          <option>Friendly</option>
        </select>
      </Field>
      <Field label="Local time zone (IANA name, for daily streaks)">
        <input className="input" value={draft.preferences.timezone} onChange={(e) => setDraft({ ...draft, preferences: { ...draft.preferences, timezone: e.target.value } })} placeholder="Asia/Kolkata" />
      </Field>
      <PrimaryButton onClick={onSave} disabled={saving} className="flex items-center gap-2">
        <Save size={16} /> Save player profile
      </PrimaryButton>
      <InputStyle />
    </div>
  );
}

function OrganisationEditor({ draft, setDraft, onSave, saving }) {
  return (
    <div className="bg-white rounded-2xl p-6 stitch-border space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Organisation name">
          <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Location">
          <input className="input" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
        </Field>
        <Field label="Contact email">
          <input className="input" value={draft.contact.email || ""} onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, email: e.target.value } })} />
        </Field>
        <Field label="Contact phone">
          <input className="input" value={draft.contact.phone || ""} onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, phone: e.target.value } })} />
        </Field>
        <Field label="Organisation type">
          <select className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            {ORG_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
        <p className="text-sm text-ink-soft">Verification status: {draft.verificationStatus}. An administrator manages this status.</p>
      </div>
      <PrimaryButton onClick={onSave} disabled={saving} className="flex items-center gap-2">
        <Save size={16} /> Save organisation profile
      </PrimaryButton>
      <InputStyle />
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-white rounded-2xl p-5 stitch-border">
      <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function ToggleGrid({ items, active, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onToggle(item)}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border-2 transition ${
            active.includes(item) ? "bg-turf border-turf text-white" : "border-ink/15 text-ink-soft"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function ChipList({ items }) {
  if (!items.length) return <p className="text-sm text-ink-soft">Nothing saved yet.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => <Badge key={item} tone="turf">{item}</Badge>)}
    </div>
  );
}

function InputStyle() {
  return (
    <style>{`.input { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }`}</style>
  );
}
