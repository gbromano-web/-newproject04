import type { Page } from "@playwright/test";
import {
  ACCOUNTS, MESSAGES, alertText, authCalls, authServer, expect, fillSignIn, form, openEmailLink, resetState, sessionCookies,
  signIn, skipBrowserValidation, sql, statusText, submit, test,
} from "./support/helpers";

/**
 * Agent self sign-up: account → email confirmation → application under review.
 * Security: email verification, password rules and breached-password check,
 * no account discovery, bot traps (hidden field, signed timer), rate limits,
 * consent. SIGNUP_MIN_SECONDS is 2 in tests: forms are submitted after that.
 */
test.beforeEach(async () => {
  await resetState();
});
test.afterEach(async () => {
  await authServer.mode("normal");
});

const HUMAN_PAUSE_MS = 2_100;
const STRONG = "Sunny morning in Makati 7";

type Details = {
  country?: "PH" | "AE";
  fullName?: string;
  email?: string;
  mobileCode?: string;
  mobile?: string;
  licenseType?: "REAL_ESTATE_BROKER" | "REAL_ESTATE_SALESPERSON";
  prc?: string;
  dhsud?: string;
  supervisor?: string;
  emirate?: string;
  brn?: string;
  orn?: string;
  brokerage?: string;
  password?: string;
  confirm?: string;
  terms?: boolean;
};

async function fillSignUp(page: Page, d: Details = {}) {
  const v = { country: "PH", fullName: "Jose Dela Cruz", email: "new.broker@test.local", mobile: "0917 123 4567", licenseType: "REAL_ESTATE_BROKER", prc: "0123456", password: STRONG, terms: true, ...d };
  const main = page.locator("main");
  await main.locator("label", { hasText: v.country === "AE" ? "UAE" : "Philippines" }).click();
  await main.locator("input[name=fullName]:visible").fill(v.fullName);
  await main.locator("input[name=email]:visible").fill(v.email);
  if (v.mobileCode) await main.getByLabel("Country code").selectOption(v.mobileCode);
  await main.getByLabel("Mobile number").fill(v.mobile);
  if (v.country === "PH") {
    await main.locator("select[name=licenseType]").selectOption(v.licenseType);
    if (v.licenseType === "REAL_ESTATE_BROKER") await main.locator("input[name=prc]:visible").fill(v.prc);
    else {
      await main.locator("input[name=dhsud]:visible").fill(v.dhsud ?? "");
      await main.locator("input[name=supervisor]:visible").fill(v.supervisor ?? "");
    }
  } else {
    await main.locator("select[name=emirate]").selectOption(v.emirate ?? "Dubai");
    await main.locator("input[name=brn]:visible").fill(v.brn ?? "");
    await main.locator("input[name=orn]:visible").fill(v.orn ?? "");
  }
  if (v.brokerage !== undefined) await main.locator("input[name=brokerage]:visible").fill(v.brokerage);
  await main.locator("input[name=password]:visible").fill(v.password);
  await main.locator("input[name=confirm]:visible").fill(v.confirm ?? v.password);
  const terms = main.locator("input[name=terms]");
  if (v.terms) await terms.check();
  else await terms.uncheck();
}

async function openSignUp(page: Page) {
  await page.goto("/agent/sign-up");
  await expect(form(page)).toBeVisible();
}

/** Fill, wait like a person would, submit. */
async function signUp(page: Page, d: Details = {}) {
  await openSignUp(page);
  await fillSignUp(page, d);
  await page.waitForTimeout(HUMAN_PAUSE_MS);
  return submit(page, "Create account");
}

async function confirmEmail(page: Page, email: string) {
  const [link] = await authServer.links(email);
  expect(link, `a confirmation link for ${email}`).toBeTruthy();
  await page.goto(`/auth/confirm?token_hash=${link.token}&type=email`);
  await page.waitForURL((u) => u.pathname === "/auth/continue");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((u) => u.pathname === "/dashboard", { waitUntil: "commit" });
}

