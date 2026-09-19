import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { PrimaryButton, GhostButton, Badge } from "../../components/ui";
import { useApp } from "../../context/AppContext";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball", "Cricket"];
const SKILLS = ["Beginner", "Intermediate", "Advanced"];
const SLOTS = ["Weekday Mornings", "Weekday Evenings", "Sunday Morning", "Weekend Evenings"];

export default function Onboarding() {
  const { role, completeOnboarding } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [playerData, setPlayerData] = useState({
    location: "",
    sports: [],
    skill: {},
    availability: [],
    preference: "Competitive",
  });

  const [orgData, setOrgData] = useState({
    name: "",
    location: "",
    type: "Turf & Court Operator",
    verify: false,
  });

  const toggle = (arr, val) => (arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const finish = () => {
    completeOnboarding();
    navigate("/app/dashboard");
  };

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
            <NextRow onNext={() => setStep(1)} disabled={!orgData.name || !orgData.location} />
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">
              Only verified organisations can publish turf/venue listings (BR-02). Submit for verification now, or
              continue and finish later from your dashboard.
            </p>
            <button
              onClick={() => setOrgData({ ...orgData, verify: true })}
              className={`w-full flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                orgData.verify ? "border-turf bg-turf-light" : "border-ink/15"
              }`}
            >
              <CheckCircle2 className={orgData.verify ? "text-turf" : "text-ink-soft"} />
              <div>
                <p className="font-semibold text-sm">Submit for verification</p>
                <p className="text-xs text-ink-soft">Email + phone verification workflow (FR-05)</p>
              </div>
            </button>
            <div className="flex justify-between pt-2">
              <GhostButton onClick={() => setStep(0)}>Back</GhostButton>
              <PrimaryButton onClick={finish}>Go to dashboard</PrimaryButton>
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
          <NextRow onNext={() => setStep(1)} disabled={!playerData.location || playerData.sports.length === 0} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft mb-1">Skill level per sport (FR-06)</p>
          {playerData.sports.map((s) => (
            <Field key={s} label={s}>
              <div className="flex gap-2">
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
          <Field label="When are you usually free? (FR-07)">
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
                <Chip key={p} active={playerData.preference === p} onClick={() => setPlayerData({ ...playerData, preference: p })}>
                  {p}
                </Chip>
              ))}
            </div>
          </Field>
          <div className="flex justify-between pt-2">
            <GhostButton onClick={() => setStep(1)}>Back</GhostButton>
            <PrimaryButton onClick={finish} disabled={playerData.availability.length === 0}>
              Go to dashboard
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

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">{label}</p>
      {children}
    </div>
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
