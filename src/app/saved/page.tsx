import type { Metadata } from "next";
import { SavedList } from "@/components/ph/saved";

export const metadata: Metadata = { title: "Saved properties", robots: { index: false, follow: true } };

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-sea-950">Saved properties</h1>
      <p className="mt-2 text-ink-soft">Listings you saved with the heart button.</p>
      <SavedList />
    </div>
  );
}
