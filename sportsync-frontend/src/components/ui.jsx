import { X } from "lucide-react";

export function Badge({ children, tone = "turf" }) {
  const tones = {
    turf: "bg-turf-light text-turf-deep",
    clay: "bg-clay-light text-clay-deep",
    gold: "bg-gold-light text-[#7A5A0E]",
    navy: "bg-navy-light text-navy",
    neutral: "bg-paper-dim text-ink-soft",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ScoreboardStat({ label, value, suffix, tone = "ink" }) {
  const tones = {
    ink: "text-ink",
    turf: "text-turf",
    clay: "text-clay",
    gold: "text-[#8A6511]",
  };
  return (
    <div className="bg-turf-deep rounded-xl px-4 py-3 min-w-[110px]">
      <p className="text-[10px] uppercase tracking-widest text-white/60 font-semibold mb-1">{label}</p>
      <p className={`scoreboard text-2xl font-bold text-white`}>
        {value}
        {suffix && <span className="text-sm ml-0.5 text-white/70">{suffix}</span>}
      </p>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay mb-1">{eyebrow}</p>}
        <h2 className="font-display text-2xl md:text-3xl tracking-wide text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="stitch-border rounded-2xl py-14 px-6 text-center bg-white/60">
      <p className="font-display text-xl tracking-wide text-ink mb-1">{title}</p>
      <p className="text-sm text-ink-soft max-w-sm mx-auto mb-4">{body}</p>
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children, widthClass = "max-w-md" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className={`bg-paper rounded-2xl w-full ${widthClass} shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10 sticky top-0 bg-paper">
          <h3 className="font-display text-xl tracking-wide">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-ink/10 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function ProgressBar({ value, tone = "turf" }) {
  const tones = { turf: "bg-turf", clay: "bg-clay", gold: "bg-gold" };
  return (
    <div className="w-full h-2 rounded-full bg-ink/10 overflow-hidden">
      <div className={`h-full ${tones[tone]} rounded-full transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`bg-clay hover:bg-clay-deep text-white font-semibold px-5 py-2.5 rounded-full transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      className={`border-2 border-ink/15 hover:border-turf hover:text-turf text-ink font-semibold px-5 py-2.5 rounded-full transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
