"use client";

import { useActionState } from "react";
import { Message } from "@/app/agent/forms";
import { approve, reject } from "./actions";

export function Decision({ userId, name, canApprove }: { userId: string; name: string; canApprove: boolean }) {
  const [a, approveAction, approving] = useActionState(approve, {});
  const [r, rejectAction, rejecting] = useActionState(reject, {});
  const busy = approving || rejecting;
  const done = a.ok || r.ok;
  // Once decided, the card keeps the result until the page is reloaded (it then drops out of the list)
  if (done) return <Message state={{ ok: done }} />;
  return (
    <div className="space-y-3">
      <Message state={a.error ? a : r} />
      <div className="flex flex-wrap items-start gap-3">
        <form action={approveAction}>
          <input type="hidden" name="userId" value={userId} />
          <button
            disabled={busy || !canApprove}
            className="rounded-full bg-sea-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sea-800 disabled:opacity-50"
            aria-label={`Approve ${name}`}
          >
            Approve
          </button>
        </form>
        <form action={rejectAction} className="flex min-w-[260px] flex-1 flex-wrap items-start gap-2">
          <input type="hidden" name="userId" value={userId} />
          <label className="sr-only" htmlFor={`reason-${userId}`}>Reason for declining {name}</label>
          <input
            id={`reason-${userId}`}
            name="reason"
            required
            minLength={5}
            maxLength={500}
            placeholder="Reason (the applicant sees it)"
            className="min-w-0 flex-1 rounded-full border border-line px-4 py-2 text-sm"
          />
          <button disabled={busy} className="rounded-full px-5 py-2.5 text-sm font-semibold text-sea-900 ring-1 ring-line hover:bg-mist disabled:opacity-50" aria-label={`Decline ${name}`}>
            Decline
          </button>
        </form>
      </div>
    </div>
  );
}
