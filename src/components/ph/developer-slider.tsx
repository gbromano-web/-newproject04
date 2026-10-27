"use client";

import { useRef } from "react";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";

export interface DeveloperSlide {
  id: string;
  developerName: string;
  projectName: string;
  imageUrl: string;
  ctaUrl: string;
}

/**
 * Promotional slider fed by HeroBanner rows with placement = DEVELOPER_SLIDER.
 * No developers are signed yet, so it renders empty slots that show where
 * sponsored projects will appear.
 */
export function DeveloperSlider({ slides, emptySlots = 3 }: { slides: DeveloperSlide[]; emptySlots?: number }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section aria-labelledby="dev-heading" className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="dev-heading" className="text-[28px] font-bold leading-tight text-sea-950 sm:text-4xl">Featured developers</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">New projects from partner developers, each showing its DHSUD License to Sell number.</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button onClick={() => scroll(-1)} className="rounded-full border border-line p-2 text-sea-800 hover:bg-lagoon-50" aria-label="Previous"><ChevronLeft className="size-4" /></button>
          <button onClick={() => scroll(1)} className="rounded-full border border-line p-2 text-sea-800 hover:bg-lagoon-50" aria-label="Next"><ChevronRight className="size-4" /></button>
        </div>
      </div>

      <div ref={track} className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {slides.map((s) => (
          <a key={s.id} href={s.ctaUrl} className="relative h-56 w-[85%] shrink-0 snap-start overflow-hidden rounded-2xl sm:w-[48%] lg:w-[32%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-4 text-white">
              <p className="text-sm opacity-90">{s.developerName}</p>
              <p className="text-lg font-bold">{s.projectName}</p>
            </div>
          </a>
        ))}
        {Array.from({ length: Math.max(0, emptySlots - slides.length) }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="flex h-56 w-[85%] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-sea-100 bg-sea-50 text-center sm:w-[48%] lg:w-[32%]"
          >
            <span className="grid size-11 place-items-center rounded-full bg-white text-sea-700 ring-1 ring-line"><Building2 className="size-5" /></span>
            <p className="font-semibold text-sea-900">Developer slot available</p>
            <p className="max-w-[24ch] text-sm text-ink-soft">This space shows a partner developer&apos;s project once a banner is added.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
