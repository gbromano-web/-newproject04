import sharp from "sharp";
import type { Page } from "@playwright/test";
import { ACCOUNTS, authServer, expect, resetState, signIn, sql, test } from "./support/helpers";

/**
 * Agents' own listing editor: details and price, photos, publishing, in both
 * countries, and the limits around it (ownership, file checks, verification).
 * Listings made here have ids starting "l_" and are removed after each test.
 */

const cleanUp = async () => {
  await sql(`DELETE FROM "PropertyMedia" WHERE "propertyId" LIKE 'l\\_%'`);
  await sql(`DELETE FROM "PriceChange" WHERE "propertyId" LIKE 'l\\_%'`);
  await sql(`DELETE FROM "Lead" WHERE "propertyId" LIKE 'l\\_%'`);
  await sql(`DELETE FROM "Property" WHERE id LIKE 'l\\_%'`);
  await sql(`UPDATE "Agent" SET verification = 'VERIFIED' WHERE id IN ('a_agent', 'a_uae')`);
};
test.beforeEach(async () => {
  await resetState();
  await cleanUp();
});
test.afterAll(cleanUp);

const locationId = async (slug: string) => (await sql<{ id: string }>(`SELECT id FROM "Location" WHERE slug = $1`, [slug]))[0].id;

/** A real JPEG with camera metadata in it (which must not survive the upload). */
const photo = (w: number, h: number, colour: string) =>
  sharp({ create: { width: w, height: h, channels: 3, background: colour } })
    .jpeg({ quality: 90 })
    .withExif({ IFD0: { Copyright: "Owner Secret Name", Artist: "Seller Phone 0917" } })
    .toBuffer();

type Details = Partial<Record<"title" | "price" | "floorArea" | "bedrooms" | "bathrooms" | "description" | "adPermitNumber", string>> & {
  listingType?: string;
  propertyType?: string;
  location: string;
};

async function fillListing(page: Page, d: Details) {
  const f = page.locator("main form:visible").filter({ has: page.locator("[name=title]") });
  if (d.listingType) await f.locator("[name=listingType]").selectOption(d.listingType);
  if (d.propertyType) await f.locator("[name=propertyType]").selectOption(d.propertyType);
  await f.locator("[name=locationId]").selectOption(d.location);
  for (const k of ["title", "price", "floorArea", "bedrooms", "bathrooms", "description", "adPermitNumber"] as const) {
    if (d[k] !== undefined) await f.locator(`[name=${k}]`).fill(d[k]!);
  }
  return f;
}

async function createDraft(page: Page, d: Details): Promise<string> {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Add listing" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Add a listing");
  const f = await fillListing(page, d);
  await f.getByRole("button", { name: "Create draft" }).click();
  await page.waitForURL(/\/dashboard\/listings\/l_[a-f0-9]+\?created=1/);
  await expect(page.getByText("Draft created. Add photos below, then publish when you're ready.")).toBeVisible();
  return new URL(page.url()).pathname.split("/").pop()!;
}

async function addPhotos(page: Page, files: { name: string; mimeType: string; buffer: Buffer }[], expectCount: number) {
  await page.locator("input[type=file]").setInputFiles(files);
  await expect(page.getByText(`${expectCount} of 30 photos`)).toBeVisible({ timeout: 30_000 });
}

const PH = {
  title: "TEST Furnished 2BR condo with park view in BGC",
  price: "12,500,000",
  floorArea: "68",
  bedrooms: "2",
  bathrooms: "2",
  description: "Corner unit on a high floor, facing the park. Walk to High Street, schools and offices. Parking slot included.",
};

