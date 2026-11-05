import { authServer, expect, resetState, sql, test } from "./support/helpers";

/**
 * The public site in both countries, run against the test database's two
 * listings: test-bgc-2br-condo (Philippines) and test-dubai-marina-2br (UAE).
 */
test.beforeEach(async () => {
  await resetState();
});

const PH = { slug: "test-bgc-2br-condo", title: "Test 2BR condo in BGC" };
const AE = { slug: "test-dubai-marina-2br", title: "Test 2BR marina apartment" };

test.describe("Country selector", () => {
  test("shows the country with its calling code, and switches country", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: /^Country: Philippines \(\+63\)/ });
    await expect(button).toBeVisible();
    await expect(button).toContainText("+63");

    await button.click();
    const menu = page.getByRole("list", { name: "Choose a country" });
    await expect(menu.getByRole("link")).toHaveText([/Philippines\s*\+63/, /United Arab Emirates\s*\+971/]);
    await menu.getByRole("link", { name: /United Arab Emirates/ }).click();
    await expect(page).toHaveURL(/\/uae$/);
    await expect(page.getByRole("button", { name: /^Country: United Arab Emirates \(\+971\)/ })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "UAE listings" })).toContainText("Off-plan");
  });

  test("closes with Escape or a click elsewhere, and is keyboard reachable", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: /^Country:/ });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.click();
    await page.locator("main").click({ position: { x: 5, y: 5 } });
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("a property page sets the country from its listing, and it is remembered", async ({ page }) => {
    await page.goto(`/property/${AE.slug}`);
    await expect(page.getByRole("button", { name: /^Country: United Arab Emirates/ })).toBeVisible();
    await page.goto("/about");
    await expect(page.getByRole("button", { name: /^Country: United Arab Emirates/ })).toBeVisible();
  });

  test("fits on a phone without sideways scrolling", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 780 }, bypassCSP: true, baseURL: test.info().project.use.baseURL });
    const p = await context.newPage();
    for (const path of ["/", "/uae", `/property/${AE.slug}`, "/agent/sign-up", "/pricing", "/uae/pricing"]) {
      await p.goto(path);
      expect(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
    }
    await context.close();
  });
});

test.describe("Home page by location", () => {
  const from = (country: string) => ({ extraHTTPHeaders: { "x-vercel-ip-country": country } });

  test.describe("a visitor in the UAE", () => {
    test.use(from("AE"));
    test("opens the UAE home page, and can still choose the Philippines", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/uae$/);
      await expect(page.getByRole("button", { name: /^Country: United Arab Emirates/ })).toBeVisible();

      // Picking the Philippines is remembered, so "/" no longer follows the location
      await page.getByRole("button", { name: /^Country:/ }).click();
      await page.getByRole("list", { name: "Choose a country" }).getByRole("link", { name: /Philippines/ }).click();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("button", { name: /^Country: Philippines/ })).toBeVisible();
      await page.goto("/");
      await expect(page).toHaveURL(/\/$/);
      expect((await page.context().cookies()).find((c) => c.name === "gsp_country")?.value).toBe("PH");
    });

    test("search engines and link previews are not redirected", async ({ request }) => {
      const r = await request.get("/", { maxRedirects: 0, headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" } });
      expect(r.status()).toBe(200);
      const human = await request.get("/", { maxRedirects: 0 });
      expect(human.status()).toBe(307);
      expect(human.headers().location).toMatch(/\/uae$/);
      expect(human.headers()["cache-control"]).toContain("no-store");
    });
  });

  test.describe("a visitor in the Philippines", () => {
    test.use(from("PH"));
    test("opens the Philippine home page, and a UAE choice is remembered", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("button", { name: /^Country: Philippines/ })).toBeVisible();
      await page.getByRole("button", { name: /^Country:/ }).click();
      await page.getByRole("list", { name: "Choose a country" }).getByRole("link", { name: /United Arab Emirates/ }).click();
      await expect(page).toHaveURL(/\/uae$/);
      await page.goto("/");
      await expect(page).toHaveURL(/\/uae$/);
    });
  });

  test("visitors elsewhere get the Philippine home page", async ({ request }) => {
    for (const country of ["US", "SA", ""]) {
      const r = await request.get("/", { maxRedirects: 0, headers: country ? { "x-vercel-ip-country": country } : {} });
      expect(r.status(), country || "no location").toBe(200);
    }
  });
});

