"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MapPin, Pause, Play } from "lucide-react";
import clsx from "clsx";
import { SCENES, type SceneKey } from "./scenes";

export interface HeroSlide {
  scene: SceneKey; // production: HeroBanner.imageKey rendered with next/image
  place: string;
  note: string;
}

export const DEFAULT_SLIDES: HeroSlide[] = [
  { scene: "lagoon", place: "El Nido, Palawan", note: "Beach lots and resort homes" },
  { scene: "city", place: "Bonifacio Global City, Taguig", note: "Condos close to work" },
  { scene: "terraces", place: "Banaue, Ifugao", note: "Cool-climate homes in the Cordilleras" },
  { scene: "volcano", place: "Mayon Volcano, Albay", note: "House and lot with mountain views" },
  { scene: "hills", place: "Chocolate Hills, Bohol", note: "Retirement and vacation homes" },
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
  const Scene = SCENES[slide.scene];

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
          <Scene uid={`hero-${slide.scene}`} />
        </motion.div>
      </AnimatePresence>
      {/* Readability: darken top for the headline and bottom for the controls */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sea-950/45 via-transparent to-sea-950/55" />

      <div className="relative mx-auto flex min-h-[640px] max-w-7xl flex-col justify-center px-4 pb-28 pt-16 sm:px-6">{children}</div>

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
              className="flex items-center gap-3 rounded-full bg-sea-950/45 py-1.5 pl-2 pr-4 text-white backdrop-blur-md"
              aria-live="polite"
            >
              <span className="grid size-8 place-items-center rounded-full bg-lagoon-500"><MapPin className="size-4" /></span>
              <span className="leading-tight">
                <span className="block text-sm font-bold">{slide.place}</span>
                <span className="block text-xs text-white/80">{slide.note}</span>
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
                      className="absolute inset-y-0 left-0 bg-mango-400"
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
