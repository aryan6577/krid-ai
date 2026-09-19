// Shared brand mark + wordmark used across the header, landing page and auth screen.
// Kept as one component so the "Krid.ai" wordmark can never pick up a stray flex
// gap between "Krid" and ".ai" again (that was the old bug: the words were separate
// flex children, so Tailwind's `gap-2` inserted space between them).

export function BrandMark({ className = "w-8 h-8", tone = "green" }) {
  const gradId = tone === "green" ? "krid-mark-green" : "krid-mark-orange";
  const gradStops =
    tone === "green"
      ? ["#155033", "#0A2A1B"]
      : ["#EA7A42", "#C9591F"];
  const stroke = "#F5F6F0";
  const accent = tone === "green" ? "var(--color-clay)" : "var(--color-gold)";

  return (
    <svg
      viewBox="0 0 32 32"
      className={`${className} shrink-0 drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={gradStops[0]} />
          <stop offset="1" stopColor={gradStops[1]} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradId})`} />
      {/* Geometric "K" built from strokes, styled like a sprint/split mark */}
      <path d="M11 6.5V25.5" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <path d="M11.6 16.3 21.6 6.6" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <path d="M11.6 16.6 22.1 26" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      {/* Ball accent, nods to the sport focus */}
      <circle cx="23.6" cy="6.1" r="2.5" fill={accent} />
    </svg>
  );
}

export function BrandWordmark({ className = "text-xl", accentClassName = "text-clay" }) {
  return (
    <span className={`font-display tracking-normal whitespace-nowrap ${className}`}>
      Krid<span className={accentClassName}>.ai</span>
    </span>
  );
}
