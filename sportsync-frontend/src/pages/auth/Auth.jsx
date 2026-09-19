import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { User, Building2, ArrowRight } from "lucide-react";
import { PrimaryButton } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { BrandMark, BrandWordmark } from "../../components/Brand";

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useApp();
  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
  const [role, setRole] = useState(params.get("role") === "organisation" ? "organisation" : "player");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Demo shortcut: logging in with an organisation demo email lands on the org dashboard,
    // even without picking a role (login mode has no role selector shown).
    const demoOrgEmails = ["org@sportsync.ai", "org@krid.ai"];
    const isOrgDemoLogin = mode === "login" && demoOrgEmails.includes(form.email.trim().toLowerCase());
    const effectiveRole = isOrgDemoLogin ? "organisation" : role;
    login(effectiveRole);
    navigate(mode === "register" ? "/onboarding" : "/app/dashboard");
  };

  return (
    <div className="min-h-screen bg-turf-deep pitch-lines flex items-center justify-center px-4 py-10">
      <div className="bg-paper rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <Link to="/" className="flex items-center gap-2 mb-6 text-ink">
          <BrandMark className="w-7 h-7" tone="green" />
          <BrandWordmark className="text-lg" accentClassName="text-clay" />
        </Link>

        <div className="flex bg-paper-dim rounded-full p-1 mb-6">
          {["login", "register"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-full text-sm font-semibold capitalize transition ${
                mode === m ? "bg-white shadow text-turf-deep" : "text-ink-soft"
              }`}
            >
              {m === "login" ? "Log in" : "Create account"}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">I am a...</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("player")}
                className={`rounded-xl p-4 border-2 text-left transition ${
                  role === "player" ? "border-turf bg-turf-light" : "border-ink/10"
                }`}
              >
                <User className="mb-2 text-turf" size={20} />
                <p className="font-semibold text-sm">Player</p>
                <p className="text-xs text-ink-soft">Find games & venues</p>
              </button>
              <button
                type="button"
                onClick={() => setRole("organisation")}
                className={`rounded-xl p-4 border-2 text-left transition ${
                  role === "organisation" ? "border-turf bg-turf-light" : "border-ink/10"
                }`}
              >
                <Building2 className="mb-2 text-turf" size={20} />
                <p className="font-semibold text-sm">Organisation</p>
                <p className="text-xs text-ink-soft">List venues & fundraise</p>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <input
              required
              placeholder={role === "organisation" ? "Organisation name" : "Full name"}
              className="w-full px-4 py-2.5 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-turf text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          )}
          <input
            required
            type="email"
            placeholder="Email address"
            className="w-full px-4 py-2.5 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-turf text-sm"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {mode === "register" && (
            <input
              placeholder="Phone number"
              className="w-full px-4 py-2.5 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-turf text-sm"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          )}
          <input
            required
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2.5 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-turf text-sm"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <PrimaryButton type="submit" className="w-full flex items-center justify-center gap-2 mt-2">
            {mode === "login" ? "Log in" : "Create account"} <ArrowRight size={16} />
          </PrimaryButton>
        </form>

        <p className="text-xs text-ink-soft/70 text-center mt-5">
          Prototype auth — no real credentials required. Passwords are never stored in this demo.
        </p>
        {mode === "login" && (
          <p className="text-xs text-turf-deep bg-turf-light rounded-lg px-3 py-2 text-center mt-3">
            Demo tip: log in with <strong>org@sportsync.ai</strong> (any password) to land on the Organisation dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
