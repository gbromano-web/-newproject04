# Go Search Property: operations playbook

**Read this first when something breaks.** It covers how the site works, the rules and algorithms behind each feature, and step-by-step fixes ordered by symptom. Every rule here points to the file that implements it, so you can check the code when the two disagree. If they do disagree, trust the code and update this file.

- Live site: https://gosearchproperty.com (Vercel project `newproject04`, team `gbromano-webs-projects`)
- Code: GitHub `gbromano-web/-newproject04`, branch `main`. Every push to `main` deploys to production.
- Database and sign-in: Supabase project `newproject04-gosearchproperty.com` (ref `uyfiidwrmytdugzcjjzo`, eu-west-1)
- Contact shown on the site: gbromano.5bdf@gmail.com

---

## 0. First five minutes (any incident)

1. **Is it up?** Open https://gosearchproperty.com/api/health.
   - `{"status":"ok","database":"ok","commit":"abc1234"}` means the site and database are fine. Go to the symptom runbook (section 6).
   - `503` with `"database":"down"` → [6.2 Database down](#62-database-down--health-says-database-down).
   - No response, or a Vercel error page → [6.1 Site down](#61-site-down-or-vercel-error-page).
2. **What changed?** Vercel → Deployments: did a deploy go out just before it started? Compare the `commit` in `/api/health` with the latest commit on GitHub. If a deploy caused it, **roll back first and debug after**: Vercel → Deployments → the last good one → ⋯ → *Promote to Production* (or *Instant Rollback*).
3. **What do the logs say?** Vercel → Project → Logs, filtered to errors. Every server log line is one JSON object with an `event` field (section 8 lists them all), so searching for e.g. `lead.save_failed` or `agent.signin_unavailable` finds the cause quickly.
4. **Is Supabase healthy?** Supabase dashboard → project status. Free-plan projects **pause after a week with no activity** → [6.8](#68-supabase-project-paused).
5. Run the test suite locally (`npm run test:e2e`, section 9). It reproduces most bugs without touching live data.

---

## 1. Architecture

```
Browser ──HTTPS──> Vercel (Next.js 16, Node runtime)
                     │  src/proxy.ts           guards /dashboard and /agent/*
                     │  server components       render pages, read listings
                     │  server actions          sign-in, sign-up, reset, lead status
                     │  route handlers          /api/ph/leads, /api/health, chat redirects, /auth/confirm
                     │
                     ├──Postgres (pooler :6543)──> Supabase Postgres 17 + PostGIS
                     │                              listings, locations, agents, leads, audit log, rate limits
                     └──HTTPS──> Supabase Auth (GoTrue)
                                  agent accounts, sessions, confirmation and reset emails (via SMTP)
                     └──HTTPS──> api.pwnedpasswords.com (sign-up and new passwords only)
```

- **One site, two countries.** The Philippines (`/`, `/search`, `/calculator`) and the UAE (`/uae`, `/uae/search`, `/uae/calculator`). Shared pages (`/property/[slug]`, `/about`, `/contact`, `/saved`, legal pages) take the country from the listing or from the visitor's last choice. Country config: `src/lib/markets.ts`.
- **The browser never talks to the database.** The site connects to Postgres from the server as the `postgres` role. The Supabase Data API is locked: RLS is on with no policies, and grants are revoked (`prisma/sql/supabase-security.sql`). The publishable key is only used server-side for Auth.
- **Sample mode and live mode.** `NEXT_PUBLIC_LISTINGS_SOURCE=database` means live mode: real listings, agent sign-in and sign-up, inquiries stored. When it is unset, the site runs in sample mode (`SAMPLE_DATA` in `src/lib/ph/preview.ts`): built-in sample listings, a preview banner, noindex, inquiries off, sign-up closed, and the sample dashboard behind Basic auth (`DASHBOARD_USER`/`DASHBOARD_PASSWORD`). The value is read **at build time**, so redeploy after changing it. Production is in live mode.
- **GitHub Pages preview** (`npm run build:preview`, `.github/workflows/pages.yml`): a static sample copy with no server. It removes `src/app/agent`, `src/app/auth` and the dashboard while building, so sign-in and sign-up don't exist there.

### Key files

| Area | File |
| --- | --- |
| Header, country selector | `src/components/site-header.tsx`, `src/components/market-nav.tsx`, `src/components/flags.tsx` |
| Phone numbers, calling codes | `src/lib/phone.ts`, `src/components/phone-input.tsx` |
| Listings from the database | `src/lib/server/listings-repo.ts` |
| Sample listings and search | `src/lib/ph/listings.ts`, `src/lib/ph/search.ts`, `src/lib/uae/samples.ts` |
| Locations | `src/lib/ph/locations.ts`, `src/lib/uae/locations.ts` (seeded by `scripts/seed-sql.mts`) |
| Leads | `src/app/api/ph/leads/route.ts`, `src/lib/server/chat-redirect.ts`, `src/lib/server/leads.ts` |
| Agent session | `src/proxy.ts`, `src/lib/server/agent-session.ts`, `src/lib/server/supabase-config.ts` |
| Sign-in, reset, set password | `src/app/agent/actions.ts`, `src/app/agent/forms.tsx` |
| Sign-up | `src/app/agent/sign-up/{actions.ts,form.tsx,page.tsx}` |
| Password rules | `src/lib/server/password-policy.ts` |
| Form timer token | `src/lib/server/form-token.ts` |
| Rate limits, logs, IP hashing | `src/lib/server/request.ts` |
| Email links | `src/app/auth/confirm/route.ts`, `src/app/auth/continue/page.tsx` |
| Dashboard | `src/app/dashboard/*`, `src/lib/server/dashboard-repo.ts` |
| Mortgage calculators | `src/lib/ph/financing.ts`, `src/lib/uae/financing.ts` |
| Currency | `src/lib/ph/currency.ts` |
| UAE regulators | `src/lib/uae/regulators.ts` |
| Schema, DB rules | `prisma/schema.prisma`, `prisma/migrations/*`, `prisma/sql/postgis.sql`, `docs/data-model.md` |
| SEO | `src/app/sitemap.ts`, `src/app/robots.ts` |
| Security headers, CSP | `next.config.ts` |

---

## 2. Request flows

### 2.1 Visitor views a listing
1. `GET /property/[slug]` → `getListing(slug)` reads one **live** listing (`listings-repo.ts`).
   A listing is live when `status = 'ACTIVE'`, `publishedAt IS NOT NULL`, and `expiresAt` is NULL or in the future.
2. Not found or not live → the not-found page (`noindex`).
3. The page sets the visitor's country to the listing's country, then shows the price in that country's currency, the licence lines (PRC or DHSUD in PH; BRN, ORN and the permit in the UAE) and the contact card.

### 2.2 Visitor sends an inquiry (`POST /api/ph/leads`)
In order:
1. In sample mode → 503.
2. The content type must be `application/json` (415 otherwise). This blocks cross-site HTML forms.
3. The body must be 16 KB or less (413).
4. Rate limit: 5 per 10 minutes per hashed IP (429 with `retry-after`).
5. The body must be valid JSON (400).
6. Honeypot `company` filled in → fake 201, nothing stored.
7. The listing must be live (404).
8. Validate name, email, mobile (`/^\+?[0-9 ()-]{7,20}$/`), consent and the optional calculator snapshot (ranges checked, unknown fields dropped).
9. Insert into `Lead` **before** answering 201. On a database error the visitor gets 503, so no inquiry is silently lost.

The contact card's mobile field uses `PhoneInput`. The visitor picks a country code (it defaults to the listing's country) and types the local number, and the hidden `mobile` field is sent as E.164, e.g. `0917 765 4321` + PH → `+639177654321`.

### 2.3 Visitor taps Viber or WhatsApp
`/api/ph/chat/viber|whatsapp?listing=<id>` → `chatRedirect()`:
1. Look up the live listing.
2. Record a lead, unless the request comes from a bot or link-preview fetcher, or the same visitor already tapped this channel for this listing in the last 30 minutes.
3. Redirect with 302 to `viber://chat?number=…` or `https://wa.me/…`.

Saving the lead never blocks the redirect: a failure is logged as `lead.save_failed`. UAE listings show WhatsApp only.

### 2.4 Agent signs in
`/agent/sign-in` → server action `signIn` (section 3.4) → Supabase `signInWithPassword` → HttpOnly session cookies → redirect to `safeNext(next)`, which is `/dashboard` unless a safe dashboard path was requested.

### 2.5 Every request to `/dashboard*` or `/agent/set-password`
`src/proxy.ts` calls `supabase.auth.getUser()`. This asks the Auth server rather than trusting the cookie, so a revoked or forged cookie fails.
- No user → redirect to `/agent/sign-in?next=<path>`.
- Auth server down or slow (5 s timeout) → also redirect to sign-in. It **fails closed**.
- Other `/agent/*` pages skip the check.

The dashboard then loads `getSession()`, which returns three things:
- `agent`: the `Agent` row where `Agent.userId = auth user id`.
- `application`: the sign-up metadata, used only when there is no `Agent` row.
- the email.

What the dashboard shows:
- An `Agent` row exists → that agent's listings and leads.
- No `Agent` row, but an application → "Your application is being reviewed".
- Neither → no data.

### 2.6 Agent signs up (new)
1. `/agent/sign-up` renders the form with a signed timer token.
2. The `signUp` server action runs the checks in section 3.5.
3. Supabase `auth.signUp` creates an **unconfirmed** account. The application goes in `user_metadata.application`, and Supabase emails a confirmation link.
4. The agent opens the link: `/auth/confirm?token_hash=…&type=email` → the Continue page → POST → `verifyOtp`. The email is now confirmed and the agent is signed in.
5. `/dashboard` shows "Your application is being reviewed".
6. **An admin checks the licence** and creates the `Agent` row (section 7.1). From then on the agent sees their dashboard.

Self sign-up never creates an `Agent` row. Nobody can list properties until an admin approves them.

### 2.7 Invitation and password reset
- **Invitation:** an admin invites from Supabase. The email link goes to `/auth/confirm?...type=invite` → Continue → `/agent/set-password`.
- **Reset:** `sendReset` sends at most 3 per 15 minutes per IP and per email. It always gives the same answer, whether or not the email exists. The link goes to `/agent/set-password`. `setPassword` checks the passwords match, then the session, then the password rules (section 3.6), then calls `updateUser`.

### 2.8 Email links (`/auth/confirm`)
- `GET` with `token_hash` → redirect to `/auth/continue`, a page with a **Continue** button. Mail scanners (Outlook Safe Links and similar) only do GET, so they can't use up the one-time token.
- `POST` (from the Continue button) → checks that `Origin` equals the site, to block login CSRF → `verifyOtp`.
- `GET` with `code` (the PKCE default template) → exchanged directly.
- Accepted `type` values: invite, recovery, signup, email, magiclink, email_change. Invite and recovery always continue to `/agent/set-password`. For other types, `next` must be `/dashboard` or `/agent/set-password`.

---

## 3. Algorithms and rules

### 3.1 Country selector with calling codes (`market-nav.tsx`)
- **Button:** flag, short name (hidden below the `sm` width), calling code (+63 or +971) and a chevron. Its accessible name is "Country: Philippines (+63). Change country".
- **Menu** (`ul#country-menu`, labelled "Choose a country"): one link per market's home page, with flag, full name, calling code and a check mark on the current one (`aria-current`).
- **Closing:** Escape, a click outside, or choosing a country.
- **Current country:** the URL decides it (`/uae*` means UAE). On shared pages it is the last one chosen; a listing page sets it to the listing's country.
- **Home page by location** (`homeByLocation` in `src/proxy.ts`): a visitor in the UAE who opens `/` is sent to `/uae` (307, not cached); everyone else, in the Philippines or anywhere else, stays on `/`. The location is Vercel's `x-vercel-ip-country` header.
  - A country picked in the selector is stored for a year in the `gsp_country` cookie and always wins over location.
  - Crawlers and link-preview bots are never redirected, so both home pages keep their own URL in search results.
  - "Someone in Dubai keeps getting the Philippine home page": they picked the Philippines before. Picking the UAE in the selector fixes it, or clearing cookies.
- **Adding a country:**
  1. Add it to `MARKETS` in `src/lib/markets.ts` and to `CALLING_CODES` in `src/lib/phone.ts`.
  2. Add a flag in `flags.tsx`.
  3. Add its locations and seed them.
  4. Add a `Country` enum value (a migration).
  5. Update the licence CHECK constraint and the listing trigger (section 3.9).
  6. Update the sign-up country list (`actions.ts`, `form.tsx`).

### 3.2 Phone numbers (`src/lib/phone.ts`)
`toE164(iso, local)`:
1. Empty input → `""`.
2. Input starting with `+` or `00` → treated as already international: the `+` or `00` is dropped.
3. Otherwise, remove spaces, dashes, dots and brackets; strip the country's **trunk prefix** (the leading `0` for PH and AE); add the calling code in front.
4. The result must match `^[1-9]\d{7,14}$` (E.164: 8 to 15 digits) → `+<digits>`. Anything else → `null` (invalid).

Examples: `PH "0917 123 4567"` → `+639171234567`; `AE "050 123 4567"` → `+971501234567`; `"+44 20 7946 0000"` → `+442079460000`.

The site stores numbers in E.164. Viber links use the `+` form; WhatsApp `wa.me` links use the digits without `+`.

### 3.3 Rate limiting (`rateLimit` in `request.ts`)
- **Fixed window** per key, shared by every server instance via one atomic Postgres upsert into `"RateLimit"`.
  - If the window has expired: reset to count 1, starting now.
  - Otherwise: count + 1.
  - `ok = count <= limit`; `retryAfter` = seconds left in the window.
- **If the database is unreachable**, an in-memory limiter per instance takes over and the switch is logged as `ratelimit.db_fallback`. Buyers are never blocked by a database outage.
- **Keys use hashed values only:** `ipHash = sha256(LEAD_IP_SALT + ip)[0:32]` (the IP is taken from `x-real-ip`, else the first `x-forwarded-for`); emails are hashed too, `sha256(email)[0:24]`.
- `purge_old_leads()` (daily) deletes old rows.

| Key | Limit | Window | Counts |
| --- | --- | --- | --- |
| `lead:<ip>` | 5 | 10 min | every inquiry |
| `chat:<channel>:<listing>:<ip>` | 1 | 30 min | dedupes chat-tap leads (the redirect itself is never blocked) |
| `signin:ip:<ip>` | 30 | 15 min | every sign-in attempt |
| `signin:email:<hash>` | 10 | 15 min | attempts on that email; **cleared by a correct password** |
| `reset:ip` / `reset:email` | 3 | 15 min | reset requests (the answer stays the same when limited) |
| `signup:ip:<ip>` | 5 | 1 hour | sign-ups that reach Supabase |
| `signup:email:<hash>` | 3 | 1 hour | same |

**To unlock someone now:** `DELETE FROM "RateLimit" WHERE key LIKE 'signin:%';` (or a narrower pattern). Section 7.4 shows how to find a single email's key.

### 3.4 Sign-in (`signIn`)
1. Validate the email format and that the password isn't empty or blank.
2. Rate limits (section 3.3) → "Too many attempts. Please wait 15 minutes and try again."
3. `signInWithPassword`. The error is mapped:

| Error | Message |
| --- | --- |
| Retryable, no status, or 5xx | "Sign-in is temporarily unavailable…" (logged as `agent.signin_unavailable`) |
| 429 | "Too many attempts…" |
| `email_not_confirmed` | "Confirm your email first…" |
| Anything else | "That email and password do not match." (the same whether the email exists or not) |

4. On success: clear the email counter, then redirect to `safeNext(next)`.

**`safeNext`** (`supabase-config.ts`) accepts a path only if it:
- starts with `/dashboard` followed by `/`, `?`, `#` or the end;
- contains no `//`;
- contains no `\`;
- has no `/.` or `/..` path segment.

Anything else becomes `/dashboard`. This blocks open redirects such as `//evil.com`, `/dashboard/../..` and `/\evil.com`.

### 3.5 Sign-up checks (`src/app/agent/sign-up/actions.ts`), in order
Each failure returns a message and the offending field. The form keeps everything except the passwords filled in.

1. **Sample mode** → closed.
2. **Honeypot:** the hidden `website` field is filled → the same success message as a real sign-up, but nothing is created. Logged as `signup.honeypot`.
3. **Form timer** (`t`, see section 3.7):
   - Sent less than `SIGNUP_MIN_SECONDS` (default 3 s) after the page loaded → "That was quick…"
   - Older than 2 hours, forged or edited → "This form has expired…"
4. **Full name:** 2 to 120 characters; Unicode letters, spaces and `.'-`.
5. **Email:** a valid format, 254 characters or fewer, lower-cased.
6. **Mobile:** valid E.164 from the phone picker.
7. **Country:** `PH` or `AE`.
8. **Licence:**
   - **PH broker:** PRC licence number, 5 to 7 digits.
   - **PH salesperson:** DHSUD accreditation number, plus the supervising broker's PRC number.
   - **AE:** the emirate, the broker number (BRN or the equivalent, digits only) and the office number (ORN, digits only). The regulator name comes from the emirate (`regulators.ts`): Dubai "RERA BRN", Abu Dhabi "ADREC", Sharjah "SRERD", Ajman "ARRA", Ras Al Khaimah "RAK RERA", Umm Al Quwain "UAQ", Fujairah "Fujairah".
9. **Brokerage:** optional; at least 2 characters if given.
10. **Passwords** match.
11. **Terms** checkbox ticked.
12. **Password rules** (section 3.6, including the breach check).
13. **Rate limits** (5 per hour per IP, 3 per hour per email). They come *after* the password check on purpose, so fixing a typo or picking another password never locks anyone out.
14. **`auth.signUp`**, with `emailRedirectTo = <site>/auth/confirm?next=/dashboard`. The metadata holds `full_name` and the `application` (all fields above, plus `consentedAt` and `termsVersion`).
15. **Result:**
   - New account (`identities.length > 0`) → an `AuditLog` row `agent.applied`.
   - **Email already registered** → Supabase returns an obfuscated user with no identities. The site shows **the same success message**, so nobody can probe which emails have accounts. No email is sent and the existing password is unchanged.
   - Signing up again before confirming → Supabase sends a fresh link.

### 3.6 Password rules (`password-policy.ts`, used by sign-up and set-password)
1. Length: at least 12 and at most 200 characters. Spaces are allowed, so passphrases work.
2. Not one character repeated (e.g. `aaaaaaaaaaaa`).
3. Must not contain the email's local part, if that part is 4 characters or more.
4. Must not contain any part of the name that is 4 characters or more.
5. **Not in a known breach**, checked with Have I Been Pwned's k-anonymity range API:
   - SHA-1 the password, then send only the **first 5 hex characters** to `/range/<prefix>`, with the `Add-Padding: true` header.
   - Compare the returned suffixes locally.
   - The password itself never leaves the server.
   - 3-second timeout. If the service is down, the check **fails open** (the password is allowed): an outage there must not stop sign-ups.
   - `PWNED_PASSWORDS_URL` overrides the endpoint; the tests use it.

The strength meter in the form is a guide only. The server rules above are what count.

### 3.7 Form timer token (`form-token.ts`, server-only)
- `formToken("signup")` = `<ms timestamp>.<HMAC-SHA256(salt, "signup:<ts>")>`, base64url. The salt is `LEAD_IP_SALT`.
- `checkFormToken` checks the signature with `timingSafeEqual`, then the age: below the minimum → `fast`, above 2 hours → `expired`.
- It lives in a server-only file, **not** in the `"use server"` actions file. Every export of a `"use server"` file can be called from a browser, which would let bots mint valid tokens.
- If `LEAD_IP_SALT` is not set, a random salt is created per instance. Tokens then fail across instances and restarts, so **set it in production**.

### 3.8 Location search (`locationIds` in `listings-repo.ts`)
1. **Exact match** in the chosen country, ignoring case, on `name`, `displayName` or any of the `aliases` ("BGC", "The Fort"). It can return several ids.
2. **Otherwise, partial match:** `name ILIKE %text%`. The **broadest** place wins (fewest ancestors), with `%`, `_` and `\` escaped.
3. Listings match if their location is one of the ids **or has one of them among its ancestors** (`loc."ancestorIds" && ids`). So "Metro Manila" includes every city and barangay inside it, and "Dubai" includes Dubai Marina.
4. Other filters: type, property type, min/max price, beds (5 means 5+), and foreign-eligible (condos not for rent).
5. Sort options: featured, newest, price. At most `MAX_RESULTS` results.
6. Search is always limited to one country: `/search?location=Dubai` returns nothing.

### 3.9 Licence and permit rules (enforced in the database by `prisma/sql/postgis.sql`)

**`agent_license_fields` CHECK**, by licence type:

| Licence type | Requires |
| --- | --- |
| `REAL_ESTATE_BROKER` | PRC number |
| `REAL_ESTATE_SALESPERSON` | DHSUD accreditation and a supervising broker |
| `UAE_BROKER` | `uaeRegulator` and `uaeBrokerNumber` |
| Anything else | rejected |

**Listing trigger** on `Property`:
- The agent's country must match the listing's country.
- In emirates with an advertising-permit system (Dubai DLD Trakheesi, Abu Dhabi ADREC Madhmoun, Ras Al Khaimah RAK RERA, set on `Location."adPermitSystem"`), a listing **cannot be ACTIVE or PENDING_REVIEW without `adPermitNumber`**.

**Other CHECKs:**
- Rent listings need a rent period.
- Pre-selling listings need a turnover year and quarter (1 to 4).
- Foreclosed listings need the foreclosing institution.
- Area required by type: lot area for lots and agricultural land, both areas for house and lot, floor area otherwise.
- Price must be above 0.
- `rentCheques` must be between 1 and 12.

**Other database rules:**
- `AuditLog` is append-only (a trigger blocks updates and deletes).
- `erase_user()` and `purge_old_leads()` handle data-subject requests and retention.

> ⚠️ **Live status (checked 3 Nov 2026):** the live database has migrations 0–6, but **the UAE version of these rules (migration 7, `7_uae_listing_rules`) has not been applied.** The live `agent_license_fields` constraint still rejects `UAE_BROKER`, so **UAE agents cannot be approved until it is applied** (section 7.6).

### 3.10 Mortgage calculators
**Payment formula:** `monthly = P · r(1+r)^n / ((1+r)^n − 1)`, where `r` = annual rate / 12 and `n` = years × 12. When `r = 0`, `P / n`.

**Philippines** (`ph/financing.ts`):

| Lender | Maximum term | Other limits | Rates by fixing period |
| --- | --- | --- | --- |
| Pag-IBIG | 30 years | loans up to ₱6M | 5.75% (1 yr) to 9.75% (30 yrs) |
| Bank | 20 years | up to 80% of value | median of 12 banks, with the range |

Sources and as-of dates are in the file and shown on the page.

**UAE** (`uae/financing.ts`):
- **Maximum loan-to-value** (`maxLtv`) depends on residency, first home or not, off-plan and price.
- The downpayment is at least `100 − LTV`.
- Maximum term from `UAE_RATES`.
- **Income needed** = monthly payment ÷ 0.5 (the 50% debt-burden cap).
- **Dubai only:** a 4% DLD transfer fee, and 0.25% mortgage registration on the loan.

**To update rates:** edit the rate table, `asOf` and `source` in those files, then deploy.

### 3.11 Currency (`ph/currency.ts`)
- PH prices are stored in pesos and UAE prices in dirhams.
- "Also show prices in" converts using fixed reference rates: the BSP bulletin, as of the `RATES_AS_OF` date, expressed as pesos per unit.
- **To update:** edit `CURRENCIES` and `RATES_AS_OF`, then deploy.

### 3.12 Saved homes
Stored in the browser only (`localStorage`), never on the server. The heart button and `/saved` read them. Clearing the browser clears them.

### 3.13 Sitemap and robots
- `sitemap.xml` lists the public pages of both countries, plus every live listing (`liveListingSlugs`). If the database read fails, it returns just the pages and logs `sitemap.listings_failed`.
- `robots.txt` disallows `/api/`, `/dashboard`, `/agent/`, `/auth/` and `/saved`.
- In sample mode the whole site is `noindex`.

### 3.14 Logs and privacy
- One JSON line per event. **Never** names, emails, phones or messages, only hashed IPs and ids.
- Leads keep `consentAt`, and personal data is stripped after 24 months (`purge_old_leads`).


### 3.15 Home page caching (`src/components/ph/latest-listings-cache.tsx`)
- `/` and `/uae` are **pre-rendered** at build time, including their newest listings, and served from Vercel's CDN.
- The listings block (`"use cache"` with `cacheLife({ stale: 60, revalidate: 60, expire: 3600 })` and tags `listings`, `listings:PH|AE`) is re-rendered in the background **at most once a minute**. Visitors always get the cached page instantly, never a slow one.
- **Consequence:** a new listing, an edit, or a **suspended agent** shows on the home pages within about a minute. Listing pages, search, chat links and inquiries check the database on every request, so a suspended agent's listings stop working there immediately.
- **Database down during a refresh:** the section shows "Latest listings are taking a moment to load" for up to a minute, then tries again. The rest of the page is unaffected.
- **Database down during a build:** the home pages are built with that message, and it clears itself within a minute once the database is back.
- **To refresh at once** (e.g. a takedown on legal request): redeploy, or call `updateTag("listings")` from server code. There is no public endpoint for it, on purpose.
- **Tests:** they set `LISTINGS_REVALIDATE_SECONDS=1` so they don't wait a minute. Never set it in production.
- **GitHub Pages preview:** it has no cache, so `scripts/build-preview.sh` swaps this file for a plain re-export.

### 3.16 Home page slideshow
- The hero's crossfade, zoom and progress bar are plain CSS (`globals.css`, "Home hero slideshow"). No animation library ships to visitors.
- Only the current photo and, while it fades in, the previous one are in the page.
- With *reduce motion* switched on, slides simply switch.

---

### 3.17 Agents' listing editor (`/dashboard/listings`)
Code: `src/app/dashboard/listings/*`, `src/lib/server/listing-editor.ts`, `src/lib/server/photo-processing.ts`.

**Flow:** Dashboard → **Add listing** → details and price → **Create draft** → add photos → **Publish**. From then on the listing page offers **Pause**, **Mark as sold** or **rented**, and **Move to drafts**.

**Who can do what:**
- Every action re-checks the signed-in agent, and every query is limited to `Property."agentId"` = that agent. Another agent's listing id gives "not found".
- Agents can only choose places in their licence's country.

**Checked on the server** (`validate()`), with the same rules as the database:

| Field | Rule |
| --- | --- |
| Title | 10–120 characters |
| Description | 30–5,000 characters |
| Price | Pesos or dirhams; commas allowed; above 0; up to 100 billion |
| Rent | Period required; UAE cheques 1–12 |
| Areas | Entered in sqm (PH) or sqft (UAE, stored as sqm). Lot or plot area is required for lots and houses, floor area for everything else |
| Pre-selling | Turnover quarter and year required |
| Foreclosed | Foreclosing institution required |
| UAE permit | Letters, digits and dashes |

Database rule errors come back as plain messages (`explain()`).

**Publishing:**
- A listing needs at least one photo.
- In Dubai, Abu Dhabi and Ras Al Khaimah it also needs the emirate's permit number: the database trigger refuses otherwise, and the agent sees "…before they go live".
- A published listing appears only while the agent is **verified** (3.9). If an unverified agent publishes, they're told it goes live once their licence is checked.
- Publishing or changing a live listing refreshes the cached home pages at once (`updateTag("listings")`).
- Price changes are recorded in `PriceChange`, and every change in `AuditLog` (`listing.created`, `listing.updated`, `listing.status_changed`).

**Photos** (up to 30 per listing):
1. **In the browser:** the photo is shrunk to under 3.8 MB, at most 2,560 px. Redrawing it also drops its metadata. iPhone HEIC photos are refused, with how to switch the camera to JPEG.
2. **On the server:**
   - The first bytes must be a real JPEG, PNG or WebP.
   - It must decode, within a 60-megapixel limit.
   - It must be at least 600 px on its long side.
   - It is turned upright, resized to at most 2,048 px, and re-encoded as WebP. **All metadata (GPS location, camera, owner) is removed.**
3. **Storage:** the photo is stored in the `listing-photos` bucket at `<auth user id>/<listing id>/<random>.webp`, **using the agent's own session**. No service key is involved.
   - The storage policies (`prisma/sql/storage-policies.sql`) let only a verified agent write, and only into their own folder.
   - Only the agent can delete their files. Nothing is ever overwritten.
4. **Managing photos:**
   - The first photo is the cover.
   - "Cover" and the arrows reorder photos.
   - Captions are up to 120 characters.
   - "Remove" deletes both the database row and the file.
5. **Limits:**
   - Uploads: 300 per hour per agent.
   - Listing saves and status changes: 120 per hour per agent.
   - Server actions accept up to 4 MB, because of the photos.

### 3.18 Agent plans and pricing (`/pricing`, `/uae/pricing`)
Prices, limits and the launch offer all live in `src/lib/plans.ts`, and both pages read from it (`src/components/pricing-page.tsx`).

| Plan | Philippine agents | UAE agents | Active listings | Featured a month | Agents |
| --- | --- | --- | --- | --- | --- |
| Starter | Free | Free | 3 | 0 | 1 |
| Pro | $14/mo or $140/yr | $79/mo or $790/yr | 25 | 2 | 1 |
| Brokerage | $44/mo or $440/yr | $269/mo or $2,690/yr | 100 | 10 | 5 |

All plans are priced and **charged in US dollars** (`PLAN_CURRENCY`), with a separate price list per country, before VAT (12% Philippines, 5% UAE, where it applies). Stripe converts to the account's AED payout (Stripe charges a conversion fee on that). Agents paying with a peso or dirham card may see a conversion fee from their bank; the pricing page and Terms say so.

**Launch offer:** every verified agent gets Pro free until **31 March 2027** (`LAUNCH_OFFER`). The pages promise an email at least 30 days before any charge, so **by 1 March 2027** either:
- email every agent with their plan options, or
- move `LAUNCH_OFFER.until` later and redeploy.

**Live-listing limit:** publishing is refused once an agent has as many live listings as their plan allows (`setStatus` in `listing-editor.ts`). See 3.19 for how the plan is worked out.

**After a downgrade** (a plan ends, a payment finally fails, or the launch offer ends on 31 March 2027): a daily job, `enforce_plan_limits()` (pg_cron `plan-limits`, 20:05 UTC; migration `5_plan_limits`, live as `10_plan_limits`), marks agents with more live listings than their plan allows (`Agent."overLimitSince"`). The dashboard and billing page warn them with the date. After **14 days** the job pauses their newest live listings down to the limit (oldest stay live), writes `listing.paused_over_plan_limit` to `AuditLog`, and clears the mark. Paused listings are kept and can be published again.
- The SQL repeats the limits (3/25/100) and the launch-offer end date from `src/lib/plans.ts`; change both together.
- Run it by hand: `SELECT public.enforce_plan_limits();` (returns how many were paused). Give someone more time: `UPDATE "Agent" SET "overLimitSince" = now() WHERE id = '<agent id>';`

**Done by hand:**
- **Featured placement:**
  ```sql
  UPDATE "Property" SET "isFeatured" = true, "featuredUntil" = now() + interval '30 days' WHERE slug = '<slug>';
  ```
- **Brokerage seats:** link the agents to one `Agency` (`Agent."agencyId"`).

### 3.19 Billing with Stripe (`/dashboard/billing`, `/api/stripe/webhook`)
Code: `src/lib/server/billing.ts`, `src/app/dashboard/billing/`, `src/app/api/stripe/webhook/route.ts`. Card details never touch the site: agents pay on Stripe Checkout and manage their plan on Stripe's customer portal.

**Which plan an agent has** (`effectivePlanOf`), first match wins:
1. **Paid:** `Agent.plan` is PRO or BROKER and `subscriptionStatus` is active, trialing or past_due (past_due = Stripe is retrying the card; the billing page warns the agent).
2. **Launch:** verified agent, before the end of `LAUNCH_OFFER.until` (Dubai time) → Pro.
3. **Free:** Starter.

**What can be bought:** Brokerage, monthly or yearly, now. Pro checkout is hidden and refused during the launch offer; it appears by itself on 1 April 2027.

**Stripe objects:** one Customer per agent (stored in `Agent.stripeCustomerId`). Prices are created on first use from `src/lib/plans.ts`, with lookup key `gsp_<plan>_<country>_<interval>_<amount>`. Changing an amount in `plans.ts` makes a new Price; existing subscribers keep the old one until they change plan. Every price is in USD; lookup keys look like `gsp_broker_ph_month_usd_44`. All of it settles to the one Stripe account.

**Webhook:** signature checked on the raw body (`STRIPE_WEBHOOK_SECRET`, 5-minute tolerance). Each event id is stored in `StripeEvent` and handled once. Every event re-reads the subscription from Stripe, then writes plan, status, interval, renewal and cancel dates to the agent named in the subscription's metadata, **only if** that agent's stored customer id matches. Plan changes are written to `AuditLog` (`agent.plan_changed`). If handling fails, the event id is removed and the site answers 500, so Stripe retries.

**Set up (once, by the owner):**
1. Open a Stripe account for the UAE business (Stripe does not serve Philippine businesses). Finish activation.
2. Apply migration `prisma/migrations/4_agent_billing` in the Supabase SQL editor (before deploying this code).
3. Stripe → Developers → Webhooks → add endpoint `https://gosearchproperty.com/api/stripe/webhook` with events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.
4. Stripe → Settings → Billing → Customer portal: turn on cancel, update payment method, invoice history, and switching between the Brokerage month and year prices. Save.
5. Vercel → Settings → Environment Variables (Production): `STRIPE_SECRET_KEY` (sk_live_…) and `STRIPE_WEBHOOK_SECRET` (whsec_…), both Sensitive. Redeploy.
6. Optional: set up Stripe Tax registrations (UAE VAT, and Philippine VAT if registered), then `STRIPE_AUTOMATIC_TAX=1`. Without it, prices are charged as listed and VAT is your own bookkeeping.
7. Test with test-mode keys on a preview deployment first: card 4242 4242 4242 4242.

**Until both keys are set** the billing page says payments are not switched on, and the webhook answers 503.

**Live-payment block** (`src/lib/payment-mode.ts`, checked in CI by `npm run check:payments`): a live key (`sk_live_`/`rk_live_`) is refused unless **both** `LIVE_PAYMENTS_APPROVED=true` is set in Vercel **and** `SITE.legalReviewed` is `true` in `src/lib/site.ts`. Flip `legalReviewed` only in a commit made after the lawyer's written sign-off on the Terms (paid plans), refund terms and Privacy notice, and mention the sign-off in the commit message. Until then a live key runs as `live_blocked`: no checkout or portal, webhook 503 (Stripe holds and retries events for 3 days), `billing.live_blocked` in the logs. `/api/health` shows the mode: `off`, `test`, `live` or `live_blocked`.

**Other protections:**
- **One open checkout per agent** (`Agent."pendingCheckoutId"`): starting a new one expires the earlier one, and if the earlier one was just paid and its webhook hasn't arrived, the agent is told to wait instead of paying twice. Checkouts expire after an hour.
- **3D Secure** is requested on every checkout card payment the card supports (`request_three_d_secure: "any"`); renewals are charged off-session under Stripe's exemptions.
- **Refunds and disputes** (`charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`) are written to `AuditLog` (`billing.refunded`, `billing.dispute_opened`, `billing.dispute_closed`). They don't change the plan. **Answer a dispute in the Stripe dashboard before its evidence deadline.** Refunds are made in the Stripe dashboard (Payments → the payment → Refund).
- **Old subscriptions:** when an agent has two, the older one ending doesn't downgrade them.
- **Failed payments:** Stripe → Settings → Billing → Subscriptions and emails: turn on Smart Retries and "cancel the subscription if all retries fail". The site keeps the plan while the status is `past_due` and moves the agent to Starter when it becomes `unpaid` or `canceled`.

**Daily reconciliation** (`/api/cron/billing-reconcile`, Vercel cron at 20:30 UTC, `vercel.json`): re-reads every subscription the site knows from Stripe, applies any missed webhook, and reports:
- `duplicates`: an agent paying through two subscriptions. Refund and cancel one in Stripe.
- `unlinked`: a paid subscription that matches no agent. Look it up in Stripe.
Logged as `billing.reconciled` (level `error` when either list isn't empty). Needs `CRON_SECRET` in Vercel (Production, Sensitive, a long random string); without it the endpoint answers 503 and nothing runs.

### 3.20 Payment kill switch (under a minute)
Stops **new** checkouts in one country or both; existing plans, the portal and webhooks keep working. Supabase → SQL editor:
```sql
-- stop the UAE (or 'PH'); both rows = everything
UPDATE "PaymentControl" SET "checkoutEnabled" = false, note = '<reason, your name>', "updatedAt" = now() WHERE country = 'AE';
-- check
SELECT * FROM "PaymentControl";
-- reopen
UPDATE "PaymentControl" SET "checkoutEnabled" = true, note = NULL, "updatedAt" = now() WHERE country = 'AE';
```
It takes effect on the next click (nothing is cached). Agents see "Card payments are paused for your country". If the setting can't be read, checkout stays closed (fails closed).

**Stop everything, including the portal and webhooks** (takes a redeploy, about 2 minutes): Vercel → Environment Variables → remove `STRIPE_SECRET_KEY` (or `LIVE_PAYMENTS_APPROVED`) → Redeploy. Stripe keeps undelivered webhooks for 3 days, so put the key back within that time and nothing is lost.

**Back to test mode:** set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to the test-mode values → Redeploy.

**Give a plan by hand** (e.g. a partner deal), no Stripe:
```sql
UPDATE "Agent" SET plan = 'BROKER', "subscriptionStatus" = 'active' WHERE id = '<agent id>';
```
Undo with `plan = 'STARTER', "subscriptionStatus" = NULL`. A manual plan is overwritten if that agent later has a Stripe subscription event.

**Benchmarks used** (November 2026):
- Lamudi Pro: about ₱999/month for 10 listings.
- UAE portals: no public rate cards; offices report about AED 2,500–15,000+ a month on Property Finder or Bayut.

### 3.21 Email (Resend)
Code: `src/lib/server/email.ts`, `src/lib/server/notices.ts`. **Off until `RESEND_API_KEY` is set**; each skipped email is logged as `email.skipped`. Plain text; logs never hold addresses or content.

| Email | To | When |
| --- | --- | --- |
| `lead_alert` | the listing's agent, reply-to the buyer | an inquiry or sample-computation request is stored (not Viber/WhatsApp taps) |
| `application_alert` | everyone in `ADMIN_EMAILS` | a new agent signs up |
| `agent_approved` / `agent_rejected` | the applicant | an admin decides on `/admin/agents` |

Supabase's own emails (confirm sign-up, invite, password reset) go through **Supabase's SMTP settings**, which can use the same Resend account.

**Set up (once, by the owner):**
1. Create a Resend account (resend.com) → Domains → add `gosearchproperty.com` → add the DNS records it shows (SPF, DKIM, and the MX for bounces) at your domain's DNS host → wait for *Verified*.
2. Resend → API Keys → create a key with *Sending access* for that domain.
3. Vercel → Environment Variables (Production): `RESEND_API_KEY` (Sensitive), `EMAIL_FROM` = `Go Search Property <hello@gosearchproperty.com>`, `ADMIN_EMAILS` = your email (comma-separate several). Redeploy.
4. Supabase → Authentication → Emails → SMTP Settings → *Enable custom SMTP*: host `smtp.resend.com`, port `465`, username `resend`, password = a Resend API key, sender `hello@gosearchproperty.com`, name `Go Search Property`. Then set the templates in section 4 if not done.
5. Test: sign up with a spare address → the confirmation email arrives; you get `application_alert`; approve → the agent gets `agent_approved`.

## 4. Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Vercel | `https://gosearchproperty.com`. Used for canonical URLs, the sitemap and email links |
| `NEXT_PUBLIC_LISTINGS_SOURCE` | Vercel (production: `database`) | Live or sample mode. **Build-time**: redeploy after changing |
| `POSTGRES_URL` / `DATABASE_URL` | Supabase integration | Transaction pooler (port 6543) |
| `DATABASE_SSL_CA`, `DATABASE_POOL_MAX` | optional | TLS root certificate; pool size (default 5) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the `ANON` variants) | Supabase integration | Auth. Safe to expose. **Never add the service-role key** |
| `LEAD_IP_SALT` | Vercel, **required** | Salt for IP hashes and the HMAC for form tokens. A long random string |
| `DASHBOARD_USER`, `DASHBOARD_PASSWORD` | sample mode only | Basic auth for the sample dashboard |
| `PWNED_PASSWORDS_URL` | optional | Override the breach-check endpoint (tests) |
| `SIGNUP_MIN_SECONDS` | optional | Minimum time to fill in the sign-up form (default 3) |
| `LEADS_LOG_ONLY` | demo servers only | Log inquiries without a database. Never set in production |
| `RESEND_API_KEY`, `EMAIL_FROM` | Vercel (email, 3.21) | Resend key (Sensitive) and the From address on the verified domain |
| `ADMIN_EMAILS` | Vercel | Who may open `/admin/agents` and gets new-application emails (comma-separated) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `LIVE_PAYMENTS_APPROVED`, `CRON_SECRET`, `STRIPE_AUTOMATIC_TAX` | Vercel (payments, 3.19) | See 3.19 |

**Supabase Auth settings that production needs** (dashboard → Authentication):

1. **Sign In / Providers → Email:**
   - **Allow new users to sign up: ON.** This is required for self sign-up. It used to be off when agents joined by invitation only.
   - **Confirm email: ON.**
   - **Minimum password length: 12.**
2. **URL Configuration:** Site URL `https://gosearchproperty.com`; Redirect URLs include `https://gosearchproperty.com/auth/confirm`.
3. **Email templates:** every link points at `/auth/confirm` with a `token_hash`, so mail scanners can't use it up:
   - **Confirm signup:** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
   - **Invite user:** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`
   - **Reset password:** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
4. **SMTP:** custom SMTP (Resend, Postmark, SES…). **Without it, confirmation, invite and reset emails only reach your own Supabase team members, a few per hour.**
5. **Rate limits / Attack protection:** keep the defaults. Optionally turn on CAPTCHA later; that would need a code change to send the token.

---

## 5. Deploys

- **Normal:** push to `main`. GitHub Actions runs the end-to-end tests (`.github/workflows/e2e-tests.yml`) and Vercel builds and deploys. Check with `/api/health`: its `commit` should equal the new commit.
- **Before pushing:**
  ```bash
  npm run lint && npx tsc --noEmit && npm run check:ph && npm run test:e2e
  ```
- **Roll back:** Vercel → Deployments → the last good one → *Promote to Production*. Then revert the bad commit on `main` (`git revert <sha>`), or the next push will redeploy it.
- **Database changes:**
  1. Add a folder under `prisma/migrations/`.
  2. Apply it in Supabase: the SQL editor, `npx prisma migrate deploy` with `DIRECT_URL`, or the Supabase MCP `apply_migration`.
  3. Re-run `prisma/sql/postgis.sql` if the rules changed. It is idempotent and uses a 5-second lock timeout.
  4. Re-run `prisma/sql/supabase-security.sql` after creating tables.

  Apply database changes **before** deploying code that needs them.
- **The build fails** → [6.10](#610-build-or-deploy-fails).

### 5.1 Release gate (every production release)

**Pre-flight:**
1. CI green on the PR: `CI`, `End-to-end tests`, `CodeQL`.
2. **Database backup** before any migration. On the Free plan there are no automatic backups, so take one:
   ```bash
   pg_dump "$DIRECT_URL" --format=custom --no-owner --file="gsp-$(date +%F-%H%M).dump"
   ```
   (`DIRECT_URL` = Supabase → Connect → Session pooler or direct connection. Keep the file encrypted, off the laptop's Downloads folder.)
3. Migrations are **additive only** (new columns nullable or defaulted, new tables). A rollback SQL block is written at the top of each migration file.
4. Secrets live only in Vercel, marked Sensitive. Check names, never print values. Required: `POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `LEAD_IP_SALT`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_LISTINGS_SOURCE`; for payments `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
5. Open Vercel → Logs (filter: errors) and Supabase → Logs before merging.

**Execution order:**
1. Apply the migration on live (SQL editor or `apply_migration`), then check it (`SELECT` the new columns).
2. Merge the PR (squash). Vercel builds `main` and promotes it automatically.
3. If Vercel doesn't start a build within 2 minutes, start it from the dashboard (Deployments → Redeploy the latest `main` commit).

**Smoke tests** (run from any shell after the deploy shows Ready):
```bash
S=https://gosearchproperty.com
curl -s $S/api/health                                   # {"status":"ok","database":"ok","commit":"<new sha>"}
curl -s -o /dev/null -w "%{http_code}\n" $S/                 # 200 (307 to /uae from a UAE network)
curl -s -o /dev/null -w "%{http_code}\n" $S/uae               # 200
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" $S/dashboard   # 307 to /agent/sign-in
curl -s -o /dev/null -w "%{http_code}\n" -X POST $S/api/stripe/webhook  # 503 (payments off) or 400 (on, unsigned)
curl -s -o /dev/null -w "%{http_code}\n" https://newproject04.vercel.app/   # 308 to gosearchproperty.com
curl -sI $S/ | grep -i -E "strict-transport|content-security"             # both present
```
Then Vercel → Logs: no `request.error` for 15 minutes.

**Rollback:**
1. **Code:** Vercel → Deployments → the previous Ready production deployment → *Instant Rollback*. Then `git revert <sha>` on `main` so the next push doesn't bring it back.
2. **Database:** only if the migration itself is the problem. Run the rollback block from the top of the migration file. Additive migrations can stay in place under the old code, so code rollback alone is usually enough.
3. **Payments:** to switch Stripe off at once, remove `STRIPE_SECRET_KEY` in Vercel and redeploy. The billing page then says payments are off and the webhook answers 503; Stripe retries webhooks for 3 days, so nothing is lost.
4. Write what happened in section 11.

---

## 6. Runbooks by symptom

### 6.1 Site down or Vercel error page
1. Check Vercel status (vercel-status.com) and the project's latest deployment state.
2. If the latest deploy is in Error, production still serves the previous one. If production itself is broken, promote the last good deployment.
3. Vercel → Logs → errors. A page-wide 500 is often a missing env var: look for `config.missing` or database connection errors.
4. DNS or SSL issues → 6.9.

### 6.2 Database down / health says `"database":"down"`
1. Supabase dashboard: is the project paused (→ 6.8), unhealthy or over its limits?
2. Is the connection string the **pooler** one (port 6543)? Check Vercel env `POSTGRES_URL` (don't print its value).
3. "Too many connections" → lower `DATABASE_POOL_MAX`, or check for a stuck query in Supabase → Database → Query performance.
4. **While it's down:** listing pages error, inquiries return 503 (nothing is silently lost), rate limits fall back to memory, and sign-in still works (it uses Auth, not Postgres) but the dashboard shows no data.

### 6.3 Agents can't sign in
Work out which message the agent sees:

| Message | Cause | Fix |
| --- | --- | --- |
| "That email and password do not match." | wrong password, or no account | Send them to *Forgot password*. Check Authentication → Users that the account exists |
| "Confirm your email first…" | right password, email unconfirmed | They open the confirmation link, or sign up again with the same email for a fresh link. An admin can also confirm them in Users |
| "Too many attempts…" | rate limit | Wait 15 minutes, or clear it (7.4) |
| "Sign-in is temporarily unavailable…" | the Auth server is down, slow or misconfigured | Check Supabase status and Auth logs; check the URL and key env vars |
| Signs in, then bounced back to sign-in | the cookie isn't kept, or `getUser` fails | Is the site on https (Secure cookie)? Is the domain the same as Site URL? Is Supabase Auth healthy? |
| Signs in but sees no listings | no `Agent` row linked | Create or link it (7.1). Check `Agent.userId = auth.users.id` |

### 6.4 Sign-up problems
- **"Too many sign-ups from here."** Five sign-ups an hour from one network. Wait, or clear `signup:%` keys (7.4).
- **"That was quick…"** The form was sent within 3 seconds; press the button again. If it happens to everyone, check `SIGNUP_MIN_SECONDS`.
- **"This form has expired…"** The page is more than 2 hours old, or `LEAD_IP_SALT` changed or isn't set (each instance then has a different salt). Reload. If it's frequent, set `LEAD_IP_SALT` in Vercel and redeploy.
- **"This password has appeared in a known data breach."** Working as intended; choose another.
- **"Sign-up is temporarily unavailable…"** Supabase Auth is down, or **sign-ups are disabled in Supabase** (`signup_disabled`). Turn on *Allow new users to sign up* (section 4).
- **The success message shows, but no email arrives** → 6.5.
- **Someone says "I already have an account" and got no email:** working as intended. An existing email gets the same answer without an email. Send them to sign-in or *Forgot password*.

### 6.5 Emails don't arrive (confirmation, invite, reset)
1. **Custom SMTP set up?** Without it, only Supabase team members get emails. This is the most common cause.
2. Supabase → Logs → Auth: look for send errors or rate limits (`over_email_send_rate_limit`).
3. The SMTP provider's dashboard: bounced or blocked? Is the domain verified (SPF/DKIM)?
4. Spam folder. Outlook and corporate filters especially.
5. **The link opens but says it expired or was used:** each link works once and expires (1 hour by default). The templates must use the `token_hash` form (section 4), otherwise scanners use up the link. Request a new link.

### 6.6 A listing isn't showing
Check each of these:
1. `status = 'ACTIVE'`, `publishedAt` set, `expiresAt` empty or in the future.
2. The right country: PH listings never appear on `/uae` or its search, and vice versa.
3. Search text: does the location exist, with that name or alias, in that country (`Location`)?
4. Cache delay: the **home pages'** "latest listings" are cached and refresh in the background about once a minute (section 3.15), so a new, edited or hidden listing shows there within about a minute. Listing pages and search read the database on every request, so they change on refresh.

```sql
SELECT p.slug, p.status, p."publishedAt", p."expiresAt", l.name, l.country
FROM "Property" p JOIN "Location" l ON l.id = p."locationId" WHERE p.slug = '<slug>';
```

### 6.7 Can't save or activate a listing (database error)

| Error | Meaning | Fix |
| --- | --- | --- |
| "needs an agent licensed in that country" | PH agent on a UAE listing, or the reverse | Use an agent from the listing's country |
| "…advertising permit…" | Dubai, Abu Dhabi or RAK listing without `adPermitNumber` | Get the permit (Trakheesi, Madhmoun or RAK RERA) and set it before activating |
| `agent_license_fields` | licence fields missing for that type | Fill them in (section 3.9). **For `UAE_BROKER` on the live database, first apply migration 7 (7.6)** |
| `property_rent_needs_period` and similar | a listing-type rule | Fill in the field the rule names (section 3.9) |

### 6.8 Supabase project paused
Free projects pause after 7 days without activity.
1. Supabase dashboard → the project → **Restore**. It takes a few minutes, and the data is kept.
2. Then check `/api/health`.
3. To prevent it, use the Pro plan, or make sure an uptime monitor pings `/api/health` daily. Every check queries the database, which counts as activity.

### 6.9 Domain or SSL problems
1. Vercel → Project → Domains: `gosearchproperty.com` and `www` should show *Valid Configuration*.
2. DNS at the registrar: apex `A 76.76.21.21` (or Vercel's current value shown in the dashboard), and `www CNAME cname.vercel-dns.com`, or Vercel nameservers if you moved DNS there.
3. If the certificate isn't issued, remove any conflicting `CAA` record, or allow `letsencrypt.org`.
4. After a domain change, update `NEXT_PUBLIC_SITE_URL`, the Supabase Site URL and the redirect URLs, then redeploy.

### 6.10 Build or deploy fails
1. Vercel → the deployment → Build logs. The first error matters; the rest usually follow from it.
2. Reproduce locally:
   ```bash
   npm ci && npm run build
   NEXT_PUBLIC_LISTINGS_SOURCE=database npm run build
   ```
3. Common causes:
   - A type error (`npx tsc --noEmit`).
   - An env var read at build time.
   - A page using request data (cookies, headers, `Date.now()`) outside `connection()` or Suspense. Next.js 16 `cacheComponents` requires this.
4. Node version: use the one set in Vercel → Project → Settings → Node.js Version.

### 6.11 Inquiries failing (buyers see an error)

| Status | Meaning |
| --- | --- |
| 503 | the database is down (6.2), or the site is in sample mode |
| 429 | the visitor sent more than 5 in 10 minutes: expected |
| 404 | the listing is no longer live |
| 415 / 400 | the client sent bad data: probably an old cached page, or a bot |

Search the logs for `lead.` events.

### 6.13 An agent can't save, publish or upload photos

| Message | Cause | Fix |
| --- | --- | --- |
| "Add at least one photo before publishing." | No photos yet | Add photos first |
| "…before they go live" | Dubai, Abu Dhabi or RAK listing without its permit | Add the permit number, Save changes, then Publish |
| "Photos can be added once your licence is verified." | Agent isn't `VERIFIED` | Verify the licence (7.1) |
| "The photo could not be saved…" | The Storage upload was refused or failed | Check `listing.photo_upload_failed` in the logs. "row-level security" there means the storage policies are missing: run `prisma/sql/storage-policies.sql` in the SQL editor. Otherwise check Supabase Storage status |
| "That photo isn't a JPEG, PNG or WebP photo." / "too small" / "couldn't be read" | The file was refused by the server checks (3.17) | Export the photo again as JPEG, at least 600 px |
| "Too many changes / uploads in an hour." | Rate limit (3.17) | Wait, or clear `listing:%` keys in `RateLimit` |
| "Your session has ended…" | Signed out | Sign in again; what was typed stays in the form until reload |

The listing page shows the photos, but the home page doesn't show the listing yet: the home page refreshes at once on publish, and within a minute otherwise (3.15).

### 6.12 Strange traffic or abuse
- **Many `signup.honeypot` or `signup.rate_limited` events:** bots. Limits hold, but consider Vercel Firewall rules or Supabase CAPTCHA.
- **Many `agent.signin_rate_limited` events:** password guessing. The per-email limit protects accounts. Check whether one agent is targeted, and ask them to change their password.
- **A suspected leaked agent password:** Supabase → Users → the user → *Log out* or *Delete sessions*, then send a reset.

---

## 7. Admin tasks (Supabase SQL editor)

### 7.0 Listings and photos

**Agents** manage their own listings and photos in the dashboard (3.17). Admins only step in for takedowns.

**Take a listing down** (e.g. a complaint):
```sql
UPDATE "Property" SET status = 'PAUSED', "updatedAt" = now() WHERE slug = '<slug>';
```
The home page catches up within a minute, or at once on redeploy.

**One-off admin photo:**
1. Upload it in Storage → `listing-photos` under an `admin/<listing id>/` folder.
2. Insert a `PropertyMedia` row with that `storageKey`.

Agents can't delete admin files, only remove the photo from their listing.

### 7.1 Approve a self-signed-up agent

**Use the admin screen:** sign in with an email listed in `ADMIN_EMAILS` → Dashboard → **Review agent applications** (`/admin/agents`). Each application shows the licence and what to check with the regulator.
- **Approve** creates the `User` and `Agent` rows (verified), writes `agent.verified` to `AuditLog` with your email, and emails the agent. It's disabled while their email is unconfirmed, or for a salesperson whose PRC broker isn't approved yet (approve the broker first).
- **Decline** needs a reason (5–500 characters). It's stored in `ApplicationDecision`, shown on the applicant's dashboard and emailed to them.
- **An admin login:** Supabase → Authentication → Users → *Invite user* with your email (invites reach Supabase team members even before SMTP is set up), set a password from the link, and put the same email in `ADMIN_EMAILS`.

The SQL below does the same as **Approve**, for when the screen is unavailable.

#### By SQL
**List applicants waiting for review:**
```sql
SELECT u.id, u.email, u.email_confirmed_at IS NOT NULL AS email_confirmed, u.created_at,
       u.raw_user_meta_data->'application' AS application
FROM auth.users u
WHERE u.raw_user_meta_data ? 'application'
  AND NOT EXISTS (SELECT 1 FROM public."Agent" a WHERE a."userId" = u.id::text)
ORDER BY u.created_at;
```

**Before approving, check the licence with the regulator:**
- **PRC broker:** the PRC online verification.
- **DHSUD salesperson:** DHSUD's list. The supervising broker must already be an approved agent here.
- **Dubai:** the DLD/RERA broker search (BRN and ORN).
- **Other emirates:** that emirate's regulator.

Approve only accounts whose email is confirmed.

**Approve one applicant** (it reads everything from their application; change only the email):
```sql
WITH app AS (
  SELECT id::text AS uid, email, raw_user_meta_data->'application' AS a
  FROM auth.users WHERE email = 'agent@example.com' AND email_confirmed_at IS NOT NULL
), usr AS (
  INSERT INTO "User" (id, email, name, role, "updatedAt")
  SELECT uid, email, a->>'fullName', 'AGENT', now() FROM app
  ON CONFLICT (id) DO UPDATE SET role = 'AGENT', "updatedAt" = now()
  RETURNING id
), agent AS (
  INSERT INTO "Agent" (id, "userId", "licenseType", "prcLicenseNumber", "dhsudAccreditationNumber", "supervisingBrokerId",
                       "uaeRegulator", "uaeBrokerNumber", "uaeOfficeNumber", "displayName", mobile, "viberNumber",
                       "whatsappNumber", languages, verification, "verifiedAt", "updatedAt")
  SELECT gen_random_uuid()::text, app.uid, (a->>'licenseType')::"LicenseType",
         a->>'prcLicenseNumber', a->>'dhsudAccreditationNumber',
         (SELECT b.id FROM "Agent" b WHERE b."prcLicenseNumber" = a->>'supervisingBrokerPrc' AND b.verification = 'VERIFIED'),
         a->>'uaeRegulator', a->>'uaeBrokerNumber', a->>'uaeOfficeNumber',
         a->>'fullName', a->>'mobile',
         CASE WHEN a->>'country' = 'PH' THEN a->>'mobile' END,
         ltrim(a->>'mobile', '+'),
         CASE WHEN a->>'country' = 'AE' THEN ARRAY['English', 'Arabic'] ELSE ARRAY['English', 'Filipino'] END,
         'VERIFIED', now(), now()
  FROM app JOIN usr ON usr.id = app.uid
  RETURNING id, "userId"
)
INSERT INTO "AuditLog" (id, action, "entityType", "entityId", after, "createdAt")
SELECT gen_random_uuid()::text, 'agent.verified', 'Agent', id, jsonb_build_object('userId', "userId"), now() FROM agent;
```

**If it fails:**
- **Zero rows:** the email isn't confirmed yet, or the email is mistyped.
- **`agent_license_fields`:**
  - For a salesperson, the supervising broker isn't an approved agent yet; approve the broker first.
  - For UAE, migration 7 isn't applied (7.6).
- **Unique violation:** that licence number already belongs to another agent. Investigate before going further.

The brokerage name in the application (`a->>'brokerage'`) is for your review. Link an `Agency` row separately if needed.

After approval the agent refreshes `/dashboard` and sees the agent view. Email them that their account is active.

### 7.2 Reject an applicant
Supabase → Authentication → Users → the user → **Delete user**, then email them the reason. The `agent.applied` row in `AuditLog` stays as the record.

### 7.3 Suspend an agent
```sql
UPDATE "Agent" SET verification = 'REJECTED', "updatedAt" = now() WHERE "userId" = '<auth user id>';
UPDATE "Property" SET status = 'PAUSED' WHERE "agentId" = (SELECT id FROM "Agent" WHERE "userId" = '<auth user id>');
```
Then Supabase → Users → *Log out* that user. Record it in `AuditLog` with `action = 'agent.suspended'`.

Listing statuses are DRAFT, PENDING_REVIEW, ACTIVE, PAUSED, EXPIRED, REJECTED, SOLD and RENTED.

### 7.4 Unlock a rate limit
```sql
-- everyone (e.g. after an incident)
DELETE FROM "RateLimit" WHERE key LIKE 'signin:%' OR key LIKE 'signup:%' OR key LIKE 'reset:%';
-- one email: keys use sha256(lower(email)), first 24 hex characters
DELETE FROM "RateLimit"
WHERE key IN (SELECT s || encode(sha256(convert_to(lower('agent@example.com'), 'UTF8')), 'hex')::varchar(24)
              FROM unnest(ARRAY['signin:email:', 'signup:email:', 'reset:email:']) s);
```

### 7.5 Rotate keys and secrets
- **`LEAD_IP_SALT`:** set a new value in Vercel and redeploy. Effects:
  - Open sign-up forms expire, so people need to reload.
  - Rate-limit counters reset.
  - Old `ipHash` values no longer match new ones.
- **Supabase publishable key:** create a new one (Settings → API keys), update Vercel, redeploy, then revoke the old one.
- **Database password:** Supabase → Database → reset the password, update `POSTGRES_URL`/`DATABASE_URL` in Vercel (the integration may do this), then redeploy.
- **SMTP credentials:** update them in Supabase → Auth → SMTP.

### 7.6 Apply migration 7 (UAE listing rules) — applied 3 Nov 2026
This re-runs the current `prisma/sql/postgis.sql`, which is idempotent: the `UAE_BROKER` licence rule, the agent-country and permit trigger, and the `rentCheques` check.

Run it in the Supabase SQL editor, or ask Claude to apply it as migration `7_uae_listing_rules`.

Afterwards, check it:
```sql
SELECT pg_get_constraintdef(oid) LIKE '%UAE_BROKER%' FROM pg_constraint WHERE conname = 'agent_license_fields';  -- expect true
```

---

### 7.7 Test agent accounts

Four test logins exist on the live site (created 3 Nov 2026). They are marked as test accounts:
- Their agent ids start with `test_`.
- Their display names start with "TEST".
- Their Supabase metadata has `test_account: true`.
- Their licence numbers are placeholders.

| Agent id | Role |
| --- | --- |
| `test_ph_broker` | Philippines broker (PRC) |
| `test_ph_salesperson` | Philippines salesperson (DHSUD), under `test_ph_broker` |
| `test_ae_broker` | UAE broker, Dubai (RERA BRN) |
| `test_ae_agent` | UAE agent, Abu Dhabi (ADREC) |

The logins and password were given to the owner directly and are not stored in this repository.

**Rules for test listings:**
- A test listing **goes live on the public site**.
- Give it a title starting with "TEST".
- Set it back to `DRAFT` or `PAUSED` when done.

**Remove them all before launch,** or whenever they are no longer needed:
```sql
BEGIN;
DELETE FROM "Lead" WHERE "agentId" LIKE 'test\_%';
DELETE FROM "Property" WHERE "agentId" LIKE 'test\_%';
UPDATE "Agent" SET "supervisingBrokerId" = NULL WHERE id LIKE 'test\_%';
DELETE FROM "Agent" WHERE id LIKE 'test\_%';
DELETE FROM "User" WHERE id IN (SELECT id::text FROM auth.users WHERE raw_user_meta_data->>'test_account' = 'true');
DELETE FROM auth.users WHERE raw_user_meta_data->>'test_account' = 'true';   -- identities and sessions cascade
COMMIT;
```

## 8. Log events

Search Vercel logs for these:

| Area | Events |
| --- | --- |
| Server errors | `request.error` (every unhandled error in a page, route, action or the proxy; `digest` matches the one on the error page; `src/instrumentation.ts`) |
| Slow dependencies | `auth.slow` (Supabase Auth call over 1 s, path only), `hibp.slow` (breach check over 1 s) |
| Configuration | `config.missing` |
| Rate limits | `ratelimit.db_fallback`, `ratelimit.clear_failed` |
| Leads | `lead.created`, `lead.rate_limited`, `lead.honeypot`, `lead.save_failed`, `lead.chat_failed` |
| Sign-in | `agent.signin`, `agent.signin_failed`, `agent.signin_rate_limited`, `agent.signin_unavailable` |
| Reset and password | `agent.reset_failed`, `agent.password_set` |
| Email links | `agent.link_cross_site` |
| Sign-up | `signup.submitted`, `signup.honeypot`, `signup.rate_limited`, `signup.unavailable`, `signup.failed`, `signup.audit_failed` |
| SEO | `sitemap.listings_failed` |
| Home pages | `home.latest_failed` (the cached listings block could not load; it retries within a minute) |
| Email | `email.sent`, `email.failed` (check the Resend dashboard), `email.skipped` (no key set) |
| Admin | `admin.agent_approved`, `admin.agent_rejected` |
| Billing | `billing.live_blocked` (live key without approval), `billing.control_unreadable` (kill-switch table missing: checkout closed), `billing.refunded`, `billing.dispute_opened` (act in Stripe), `billing.dispute_closed`, `billing.reconciled`, `billing.reconcile_failed`, `billing.checkout_started`, `billing.checkout_failed`, `billing.portal_failed`, `billing.synced`, `billing.payment_failed`, `billing.webhook_bad_signature` (repeated = someone probing, or the wrong secret in Vercel), `billing.webhook_failed` (Stripe will retry), `billing.subscription_unmatched`, `billing.schema_missing` (migration 4 not applied) |

---

## 9. Tests

**Commands:**
- `npm run test:e2e`: everything, 95 tests, about 6 minutes including the build.
- `npm run test:auth`: the account-related subset.
- `AUTH_TEST_SKIP_BUILD=1 npm run test:e2e`: rerun without rebuilding.

**How it runs:**
- It builds into `.next-auth-test/` and runs it against:
  - a local stand-in for Supabase Auth (`tests/e2e/support/mock-auth.mjs`), which also stands in for Storage, the breach-check API and the few Stripe endpoints the site calls;
  - an in-memory Postgres (PGlite) with the real migrations, rules and seed locations (`tests/e2e/support/test-db.mjs`), with PostGIS removed.
- Two test listings: `test-bgc-2br-condo` (PH) and `test-dubai-marina-2br` (UAE).
- No real accounts, data or secrets are used.

**Suites:**

| Suite | Covers |
| --- | --- |
| `account-creation` | invitations; that sign-up has a single address |
| `sign-up` | PH broker, UAE broker and salesperson; duplicates; validation; password rules; breach outage; honeypot; timer; rate limits; injection |
| `sign-in` | sign-in cases |
| `session` | sessions and sign-out |
| `security` | injection, rate limits, redirects, cookies, Auth outages |
| `site` | country selector, phone codes, both countries' listings, inquiries, saved homes, pricing pages, health, sitemap, footer links, mobile width |
| `listings` | listing editor: details, price, photos, publishing, ownership, verification |
| `admin` | admin screen: access, approve, blocked cases, decline with reason, emails |
| `billing` | Stripe checkout in pesos and dirhams, signed and forged webhooks, repeated events, past-due and cancelled plans, the customer portal, live-listing limits |

**Practice:** **add a test that reproduces a bug before fixing it.** Rerun with `--repeat-each=3` to catch flaky tests.

**CI:** `.github/workflows/e2e-tests.yml` runs on every push and pull request. **Protect `main`** (owner, once): GitHub → Settings → Branches → Add rule for `main` → *Require status checks to pass* → tick `check` and `e2e`, and *Require branches to be up to date*. Then nothing merges with failing tests.

**Other checks:**
- `npm run lint`
- `npx tsc --noEmit`
- `npm run check:ph` (formatting and seed data)
- `npm run build:preview` (the static preview)

---

## 10. Security model (summary)

**Sessions:**
- HttpOnly, Secure, SameSite=Lax cookies; no browser code touches Supabase.
- Every protected request asks the Auth server (`getUser`); it fails closed.

**Passwords:**
- 12 or more characters; breach check with k-anonymity; doesn't contain the user's name or email.
- Supabase stores them with bcrypt.

**Anti-automation:**
- Rate limits per IP and per email; the per-email limit is cleared on success.
- Honeypots (sign-up and inquiries).
- A signed minimum-time token on sign-up.

**Anti-enumeration:** sign-in, reset and sign-up give the same answer whether or not the email exists.

**Links:**
- One-time tokens are spent only on POST, from the Continue page, with an Origin check.
- `safeNext` blocks open redirects.

**Data:**
- The Data API is locked (RLS plus revoked grants).
- IPs are hashed with a secret salt; logs contain no personal data.
- Consent is recorded; 24-month retention; `erase_user()`.

**Headers** (`next.config.ts`): CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame-ancestors none.

**Least privilege:** no service-role key in the app; agents only see their own listings and leads (every dashboard query filters by `agentId`).

**Compliance notes** (not legal advice; have a lawyer review the Terms and Privacy pages):
- **Philippines:** Data Privacy Act (RA 10173) consent and retention; RESA (RA 9646) PRC and DHSUD licence display.
- **UAE:** emirate-level broker registration and advertising permits (Trakheesi, Madhmoun, RAK RERA) shown on listings; PDPL (Federal Decree-Law 45/2021) for personal data.

---

## 11. Open items (as of 3 Nov 2026)

1. **Apply migration 7** (UAE listing rules) on the live database (7.6). Until then, UAE agents can't be approved.
2. **Supabase Auth settings for self sign-up** (section 4):
   - turn on *Allow new users to sign up*;
   - keep *Confirm email* on;
   - set the Confirm signup template;
   - set the minimum length to 12.
3. **Custom SMTP** in Supabase. Without it, confirmation emails don't reach applicants.
4. Set **`LEAD_IP_SALT`** in Vercel if it isn't set: check that it exists without printing it.
5. **Plans:** the Supabase free plan pauses when idle and has no backups, and Vercel Hobby is for non-commercial use. Move both to Pro before launch marketing.
6. **Legal review** of the Terms (version `2026-10-31`) and the Privacy notice for both countries.
7. **Later:**
   - an admin screen for approving applicants (today it's SQL, 7.1);
   - an email to the agent when they are approved;
   - CAPTCHA on sign-up if bot traffic grows;
   - daily exchange-rate and mortgage-rate refresh.
