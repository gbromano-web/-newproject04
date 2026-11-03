"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Pause, Play } from "lucide-react";
import clsx from "clsx";
import { PHOTOS, type PhotoKey } from "@/lib/ph/photos";
import { ScenePhoto } from "./scene-photo";
import type { SceneKey } from "./scenes";

export interface HeroSlide {
  photo?: PhotoKey; // production: HeroBanner.imageKey from Supabase Storage; omitted = illustration only
  scene: SceneKey; // illustration shown while the photo loads, or if it fails
  place: string;
  note: string;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  { photo: "elNido", scene: "lagoon", place: "El Nido, Palawan", note: "Beach lots and resort homes" },
  { photo: "bgc", scene: "city", place: "Bonifacio Global City, Taguig", note: "Condos close to work" },
  { photo: "batad", scene: "terraces", place: "Batad, Banaue, Ifugao", note: "Cool-climate homes in the Cordilleras" },
  { photo: "mayon", scene: "volcano", place: "Mayon Volcano, Albay", note: "House and lot with mountain views" },
  { photo: "chocolateHills", scene: "hills", place: "Chocolate Hills, Bohol", note: "Retirement and vacation homes" },
];

const SLIDE_MS = 7000;
const FADE_MS = 1200; // keep in step with .hero-slide-enter in globals.css

/**
 * Full-bleed photo slideshow behind the home page search. Transitions are plain
 * CSS (globals.css, "Home hero slideshow"), so the page ships no animation
 * library. Only the current photo and, while it fades in, the previous one are
 * in the page, so photos load one at a time.
 */
export function ScenicHero({ slides = DEFAULT_SLIDES, label = "Philippine destinations", children }: { slides?: HeroSlide[]; label?: string; children: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [changed, setChanged] = useState(false); // the first photo appears without a fade
  const [playing, setPlaying] = useState(true);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = (next: number) => {
    if (next === index) return;
    setPrevious(index);
    setIndex(next);
    setChanged(true);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setPrevious(null), FADE_MS + 100);
  };

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => show((index + 1) % slides.length), SLIDE_MS);
    return () => clearTimeout(t);
    // show() only depends on index, which is listed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playing, slides.length]);

  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  const slide = slides[index];
  const credit = slide.photo ? PHOTOS[slide.photo] : null;
  const layers = previous === null ? [index] : [previous, index];

  return (
    <section className="relative isolate overflow-hidden bg-sea-950" aria-roledescription="carousel" aria-label={label}>
      {layers.map((i) => (
        <div key={i} className={clsx("absolute inset-0 -z-20", i === index && changed ? "hero-slide-enter" : "hero-slide")}>
          <ScenePhoto photo={slides[i].photo} scene={slides[i].scene} uid={`hero-${slides[i].scene}`} priority={i === 0} />
        </div>
      ))}
      {/* Readability: darken top for the headline and bottom for the controls */}
      <div className="grain absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,29,43,.55)_0%,rgba(7,29,43,.15)_38%,rgba(7,29,43,.25)_62%,rgba(7,29,43,.75)_100%)]" />

      <div className="relative mx-auto flex min-h-[680px] max-w-7xl flex-col justify-center px-4 pb-28 pt-16 sm:px-6">{children}</div>

      {/* Caption and controls */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-4 px-4 pb-6 sm:px-6">
          <div key={slide.place} className={clsx("flex items-center gap-3 text-white", changed && "hero-caption")} aria-live="polite">
            <span className="grid size-8 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-md"><MapPin className="size-4" /></span>
            <span className="leading-tight">
              <span className="block text-sm font-bold">{slide.place}</span>
              <span className="block text-xs text-white/80">
                {slide.note}
                {credit && (
                  <span className="hidden sm:inline">
                    {". Photo: "}
                    <a href={credit.profileUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/40 underline-offset-2 hover:decoration-white">{credit.photographer}</a>
                    {" on Unsplash"}
                  </span>
                )}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.place}
                  onClick={() => show(i)}
                  aria-label={`Show ${s.place}`}
                  aria-current={i === index}
                  className={clsx("relative h-1.5 overflow-hidden rounded-full bg-white/35 transition-all", i === index ? "w-10" : "w-4 hover:bg-white/60")}
                >
                  {i === index && (
                    <span
                      key={`${index}-${playing}`}
                      className={clsx("absolute inset-y-0 left-0 w-full bg-white", playing && "hero-progress")}
                      style={playing ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
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
