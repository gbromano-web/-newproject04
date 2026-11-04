"use client";

import { useActionState } from "react";
import { Message } from "@/app/agent/forms";
import { openPortal, startCheckout } from "./actions";

/** "Pay monthly" / "Pay yearly" for one plan: goes to Stripe Checkout. */
export function CheckoutButtons({ plan, monthly, yearly }: { plan: string; monthly: string; yearly: string }) {
  const [state, action, pending] = useActionState(startCheckout, {});
  return (
    <div className="space-y-3">
      <Message state={state} />
      <div className="flex flex-wrap gap-2">
        {([["month", `Pay ${monthly} a month`, true], ["year", `Pay ${yearly} a year`, false]] as const).map(([interval, label, main]) => (
          <form key={interval} action={action}>
            <input type="hidden" name="plan" value={plan} />
            <input type="hidden" name="interval" value={interval} />
            <button
              disabled={pending}
              className={
                main
                  ? "rounded-full bg-sea-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sea-800 disabled:opacity-60"
                  : "rounded-full px-5 py-2.5 text-sm font-semibold text-sea-900 ring-1 ring-line hover:bg-mist disabled:opacity-60"
              }
            >
              {label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

/** Opens Stripe's customer portal: change plan, card, invoices, cancel. */
export function ManageBilling() {
  const [state, action, pending] = useActionState(openPortal, {});
  return (
    <div className="space-y-3">
      <Message state={state} />
      <form action={action}>
        <button disabled={pending} className="rounded-full bg-sea-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sea-800 disabled:opacity-60">
          Manage billing
        </button>
      </form>
    </div>
  );
}
