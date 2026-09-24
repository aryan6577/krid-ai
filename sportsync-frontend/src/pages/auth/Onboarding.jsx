import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, User } from "lucide-react";
import { PrimaryButton, GhostButton, Badge } from "../../components/ui";
import { useApp } from "../../context/AppContext";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball", "Cricket"];
const SKILLS = ["Beginner", "Intermediate", "Advanced"];
const SLOTS = ["Weekday Mornings", "Weekday Evenings", "Sunday Morning", "Weekend Evenings"];

export default function Onboarding() {
  const { completeOnboarding } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [playerData, setPlayerData] = useState({
    name: "",
    location: "",
    sports: [],
    skill: {},
    availability: [],
    preferences: { competitivePreference: "Competitive", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" },
  });

  const [orgData, setOrgData] = useState({
    name: "",
    contact: { email: "", phone: "" },
    location: "",
    type: "Turf & Court Operator",
    verificationStatus: "Pending",
  });

  const toggle = (arr, val) => (arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const finish = async () => {
    setError("");
    setSaving(true);
    try {
      await completeOnboarding(role, role === "organisation" ? orgData : playerData);
      navigate("/app/dashboard");
    } catch (err) {
      setError(err.message || "Could not complete onboarding.");
    } finally {
      setSaving(false);
    }
  };

  if (!role) {
    return (
      <Shell title="Choose your Krid.ai role" step={0} total={1}>
        <p className="text-sm text-ink-soft mb-5">
          This choice is permanent for the account. The backend enforces one role per login.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <RoleCard icon={User} title="Player" body="Find games, train, and manage your profile." onClick={() => setRole("player")} />
          <RoleCard
            icon={Building2}
            title="Organisation"
            body="Manage organisation details and verification status."
            onClick={() => setRole("organisation")}
          />
        </div>
      </Shell>
    );
  }

  if (role === "organisation") {
    return (
      <Shell title="Set up your organisation" step={step} total={2}>
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Organisation name">
              <input
                className="input"
                value={orgData.name}
                onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                placeholder="e.g. Greenfield Sports Arena"
              />
            </Field>
            <Field label="Primary location">
              <input
                className="input"
                value={orgData.location}
                onChange={(e) => setOrgData({ ...orgData, location: e.target.value })}
                placeholder="Area, city"
              />
            </Field>
            <Field label="Organisation type">
              <select className="input" value={orgData.type} onChange={(e) => setOrgData({ ...orgData, type: e.target.value })}>
                <option>Turf & Court Operator</option>
                <option>Sports Academy</option>
                <option>Community Club</option>
                <option>Event Organiser</option>
              </select>
            </Field>
            <NextRow onBack={() => setRole(null)} onNext={() => setStep(1)} disabled={!orgData.name || !orgData.location} />
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <Field label="Contact email">
              <input
                className="input"
                value={orgData.contact.email}
                onChange={(e) => setOrgData({ ...orgData, contact: { ...orgData.contact, email: e.target.value } })}
                placeholder="ops@example.com"
              />
            </Field>
            <Field label="Contact phone">
              <input
                className="input"
                value={orgData.contact.phone}
                onChange={(e) => setOrgData({ ...orgData, contact: { ...orgData.contact, phone: e.target.value } })}
                placeholder="+91..."
              />
            </Field>
            <p className="text-sm text-ink-soft">Verification status: Pending. An administrator can update it after review.</p>
            {error && <p className="text-sm text-clay-deep bg-clay-light rounded-xl px-3 py-2">{error}</p>}
            <div className="flex justify-between pt-2">
              <GhostButton onClick={() => setStep(0)}>Back</GhostButton>
              <PrimaryButton onClick={finish} disabled={saving}>
                Save profile
              </PrimaryButton>
            </div>
          </div>
        )}
      </Shell>
    );
  }

  return (
    <Shell title="Set up your player profile" step={step} total={3}>
      {step === 0 && (
        <div className="space-y-4">
          <Field label="Full name">
            <input
              className="input"
              value={playerData.name}
              onChange={(e) => setPlayerData({ ...playerData, name: e.target.value })}
              placeholder="Your name"
            />
          </Field>
          <Field label="Your location">
            <input
              className="input"
              value={playerData.location}
              onChange={(e) => setPlayerData({ ...playerData, location: e.target.value })}
              placeholder="Area, city"
            />
          </Field>
          <Field label="Sports you play">
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((s) => (
                <Chip key={s} active={playerData.sports.includes(s)} onClick={() => setPlayerData({ ...playerData, sports: toggle(playerData.sports, s) })}>
                  {s}
                </Chip>
              ))}
            </div>
          </Field>
          <NextRow
            onBack={() => setRole(null)}
            onNext={() => setStep(1)}
            disabled={!playerData.name || !playerData.location || playerData.sports.length === 0}
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft mb-1">Skill level per sport</p>
          {playerData.sports.map((s) => (
            <Field key={s} label={s}>
              <div className="flex gap-2 flex-wrap">
                {SKILLS.map((sk) => (
                  <Chip
                    key={sk}
                    active={playerData.skill[s] === sk}
                    onClick={() => setPlayerData({ ...playerData, skill: { ...playerData.skill, [s]: sk } })}
                  >
                    {sk}
                  </Chip>
                ))}
              </div>
            </Field>
          ))}
          <NextRow onNext={() => setStep(2)} onBack={() => setStep(0)} disabled={playerData.sports.some((s) => !playerData.skill[s])} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="When are you usually free?">
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((s) => (
                <Chip key={s} active={playerData.availability.includes(s)} onClick={() => setPlayerData({ ...playerData, availability: toggle(playerData.availability, s) })}>
                  {s}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Competitive preference">
            <div className="flex gap-2">
              {["Competitive", "Friendly"].map((p) => (
                <Chip
                  key={p}
                  active={playerData.preferences.competitivePreference === p}
                  onClick={() => setPlayerData({ ...playerData, preferences: { ...playerData.preferences, competitivePreference: p } })}
                >
                  {p}
                </Chip>
              ))}
            </div>
          </Field>
          {error && <p className="text-sm text-clay-deep bg-clay-light rounded-xl px-3 py-2">{error}</p>}
          <div className="flex justify-between pt-2">
            <GhostButton onClick={() => setStep(1)}>Back</GhostButton>
            <PrimaryButton onClick={finish} disabled={saving || playerData.availability.length === 0}>
              Save profile
            </PrimaryButton>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ title, step, total, children }) {
  return (
    <div className="min-h-screen bg-turf-deep pitch-lines flex items-center justify-center px-4 py-10">
      <div className="bg-paper rounded-3xl w-full max-w-lg p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-5">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-clay" : "bg-ink/10"}`} />
          ))}
        </div>
        <Badge tone="turf">Step {step + 1} of {total}</Badge>
        <h1 className="font-display text-2xl tracking-wide mt-3 mb-6">{title}</h1>
        {children}
      </div>
      <style>{`.input { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function RoleCard({ icon: Icon, title, body, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl p-5 border-2 border-ink/10 text-left hover:border-turf hover:bg-turf-light transition">
      <Icon className="mb-3 text-turf" size={22} />
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-ink-soft mt-1">{body}</p>
    </button>
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

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border-2 transition ${
        active ? "bg-turf border-turf text-white" : "border-ink/15 text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

function NextRow({ onNext, onBack, disabled }) {
  return (
    <div className="flex justify-between pt-2">
      {onBack ? <GhostButton onClick={onBack}>Back</GhostButton> : <span />}
      <PrimaryButton onClick={onNext} disabled={disabled}>
        Continue
      </PrimaryButton>
    </div>
  );
}
