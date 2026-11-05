import { ACCOUNTS, authServer, expect, resetState, signIn, sql, test } from "./support/helpers";

/**
 * The admin screen for agent applications (/admin/agents): only ADMIN_EMAILS
 * can see it; approving creates a verified agent and emails them; declining
 * records the reason, shows it to the applicant and emails them.
 * Applications are written straight into the test auth.users table.
 */
const BROKER = "11111111-1111-4111-8111-111111111111";
const SALES = "22222222-2222-4222-8222-222222222222";
const UNCONFIRMED = "33333333-3333-4333-8333-333333333333";

const app = (a: Record<string, string>) => JSON.stringify({ application: { consentedAt: "2026-11-05T00:00:00Z", termsVersion: "2026-11-05", ...a } });

const cleanUp = async () => {
  const ids = [BROKER, SALES, UNCONFIRMED];
  await sql(`DELETE FROM "Agent" WHERE "userId" = ANY($1)`, [ids]);
  await sql(`DELETE FROM "User" WHERE id = ANY($1)`, [ids]);
  await sql(`DELETE FROM "ApplicationDecision" WHERE "userId" = ANY($1)`, [ids]);
  await sql(`DELETE FROM auth.users WHERE id = ANY($1::uuid[])`, [ids]);
};

test.beforeEach(async () => {
  await resetState();
  await cleanUp();
  await sql(
    `INSERT INTO auth.users (id, email, email_confirmed_at, created_at, raw_user_meta_data) VALUES
       ($1, 'jose.broker@test.local', now(), now() - interval '3 hours', $4),
       ($2, 'lea.sales@test.local', now(), now() - interval '2 hours', $5),
       ($3, 'khalid.uae@test.local', NULL, now() - interval '1 hour', $6)`,
    [
      BROKER, SALES, UNCONFIRMED,
      app({ country: "PH", fullName: "Jose Dela Cruz", mobile: "+639171112222", licenseType: "REAL_ESTATE_BROKER", prcLicenseNumber: "0456789", brokerage: "Dela Cruz Realty" }),
      app({ country: "PH", fullName: "Lea Santos", mobile: "+639173334444", licenseType: "REAL_ESTATE_SALESPERSON", dhsudAccreditationNumber: "NCR-12345", supervisingBrokerPrc: "0777777" }),
      app({ country: "AE", fullName: "Khalid Hassan", mobile: "+971501112222", licenseType: "UAE_BROKER", emirate: "Dubai", uaeRegulator: "RERA BRN", uaeBrokerNumber: "77777", uaeOfficeNumber: "8888" }),
    ],
  );
});
test.afterAll(cleanUp);

const card = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("list", { name: "Applications" }).getByRole("listitem").filter({ has: page.getByRole("heading", { name }) });

test.describe("Admin: agent applications", () => {
  test("agents and visitors can't open it", async ({ page }) => {
    const anon = await page.request.get("/admin/agents", { maxRedirects: 0 });
    expect(anon.status()).toBe(307);
    expect(anon.headers().location).toContain("/agent/sign-in");

    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    await page.goto("/admin/agents");
    await expect(page.getByRole("heading", { name: "Agent applications" })).toHaveCount(0);
    await expect(page.getByText("Jose Dela Cruz")).toHaveCount(0);
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Applications" })).toHaveCount(0);
  });

  test("an admin approves a licensed broker; blocked cases can't be approved; a decline is shown to the applicant", async ({ page }) => {
    await signIn(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Admin");
    await page.getByRole("link", { name: "Review agent applications" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Agent applications");
    await expect(page.getByRole("list", { name: "Applications" }).getByRole("heading", { level: 2 })).toHaveText(["Jose Dela Cruz", "Lea Santos", "Khalid Hassan"]);

    // Not approvable: unconfirmed email, and a salesperson whose broker isn't approved yet
    await expect(card(page, "Khalid Hassan")).toContainText("Email not confirmed yet");
    await expect(card(page, "Khalid Hassan").getByRole("button", { name: "Approve Khalid Hassan" })).toBeDisabled();
    await expect(card(page, "Lea Santos")).toContainText("supervising broker not approved yet");
    await expect(card(page, "Lea Santos").getByRole("button", { name: "Approve Lea Santos" })).toBeDisabled();

    // Approve the broker: a verified agent with the application's details, audited and emailed
    const jose = card(page, "Jose Dela Cruz");
    await expect(jose).toContainText("PRC broker licence 0456789");
    await jose.getByRole("button", { name: "Approve Jose Dela Cruz" }).click();
    await expect(page.getByText("Jose Dela Cruz is approved. They can sign in and list now.")).toBeVisible();
    const [agent] = await sql<Record<string, unknown>>(
      `SELECT a."licenseType"::text AS type, a."prcLicenseNumber" AS prc, a."displayName" AS name, a.mobile, a.verification::text AS v, u.role::text AS role, u.email
         FROM "Agent" a JOIN "User" u ON u.id = a."userId" WHERE a."userId" = $1`, [BROKER]);
    expect(agent).toEqual({ type: "REAL_ESTATE_BROKER", prc: "0456789", name: "Jose Dela Cruz", mobile: "+639171112222", v: "VERIFIED", role: "AGENT", email: "jose.broker@test.local" });
    const audit = await sql<{ after: { by: string } }>(`SELECT after FROM "AuditLog" WHERE action = 'agent.verified' AND after->>'userId' = $1`, [BROKER]);
    expect(audit[0].after.by).toBe("admin@test.local");
    await expect.poll(async () => (await authServer.emails()).filter((e) => e.tags[0]?.value === "agent_approved").map((e) => e.to)).toEqual([["jose.broker@test.local"]]);

    // Decline, with a reason the applicant sees
    await page.reload();
    await expect(page.getByRole("list", { name: "Applications" }).getByRole("heading", { level: 2 })).toHaveText(["Lea Santos", "Khalid Hassan"]);
    const khalid = card(page, "Khalid Hassan");
    await khalid.getByLabel("Reason for declining Khalid Hassan").fill("Broker number 77777 isn't on the DLD register.");
    await khalid.getByRole("button", { name: "Decline Khalid Hassan" }).click();
    await expect(page.getByText("Khalid Hassan's application was declined.")).toBeVisible();
    expect(await sql(`SELECT decision, reason, "decidedBy" FROM "ApplicationDecision" WHERE "userId" = $1`, [UNCONFIRMED])).toEqual([
      { decision: "REJECTED", reason: "Broker number 77777 isn't on the DLD register.", decidedBy: "admin@test.local" },
    ]);
    await expect.poll(async () => (await authServer.emails()).filter((e) => e.tags[0]?.value === "agent_rejected").map((e) => e.to)).toEqual([["khalid.uae@test.local"]]);
    const rejected = (await authServer.emails()).find((e) => e.tags[0]?.value === "agent_rejected")!;
    expect(rejected.text).toContain("Reason: Broker number 77777 isn't on the DLD register.");
    await page.reload();
    await expect(page.getByRole("list", { name: "Applications" }).getByRole("heading", { level: 2 })).toHaveText(["Lea Santos"]);
  });
});
