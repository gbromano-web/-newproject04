import { STATIC_PREVIEW } from "@/lib/ph/preview";

/** Public client preview only: makes clear the listings and agents are samples. */
export function PreviewBanner() {
  if (!STATIC_PREVIEW) return null;
  return (
    <div role="note" className="bg-mango-500 px-4 py-1.5 text-center text-xs font-semibold text-sea-950">
      Client preview: listings, agents, licence numbers and phone numbers are samples. Inquiries are not sent.
    </div>
  );
}