test.describe("Listings in both countries", () => {
  test("each home page shows only its own country's listings", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).toContainText(PH.title);
    await expect(page.locator("main")).not.toContainText(AE.title);
    await page.goto("/uae");
    await expect(page.locator("main")).toContainText(AE.title);
    await expect(page.locator("main")).not.toContainText(PH.title);
  });

  test("search covers places inside a place, per country", async ({ page }) => {
    await page.goto("/search?location=Metro%20Manila");
    await expect(page.locator("main")).toContainText(PH.title);
    await page.goto("/uae/search?location=Dubai");
    await expect(page.locator("main")).toContainText(AE.title);
    await page.goto("/search?location=Dubai");
    await expect(page.locator("main")).not.toContainText(AE.title);
  });

  test("Philippine listing: pesos, square metres, PRC licence, Viber and WhatsApp", async ({ page }) => {
    await page.goto(`/property/${PH.slug}`);
    const main = page.locator("main");
    await expect(main).toContainText("₱12.5M");
    await expect(main).toContainText("sqm");
    await expect(main).toContainText("PRC 0099999");
    await expect(main.getByRole("link", { name: /Viber/ }).first()).toBeVisible();
  });

  test("UAE listing: dirhams, square feet, Trakheesi permit, BRN and ORN, WhatsApp only", async ({ page }) => {
    await page.goto(`/property/${AE.slug}`);
    const main = page.locator("main");
    await expect(main).toContainText("AED 2.45M");
    await expect(main).toContainText("sqft");
    await expect(main).toContainText("DLD Trakheesi permit");
    await expect(main).toContainText("7100001234");
    await expect(main).toContainText("RERA BRN 12345");
    await expect(main).toContainText("RERA ORN 6789");
    await expect(main).not.toContainText("₱");
    await expect(main.getByRole("link", { name: /Viber/ })).toHaveCount(0);
  });

  test("a suspended agent's listings disappear everywhere at once, and come back when reinstated", async ({ page, request }) => {
    try {
      await sql(`UPDATE "Agent" SET verification = 'REJECTED' WHERE id = 'a_new'`);
      await page.goto(`/property/${AE.slug}`);
      await expect(page.locator("main")).toContainText("This page isn't here");
      await expect(page.locator("main")).not.toContainText("AED 2.45M");
      // The home page's list is cached and refreshes in the background, so it follows within moments
      await expect(async () => {
        await page.goto("/uae");
        await expect(page.locator("main")).not.toContainText(AE.title, { timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
      await page.goto("/uae/search?location=Dubai");
      await expect(page.locator("main")).not.toContainText(AE.title);
      expect(await (await request.get("/sitemap.xml")).text()).not.toContain(AE.slug);
      // Chat links and inquiries treat the listing as gone too
      const chat = await request.get(`/api/ph/leads/whatsapp?listing=p_ae`, { maxRedirects: 0 });
      expect(chat.headers().location).toMatch(/\/search$/);
      const lead = await request.post("/api/ph/leads", { data: { listingId: "p_ae", name: "Ana", email: "ana@example.com", consent: true } });
      expect(lead.status()).toBe(404);
    } finally {
      await sql(`UPDATE "Agent" SET verification = 'VERIFIED' WHERE id = 'a_new'`);
    }
    await page.goto(`/property/${AE.slug}`);
    await expect(page.locator("main")).toContainText("AED 2.45M");
    await expect(async () => {
      await page.goto("/uae");
      await expect(page.locator("main")).toContainText(AE.title, { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
  });

  test("home pages are prerendered and served from cache, not rendered per visit", async ({ request }) => {
    for (const path of ["/", "/uae"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const cc = res.headers()["cache-control"] ?? "";
      expect(cc, `${path} cache-control`).not.toMatch(/no-store|private/);
      expect(cc, `${path} cache-control`).toMatch(/s-maxage=\d+/);
    }
  });

  test("an unknown listing shows the not-found page and is not indexed", async ({ page }) => {
    await page.goto("/property/no-such-listing");
    await expect(page.locator("main")).toContainText("This page isn't here");
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });
});

test.describe("Inquiries and saved homes", () => {
  test("an inquiry is stored, with the mobile in international form from the country-code picker", async ({ page }) => {
    await page.goto(`/property/${PH.slug}`);
    const card = page.locator("aside form");
    await card.locator("input[name=name]").fill("Ana Buyer");
    await card.locator("input[name=email]").fill("ana.buyer@example.com");
    await expect(card.getByLabel("Country code")).toHaveValue("PH");
    await card.getByLabel("Mobile number (optional)").fill("0917 765 4321");
    await card.locator("input[name=consent]").check();
    const res = page.waitForResponse((r) => r.url().endsWith("/api/ph/leads") && r.request().method() === "POST");
    await card.getByRole("button", { name: "Send inquiry" }).click();
    expect((await res).status()).toBe(201);
    await expect(page.locator("aside")).toContainText("Inquiry sent.");
    const [lead] = await sql<{ mobile: string; agentId: string }>(`SELECT mobile, "agentId" FROM "Lead" WHERE email = 'ana.buyer@example.com'`);
    expect(lead).toEqual({ mobile: "+639177654321", agentId: "a_agent" });
    // The agent gets an email they can reply to
    await expect.poll(async () => (await authServer.emails()).filter((e) => e.tags[0]?.value === "lead_alert")).toHaveLength(1);
    const [mail] = (await authServer.emails()).filter((e) => e.tags[0]?.value === "lead_alert");
    expect(mail).toMatchObject({ to: ["agent@test.local"], reply_to: "ana.buyer@example.com", subject: `New inquiry: ${PH.title}`, from: "Go Search Property <hello@test.local>" });
    expect(mail.text).toContain("Mobile: +639177654321");
  });

  test("a UAE inquiry defaults to +971", async ({ page }) => {
    await page.goto(`/property/${AE.slug}`);
    await expect(page.locator("aside form").getByLabel("Country code")).toHaveValue("AE");
  });

  test("the heart saves a listing on this device", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: `Save ${PH.title}` }).click();
    await expect(page.getByRole("link", { name: "Saved properties (1)" })).toBeVisible();
    await page.goto("/saved");
    await expect(page.locator("main")).toContainText(PH.title);
  });
});

test.describe("Plans for agents", () => {
  test("the Philippine page shows dollar plans, the launch offer and VAT, and links to sign-up", async ({ page }) => {
    await page.goto("/pricing");
    const main = page.locator("main");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plans for agents and brokers");
    const plans = main.getByRole("list", { name: "Plans" }).getByRole("listitem").filter({ has: page.getByRole("heading", { level: 2 }) });
    await expect(plans.getByRole("heading", { level: 2 })).toHaveText(["Starter", "Pro", "Brokerage"]);
    await expect(plans.nth(0)).toContainText("Free");
    await expect(plans.nth(1)).toContainText("$14");
    await expect(plans.nth(1)).toContainText("$140");
    await expect(plans.nth(2)).toContainText("$44");
    await expect(main).toContainText("Pro free until 31 March 2027");
    await expect(main).toContainText("Prices in US dollars (USD), before VAT (12% where it applies)");
    await expect(page.locator('main ul[aria-label="Plans"]:visible')).not.toContainText(/AED|₱/);
    await expect(plans.nth(0).getByRole("link", { name: "Create a free account" })).toHaveAttribute("href", "/agent/sign-up");
    await expect(plans.nth(2).getByRole("link", { name: "Get Brokerage" })).toHaveAttribute("href", "/dashboard/billing");
    await expect(page.getByRole("button", { name: /^Country: Philippines/ })).toBeVisible();
  });

  test("the UAE page shows its own dollar plans with 5% VAT, and each page links to the other country", async ({ page }) => {
    await page.goto("/pricing");
    await page.getByRole("link", { name: /Prices for UAE/ }).click();
    await expect(page).toHaveURL(/\/uae\/pricing$/);
    const main = page.locator("main");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plans for brokers");
    await expect(main).toContainText("$79");
    await expect(main).toContainText("$269");
    await expect(main).toContainText("VAT (5% where it applies)");
    await expect(main).toContainText("advertising permit");
    // The Philippine page stays mounted but hidden after the client-side navigation: check what is visible
    await expect(page.locator('main ul[aria-label="Plans"]:visible')).not.toContainText("₱");
    await expect(page.getByRole("button", { name: /^Country: United Arab Emirates/ })).toBeVisible();
    await page.getByRole("link", { name: /Prices for Philippines/ }).click();
    await expect(page).toHaveURL(/\/pricing$/);
  });

  test("plans are linked from the footer, sign-up and the sitemap", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator("footer").getByRole("link", { name: "Plans and pricing" })).toHaveAttribute("href", "/pricing");
    await page.goto("/agent/sign-up");
    await expect(page.locator("main").getByRole("link", { name: "see plans" })).toHaveAttribute("href", "/pricing");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/pricing</loc>");
    expect(sitemap).toContain("/uae/pricing</loc>");
  });
});

test.describe("Site health", () => {
  test("health check, robots and sitemap", async ({ request }) => {
    const health = await (await request.get("/api/health")).json();
    expect(health).toMatchObject({ status: "ok", database: "ok" });
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /agent/");
    expect(robots).toContain("Sitemap:");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(`/property/${PH.slug}`);
    expect(sitemap).toContain(`/property/${AE.slug}`);
    expect(sitemap).toContain("/uae/search");
  });

  test("every footer link opens", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = [...new Set(await page.locator("footer a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? "")))].filter((h) => h.startsWith("/"));
    expect(hrefs.length).toBeGreaterThan(10);
    for (const href of hrefs) expect((await request.get(href.split("#")[0])).status(), href).toBeLessThan(400);
  });

  test("main pages load without browser errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const path of ["/", "/uae", "/search", "/uae/search", "/calculator", "/uae/calculator", "/pricing", "/uae/pricing", `/property/${PH.slug}`, `/property/${AE.slug}`, "/about", "/contact", "/terms", "/privacy", "/agent/sign-up"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
    }
    expect(errors).toEqual([]);
  });

  test("inquiries are rate limited without crashing", async ({ request }) => {
    const body = { listingId: "p_ph", name: "Spam", email: "spam@example.com", consent: true };
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await request.post("/api/ph/leads", { data: body, headers: { "x-real-ip": "203.0.113.77" } })).status());
    expect(codes.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(codes.slice(5)).toEqual([429, 429]);
  });
});

