import { ACCOUNTS, authCalls, expect, resetState, otherBrowser, sessionCookies, signIn, test } from "./support/helpers";
import { BASE_URL } from "./support/ports";

test.beforeEach(async () => {
  await resetState();
});

test.describe("B. Sessions", () => {
  test("reload and a new tab stay signed in", async ({ page, context }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Mabuhay, ${ACCOUNTS.agent.name}`);

    const tab = await context.newPage();
    await tab.goto("/dashboard");
    await expect(tab).toHaveURL(/\/dashboard$/);
    await expect(tab.getByRole("heading", { level: 1 })).toHaveText(`Mabuhay, ${ACCOUNTS.agent.name}`);
  });

  test("the session survives a browser restart (saved cookies)", async ({ page, context, browser }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    const state = await context.storageState();
    const restarted = await browser.newContext({ baseURL: BASE_URL, bypassCSP: true, storageState: state });
    const p = await restarted.newPage();
    await p.goto("/dashboard");
    await expect(p.getByRole("heading", { level: 1 })).toHaveText(`Mabuhay, ${ACCOUNTS.agent.name}`);
    await restarted.close();
  });

  test("an expiring access token is refreshed quietly, and the rotated token keeps working", async ({ page }) => {
    await signIn(page, ACCOUNTS.shortlived.email, ACCOUNTS.shortlived.password);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Mabuhay, ${ACCOUNTS.shortlived.name}`);
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Mabuhay, ${ACCOUNTS.shortlived.name}`);
    }
    expect((await authCalls({ path: "/auth/v1/token", grant: "refresh_token" })).length).toBeGreaterThan(0);
  });
});

test.describe("B. Sign-out", () => {
  test("sign-out clears the session cookie and returns to sign-in", async ({ page, context }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/agent\/sign-in$/);
    expect(await sessionCookies(context)).toHaveLength(0);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/agent\/sign-in\?next=%2Fdashboard$/);
    expect(await authCalls({ path: "/auth/v1/logout" })).toHaveLength(1);
  });

  test("a copy of the old cookie is useless after sign-out (revoked on the server)", async ({ page, context, browser }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    const stolen = await sessionCookies(context);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/agent\/sign-in$/);

    const { context: attacker, page: p } = await otherBrowser(browser, "stolen-cookie");
    await attacker.addCookies(stolen);
    await p.goto("/dashboard");
    await expect(p).toHaveURL(/\/agent\/sign-in\?next=%2Fdashboard$/);
    await attacker.close();
  });
});

test.describe("C. Protected routes", () => {
  for (const [path, next] of [
    ["/dashboard", "?next=%2Fdashboard"],
    ["/dashboard?tab=leads", "?next=%2Fdashboard%3Ftab%3Dleads"],
    ["/dashboard/anything", "?next=%2Fdashboard%2Fanything"],
    ["/agent/set-password", ""],
  ] as const) {
    test(`${path} without a session redirects to sign-in`, async ({ page, context }) => {
      const res = await page.goto(path);
      await expect(page).toHaveURL(`${BASE_URL}/agent/sign-in${next}`);
      expect(res?.status()).toBe(200);
      expect(await sessionCookies(context)).toHaveLength(0);
    });
  }

  test("after sign-in, the agent lands on the page they first asked for", async ({ page }) => {
    await page.goto("/dashboard?tab=leads");
    await expect(page).toHaveURL(/next=%2Fdashboard%3Ftab%3Dleads$/);
    await page.locator("main input[name=email]:visible").fill(ACCOUNTS.agent.email);
    await page.locator("main input[name=password]:visible").fill(ACCOUNTS.agent.password);
    await page.locator("main form:visible").getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/dashboard?tab=leads`);
  });

  test("agent pages are never cached by browsers or CDNs", async ({ page }) => {
    for (const path of ["/agent/sign-in", "/agent/forgot-password"]) {
      const res = await page.goto(path);
      expect(res?.headers()["cache-control"], path).toContain("no-store");
    }
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    const res = await page.goto("/dashboard");
    expect(res?.headers()["cache-control"]).toContain("no-store");
    expect(res?.headers()["cache-control"]).toContain("private");
  });
});
