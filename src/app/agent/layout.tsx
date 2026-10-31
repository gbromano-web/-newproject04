import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** A plain centred card for sign-in, password reset and set-password. */
export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-mist/60 px-4 py-14 sm:py-20">
      <div className="mx-auto w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-sm ring-1 ring-line sm:p-8">{children}</div>
    </div>
  );
}
