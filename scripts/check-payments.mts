// Checks the live-payment block (src/lib/payment-mode.ts). Run: npm run check:payments
import assert from "node:assert/strict";
import { paymentModeFor } from "../src/lib/payment-mode";

const w = "whsec_x";
const cases: [Parameters<typeof paymentModeFor>[0], boolean, string][] = [
  [{}, false, "off"],
  [{ secretKey: "sk_test_1" }, false, "off"], // no webhook secret
  [{ secretKey: "sk_test_1", webhookSecret: w }, false, "test"],
  [{ secretKey: "sk_test_1", webhookSecret: w, liveApproved: "true" }, true, "test"],
  [{ secretKey: "sk_live_1", webhookSecret: w }, false, "live_blocked"],
  [{ secretKey: "sk_live_1", webhookSecret: w, liveApproved: "true" }, false, "live_blocked"], // no legal sign-off
  [{ secretKey: "sk_live_1", webhookSecret: w }, true, "live_blocked"], // no owner switch
  [{ secretKey: "sk_live_1", webhookSecret: w, liveApproved: "TRUE" }, true, "live_blocked"], // exact value only
  [{ secretKey: "rk_live_1", webhookSecret: w, liveApproved: "true" }, true, "live"],
  [{ secretKey: "sk_live_1", webhookSecret: w, liveApproved: "true" }, true, "live"],
  [{ secretKey: "pk_live_1", webhookSecret: w, liveApproved: "true" }, true, "off"], // publishable key is not a secret key
];
for (const [env, legal, want] of cases) assert.equal(paymentModeFor(env, legal), want, JSON.stringify({ env, legal }));
console.log(`payment mode: ${cases.length} cases ok`);
