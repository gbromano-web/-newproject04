// Mark: a roof line over a setting sun and a wave, the shoreline view the
// brand is built around.
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill={inverted ? "#fff" : "var(--color-sea-800)"} />
        <circle cx="16" cy="19" r="6" fill="var(--color-mango-500)" />
        <path d="M5 21.5c2.2 0 2.2-1.6 4.4-1.6s2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6 2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6" stroke="var(--color-lagoon-400)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M7 25.5h18" stroke={inverted ? "var(--color-sea-800)" : "#fff"} strokeWidth="2" strokeLinecap="round" opacity=".55" />
        <path d="M8 13.5 16 7l8 6.5" stroke={inverted ? "var(--color-sea-800)" : "#fff"} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`font-display text-xl font-bold tracking-tight ${inverted ? "text-white" : "text-sea-800"}`}>SA Realty</span>
    </span>
  );
}