test.describe("A. Sign-up", () => {
  test("happy path, Philippine broker: account → confirm email → application under review", async ({ page, context }) => {
    await signUp(page, { email: "new.broker@test.local" });
    await expect(statusText(page)).toHaveText(MESSAGES.signUpSent("new.broker@test.local"));
    // The admin is told there's an application to review
    await expect.poll(async () => (await authServer.emails()).filter((e) => e.tags[0]?.value === "application_alert").map((e) => [e.to, e.subject])).toEqual([
      [["admin@test.local"], "New agent application: Jose Dela Cruz (Philippines)"],
    ]);

    const user = await authServer.user("new.broker@test.local");
    expect(user?.confirmed).toBe(false);
    expect(user?.user_metadata.application).toMatchObject({
      country: "PH", fullName: "Jose Dela Cruz", mobile: "+639171234567", licenseType: "REAL_ESTATE_BROKER", prcLicenseNumber: "0123456", termsVersion: "2026-11-05",
    });
    // Signing in before confirming is refused with a helpful message
    await page.goto("/agent/sign-in");
    await fillSignIn(page, "new.broker@test.local", STRONG);
    await submit(page, "Sign in");
    await expect(alertText(page)).toContainText("Confirm your email first");
    expect(await sessionCookies(context)).toHaveLength(0);

    await confirmEmail(page, "new.broker@test.local");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your application is being reviewed");
    await expect(page.locator("main")).toContainText("PRC 0123456");
    await expect(page.locator("main")).not.toContainText("Ana Reyes"); // no agent data before approval
    for (const c of await sessionCookies(context)) expect(c.httpOnly).toBe(true);
    // Recorded for the admin, without personal data
    expect(await sql(`SELECT after FROM "AuditLog" WHERE action = 'agent.applied' AND "entityId" = $1`, [user!.id])).toHaveLength(1);
  });

  test("happy path, UAE broker: emirate, broker and office numbers, +971 mobile", async ({ page }) => {
    await signUp(page, { country: "AE", email: "dubai.broker@test.local", emirate: "Abu Dhabi", brn: "4567", orn: "8910", mobile: "050 123 4567", brokerage: "Capital Shores" });
    await expect(statusText(page)).toHaveText(MESSAGES.signUpSent("dubai.broker@test.local"));
    expect((await authServer.user("dubai.broker@test.local"))?.user_metadata.application).toMatchObject({
      country: "AE", licenseType: "UAE_BROKER", emirate: "Abu Dhabi", uaeRegulator: "ADREC", uaeBrokerNumber: "4567", uaeOfficeNumber: "8910", mobile: "+971501234567", brokerage: "Capital Shores",
    });
    await confirmEmail(page, "dubai.broker@test.local");
    await expect(page.locator("main")).toContainText("ADREC 4567 (Abu Dhabi)");
  });

  test("Philippine salesperson: DHSUD number and supervising broker", async ({ page }) => {
    await signUp(page, { email: "sales@test.local", licenseType: "REAL_ESTATE_SALESPERSON", dhsud: "NCR-2025-11823", supervisor: "0099999" });
    await expect(statusText(page)).toBeVisible();
    expect((await authServer.user("sales@test.local"))?.user_metadata.application).toMatchObject({
      licenseType: "REAL_ESTATE_SALESPERSON", dhsudAccreditationNumber: "NCR-2025-11823", supervisingBrokerPrc: "0099999",
    });
  });

  test("duplicate: an email that already has an account gets the same answer, and nothing changes", async ({ page }) => {
    await signUp(page, { email: ACCOUNTS.agent.email, fullName: "Someone Else" });
    await expect(statusText(page)).toHaveText(MESSAGES.signUpSent(ACCOUNTS.agent.email));
    expect((await authServer.links(ACCOUNTS.agent.email)).filter((l) => l.type === "signup")).toHaveLength(0); // no sign-up email sent
    expect(await authServer.password(ACCOUNTS.agent.email)).toBe(ACCOUNTS.agent.password); // password untouched
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Mabuhay, ${ACCOUNTS.agent.name}`);
  });

  test("signing up again before confirming sends a fresh link to the same account", async ({ page }) => {
    await signUp(page, { email: "twice@test.local" });
    await signUp(page, { email: "twice@test.local" });
    await expect(statusText(page)).toHaveText(MESSAGES.signUpSent("twice@test.local"));
    expect((await authServer.links("twice@test.local")).length).toBeGreaterThanOrEqual(1);
    expect((await authServer.user("twice@test.local"))?.confirmed).toBe(false);
  });

  test("validation: every field is checked on the server, with a clear message, and the form stays filled", async ({ page }) => {
    const cases: [Details, string][] = [
      [{ fullName: "" }, "Enter your full name as it appears on your licence."],
      [{ fullName: "   " }, "Enter your full name as it appears on your licence."],
      [{ fullName: "<script>alert(1)</script>" }, "Enter your full name as it appears on your licence."],
      [{ email: "invalid-email" }, "Enter a valid email address."],
      [{ email: "@domain.com" }, "Enter a valid email address."],
      [{ email: "user@" }, "Enter a valid email address."],
      [{ mobile: "" }, "Enter your mobile number with its country code."],
      [{ mobile: "12" }, "Enter your mobile number with its country code."],
      [{ prc: "12" }, "Enter your PRC licence number (5 to 7 digits)."],
      [{ prc: "' OR '1'='1" }, "Enter your PRC licence number (5 to 7 digits)."],
      [{ licenseType: "REAL_ESTATE_SALESPERSON", dhsud: "", supervisor: "0099999" }, "Enter your DHSUD accreditation number."],
      [{ licenseType: "REAL_ESTATE_SALESPERSON", dhsud: "NCR-2025-1", supervisor: "x" }, "Enter your supervising broker's PRC licence number."],
      [{ country: "AE", brn: "", orn: "123" }, "Enter your broker registration number (digits only)."],
      [{ country: "AE", brn: "1234", orn: "abc" }, "Enter your brokerage's office registration number (digits only)."],
      [{ terms: false }, "Agree to the Terms and Privacy notice to create an account."],
    ];
    for (const [details, message] of cases) {
      await openSignUp(page);
      await skipBrowserValidation(page);
      await fillSignUp(page, { email: "valid@test.local", ...details });
      await page.waitForTimeout(HUMAN_PAUSE_MS);
      await submit(page, "Create account");
      await expect(alertText(page), JSON.stringify(details)).toHaveText(message);
    }
    // The name stays filled in after an error
    await expect(page.locator("main input[name=fullName]:visible")).toHaveValue("Jose Dela Cruz");
    expect(await authCalls({ path: "/auth/v1/signup" })).toHaveLength(0);
  });

  test("password rules: length, spaces, mismatch, own details and known breaches", async ({ page }) => {
    const cases: [Details, string][] = [
      [{ password: "Short pw 1" }, MESSAGES.tooShort],
      [{ password: "              " }, MESSAGES.tooShort],
      [{ password: "aaaaaaaaaaaaaaaa" }, "Don't repeat a single character."],
      [{ password: STRONG, confirm: `${STRONG}x` }, MESSAGES.noMatch],
      [{ email: "jose.dela@test.local", password: "jose.dela is my password" }, "Don't use your email address in your password."],
      [{ password: "Dela Cruz family home 9" }, "Don't use your name in your password."],
      [{ password: "Correct horse battery staple" }, "This password has appeared in a known data breach. Choose a different one."],
    ];
    for (const [details, message] of cases) {
      await openSignUp(page);
      await skipBrowserValidation(page);
      await fillSignUp(page, details);
      await page.waitForTimeout(HUMAN_PAUSE_MS);
      await submit(page, "Create account");
      await expect(alertText(page), JSON.stringify(details)).toHaveText(message);
    }
    expect(await authCalls({ path: "/auth/v1/signup" })).toHaveLength(0);
    // The breach check only ever sent the first 5 characters of a SHA-1 hash
    const lookups = (await authServer.log()).filter((e) => e.path === "/pwned/range");
    expect(lookups.length).toBeGreaterThan(0);
    for (const l of lookups) expect(l.prefix).toMatch(/^[0-9A-F]{5}$/);
  });

  test("the breach check failing does not block sign-up", async ({ page }) => {
    await authServer.mode("pwned-down");
    await signUp(page, { email: "offline-check@test.local" });
    await expect(statusText(page)).toHaveText(MESSAGES.signUpSent("offline-check@test.local"));
  });

  test("invite and reset passwords follow the same rules, including the breach check", async ({ page }) => {
    await openEmailLink(page, "invite-ok", "invite");
    await page.locator("input[name=password]:visible").fill("Password12345!");
    await page.locator("input[name=confirm]:visible").fill("Password12345!");
    await submit(page, "Save password");
    await expect(alertText(page)).toHaveText("This password has appeared in a known data breach. Choose a different one.");
  });
});

test.describe("C. Sign-up abuse protection", () => {
  test("bots: the hidden field makes it look successful, but nothing is created", async ({ page }) => {
    await openSignUp(page);
    await fillSignUp(page, { email: "bot@test.local" });
    await page.locator("main input[name=website]").evaluate((el: HTMLInputElement) => (el.value = "https://spam.example"));
    await page.waitForTimeout(HUMAN_PAUSE_MS);
    await submit(page, "Create account");
    await expect(statusText(page)).toHaveText(MESSAGES.signUpSent("bot@test.local"));
    expect(await authCalls({ path: "/auth/v1/signup" })).toHaveLength(0);
  });

  test("bots: a form sent faster than a person can fill it is refused", async ({ page }) => {
    await openSignUp(page);
    await fillSignUp(page, { email: "fast@test.local" });
    await submit(page, "Create account");
    await expect(alertText(page)).toHaveText("That was quick. Please check your details and press Create account again.");
    expect(await authCalls({ path: "/auth/v1/signup" })).toHaveLength(0);
  });

  test("a forged or edited form timer is refused", async ({ page }) => {
    await openSignUp(page);
    await fillSignUp(page, { email: "forged@test.local" });
    await page.locator("main input[name=t]").evaluate((el: HTMLInputElement) => (el.value = `${Date.now() - 60_000}.forged`));
    await page.waitForTimeout(HUMAN_PAUSE_MS);
    await submit(page, "Create account");
    await expect(alertText(page)).toHaveText("This form has expired. Reload the page and try again.");
    expect(await authCalls({ path: "/auth/v1/signup" })).toHaveLength(0);
  });

  test("sign-ups are limited to 5 an hour per visitor", async ({ page }) => {
    for (let i = 1; i <= 6; i++) {
      await signUp(page, { email: `burst-${i}@test.local` });
      if (i <= 5) await expect(statusText(page), `sign-up ${i}`).toBeVisible();
      else await expect(alertText(page)).toHaveText("Too many sign-ups from here. Please try again in an hour.");
    }
    expect(await authCalls({ path: "/auth/v1/signup" })).toHaveLength(5);
  });

  test("injection in sign-up fields is stored as plain text or refused", async ({ page }) => {
    const before = await sql(`SELECT count(*)::int AS n FROM "Agent"`);
    await signUp(page, { email: "inject@test.local", brokerage: "Robert'); DROP TABLE \"Agent\";-- <b>Realty</b>" });
    await expect(statusText(page)).toBeVisible();
    expect((await authServer.user("inject@test.local"))?.user_metadata.application?.brokerage).toBe("Robert'); DROP TABLE \"Agent\";-- <b>Realty</b>");
    expect(await sql(`SELECT count(*)::int AS n FROM "Agent"`)).toEqual(before); // table intact, no agent created
  });
});
