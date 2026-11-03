import type { CountryCode } from "@/lib/markets";

/** Small national flags drawn as SVG, so they look the same on every system (emoji flags do not show on Windows). */
export function Flag({ code, className = "h-3.5 w-5" }: { code: CountryCode; className?: string }) {
  if (code === "AE") {
    return (
      <svg viewBox="0 0 12 6" className={`${className} shrink-0 rounded-[2px] ring-1 ring-black/10`} aria-hidden>
        <rect width="12" height="2" fill="#00732F" />
        <rect y="2" width="12" height="2" fill="#FFFFFF" />
        <rect y="4" width="12" height="2" fill="#000000" />
        <rect width="3" height="6" fill="#FF0000" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 6" className={`${className} shrink-0 rounded-[2px] ring-1 ring-black/10`} aria-hidden>
      <rect width="12" height="3" fill="#0038A8" />
      <rect y="3" width="12" height="3" fill="#CE1126" />
      <path d="M0 0 L5.2 3 L0 6 Z" fill="#FFFFFF" />
      <circle cx="1.75" cy="3" r="0.7" fill="#FCD116" />
      <circle cx="0.55" cy="0.75" r="0.28" fill="#FCD116" />
      <circle cx="0.55" cy="5.25" r="0.28" fill="#FCD116" />
      <circle cx="4.3" cy="3" r="0.28" fill="#FCD116" />
    </svg>
  );
}
