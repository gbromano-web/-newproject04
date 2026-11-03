import {
  ACCOUNTS, MESSAGES, alertText, authCalls, authServer, expect, resetState, fillSignIn, otherBrowser, sessionCookies, signIn,
  skipBrowserValidation, submit, test,
} from "./support/helpers";
import { BASE_URL } from "./support/ports";

test.beforeEach(async () => {
  await resetState();
});
test.afterEach(async () => {
  await authServer.mode("normal");
});

/** Nothing technical may reach the visitor: no stack traces, driver names or internal hosts. */
const LEAKS = /stack|ECONN|TypeError|ReferenceError|AuthApiError|AuthRetryableFetchError|postgres|pg_|SQLSTATE|127\.0\.0\.1|syntax error/i;

test.describe("C. Injection", () => {
  test("SQL injection strings are treated as plain text", async ({ page, request }) => {
    await page.goto("/agent/sign-in");
    await skipBrowserValidation(page);
    await fillSignIn(page, "' OR '1'='1", "' OR '1'='1");
    await submit(page, "Sign in");
    await expect(alertText(page)).toHaveText(MESSAGES.missing);

    // A well-formed email that carries SQL: passed to the Auth server as data, rejected normally
    await fillSignIn(page, "admin'--@test.local", "' OR '1'='1'; DROP TABLE \"User\"; --");
    const res = await submit(page, "Sign in");
    expect(res.status()).toBeLessThan(500);
    await expect(alertText(page)).toHaveText(MESSAGES.mismatch);
    expect(await page.locator("main").innerText()).not.toMatch(LEAKS);

    // The database is untouched and sign-in still works
    expect((await request.get("/api/health")).status()).toBe(200);
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await expect(page.locator("main")).toContainText("Ana Reyes");
  });

  test("script and HTML injection is shown as text, never run", async ({ page }) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    for (const email of ["<script>alert(1)</script>", '"><img src=x onerror=alert(2)>@test.local', "<svg/onload=alert(3)>"]) {
      await page.goto("/agent/sign-in");
      await skipBrowserValidation(page);
      await fillSignIn(page, email, "<script>alert(4)</script>");
      await submit(page, "Sign in");
      await expect(alertText(page)).toHaveText(MESSAGES.missing);
      // Echoed back only as the input's value, escaped
      await expect(page.locator("main input[name=email]:visible")).toHaveValue(email.trim().toLowerCase());
      expect(await page.locator("main img[src=x], main svg[onload], main script:not([src])").count()).toBe(0);
    }
    // Hostile query strings on the sign-in page
    await page.goto(`/agent/sign-in?error=${encodeURIComponent("<img src=x onerror=alert(5)>")}&next=${encodeURIComponent("javascript:alert(6)")}`);
    expect(await page.locator("main img[src=x]").count()).toBe(0);
    await expect(alertText(page)).toHaveCount(0);
    await fillSignIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await submit(page, "Sign in");
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    expect(dialogs).toEqual([]);
  });

  test("sign-in never redirects off the site", async ({ page, context }) => {
    for (const next of ["https://evil.example/", "//evil.example/", "/dashboard//evil.example", "/\\evil.example", "/dashboard/../../evil", "javascript:alert(1)"]) {
      await context.clearCookies();
      await page.goto(`/agent/sign-in?next=${encodeURIComponent(next)}`);
      await fillSignIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
      await submit(page, "Sign in");
      await page.waitForURL((u) => u.pathname === "/dashboard", { waitUntil: "commit" });
      expect(new URL(page.url()).origin, next).toBe(BASE_URL);
      expect(new URL(page.url()).pathname, next).toBe("/dashboard");
    }
  });

  test("email links cannot be confirmed from another site (login CSRF)", async ({ request }) => {
    const res = await request.post("/auth/confirm", {
      headers: { origin: "https://evil.example" },
      form: { token_hash: "invite-ok", type: "invite" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(403);
    expect(await authCalls({ path: "/auth/v1/verify" })).toHaveLength(0);
  });
});

test.describe("C. Rate limiting", () => {
  test("rapid failed sign-ins are slowed after 10, without errors or a crash", async ({ page, request, browser }) => {
    const email = "brute-force@test.local";
    await page.goto("/agent/sign-in");
    for (let i = 1; i <= 12; i++) {
      await fillSignIn(page, email, `guess number ${i}`);
      const res = await submit(page, "Sign in");
      expect(res.status(), `attempt ${i}`).toBeLessThan(500);
      await expect(alertText(page), `attempt ${i}`).toHaveText(i <= 10 ? MESSAGES.mismatch : MESSAGES.rateLimited);
    }
    // The 11th and 12th attempts never reached the Auth server
    expect(await authCalls({ path: "/auth/v1/token", grant: "password", email })).toHaveLength(10);
    expect((await request.get("/api/health")).status()).toBe(200);

    // The lock is per email and per visitor: a real agent elsewhere is not locked out
    const { context, page: agent } = await otherBrowser(browser, "not-the-attacker");
    await signIn(agent, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await expect(agent.getByRole("heading", { level: 1 })).toHaveText(`Mabuhay, ${ACCOUNTS.agent.name}`);
    await context.close();
  });

  test("one visitor trying many different emails is slowed too (30 per 15 minutes)", async ({ page }) => {
    await page.goto("/agent/sign-in");
    for (let i = 1; i <= 31; i++) {
      await fillSignIn(page, `spray-${i}@test.local`, "Password123!");
      await submit(page, "Sign in");
      await expect(alertText(page), `attempt ${i}`).toHaveText(i <= 30 ? MESSAGES.mismatch : MESSAGES.rateLimited);
    }
  });

  test("signing in and out repeatedly never locks a real agent out", async ({ page }) => {
    for (let i = 1; i <= 12; i++) {
      await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page, `round ${i}`).toHaveURL(/\/agent\/sign-in$/);
    }
  });

  test("a correct sign-in clears earlier failed attempts for that email", async ({ page }) => {
    await page.goto("/agent/sign-in");
    for (let i = 1; i <= 9; i++) {
      await fillSignIn(page, ACCOUNTS.agent.email, `typo ${i}`);
      await submit(page, "Sign in");
      await expect(alertText(page)).toHaveText(MESSAGES.mismatch);
    }
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/agent\/sign-in$/);
    for (let i = 1; i <= 9; i++) {
      await fillSignIn(page, ACCOUNTS.agent.email, `second typo ${i}`);
      await submit(page, "Sign in");
      await expect(alertText(page), `attempt ${i} after a good sign-in`).toHaveText(MESSAGES.mismatch);
    }
  });

  test("password reset requests are limited without revealing it", async ({ page }) => {
    for (let i = 1; i <= 5; i++) {
      await page.goto("/agent/forgot-password");
      await page.locator("input[name=email]:visible").fill(ACCOUNTS.agent.email);
      await submit(page, "Email me a link");
      await expect(page.locator("main p[role=status]:visible")).toHaveText(MESSAGES.resetSent);
    }
    expect(await authCalls({ path: "/auth/v1/recover", email: ACCOUNTS.agent.email })).toHaveLength(3);
  });
});

test.describe("C. Auth service outage", () => {
  test("Auth server down: a clear 'try again' message, not 'wrong password'", async ({ page, context }) => {
    await authServer.mode("down");
    await page.goto("/agent/sign-in");
    await fillSignIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    const res = await submit(page, "Sign in");
    expect(res.status()).toBeLessThan(500);
    await expect(alertText(page)).toHaveText(MESSAGES.unavailable);
    expect(await page.locator("main").innerText()).not.toMatch(LEAKS);
    expect(await sessionCookies(context)).toHaveLength(0);
  });

  test("Auth server hanging: sign-in gives up within seconds with the same message", async ({ page }) => {
    await authServer.mode("hang");
    await page.goto("/agent/sign-in");
    await fillSignIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    const started = Date.now();
    await submit(page, "Sign in");
    await expect(alertText(page)).toHaveText(MESSAGES.unavailable);
    expect(Date.now() - started).toBeLessThan(15_000);
  });

  test("a signed-in agent is sent to sign-in (not let through) when sessions cannot be checked", async ({ page }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await authServer.mode("down");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/agent\/sign-in\?next=%2Fdashboard$/);
    await expect(page.locator("main")).not.toContainText("Ana Reyes");
  });
});
