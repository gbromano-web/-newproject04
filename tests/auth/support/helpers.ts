import { createHash } from "node:crypto";
import { test as base, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";
import { AUTH_PORT, BASE_URL, DB_PORT } from "./ports";

const AUTH = `http://127.0.0.1:${AUTH_PORT}`;

/** Accounts known to tests/auth/support/mock-auth.mjs and test-db.mjs. */
export const ACCOUNTS = {
  agent: { email: "agent@test.local", password: "Correct horse battery 1", name: "Maria" },
  unlinked: { email: "unlinked@test.local", password: "Unlinked account pass 3" },
  shortlived: { email: "shortlived@test.local", password: "Short lived session 4", name: "Sam" },
  invited: { email: "newagent@test.local", name: "Nadia" },
} as const;

export const MESSAGES = {
  mismatch: "That email and password do not match.",
  missing: "Enter your email and password.",
  rateLimited: "Too many attempts. Please wait 15 minutes and try again.",
  unavailable: "Sign-in is temporarily unavailable. Please try again in a few minutes.",
  linkUsed: "That link has expired or was already used. Sign in, or ask for a new link.",
  resetSent: "If that email belongs to an agent account, a link to set a new password is on its way. It works once, for one hour.",
  invalidEmail: "Enter a valid email address.",
  tooShort: "Use at least 10 characters.",
  noMatch: "The two passwords do not match.",
} as const;

/** The Supabase Auth stand-in: reset its state, read what it was asked, simulate outages. */
export const authServer = {
  reset: () => fetch(`${AUTH}/__reset`, { method: "POST" }),
  mode: (mode: "normal" | "down" | "hang") => fetch(`${AUTH}/__mode`, { method: "POST", body: JSON.stringify({ mode }) }),
  log: async (): Promise<{ method: string; path: string; grant: string | null; email?: string }[]> => (await fetch(`${AUTH}/__log`)).json(),
  password: async (email: string): Promise<string | null> =>
    (await (await fetch(`${AUTH}/__password`, { method: "POST", body: JSON.stringify({ email }) })).json()).password,
};

/**
 * Fresh state for every test: the Auth stand-in forgets sessions, used links and
 * changed passwords, and the site's rate-limit counters are cleared, so one
 * test's sign-ins never count against another's.
 */
export async function resetState() {
  await authServer.reset();
  const db = new Client({ connectionString: `postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres` });
  await db.connect();
  try {
    await db.query(`DELETE FROM "RateLimit"`);
  } finally {
    await db.end();
  }
}

/** Calls to the Auth server for one path / grant / email. */
export async function authCalls(filter: { path?: string; grant?: string; email?: string; method?: string }) {
  return (await authServer.log()).filter(
    (e) =>
      (!filter.path || e.path === filter.path) &&
      (!filter.grant || e.grant === filter.grant) &&
      (!filter.email || e.email === filter.email) &&
      (!filter.method || e.method === filter.method),
  );
}

/**
 * Sign-in is rate limited per visitor IP. Each test gets its own IP (the site
 * reads x-real-ip, which Vercel sets in production), so tests never trip
 * each other's limits.
 */
const ipFor = (seed: string) => {
  const h = createHash("sha256").update(seed).digest();
  return `10.${h[0]}.${h[1]}.${(h[2] % 250) + 1}`;
};

export const test = base.extend<{ visitorIp: string }>({
  visitorIp: async ({}, use, testInfo) => use(ipFor(testInfo.testId)),
  extraHTTPHeaders: async ({ visitorIp }, use) => use({ "x-real-ip": visitorIp }),
});
export { expect };

/** A second, independent browser (another device), optionally with a different IP. */
export async function otherBrowser(browser: Browser, seed: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: BASE_URL, bypassCSP: true, extraHTTPHeaders: { "x-real-ip": ipFor(seed) } });
  return { context, page: await context.newPage() };
}

export const form = (page: Page) => page.locator("main form:visible").first();
export const alertText = (page: Page) => page.locator("main p[role=alert]:visible");
export const statusText = (page: Page) => page.locator("main p[role=status]:visible");

/** Turn off the browser's own field checks, so the server's validation is what gets tested. */
export async function skipBrowserValidation(page: Page) {
  await form(page).evaluate((f: HTMLFormElement) => (f.noValidate = true));
}

/** Submit a form and wait for the server action's response, so repeated submissions are not raced. */
export async function submit(page: Page, button: string) {
  const done = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).origin === BASE_URL);
  await form(page).getByRole("button", { name: button }).click();
  const res = await done;
  // React re-enables the button and resets the form's fields when it applies the result, a moment
  // after the response. Typing before that would be wiped, so wait for it (or for the page to change).
  await page
    .waitForFunction(() => !document.querySelector("main form button[disabled]"), null, { timeout: 10_000 })
    .catch(() => undefined);
  return res;
}

export async function fillSignIn(page: Page, email: string, password: string) {
  await page.locator("main input[name=email]:visible").fill(email);
  await page.locator("main input[name=password]:visible").fill(password);
}

/** Sign in through the real form and land on the dashboard. */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/agent/sign-in");
  await fillSignIn(page, email, password);
  await submit(page, "Sign in");
  await page.waitForURL((u) => u.pathname === "/dashboard", { waitUntil: "commit" });
}

/** Supabase stores the session in sb-<project>-auth-token, split into .0/.1 chunks when long. */
export async function sessionCookies(context: BrowserContext) {
  return (await context.cookies(BASE_URL)).filter((c) => /^sb-[^-]+-auth-token(\.\d+)?$/.test(c.name));
}

/** Open an invite or reset link and press Continue: the agent then has a session. */
export async function openEmailLink(page: Page, tokenHash: string, type: "invite" | "recovery") {
  await page.goto(`/auth/confirm?token_hash=${tokenHash}&type=${type}`);
  await page.waitForURL((u) => u.pathname === "/auth/continue");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((u) => u.pathname !== "/auth/continue", { waitUntil: "commit" });
}
