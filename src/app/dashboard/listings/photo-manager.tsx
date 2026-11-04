"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { photoUrl, resolvePhoto } from "@/lib/ph/photos";
import type { EditablePhoto } from "@/lib/server/listing-editor";
import { arrangePhoto, captionPhoto, removePhoto, uploadPhoto, type PhotoState } from "./actions";

const MAX_SIDE = 2560;
const MAX_BYTES = 3.8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Shrinks a photo in the browser before upload: phone photos are often 5-12 MB,
 * which is slow on mobile data and over the server's limit. Drawing to a canvas
 * also turns the photo upright and leaves its metadata (GPS, camera) behind;
 * the server re-checks and re-encodes it anyway.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    for (const [side, quality] of [[MAX_SIDE, 0.88], [2048, 0.8], [1600, 0.75]] as const) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (blob && blob.size <= MAX_BYTES) return blob;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("too large");
}

export function PhotoManager({ id, initial, max, canUpload }: { id: string; initial: EditablePhoto[]; max: number; canUpload: boolean }) {
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const apply = (r: PhotoState, name?: string) => {
    if (r.photos) setPhotos(r.photos);
    if (r.error) setErrors((e) => [...e, name ? `${name}: ${r.error}` : r.error!]);
  };

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setErrors([]);
    const list = Array.from(files).slice(0, Math.max(0, max - photos.length));
    if (list.length < files.length) setErrors([`Only ${max} photos per listing: ${files.length - list.length} not added.`]);
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setBusy(`Uploading ${i + 1} of ${list.length}…`);
      let blob: Blob;
      try {
        if (!ACCEPT.split(",").includes(file.type)) throw new Error("type");
        blob = await shrink(file);
      } catch {
        setErrors((e) => [...e, `${file.name}: use a JPEG, PNG or WebP photo (iPhone: Settings → Camera → Formats → Most Compatible).`]);
        continue;
      }
      const form = new FormData();
      form.set("id", id);
      form.set("photo", new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
      try {
        apply(await uploadPhoto(form), file.name);
      } catch {
        setErrors((e) => [...e, `${file.name}: the upload failed. Check your connection and try again.`]);
      }
    }
    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function run(label: string, fn: () => Promise<PhotoState>) {
    setBusy(label);
    setErrors([]);
    try {
      apply(await fn());
    } catch {
      setErrors(["That didn't work. Check your connection and try again."]);
    }
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      {canUpload ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-mist/40 px-6 py-8 text-center hover:border-lagoon-600 hover:bg-lagoon-50/40">
          <ImagePlus className="size-7 text-lagoon-600" />
          <span className="text-sm font-semibold text-sea-950">Add photos</span>
          <span className="text-xs text-ink-soft">JPEG, PNG or WebP, up to {max} per listing. The first photo is the cover. Location data is removed from every photo.</span>
          <input ref={inputRef} type="file" accept={ACCEPT} multiple className="sr-only" aria-label="Add photos" disabled={!!busy} onChange={(e) => upload(e.target.files)} />
        </label>
      ) : (
        <p className="rounded-xl bg-mango-300/20 px-4 py-3 text-sm text-mango-700">Photos can be added once your licence is verified.</p>
      )}

      <p role="status" aria-live="polite" className="text-sm text-ink-soft">{busy ?? `${photos.length} of ${max} photos`}</p>
      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      {photos.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Listing photos">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
              <div className="relative aspect-[4/3] bg-mist">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploads are already sized WebP files */}
                <img src={photoUrl(resolvePhoto(p.image), 640)} alt={p.caption ?? `Photo ${i + 1}`} className="size-full object-cover" loading="lazy" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-sea-950/80 px-2.5 py-1 text-xs font-semibold text-white">Cover</span>}
              </div>
              <div className="space-y-2 p-3">
                <input
                  defaultValue={p.caption ?? ""}
                  maxLength={120}
                  placeholder="Caption (optional)"
                  disabled={!!busy}
                  aria-label={`Caption for photo ${i + 1}`}
                  className="w-full rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-lagoon-600"
                  onBlur={(e) => e.target.value !== (p.caption ?? "") && run("Saving caption…", () => captionPhoto(p.id, e.target.value))}
                />
                <div className="flex items-center gap-1">
                  {i > 0 && (
                    <button type="button" disabled={!!busy} onClick={() => run("Saving order…", () => arrangePhoto(p.id, "cover"))} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-sea-900 ring-1 ring-line hover:bg-mist disabled:opacity-40" aria-label={`Make photo ${i + 1} the cover`}>
                      <Star className="size-3.5" /> Cover
                    </button>
                  )}
                  <button type="button" disabled={!!busy || i === 0} onClick={() => run("Saving order…", () => arrangePhoto(p.id, "up"))} className="rounded-full p-1.5 text-sea-900 ring-1 ring-line hover:bg-mist disabled:opacity-30" aria-label={`Move photo ${i + 1} earlier`}>
                    <ArrowLeft className="size-3.5" />
                  </button>
                  <button type="button" disabled={!!busy || i === photos.length - 1} onClick={() => run("Saving order…", () => arrangePhoto(p.id, "down"))} className="rounded-full p-1.5 text-sea-900 ring-1 ring-line hover:bg-mist disabled:opacity-30" aria-label={`Move photo ${i + 1} later`}>
                    <ArrowRight className="size-3.5" />
                  </button>
                  <button type="button" disabled={!!busy} onClick={() => run("Removing…", () => removePhoto(p.id))} className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-40" aria-label={`Remove photo ${i + 1}`}>
                    <Trash2 className="size-3.5" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
