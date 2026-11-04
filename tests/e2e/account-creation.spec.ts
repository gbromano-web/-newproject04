import {
  ACCOUNTS, MESSAGES, alertText, authCalls, authServer, expect, resetState, fillSignIn, form, openEmailLink, otherBrowser,
  sessionCookies, signIn, skipBrowserValidation, statusText, submit, test,
} from "./support/helpers";

/**
 * "Sign-up" on this site: agents cannot register themselves. An admin checks
 * their licence and sends a Supabase invite; the invite link lets the agent
 * choose a password, which creates their sign-in. These tests cover that
 * flow, the password rules, and password reset.
 */
test.beforeEach(async () => {
  await resetState();
});

test.describe("A. Account creation (invitation)", () => {
  test("invitations still work alongside self sign-up, and there is one sign-up address", async ({ page, request }) => {
    expect((await request.get("/agent/sign-up")).status()).toBe(200);
    for (const path of ["/signup", "/sign-up", "/register", "/agent/register"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
    await page.goto("/agent/sign-in");
    await expect(page.locator("main").getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/agent/sign-up");
  });

  test("happy path: invite link → choose password → signed in to the dashboard", async ({ page, context }) => {
    await page.goto("/auth/confirm?token_hash=invite-ok&type=invite");
    await expect(page).toHaveURL(/\/auth\/continue\?/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome to Go Search Property");
    // Opening the link must not use it up (mail scanners open links too)
    expect(await authCalls({ path: "/auth/v1/verify" })).toHaveLength(0);

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/agent\/set-password$/);
    await page.locator("input[name=password]:visible").fill("Strong new password 1");
    await page.locator("input[name=confirm]:visible").fill("Strong new password 1");
    await submit(page, "Save password");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Welcome, ${ACCOUNTS.invited.name}`);
    await expect(page.locator("main")).toContainText("RERA BRN 12345");
    expect(await authServer.password(ACCOUNTS.invited.email)).toBe("Strong new password 1");

    const cookies = await sessionCookies(context);
    expect(cookies.length).toBeGreaterThan(0);
    for (const c of cookies) {
      expect(c.httpOnly, `${c.name} must be HttpOnly`).toBe(true);
      expect(c.sameSite).toBe("Lax");
      expect(c.path).toBe("/");
    }
  });

  test("the new password works for the next sign-in", async ({ page, browser }) => {
    await openEmailLink(page, "invite-ok", "invite");
    await page.locator("input[name=password]:visible").fill("Strong new password 1");
    await page.locator("input[name=confirm]:visible").fill("Strong new password 1");
    await submit(page, "Save password");
    await expect(page).toHaveURL(/\/dashboard$/);

    const { context, page: second } = await otherBrowser(browser, "invite-second-device");
    await signIn(second, ACCOUNTS.invited.email, "Strong new password 1");
    await expect(second.getByRole("heading", { level: 1 })).toHaveText(`Welcome, ${ACCOUNTS.invited.name}`);
    await context.close();
  });

  test("duplicate: an invite link that was already used cannot create the account again", async ({ page, browser }) => {
    await openEmailLink(page, "invite-ok", "invite");
    await expect(page).toHaveURL(/\/agent\/set-password$/);

    const { context, page: again } = await otherBrowser(browser, "invite-reuse");
    await openEmailLink(again, "invite-ok", "invite");
    await expect(again).toHaveURL(/\/agent\/sign-in\?error=link$/);
    await expect(alertText(again)).toHaveText(MESSAGES.linkUsed);
    expect(await sessionCookies(context)).toHaveLength(0);
    await context.close();
  });

  test("an invalid or tampered invite link is refused", async ({ page, context }) => {
    await openEmailLink(page, "not-a-real-token", "invite");
    await expect(page).toHaveURL(/\/agent\/sign-in\?error=link$/);
    await expect(alertText(page)).toHaveText(MESSAGES.linkUsed);
    expect(await sessionCookies(context)).toHaveLength(0);
  });

  test("password rules: too short, blank, whitespace-only and mismatched passwords are refused", async ({ page }) => {
    await openEmailLink(page, "invite-ok", "invite");
    await expect(page).toHaveURL(/\/agent\/set-password$/);
    await skipBrowserValidation(page);

    const cases: [string, string, string][] = [
      ["", "", MESSAGES.tooShort],
      ["short1", "short1", MESSAGES.tooShort],
      ["123456789", "123456789", MESSAGES.tooShort],
      ["          ", "          ", MESSAGES.tooShort],
      ["   \t     \t  ", "   \t     \t  ", MESSAGES.tooShort],
      ["Strong new password 1", "Strong new password 2", MESSAGES.noMatch],
    ];
    for (const [password, confirm, message] of cases) {
      await page.locator("input[name=password]:visible").fill(password);
      await page.locator("input[name=confirm]:visible").fill(confirm);
      await submit(page, "Save password");
      await expect(alertText(page), JSON.stringify(password)).toHaveText(message);
      await expect(page).toHaveURL(/\/agent\/set-password$/);
    }
    // None of these reached the Auth server
    expect(await authCalls({ path: "/auth/v1/user", method: "PUT" })).toHaveLength(0);
  });

  test("set-password cannot be opened without a session", async ({ page }) => {
    await page.goto("/agent/set-password");
    await expect(page).toHaveURL(/\/agent\/sign-in$/);
  });
});

test.describe("A. Password reset", () => {
  test("same answer for registered and unknown emails (no account discovery)", async ({ page }) => {
    await page.goto("/agent/forgot-password");
    await page.locator("input[name=email]:visible").fill(ACCOUNTS.agent.email);
    await submit(page, "Email me a link");
    await expect(statusText(page)).toHaveText(MESSAGES.resetSent);

    await page.goto("/agent/forgot-password");
    await page.locator("input[name=email]:visible").fill("nobody-here@test.local");
    await submit(page, "Email me a link");
    await expect(statusText(page)).toHaveText(MESSAGES.resetSent);
    expect(await authCalls({ path: "/auth/v1/recover" })).toHaveLength(2);
  });

  test("malformed and blank emails are refused before anything is sent", async ({ page }) => {
    await page.goto("/agent/forgot-password");
    await skipBrowserValidation(page);
    for (const email of ["invalid-email", "@domain.com", "user@", "user@domain", "   ", ""]) {
      await page.locator("input[name=email]:visible").fill(email);
      await submit(page, "Email me a link");
      await expect(alertText(page), JSON.stringify(email)).toHaveText(MESSAGES.invalidEmail);
    }
    expect(await authCalls({ path: "/auth/v1/recover" })).toHaveLength(0);
  });

  test("reset link → new password → old password stops working", async ({ page, browser }) => {
    await openEmailLink(page, "recovery-ok", "recovery");
    await expect(page).toHaveURL(/\/agent\/set-password$/);
    await page.locator("input[name=password]:visible").fill("Brand new password 9");
    await page.locator("input[name=confirm]:visible").fill("Brand new password 9");
    await submit(page, "Save password");
    await expect(page).toHaveURL(/\/dashboard$/);

    const { context, page: other } = await otherBrowser(browser, "reset-old-password");
    await other.goto("/agent/sign-in");
    await fillSignIn(other, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await submit(other, "Sign in");
    await expect(alertText(other)).toHaveText(MESSAGES.mismatch);
    await signIn(other, ACCOUNTS.agent.email, "Brand new password 9");
    await expect(other.getByRole("heading", { level: 1 })).toHaveText(`Mabuhay, ${ACCOUNTS.agent.name}`);
    await context.close();
  });

  test("the reset form is reachable from sign-in", async ({ page }) => {
    await page.goto("/agent/sign-in");
    await form(page).getByRole("link", { name: "Forgot your password?" }).click();
    await expect(page).toHaveURL(/\/agent\/forgot-password$/);
  });
});
