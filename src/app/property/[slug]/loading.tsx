/** Shown while a live listing loads (also the Suspense boundary for per-request rendering). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="h-4 w-64 animate-pulse rounded bg-mist" />
      <div className="mt-6 aspect-[16/7] animate-pulse rounded-3xl bg-mist" />
      <div className="mt-8 h-8 w-2/3 animate-pulse rounded bg-mist" />
      <div className="mt-3 h-5 w-1/3 animate-pulse rounded bg-mist" />
    </div>
  );
}