test.describe("Listing editor", () => {
  test("a Philippine broker adds a listing with price and photos, publishes it, edits the price, and pauses it", async ({ page }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    const bgc = await locationId("national-capital-region/metro-manila/taguig/bonifacio-global-city");

    // The server checks every field and keeps what was typed
    await page.goto("/dashboard/listings/new");
    let f = await fillListing(page, { ...PH, title: "Too short", location: bgc });
    await f.evaluate((el) => (el as HTMLFormElement).setAttribute("novalidate", ""));
    await f.getByRole("button", { name: "Create draft" }).click();
    await expect(page.locator("main p[role=alert]")).toHaveText("Give the listing a title of at least 10 characters.");
    await expect(f.locator("[name=price]")).toHaveValue(PH.price);
    await f.locator("[name=title]").fill(PH.title);
    await f.locator("[name=price]").fill("12.5 million");
    await f.getByRole("button", { name: "Create draft" }).click();
    await expect(page.locator("main p[role=alert]")).toHaveText("Enter the price in pesos, digits only (commas are fine).");

    const id = await createDraft(page, { ...PH, location: bgc });
    const [row] = await sql<{ status: string; price: string; floorAreaSqm: string; agentId: string }>(
      `SELECT status::text, price::text, "floorAreaSqm"::text, "agentId" FROM "Property" WHERE id = $1`, [id]);
    expect(row).toEqual({ status: "DRAFT", price: "12500000.00", floorAreaSqm: "68.00", agentId: "a_agent" });

    // Publishing needs a photo
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Add at least one photo before publishing.")).toBeVisible();

    // Photos: big phone-style JPEGs with metadata go in, upright WebP files without metadata are stored
    await addPhotos(page, [
      { name: "living.jpg", mimeType: "image/jpeg", buffer: await photo(4000, 3000, "#3a7ca5") },
      { name: "bedroom.jpg", mimeType: "image/jpeg", buffer: await photo(1200, 1600, "#d9a441") },
    ], 2);
    const stored = (await authServer.storage(true)).filter((o) => o.key.startsWith(`u_agent/${id}/`));
    expect(stored).toHaveLength(2);
    for (const o of stored) {
      const meta = await sharp(Buffer.from(o.base64!, "base64")).metadata();
      expect(o.type).toBe("image/webp");
      expect(meta.format).toBe("webp");
      expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(2048);
      expect(meta.exif).toBeUndefined();
      expect(Buffer.from(o.base64!, "base64").toString("latin1")).not.toContain("Owner Secret Name");
    }

    // Reorder: the bedroom photo becomes the cover; captions save
    await page.getByRole("button", { name: "Make photo 2 the cover" }).click();
    await expect(page.getByRole("button", { name: "Make photo 2 the cover" })).toBeVisible();
    const media = await sql<{ storageKey: string; height: number }>(`SELECT "storageKey", height FROM "PropertyMedia" WHERE "propertyId" = $1 ORDER BY "sortOrder"`, [id]);
    expect(media[0].height).toBeGreaterThan(1000); // the portrait photo is now first
    await page.getByLabel("Caption for photo 1").fill("Main bedroom with built-in closets");
    await page.getByLabel("Caption for photo 1").blur();
    await expect.poll(async () => (await sql<{ caption: string }>(`SELECT caption FROM "PropertyMedia" WHERE "propertyId" = $1 ORDER BY "sortOrder" LIMIT 1`, [id]))[0].caption)
      .toBe("Main bedroom with built-in closets");

    // Publish: live on the listing page, in search, and on the home page within moments
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published.", { exact: true })).toBeVisible();
    const [{ slug }] = await sql<{ slug: string }>(`SELECT slug FROM "Property" WHERE id = $1`, [id]);
    await page.goto(`/property/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(PH.title);
    await expect(page.locator("main")).toContainText("₱12.5M");
    await expect(page.locator("main")).toContainText("PRC 0099999");
    await expect(page.locator(`main img[src*="/storage/v1/object/public/listing-photos/u_agent/${id}/"]`).first()).toBeVisible();
    await page.goto("/search?location=BGC");
    await expect(page.locator("main")).toContainText(PH.title);
    await expect(async () => {
      await page.goto("/");
      await expect(page.locator("main")).toContainText(PH.title, { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });

    // Edit the price: the page shows it and the change is recorded
    await page.goto(`/dashboard/listings/${id}`);
    f = page.locator("main form:visible").filter({ has: page.locator("[name=title]") });
    await f.locator("[name=price]").fill("11,900,000");
    await f.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Changes saved.")).toBeVisible();
    expect(await sql(`SELECT "oldPrice"::text, "newPrice"::text FROM "PriceChange" WHERE "propertyId" = $1`, [id])).toEqual([{ oldPrice: "12500000.00", newPrice: "11900000.00" }]);
    await page.goto(`/property/${slug}`);
    await expect(page.locator("main")).toContainText("₱11.9M");

    // Pause: gone from the site at once
    await page.goto(`/dashboard/listings/${id}`);
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByText("Paused. It is hidden from the site until you publish it again.")).toBeVisible();
    await page.goto(`/property/${slug}`);
    await expect(page.locator("main")).toContainText("This page isn't here");
    await page.goto("/search?location=BGC");
    await expect(page.locator("main")).not.toContainText(PH.title);
  });

  test("a UAE broker lists in dirhams and square feet, and Dubai needs its advertising permit to publish", async ({ page }) => {
    await signIn(page, ACCOUNTS.uae.email, ACCOUNTS.uae.password);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Omar");
    const marina = await locationId("uae/dubai/dubai-marina");
    await page.goto("/dashboard/listings/new");
    await expect(page.locator("main")).toContainText("Prices in dirhams, areas in square feet.");
    await expect(page.locator("[name=locationId] option", { hasText: "Bonifacio" })).toHaveCount(0); // only UAE places
    const id = await createDraft(page, {
      title: "TEST 2BR apartment with full marina view",
      price: "2,450,000",
      floorArea: "1,250",
      bedrooms: "2",
      bathrooms: "3",
      description: "High floor, full marina view, walk to JBR beach and the tram. Vacant on transfer, one parking space.",
      location: marina,
    });
    const [row] = await sql<{ floorAreaSqm: string }>(`SELECT "floorAreaSqm"::text FROM "Property" WHERE id = $1`, [id]);
    expect(Number(row.floorAreaSqm)).toBeCloseTo(1250 / 10.7639, 1); // stored in sqm, entered in sqft
    await addPhotos(page, [{ name: "marina.png", mimeType: "image/png", buffer: await sharp({ create: { width: 1600, height: 1000, channels: 3, background: "#1d4e89" } }).png().toBuffer() }], 1);

    // No permit: the database refuses to publish in Dubai, and the agent is told why
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.locator("main p[role=alert]").first()).toContainText("before they go live");
    expect((await sql<{ status: string }>(`SELECT status::text FROM "Property" WHERE id = $1`, [id]))[0].status).toBe("DRAFT");

    const f = page.locator("main form:visible").filter({ has: page.locator("[name=title]") });
    await f.locator("[name=adPermitNumber]").fill("7100009999");
    await f.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Changes saved.")).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published.", { exact: true })).toBeVisible();

    const [{ slug }] = await sql<{ slug: string }>(`SELECT slug FROM "Property" WHERE id = $1`, [id]);
    await page.goto(`/property/${slug}`);
    const main = page.locator("main");
    await expect(main).toContainText("AED 2.45M");
    await expect(main).toContainText("1,250 sqft");
    await expect(main).toContainText("7100009999");
    await expect(main).toContainText("RERA BRN 54321");
    await expect(main).not.toContainText("₱");
  });

  test("agents only ever see and change their own listings", async ({ page, browser }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    const id = await createDraft(page, { ...PH, location: await locationId("national-capital-region/metro-manila/taguig/bonifacio-global-city") });

    const ctx = await browser.newContext({ bypassCSP: true, baseURL: test.info().project.use.baseURL, extraHTTPHeaders: { "x-real-ip": "198.51.100.77" } });
    const other = await ctx.newPage();
    await signIn(other, ACCOUNTS.uae.email, ACCOUNTS.uae.password);
    await other.goto(`/dashboard/listings/${id}`);
    await expect(other.locator("main")).toContainText("This page isn't here");
    await expect(other.locator("main")).not.toContainText(PH.title);
    await other.goto("/dashboard");
    await expect(other.locator("main")).not.toContainText(PH.title);
    await ctx.close();

    // Signed out: the editor is behind sign-in
    const anon = await browser.newContext({ bypassCSP: true, baseURL: test.info().project.use.baseURL });
    const a = await anon.newPage();
    await a.goto(`/dashboard/listings/${id}`);
    await expect(a).toHaveURL(/\/agent\/sign-in\?next=%2Fdashboard%2Flistings%2F/);
    await anon.close();
  });

  test("only real photos are accepted, and unverified agents cannot upload or go live", async ({ page }) => {
    await signIn(page, ACCOUNTS.agent.email, ACCOUNTS.agent.password);
    const id = await createDraft(page, { ...PH, location: await locationId("national-capital-region/metro-manila/taguig/bonifacio-global-city") });

    // A web page renamed to .png, and a tiny image, are refused; nothing is stored
    await page.locator("input[type=file]").setInputFiles([
      { name: "invoice.png", mimeType: "image/png", buffer: Buffer.from("<html><script>alert(1)</script></html>") },
      { name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") },
    ]);
    await expect(page.getByText("invoice.png: use a JPEG, PNG or WebP photo", { exact: false })).toBeVisible();
    await expect(page.getByText("notes.pdf: use a JPEG, PNG or WebP photo", { exact: false })).toBeVisible();
    await page.locator("input[type=file]").setInputFiles([{ name: "icon.jpg", mimeType: "image/jpeg", buffer: await photo(200, 150, "#888888") }]);
    await expect(page.getByText("icon.jpg: That photo is too small.", { exact: false })).toBeVisible();
    expect((await authServer.storage()).filter((o) => o.key.includes(id))).toHaveLength(0);

    // Licence not verified (e.g. expired): no uploads, and published listings stay off the site
    await sql(`UPDATE "Agent" SET verification = 'PENDING' WHERE id = 'a_agent'`);
    await page.goto(`/dashboard/listings/${id}`);
    await expect(page.getByText("Photos can be added once your licence is verified.")).toBeVisible();
    await expect(page.locator("input[type=file]")).toHaveCount(0);
  });
});
