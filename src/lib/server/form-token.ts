import "server-only";
import { timingSafeEqual } from "node:crypto";
import { sign } from "./request";

/**
 * A signed "this form was shown at <time>" value for a hidden field. Lets the
 * server reject forms submitted faster than a person could fill them, or long
 * after they were shown, without storing anything. Server-only: if this could
 * be called from the browser, a bot could mint backdated tokens.
 */
export function formToken(purpose: string, now = Date.now()): string {
  return `${now}.${sign(`${purpose}:${now}`)}`;
}

export function checkFormToken(purpose: string, token: string, minMs: number, maxMs: number): "ok" | "fast" | "expired" | "invalid" {
  const [t, mac] = token.split(".");
  const issued = Number(t);
  if (!issued || !mac) return "invalid";
  const expected = Buffer.from(sign(`${purpose}:${issued}`));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  const age = Date.now() - issued;
  if (age < minMs) return "fast";
  if (age > maxMs) return "expired";
  return "ok";
}
