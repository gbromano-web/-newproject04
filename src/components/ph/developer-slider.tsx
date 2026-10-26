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
          <h2 id="dev-heading" className="text-2xl font-bold text-[#14214f] sm:text-3xl">Featured developers</h2>
          <p className="mt-1 text-sm text-slate-600">New projects from partner developers, with DHSUD License to Sell numbers shown on each project.</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button onClick={() => scroll(-1)} className="rounded-full border border-slate-300 p-2 text-slate-700 hover:bg-slate-100" aria-label="Previous"><ChevronLeft className="size-4" /></button>
          <button onClick={() => scroll(1)} className="rounded-full border border-slate-300 p-2 text-slate-700 hover:bg-slate-100" aria-label="Next"><ChevronRight className="size-4" /></button>
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
            className="flex h-56 w-[85%] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center sm:w-[48%] lg:w-[32%]"
          >
            <Building2 className="size-7 text-slate-400" />
            <p className="font-semibold text-slate-600">Developer slot available</p>
            <p className="max-w-[24ch] text-sm text-slate-500">This space shows a partner developer&apos;s project once a banner is added.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
