"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Grid2x2, X } from "lucide-react";
import clsx from "clsx";
import { resolvePhoto, type ListingImage } from "@/lib/ph/photos";
import { ListingPhoto } from "./listing-photo";

/** Mosaic on desktop, swipeable single photo on phones, full-screen viewer for both. */
export function PropertyGallery({ photos, title }: { photos: ListingImage[]; title: string }) {
  const [viewer, setViewer] = useState<number | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);
  const go = (d: number) => setViewer((i) => (i === null ? i : (i + d + photos.length) % photos.length));

  useEffect(() => {
    if (viewer === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewer(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const [main, ...rest] = photos;

  return (
    <>
      {/* Desktop mosaic */}
      <div className={clsx("relative hidden h-[480px] gap-2 overflow-hidden rounded-3xl md:grid", rest.length ? "grid-cols-[2fr_1fr]" : "grid-cols-1")}>
        <button onClick={() => setViewer(0)} className="group relative overflow-hidden bg-mist" aria-label={`Open photo 1 of ${photos.length}`}>
          <ListingPhoto photo={main} priority sizes="(min-width: 1280px) 860px, 66vw" />
        </button>
        {rest.length > 0 && (
          <div className={clsx("grid gap-2", rest.length > 1 ? "grid-rows-2" : "grid-rows-1")}>
            {rest.slice(0, 2).map((p, i) => (
              <button key={i} onClick={() => setViewer(i + 1)} className="group relative overflow-hidden bg-mist" aria-label={`Open photo ${i + 2} of ${photos.length}`}>
                <ListingPhoto photo={p} sizes="430px" />
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setViewer(0)} className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-sea-950 shadow-md backdrop-blur hover:bg-white">
          <Grid2x2 className="size-4" /> Show all {photos.length} photos
        </button>
      </div>

      {/* Phone: one photo at a time */}
      <div className="relative -mx-4 aspect-[4/3] overflow-hidden bg-mist md:hidden">
        <button onClick={() => setViewer(mobileIndex)} className="absolute inset-0" aria-label="Open photo viewer">
          <ListingPhoto key={mobileIndex} photo={photos[mobileIndex]} priority sizes="100vw" />
        </button>
        {photos.length > 1 && (
          <>
            <button onClick={() => setMobileIndex((i) => (i - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow" aria-label="Previous photo"><ChevronLeft className="size-5" /></button>
            <button onClick={() => setMobileIndex((i) => (i + 1) % photos.length)} className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow" aria-label="Next photo"><ChevronRight className="size-5" /></button>
          </>
        )}
        <span className="absolute bottom-3 right-3 rounded-full bg-sea-950/70 px-2.5 py-1 text-xs font-semibold text-white">{mobileIndex + 1} / {photos.length}</span>
      </div>

      {/* Full-screen viewer */}
      {viewer !== null && (
        <div role="dialog" aria-modal="true" aria-label={`${title} photos`} className="fixed inset-0 z-[60] flex flex-col bg-sea-950">
          <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
            <p className="text-sm font-semibold">{viewer + 1} / {photos.length}</p>
            <p className="hidden max-w-md truncate text-sm text-white/70 sm:block">{resolvePhoto(photos[viewer]).alt}</p>
            <button onClick={() => setViewer(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close photos"><X className="size-5" /></button>
          </div>
          <div className="relative flex-1">
            <ListingPhoto key={viewer} photo={photos[viewer]} fit="contain" sizes="100vw" />
            {photos.length > 1 && (
              <>
                <button onClick={() => go(-1)} className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-sea-950 shadow-lg" aria-label="Previous photo"><ChevronLeft className="size-5" /></button>
                <button onClick={() => go(1)} className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-sea-950 shadow-lg" aria-label="Next photo"><ChevronRight className="size-5" /></button>
              </>
            )}
          </div>
          {/* Credit only for stock photos; agents' own uploads need none */}
          {(() => {
            const p = resolvePhoto(photos[viewer]);
            return p.upload ? null : (
              <p className="px-6 py-3 text-center text-xs text-white/50">
                Photo: <a href={p.profileUrl} target="_blank" rel="noopener noreferrer" className="underline">{p.photographer}</a> on Unsplash
              </p>
            );
          })()}
        </div>
      )}
    </>
  );
}
