import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PrimaryButton } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { BrandMark, BrandWordmark } from "../../components/Brand";

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login, register } = useApp();
  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const payloadFromForm = () => {
    const identifier = form.identifier.trim();
    return identifier.includes("@")
      ? { email: identifier, password: form.password }
      : { phone: identifier, password: form.password };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    setSubmitting(true);
    try {
      if (mode === "register") {
        const data = await register(payloadFromForm());
        if (!data.accessToken) {
          setStatus("Account created. Confirm your email or phone in Supabase Auth, then log in.");
          return;
        }
        navigate("/onboarding");
        return;
      }

      const data = await login(payloadFromForm());
      navigate(data.profile?.role ? "/app/dashboard" : "/onboarding");
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
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

        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor="auth-identifier" className="block text-sm font-semibold">Email address or phone</label>
          <input
            id="auth-identifier"
            required
            placeholder="Email address or phone"
            className="w-full px-4 py-2.5 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-turf text-sm"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
          />
          <label htmlFor="auth-password" className="block text-sm font-semibold">Password</label>
          <input
            id="auth-password"
            required
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2.5 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-turf text-sm"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          {error && <p role="alert" className="text-sm text-clay-deep bg-clay-light rounded-xl px-3 py-2">{error}</p>}
          {status && <p role="status" className="text-sm text-turf-deep bg-turf-light rounded-xl px-3 py-2">{status}</p>}

          <PrimaryButton type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 mt-2">
            {mode === "login" ? "Log in" : "Create account"} <ArrowRight size={16} />
          </PrimaryButton>
        </form>

        <p className="text-xs text-ink-soft/70 text-center mt-5">
          Role selection happens after first login and can only be completed once per account.
        </p>
      </div>
    </div>
  );
}
