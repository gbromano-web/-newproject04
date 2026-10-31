"use client";

import { useEffect, useRef, useState } from "react";
import { PHOTOS, photoSrcSet, photoUrl, type PhotoKey } from "@/lib/ph/photos";
import { SCENES, type SceneKey } from "./scenes";

/**
 * A full-bleed photograph with its matching illustration underneath.
 * The illustration shows while the photo loads and stays if the photo
 * cannot be reached (offline, CDN outage, blocked network).
 */
export function ScenePhoto({
  photo,
  scene,
  uid,
  sizes = "100vw",
  priority = false,
}: {
  /** Optional: without a photo the illustration is the picture */
  photo?: PhotoKey;
  scene: SceneKey;
  uid: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const img = useRef<HTMLImageElement>(null);

  // A cached photo can finish loading before React hydrates and attaches onLoad
  useEffect(() => {
    const el = img.current;
    if (el?.complete) setState(el.naturalWidth > 0 ? "loaded" : "failed");
  }, []);
  const p = photo ? PHOTOS[photo] : null;
  const Scene = SCENES[scene];
  if (!p) return <div className="absolute inset-0"><Scene uid={uid} /></div>;

  return (
    <div className="absolute inset-0">
      {state !== "loaded" && <Scene uid={uid} />}
      {state !== "failed" && (
        // Plain <img> with an Unsplash srcset: the CDN resizes and picks
        // AVIF/WebP itself, so next/image's optimiser would only add a hop.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          src={photoUrl(p, 1600)}
          srcSet={photoSrcSet(p)}
          sizes={sizes}
          alt={p.alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
          style={{ objectPosition: p.position ?? "center" }}
        />
      )}
    </div>
  );
}
