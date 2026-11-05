import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { getSession } from "@/lib/server/agent-session";
import { isAdminEmail, pendingApplicants, type Applicant } from "@/lib/server/admin";
import { emailEnabled } from "@/lib/server/email";
import { Decision } from "./decision-forms";

export const metadata: Metadata = { title: "Agent applications", robots: { index: false, follow: false } };

const when = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }).format(d);

function licence(a: Applicant["application"]): { label: string; check: string } {
  if (a.licenseType === "UAE_BROKER")
    return { label: `${a.uaeRegulator} ${a.uaeBrokerNumber}, office ${a.uaeOfficeNumber} (${a.emirate})`, check: `Check the broker and office numbers with the ${a.emirate} regulator.` };
  if (a.licenseType === "REAL_ESTATE_BROKER") return { label: `PRC broker licence ${a.prcLicenseNumber}`, check: "Check the licence with PRC online verification." };
  return { label: `DHSUD accreditation ${a.dhsudAccreditationNumber}, under PRC broker ${a.supervisingBrokerPrc}`, check: "Check the accreditation with DHSUD, and that the broker supervises them." };
}

async function Applications() {
  const session = await getSession();
  if (!session || !isAdminEmail(session.email)) notFound();
  const list = await pendingApplicants();
  return (
    <>
      <h1 className="text-2xl font-bold text-sea-950 sm:text-[32px]">Agent applications</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Check each licence with the regulator before approving. Approving creates the agent account; they can list straight away.
        {!emailEnabled() && " Email is not switched on yet, so applicants are not notified: email them yourself."}
      </p>
      {list.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-white p-6 text-sm text-ink-soft ring-1 ring-line">No applications waiting.</p>
      ) : (
        <ul className="mt-6 space-y-4" aria-label="Applications">
          {list.map((p) => {
            const l = licence(p.application);
            const blocked = !p.confirmed || p.supervisorApproved === false;
            return (
              <li key={p.userId} className="rounded-2xl bg-white p-6 ring-1 ring-line">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold text-sea-950">{p.application.fullName}</h2>
                  <span className="text-xs text-ink-soft">Applied {when(new Date(p.appliedAt))}</span>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div><dt className="inline text-ink-soft">Country: </dt><dd className="inline">{p.application.country === "AE" ? "UAE" : "Philippines"}</dd></div>
                  <div><dt className="inline text-ink-soft">Licence: </dt><dd className="inline">{l.label}</dd></div>
                  <div><dt className="inline text-ink-soft">Email: </dt><dd className="inline break-all">{p.email}</dd></div>
                  <div><dt className="inline text-ink-soft">Mobile: </dt><dd className="inline">{p.application.mobile}</dd></div>
                  {p.application.brokerage && <div><dt className="inline text-ink-soft">Brokerage: </dt><dd className="inline">{p.application.brokerage}</dd></div>}
                </dl>
                <p className="mt-3 flex items-center gap-1.5 text-sm">
                  {p.confirmed ? (
                    <span className="inline-flex items-center gap-1 text-lagoon-700"><CheckCircle2 className="size-4" /> Email confirmed</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-mango-700"><Clock className="size-4" /> Email not confirmed yet</span>
                  )}
                  {p.supervisorApproved === false && <span className="text-mango-700"> · supervising broker not approved yet</span>}
                </p>
                <p className="mt-1 text-xs text-ink-soft">{l.check}</p>
                <div className="mt-4">
                  <Decision userId={p.userId} name={p.application.fullName} canApprove={!blocked} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function AdminAgentsPage() {
  if (SAMPLE_DATA) notFound();
  return (
    <div className="bg-mist/60">
      <div className="mx-auto max-w-[880px] px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sea-900 hover:text-lagoon-700">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-mist" />}>
          <Applications />
        </Suspense>
      </div>
    </div>
  );
}
