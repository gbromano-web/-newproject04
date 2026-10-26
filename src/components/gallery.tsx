"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, LayoutPanelLeft } from "lucide-react";
import clsx from "clsx";

export function Gallery({ images, floorPlan, title }: { images: string[]; floorPlan?: string; title: string }) {
  const [tab, setTab] = useState<"photos" | "plan">("photos");
  const [i, setI] = useState(0);
  const go = (d: number) => setI((x) => (x + d + images.length) % images.length);
  const src = tab === "plan" && floorPlan ? floorPlan : images[i];

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-mist">
        <Image src={src} alt={tab === "plan" ? `${title} floor plan` : `${title}, photo ${i + 1}`} fill priority sizes="(min-width: 1024px) 66vw, 100vw" className={tab === "plan" ? "object-contain" : "object-cover"} />
        {tab === "photos" && images.length > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white" aria-label="Previous photo"><ChevronLeft className="size-5" /></button>
            <button onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white" aria-label="Next photo"><ChevronRight className="size-5" /></button>
            <span className="absolute bottom-3 right-3 rounded-md bg-ink/75 px-2 py-0.5 text-xs font-semibold text-white">{i + 1} / {images.length}</span>
          </>
        )}
        <div className="absolute bottom-3 left-3 flex gap-1 rounded-lg bg-white/95 p-1 text-sm font-semibold shadow">
          <button onClick={() => setTab("photos")} className={clsx("flex items-center gap-1.5 rounded-md px-3 py-1", tab === "photos" ? "bg-creek-700 text-white" : "text-ink-soft")}>
            <Images className="size-4" /> Photos
          </button>
          {floorPlan && (
            <button onClick={() => setTab("plan")} className={clsx("flex items-center gap-1.5 rounded-md px-3 py-1", tab === "plan" ? "bg-creek-700 text-white" : "text-ink-soft")}>
              <LayoutPanelLeft className="size-4" /> Floor plan
            </button>
          )}
        </div>
      </div>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => { setTab("photos"); setI(idx); }}
            className={clsx("relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2", tab === "photos" && idx === i ? "ring-creek-500" : "ring-transparent opacity-80 hover:opacity-100")}
            aria-label={`Show photo ${idx + 1}`}
          >
            <Image src={img} alt="" fill sizes="96px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
