import {
  ACCOUNTS, MESSAGES, alertText, authCalls, expect, resetState, fillSignIn, sessionCookies, signIn,
  skipBrowserValidation, submit, test,
} from "./support/helpers";

test.beforeEach(async () => {
  await resetState();
});

test.describe("B. Sign-in", () => {
  test("happy path: valid credentials open the agent's own dashboard", async ({ page, context }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Mabuhay, ${ACCOUNTS.agent.name}`);
    await expect(page.locator("main")).toContainText("Ana Reyes"); // their inquiry
    await expect(page.locator("main")).not.toContainText("Omar Haddad"); // another agent's
    expect((await sessionCookies(context)).length).toBeGreaterThan(0);
  });

  test("the session cookie is HttpOnly, SameSite=Lax and unreadable by page scripts", async ({ page, context }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    const cookies = await sessionCookies(context);
    expect(cookies.length).toBeGreaterThan(0);
    for (const c of cookies) {
      expect(c.httpOnly, `${c.name} must be HttpOnly`).toBe(true);
      expect(c.sameSite).toBe("Lax");
      expect(c.secure, `${c.name} must be Secure in production`).toBe(true);
    }
    expect(await page.evaluate(() => document.cookie)).not.toMatch(/sb-[^=]*-auth-token/);
  });

  test("email is matched without regard to case or surrounding spaces", async ({ page }) => {
    await signIn(page, "  AGENT@Test.Local ", ACCOUNTS.agent.password);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Mabuhay, ${ACCOUNTS.agent.name}`);
  });

  test("wrong password: generic error, no session, email kept for retry", async ({ page, context }) => {
    await page.goto("/agent/sign-in");
    await fillSignIn(page, ACCOUNTS.agent.email, "not the password");
    await submit(page, "Sign in");
    await expect(alertText(page)).toHaveText(MESSAGES.mismatch);
    await expect(page).toHaveURL(/\/agent\/sign-in/);
    await expect(page.locator("input[name=email]:visible")).toHaveValue(ACCOUNTS.agent.email);
    expect(await sessionCookies(context)).toHaveLength(0);
  });

  test("unknown email gets exactly the same error as a wrong password", async ({ page, context }) => {
    await page.goto("/agent/sign-in");
    await fillSignIn(page, "nobody@test.local", "whatever password");
    await submit(page, "Sign in");
    await expect(alertText(page)).toHaveText(MESSAGES.mismatch);
    expect(await sessionCookies(context)).toHaveLength(0);
  });

  test("malformed, blank and whitespace-only input is refused without calling the Auth server", async ({ page }) => {
    await page.goto("/agent/sign-in");
    await skipBrowserValidation(page);
    const cases: [string, string][] = [
      ["invalid-email", ACCOUNTS.agent.password],
      ["@domain.com", ACCOUNTS.agent.password],
      ["user@", ACCOUNTS.agent.password],
      ["user@domain", ACCOUNTS.agent.password],
      ["agent @test.local", ACCOUNTS.agent.password],
      ["", ACCOUNTS.agent.password],
      ["    ", ACCOUNTS.agent.password],
      [ACCOUNTS.agent.email, ""],
      [ACCOUNTS.agent.email, "      "],
      ["", ""],
    ];
    for (const [email, password] of cases) {
      await fillSignIn(page, email, password);
      await submit(page, "Sign in");
      await expect(alertText(page), JSON.stringify([email, password])).toHaveText(MESSAGES.missing);
    }
    expect(await authCalls({ path: "/auth/v1/token", grant: "password" })).toHaveLength(0);
  });

  test("an account with no agent profile signs in but sees no data", async ({ page }) => {
    await signIn(page, ACCOUNTS.unlinked.email, ACCOUNTS.unlinked.password);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("not linked to an agent profile");
    await expect(page.locator("main")).not.toContainText("Ana Reyes");
  });
});
