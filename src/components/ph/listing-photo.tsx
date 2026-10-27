"use client";

import { useEffect, useRef, useState } from "react";
import { PHOTOS, photoSrcSet, photoUrl, type PhotoKey } from "@/lib/ph/photos";

/**
 * Listing photo with a local placeholder underneath. The placeholder shows
 * while the photo loads and stays if the photo cannot be reached.
 * Production listings use agent uploads from storage instead of Unsplash.
 */
export function ListingPhoto({ photo, fallbackSrc, sizes }: { photo: PhotoKey; fallbackSrc: string; sizes: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const img = useRef<HTMLImageElement>(null);
  const p = PHOTOS[photo];

  useEffect(() => {
    const el = img.current;
    if (el?.complete) setState(el.naturalWidth > 0 ? "loaded" : "failed");
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {state !== "loaded" && <img src={fallbackSrc} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />}
      {state !== "failed" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          src={photoUrl(p, 800)}
          srcSet={photoSrcSet(p)}
          sizes={sizes}
          alt={p.alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
          className={`absolute inset-0 size-full object-cover transition-[opacity,transform] duration-700 group-hover:scale-[1.03] ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </>
  );
}
