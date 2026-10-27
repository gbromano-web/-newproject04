"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MapPin, Pause, Play } from "lucide-react";
import clsx from "clsx";
import { PHOTOS, type PhotoKey } from "@/lib/ph/photos";
import { ScenePhoto } from "./scene-photo";
import type { SceneKey } from "./scenes";

export interface HeroSlide {
  photo: PhotoKey; // production: HeroBanner.imageKey from Supabase Storage
  scene: SceneKey; // illustration shown while the photo loads, or if it fails
  place: string;
  note: string;
}

export const DEFAULT_SLIDES: HeroSlide[] = [
  { photo: "elNido", scene: "lagoon", place: "El Nido, Palawan", note: "Beach lots and resort homes" },
  { photo: "bgc", scene: "city", place: "Bonifacio Global City, Taguig", note: "Condos close to work" },
  { photo: "batad", scene: "terraces", place: "Batad, Banaue, Ifugao", note: "Cool-climate homes in the Cordilleras" },
  { photo: "mayon", scene: "volcano", place: "Mayon Volcano, Albay", note: "House and lot with mountain views" },
  { photo: "chocolateHills", scene: "hills", place: "Chocolate Hills, Bohol", note: "Retirement and vacation homes" },
];

const SLIDE_MS = 7000;

export function ScenicHero({ slides = DEFAULT_SLIDES, children }: { slides?: HeroSlide[]; children: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, playing, slides.length]);

  const slide = slides[index];
  const credit = PHOTOS[slide.photo];

  return (
    <section className="relative isolate overflow-hidden bg-sea-950" aria-roledescription="carousel" aria-label="Philippine destinations">
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0 -z-20"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: reduce ? 1.02 : 1.1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.2, ease: "easeInOut" }, scale: { duration: SLIDE_MS / 1000 + 1.5, ease: "linear" } }}
        >
          <ScenePhoto photo={slide.photo} scene={slide.scene} uid={`hero-${slide.scene}`} priority={index === 0} />
        </motion.div>
      </AnimatePresence>
      {/* Readability: darken top for the headline and bottom for the controls */}
      <div className="grain absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,29,43,.55)_0%,rgba(7,29,43,.15)_38%,rgba(7,29,43,.25)_62%,rgba(7,29,43,.75)_100%)]" />

      <div className="relative mx-auto flex min-h-[680px] max-w-7xl flex-col justify-center px-4 pb-28 pt-16 sm:px-6">{children}</div>

      {/* Caption and controls */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-4 px-4 pb-6 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.place}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3 text-white"
              aria-live="polite"
            >
              <span className="grid size-8 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-md"><MapPin className="size-4" /></span>
              <span className="leading-tight">
                <span className="block text-sm font-bold">{slide.place}</span>
                <span className="block text-xs text-white/80">
                  {slide.note}
                  <span className="hidden sm:inline">
                    {". Photo: "}
                    <a href={credit.profileUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/40 underline-offset-2 hover:decoration-white">{credit.photographer}</a>
                    {" on Unsplash"}
                  </span>
                </span>
              </span>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.place}
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${s.place}`}
                  aria-current={i === index}
                  className={clsx("relative h-1.5 overflow-hidden rounded-full bg-white/35 transition-all", i === index ? "w-10" : "w-4 hover:bg-white/60")}
                >
                  {i === index && (
                    <motion.span
                      key={`${index}-${playing}`}
                      className="absolute inset-y-0 left-0 bg-white"
                      initial={{ width: playing ? "0%" : "100%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: playing ? SLIDE_MS / 1000 : 0, ease: "linear" }}
                    />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="grid size-8 place-items-center rounded-full bg-sea-950/45 text-white backdrop-blur-md hover:bg-sea-950/70"
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
