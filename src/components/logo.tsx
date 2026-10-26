export function Logo({ inverted = false }: { inverted?: boolean }) {
  const fg = inverted ? "#fff" : "var(--color-creek-700)";
  return (
    <span className="flex items-center gap-2">
      {/* Mark: a doorway arch over a horizon line */}
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <rect width="30" height="30" rx="8" fill={fg} />
        <path d="M9 23V14a6 6 0 0 1 12 0v9" stroke={inverted ? "var(--color-creek-700)" : "#fff"} strokeWidth="2.6" fill="none" />
        <path d="M6 23h18" stroke="var(--color-date-500)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight" style={{ color: fg }}>
        SA Realty
      </span>
    </span>
  );
}
