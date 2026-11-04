"use client";

import { useActionState } from "react";
import { Message } from "@/app/agent/forms";
import { changeStatus } from "./actions";

const NEXT: Record<string, [string, string][]> = {
  DRAFT: [["ACTIVE", "Publish"]],
  ACTIVE: [["PAUSED", "Pause"], ["SOLD", "Mark as sold"], ["RENTED", "Mark as rented"], ["DRAFT", "Move to drafts"]],
  PAUSED: [["ACTIVE", "Publish again"], ["SOLD", "Mark as sold"], ["RENTED", "Mark as rented"], ["DRAFT", "Move to drafts"]],
  SOLD: [["ACTIVE", "Publish again"], ["DRAFT", "Move to drafts"]],
  RENTED: [["ACTIVE", "Publish again"], ["DRAFT", "Move to drafts"]],
  EXPIRED: [["ACTIVE", "Publish again"], ["DRAFT", "Move to drafts"]],
  PENDING_REVIEW: [["DRAFT", "Move to drafts"]],
  REJECTED: [["DRAFT", "Move to drafts"]],
};

/** Publish, pause, mark sold or rented. Publishing needs at least one photo (checked on the server too). */
export function StatusPanel({ id, status, rent }: { id: string; status: string; rent: boolean }) {
  const [state, action, pending] = useActionState(changeStatus, {});
  const options = (NEXT[status] ?? NEXT.DRAFT).filter(([s]) => !(rent ? s === "SOLD" : s === "RENTED"));
  return (
    <div className="space-y-3">
      <Message state={state} />
      <div className="flex flex-wrap gap-2">
        {options.map(([s, text]) => (
          <form key={s} action={action}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={s} />
            <button
              disabled={pending}
              className={
                s === "ACTIVE"
                  ? "rounded-full bg-lagoon-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-lagoon-700 disabled:opacity-60"
                  : "rounded-full px-4 py-2.5 text-sm font-semibold text-sea-900 ring-1 ring-line hover:bg-mist disabled:opacity-60"
              }
            >
              {text}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
