// Mark: a roofline over the horizon, with the sun setting into the sea.
export function Logo({ inverted = false }: { inverted?: boolean }) {
  const fg = inverted ? "#fff" : "var(--color-sea-900)";
  return (
    <span className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <path d="M4 13.5 15 5l11 8.5" stroke={fg} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 21a5.5 5.5 0 0 1 11 0" fill="var(--color-mango-500)" />
        <path d="M4 21h22" stroke={fg} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M8 25h14" stroke="var(--color-lagoon-500)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="text-[19px] font-bold tracking-[-0.03em]" style={{ color: fg }}>
        SA Realty
      </span>
    </span>
  );
}
