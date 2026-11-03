# Pre-launch audit: database, security, performance, observability, go-live

**Date:** 3 November 2026
**Scope:** gosearchproperty.com at commit `89926a7`; Supabase project `uyfiidwrmytdugzcjjzo` (Postgres 17.11, eu-west-1); Vercel project `newproject04`.

## Launch profile

| | |
| --- | --- |
| **Application** | Go Search Property: a property portal for the Philippines and the UAE |
| **Environment** | Production on Vercel (Next.js 16.4, Node). Supabase Postgres + PostGIS through the Supavisor pooler (transaction mode, port 6543). Supabase Auth |
| **Critical integrations** | Supabase Auth (agent sign-in, sign-up, invites, resets), Have I Been Pwned range API, Viber/WhatsApp deep links (outbound only, no webhooks), Postgres-backed rate limiter |
| **Expected load** | Not stated. Sized here for an early launch: about 1–5k visitors a day, under 20 requests/second at peak. Phase 3 load-tests against this |

## How this was checked

Every finding below comes from something run during this audit, not from a template:

- SQL against the live database: settings, connections, foreign keys, RLS, grants, cron jobs, statement stats.
- Supabase security and performance advisors.
- `EXPLAIN ANALYZE` of the site's real queries on 20,000 synthetic listings. This ran in a local Postgres 17 (PGlite) with the production schema; the live database has no listings yet.
- A secret scan of the code and the full git history.
- `npm audit`.
- A Vercel env inventory: names only, no values decrypted.
- GitHub repo settings.
- The 71-test end-to-end suite, which passed three times over.

---

## Findings at a glance

| # | Severity | Finding | Fix |
| --- | --- | --- | --- |
| 1.1 | 🔴 Critical | **No database backups.** Supabase Free has no automatic backups and no PITR, and pauses after 7 idle days | Pro plan + nightly encrypted dump (1.1) |
| 2.1 | 🔴 Critical | **Unused master secrets in Vercel:** `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`. The JWT secret can mint a session for any user; the service key bypasses all RLS. The app uses none of them | Delete from Vercel (2.1) |
| 2.2 | 🟠 High | **Listings of unverified or suspended agents still show.** The "live" filter ignores `Agent.verification` | One-line SQL change (2.2) |
| 1.2 | 🟠 High | **UAE listing rules (migration 7) are not on the live database.** UAE brokers can't be approved, and Dubai/Abu Dhabi/RAK permits aren't enforced | Apply migration 7 (1.2) |
| 2.3 | 🟠 High | **`main` is unprotected:** a push deploys to production while the tests are still running | Branch protection with required checks (2.3) |
| 1.3 | 🟡 Medium | **The app connects as `postgres`**, which has full privileges, bypasses RLS and has no server-side timeouts. The 5 s `statement_timeout` set in the app may not reach Postgres through the transaction pooler | Dedicated app role with limits (1.3) |
| 1.4 | 🟡 Medium | **The home page and sitemap queries scan every live listing.** 197 ms at 20k listings | Two partial indexes: home 197 → 4.8 ms, sitemap 19 → 8 ms (1.4) |
| 2.4 | 🟡 Medium | **Supabase Auth settings for self sign-up are not done yet:** sign-ups on, custom SMTP, minimum length 12, signup template | Dashboard settings (2.4) |
| 1.5 | 🟢 Low | **The database TLS certificate isn't verified** (`DATABASE_SSL_CA` unset). The connection is encrypted, but a proxy could impersonate the server | Add the CA (1.5) |
| 2.5 | 🟢 Low | **Server-action body limit is the 1 MB default.** No upload needs more than a few KB | `bodySizeLimit: "100kb"` (2.5) |
| 2.6 | 🟢 Low | **`DASHBOARD_USER`/`PASSWORD` are still set.** They're only used in sample mode | Delete (2.1) |
| 2.7 | ℹ️ Accepted | **CSP allows inline scripts** (`'unsafe-inline'`) | Accepted: a nonce-based CSP would make every page dynamic. Revisit in Phase 3 |
| 2.8 | ℹ️ Accepted | **The rate limiter uses fixed windows:** up to 2× the limit can get through across a window edge | Accepted for this load. A sliding window is shown in 2.6 if wanted |
| 2.9 | ℹ️ Info | **16 moderate `npm audit` advisories,** all in dev tooling (eslint → minimatch) | **0 in production dependencies** |

---

# PHASE 1: Database and data integrity

## 1.0 What's already in good shape (verified)

| Check | Result |
| --- | --- |
| Migrations | 0–6 applied, matching `prisma/migrations` (7 pending, see 1.2) |
| Foreign keys | **Every FK is indexed** (the check query returned none unindexed) |
| Delete rules | `Property→Agent`, `Lead→Agent`, `Property→Location` and `Project→Developer` are **RESTRICT**: an agent with listings or leads can't be deleted. Child rows (media, amenities, price history) **CASCADE**. Optional links **SET NULL** |
| RLS | On for all 22 tables, with no policies. No grants to `anon`/`authenticated`. The browser keys can read nothing. The advisor's 22 "RLS enabled, no policy" notices are this intended lockdown |
| Retention job | `pg_cron` `lead-retention` runs daily at 19:15 UTC (`purge_old_leads(24)`) |
| Isolation | `READ COMMITTED`, and that's enough. Every write is one atomic statement: the rate-limit upsert, the lead insert, and the lead-status change, which locks with `FOR UPDATE` in a CTE. No multi-statement invariants need `SERIALIZABLE` |
| Pool (app side) | `pg` Pool with `max 5` per instance, 3 s connect timeout, 10 s idle timeout, 6 s client query timeout, through the Supavisor transaction pooler. `max_connections` is 60, with 16 in use at idle |
| Size | 20 MB; 137 locations, 21 amenities, 5 banners, no listings yet |
| Indexes flagged "unused" by the advisor (39) | Expected with no traffic. **Don't drop any.** Re-check after 30 days of real traffic |

## 1.1 🔴 Backups and disaster recovery

**Today:** the Free plan has no backups and no PITR, and it pauses after a week idle ([Supabase pricing](https://supabase.com/pricing)). **RPO is unbounded:** losing the project means losing every lead and listing.

| Option | RPO (data loss) | RTO (time to restore) | Cost |
| --- | --- | --- | --- |
| Now (Free) | everything | none | $0 |
| **Pro plan** (daily backups, 7 days kept, no pausing) | ≤ 24 h | ~30–60 min (dashboard restore) | $25/mo |
| Pro + PITR (7 days) | ~2 min | ~30–60 min | +$100/mo |
| **Plus** the nightly encrypted dump below | ≤ 24 h, held outside Supabase | ~1 h (new project + `pg_restore`) | $0 |

**Recommendation: Pro now, plus the nightly dump.** That gives an RPO of 24 hours and an RTO of 1 hour. Add PITR once inquiries carry real money.

**Nightly encrypted dump.** The repo is **public**, so the dump must be encrypted before it is uploaded. Encrypted artifacts can be downloaded by anyone with read access but are useless without the passphrase.

`.github/workflows/db-backup.yml`:
```yaml
name: Database backup
on:
  schedule: [{ cron: "40 20 * * *" }] # 00:40 Dubai, after the retention job
  workflow_dispatch:
permissions: { contents: read }
jobs:
  backup:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Install pg_dump 17
        run: |
          sudo apt-get update -qq && sudo apt-get install -y -qq postgresql-common
          yes | sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
          sudo apt-get install -y -qq postgresql-client-17
      - name: Dump, check, encrypt
        env:
          DB_URL: ${{ secrets.BACKUP_DATABASE_URL }}   # session pooler, port 5432
          PASSPHRASE: ${{ secrets.BACKUP_PASSPHRASE }}
        run: |
          set -euo pipefail
          f="gsp-$(date -u +%F).dump"
          /usr/lib/postgresql/17/bin/pg_dump "$DB_URL" -Fc --no-owner --no-privileges \
            -n public -n auth -f "$f"
          /usr/lib/postgresql/17/bin/pg_restore --list "$f" > /dev/null   # fails if the dump is corrupt
          openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -in "$f" -out "$f.enc" -pass env:PASSPHRASE
          rm "$f"; ls -l "$f.enc"
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with: { name: db-backup, path: "*.enc", retention-days: 14 }
```

- **Secrets to add** (GitHub → Settings → Secrets → Actions):
  - `BACKUP_DATABASE_URL`: Supabase → Connect → *Session pooler*, using the read-only role from 1.3.
  - `BACKUP_PASSPHRASE`: 32+ random characters. Keep a copy offline.
- **Monthly restore drill** (proves the backup works; target under 1 hour):
  ```bash
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in gsp-2026-11-04.dump.enc -out gsp.dump -pass env:PASSPHRASE
  createdb gsp_restore_test && pg_restore -d gsp_restore_test --no-owner -n public gsp.dump
  psql gsp_restore_test -c 'SELECT count(*) FROM "Location"; SELECT count(*) FROM "Lead";'
  ```

## 1.2 🟠 Apply migration 7, with a rollback

The pre-check ran on live: no agents, no listings, 55 UAE locations, 3 emirates with permit systems. **Nothing can violate the rules.** It is safe to apply now. The SQL is lines 84–136 of `prisma/sql/postgis.sql`.

**Rollback (down)**, if it ever needs undoing:
```sql
BEGIN;
DROP TRIGGER IF EXISTS trg_property_market_rules ON "Property";
DROP FUNCTION IF EXISTS property_market_rules();
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS property_rent_cheques;
ALTER TABLE "Agent" DROP CONSTRAINT IF EXISTS agent_license_fields;
ALTER TABLE "Agent" ADD CONSTRAINT agent_license_fields CHECK (CASE "licenseType"
  WHEN 'REAL_ESTATE_BROKER' THEN "prcLicenseNumber" IS NOT NULL
  WHEN 'REAL_ESTATE_SALESPERSON' THEN "dhsudAccreditationNumber" IS NOT NULL AND "supervisingBrokerId" IS NOT NULL
  ELSE FALSE END);
COMMIT;
```

**Zero-downtime rule for later migrations, once tables have data:**
- Add a CHECK as `NOT VALID`, then `VALIDATE CONSTRAINT` in a separate step.
- Build indexes with `CREATE INDEX CONCURRENTLY`, outside a transaction.
- Use only additive columns (nullable or with a default). Deploy the code that tolerates both shapes *before* removing anything.
- Keep `lock_timeout = '5s'` so a migration fails fast instead of queuing behind live traffic.

## 1.3 🟡 Least-privilege app role with server-side limits

**The problem:**
- The site connects as `postgres`, which can alter or drop tables and bypasses RLS.
- That role's `statement_timeout` is 2 minutes, and `idle_in_transaction_session_timeout` is 0 (off).
- Through Supavisor's transaction mode, the timeouts the app sends at startup may not apply. The app's 6 s client-side `query_timeout` still cancels the query, but the server keeps working on it.

**The fix** is a dedicated role that can only read and write the tables the site uses, with limits enforced by Postgres itself:
```sql
-- Run in the SQL editor (as postgres). Choose the password in the dashboard; never commit it.
CREATE ROLE gsp_app LOGIN PASSWORD '<generated>' NOINHERIT;
GRANT USAGE ON SCHEMA public, extensions TO gsp_app;
GRANT SELECT ON "Location","Amenity","HeroBanner","FinancingProgram","Agency","Agent","Property",
               "PropertyMedia","PropertyAmenity","NearbyPlace","Project","ProjectMedia","Developer","User" TO gsp_app;
GRANT SELECT, INSERT, UPDATE ON "Lead", "LeadEvent" TO gsp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "RateLimit" TO gsp_app;
GRANT INSERT ON "AuditLog" TO gsp_app;          -- append-only, as the trigger already enforces
ALTER ROLE gsp_app BYPASSRLS;                   -- RLS stays on to block the browser keys; this role is server-only
ALTER ROLE gsp_app SET statement_timeout = '5s';
ALTER ROLE gsp_app SET idle_in_transaction_session_timeout = '10s';
ALTER ROLE gsp_app SET lock_timeout = '3s';

-- Read-only role for the backup job
CREATE ROLE gsp_backup LOGIN PASSWORD '<generated>' BYPASSRLS;
GRANT USAGE ON SCHEMA public, auth TO gsp_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO gsp_backup;
```

**Steps:**
1. Run the SQL above.
2. In Vercel, set `DATABASE_URL` = `postgresql://gsp_app.uyfiidwrmytdugzcjjzo:<password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`. `DATABASE_URL` takes priority over the integration's `POSTGRES_URL`.
3. Redeploy and check `/api/health`.

**Admin approvals** (playbook 7.1) keep running as `postgres` in the SQL editor.

**Before switching:** the test suite can be run against a role with only these grants, to prove nothing needs more.

## 1.4 🟡 Query performance (measured)

Measured on 20,000 listings, about 18,000 of them live:

| Query (as the site runs it) | Before | After the indexes below | Plan |
| --- | --- | --- | --- |
| Home "latest" (6 newest live, per country) | **196.7 ms** | **4.8 ms** | Seq scan + sort → index scan on `property_live_published_idx` |
| Search "Metro Manila, for sale", featured sort | 108 ms | 68 ms | Hash join on 4,285 rows; top-N sort on a computed `featured` value. Fine up to ~100k listings |
| Search "Dubai", cheapest first | 29 ms | 35 ms | Index scan on `Property_price_idx` |
| Listing page by slug | 2.9 ms | 3.0 ms | Unique index `Property_slug_key` |
| Sitemap (5,000 slugs) | 19.5 ms | 8.1 ms | Index scan on `property_live_updated_idx` |

PGlite is WebAssembly, so absolute times are roughly 3–5× slower than native Postgres. The *shape* of each plan is what transfers.

**Migration 8:**
```sql
-- 8_live_listing_indexes (up)
CREATE INDEX IF NOT EXISTS property_live_published_idx ON "Property" ("publishedAt" DESC)
  WHERE status = 'ACTIVE' AND "publishedAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS property_live_updated_idx ON "Property" ("updatedAt" DESC)
  WHERE status = 'ACTIVE' AND "publishedAt" IS NOT NULL;
-- down
DROP INDEX IF EXISTS property_live_published_idx;
DROP INDEX IF EXISTS property_live_updated_idx;
```

The tables are empty now, so a plain `CREATE INDEX` is instant. Later, use `CONCURRENTLY`.

**Monthly validation queries** (save them in the SQL editor):
```sql
-- Slowest app queries (needs real traffic)
SELECT round(mean_exec_time::numeric,1) ms, calls, left(query,120) q
FROM pg_stat_statements WHERE calls > 20 ORDER BY mean_exec_time DESC LIMIT 10;
-- Tables read mostly by sequential scan (candidates for an index)
SELECT relname, seq_scan, idx_scan, n_live_tup FROM pg_stat_user_tables
WHERE seq_scan > coalesce(idx_scan,0) AND n_live_tup > 5000 ORDER BY seq_scan DESC;
-- Connection headroom (alert above 80% of max_connections)
SELECT count(*) used, current_setting('max_connections')::int max FROM pg_stat_activity;
-- Foreign keys without an index (must return nothing)
SELECT c.conrelid::regclass::text || '.' || a.attname FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
  AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]);
-- Data rules hold (each must return 0)
SELECT count(*) FROM "Property" p JOIN "Location" l ON l.id = p."locationId" JOIN "Agent" a ON a.id = p."agentId"
WHERE (l.country = 'AE') <> (a."licenseType" = 'UAE_BROKER');
SELECT count(*) FROM "Lead" WHERE "createdAt" < now() - interval '24 months' AND (email IS NOT NULL OR mobile IS NOT NULL);
```

## 1.5 🟢 Verify the database certificate

In Supabase → Project Settings → Database → **SSL Configuration**, download the CA certificate. In Vercel, add `DATABASE_SSL_CA` with the PEM contents, with newlines written as `\n`. The app then sets `rejectUnauthorized: true` (already coded in `src/lib/server/db.ts`), and the `db.tls_unverified` warning stops.

---

# PHASE 2: DevSecOps and security hardening

## 2.0 Verified in good shape

| Area | How it is protected | Evidence |
| --- | --- | --- |
| Session validation | Every `/dashboard` request calls `supabase.auth.getUser()`, which asks the Auth server. A revoked or forged JWT fails. If Auth is down, it fails closed back to sign-in | `src/proxy.ts`; tests in `session.spec.ts` |
| Token lifetime and revocation | Supabase access JWT: 1 h by default, with rotating refresh tokens. Revoke a user with Dashboard → Users → *Log out* (all sessions); the next request fails `getUser` | Confirm *JWT expiry* = 3600 in Auth settings |
| Cookies | `HttpOnly`, `Secure` (production), `SameSite=Lax`, path `/`. No script can read the session | `AUTH_COOKIE_OPTIONS`; test checks the cookie flags |
| CSRF | **No double-submit token is needed, because three controls cover every way to change state:** <br>(1) Server actions: Next.js rejects any request whose `Origin` ≠ `Host` ([docs](node_modules/next/dist/docs/01-app/02-guides/data-security.md)). <br>(2) `/api/ph/leads` accepts only `application/json`. With no CORS headers, a cross-site form or fetch can't send it. <br>(3) `/auth/confirm` POST checks `Origin` explicitly. `SameSite=Lax` blocks cookies on cross-site POSTs as well | `security.spec.ts` |
| Access control | There is one role (agent). Every dashboard read and write filters by the session's `agentId`. `setLeadStatus` updates `WHERE id = $1 AND "agentId" = $2 … FOR UPDATE` and writes an audit row | `dashboard-repo.ts`, `actions.ts` |
| Open redirect | `safeNext()` allows only `/dashboard…`: no `//`, no `\`, no dot segments | tests cover `//evil.com`, `/\evil`, `..` |
| SQL injection | All values are bound parameters (`$1…`). The only values put directly into SQL text are server constants (`ORDER[...]` from an allowlist, `MAX_RESULTS`). `ILIKE` input is escaped | code review; `security.spec.ts` injection cases |
| XSS | React escapes all output. The only raw HTML is the JSON-LD block (escapes `<`) and a static frame guard. No `eval` or `new Function` | grep |
| SSRF | The server fetches only fixed hosts: Supabase Auth and `api.pwnedpasswords.com` (overridable only by env). No URL from a user is ever fetched | code review |
| Payload limits | Leads: 16 KB, checked against both the declared and the actual size (413). Form fields are truncated per field. Server actions: 1 MB default (see 2.5) | `route.ts`, `security.spec.ts` |
| Rate limits | Postgres-backed, shared across instances, falls back to memory if the database is down. Limits per IP and per email for sign-in, sign-up, reset and leads | `request.ts`; playbook §3.3 |
| Input validation | Allowlists and regexes per field on the server (E.164 phone, licence number formats, enums, numeric ranges). Unknown fields are dropped. Zod would be equivalent; not needed | `sign-up/actions.ts`, `route.ts` |
| HMAC | The sign-up form timer is HMAC-SHA256 with `timingSafeEqual`, kept in a server-only module. **There are no inbound webhooks** (Viber and WhatsApp are outbound deep links), so no webhook signatures are needed. If a WhatsApp Business webhook is added later, use the pattern in 2.6 | `form-token.ts` |
| Secrets in code | **None** in tracked files or the full git history (Supabase secret/service keys, JWTs, DB URLs with passwords, AWS keys, private keys, GitHub tokens, Resend keys). Only `.env.example` is tracked | regex scan of `git log --all -p` |
| Public env vars | The `NEXT_PUBLIC_*` variables are site URL, listings mode, base path, preview flag, Supabase URL and the publishable/anon key. **All are safe to expose**; no secret has a `NEXT_PUBLIC_` name | grep + Vercel inventory |
| Headers | CSP, HSTS (2 years, preload), `nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy, `poweredByHeader: false` | live response headers |
| Dependencies | `npm audit --omit=dev`: **0**. CodeQL and Dependabot are running | CI on `89926a7`: CI ✓, CodeQL ✓, E2E ✓, Pages ✓ |

## 2.1 🔴 Remove unused master secrets from Vercel

The Supabase–Vercel integration copied these into production. **The site's code never reads them:**

| Variable | What it can do if leaked |
| --- | --- |
| `SUPABASE_JWT_SECRET` | Forge a valid session for *any* user |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY` | Full read and write through the Data API, bypassing RLS |
| `DASHBOARD_USER`, `DASHBOARD_PASSWORD` | Nothing in live mode; dead weight |

**Fix:** Vercel → Project → Settings → Environment Variables → delete those five, then redeploy.

Or with the CLI:
```bash
for k in SUPABASE_JWT_SECRET SUPABASE_SERVICE_ROLE_KEY SUPABASE_SECRET_KEY DASHBOARD_USER DASHBOARD_PASSWORD; do
  vercel env rm "$k" production --yes --scope gosearchproperty; done
vercel env rm DASHBOARD_USER preview --yes --scope gosearchproperty
vercel env rm DASHBOARD_PASSWORD preview --yes --scope gosearchproperty
```

If the integration ever re-syncs, check again. Also **rotate the JWT secret** (Supabase → Settings → JWT Keys → migrate to asymmetric signing keys, then revoke the legacy secret), because it has sat in a third-party env store.

## 2.2 🟠 Only verified agents' listings go live

`src/lib/server/listings-repo.ts`:
```diff
-const LIVE = `p.status = 'ACTIVE' AND p."publishedAt" IS NOT NULL AND (p."expiresAt" IS NULL OR p."expiresAt" > now())`;
+// Live: active, published, not expired, and listed by an agent whose licence is currently verified
+const LIVE = `p.status = 'ACTIVE' AND p."publishedAt" IS NOT NULL AND (p."expiresAt" IS NULL OR p."expiresAt" > now())
+  AND EXISTS (SELECT 1 FROM "Agent" av WHERE av.id = p."agentId" AND av.verification = 'VERIFIED')`;
```

- **What it changes:** suspending an agent (`verification = 'REJECTED'` or `'EXPIRED'`) hides all their listings and chat links immediately, with no need to pause each listing.
- **Test:** add an e2e case that sets the test agent to `REJECTED` and expects the listing page to 404 and the listing to drop out of search and the sitemap.
- **Index:** `Agent_pkey` plus `Agent_verification_idx` already cover it.

## 2.3 🟠 Protect `main` so only tested code deploys

```bash
gh api -X PUT repos/gbromano-web/-newproject04/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["check", "e2e"] },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
JSON
```

Changes then go through a pull request. Vercel builds a preview for it, the tests must pass, and only then can it merge and deploy. `check` is the job in `ci.yml` (lint, type check, build) and `e2e` is the job in `e2e-tests.yml`.

## 2.4 🟡 Supabase Auth settings (dashboard → Authentication)

| Setting | Value | Why |
| --- | --- | --- |
| Allow new users to sign up | **On** | Self sign-up |
| Confirm email | **On** | No account works without owning the email |
| Minimum password length | **12** | Matches the site's rule |
| Password requirements | Letters + digits (optional) | The site's breach check already covers weak passwords |
| JWT expiry | **3600** s | Short access tokens; refresh tokens rotate |
| Refresh token reuse interval | 10 s (default) | Detects stolen refresh tokens |
| Custom SMTP | **Required** | Without it, confirmation emails only reach team members |
| Confirm signup template | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard` | Mail scanners can't use up the link |
| Rate limits → emails per hour | 30+ (after SMTP) | The built-in sender limit is very low |
| Pro plan: *Time-box sessions* | 30 days; *inactivity timeout* 7 days | Ends forgotten sessions |

## 2.5 🟢 Smaller server-action body limit

`next.config.ts`:
```ts
const nextConfig: NextConfig = {
  // ...
  experimental: {
    serverActions: { bodySizeLimit: "100kb" }, // largest form (sign-up) is under 4 KB
  },
};
```

In Next 16.4 this option is still under `experimental` (checked in the bundled `serverActions.md`).

## 2.6 Patterns ready for later integrations

**Inbound webhook signature check** (e.g. WhatsApp Business), constant-time and raw-body based:
```ts
import { createHmac, timingSafeEqual } from "node:crypto";
export async function POST(req: Request) {
  const raw = await req.text();                                   // sign the exact bytes received
  const got = Buffer.from((req.headers.get("x-hub-signature-256") ?? "").replace(/^sha256=/, ""), "hex");
  const want = createHmac("sha256", process.env.WHATSAPP_APP_SECRET!).update(raw).digest();
  if (got.length !== want.length || !timingSafeEqual(got, want)) return new Response("bad signature", { status: 401 });
  // ...parse JSON from `raw`, de-duplicate by message id, then handle
}
```

**Sliding-window limit in Postgres**, if fixed-window bursts become a problem. It interpolates the previous window's count:
```sql
-- count_estimate = prev_count * (1 - elapsed_fraction) + current_count
SELECT prev.count * (1 - EXTRACT(EPOCH FROM now() - cur."windowStart") / $2) + cur.count AS estimate
FROM "RateLimit" cur LEFT JOIN "RateLimit" prev ON prev.key = cur.key || ':prev' WHERE cur.key = $1;
```

---

## Phases 1–2: what has been done (3 November 2026)

| Item | Status |
| --- | --- |
| 2.2 Only verified agents' listings go live | ✅ Live (PR #12, commit `ee4e3d1`), with a new e2e test |
| 1.4 Live-listing indexes | ✅ Live on the database (repo migration `3_live_listing_indexes`) |
| 1.2 Migration 7 (UAE rules) | ✅ Applied and verified: UAE licence rule, permit trigger, rent cheques; browser key can't call the function |
| 2.5 Server-action body limit 100 KB | ✅ Live |
| 1.1 Nightly encrypted backup job | ✅ Merged. **Waiting for you** to add `BACKUP_DATABASE_URL` and `BACKUP_PASSPHRASE` (it skips until then) |
| 1.1 Supabase Pro | ⏳ You |
| 2.1 Delete 5 unused secrets in Vercel; rotate the JWT secret | ⏳ You |
| 2.3 Branch protection | ⏳ You (command in 2.3) |
| 2.4 Supabase Auth settings + SMTP | ⏳ You |
| 1.3 App role `gsp_app` | ⏳ Together: you set the password and `DATABASE_URL`, I verify |
| 1.5 `DATABASE_SSL_CA` | ⏳ You |

## Order to apply (Phases 1–2), as planned

| Step | Who | Item | Downtime |
| --- | --- | --- | --- |
| 1 | You | Upgrade Supabase to **Pro** (backups, no pausing) | none |
| 2 | You | Delete the 5 unused secrets in Vercel; redeploy | none |
| 3 | You (or me with your approval in the prompt) | Apply **migration 7** | none |
| 4 | Me | Code: verified-agents filter (2.2) + test, `bodySizeLimit`, migration 8 indexes, backup workflow → PR → tests → merge | none |
| 5 | You | Supabase Auth settings + SMTP (2.4) | none |
| 6 | Me + you | App role `gsp_app` (1.3): create the roles, you set the password and `DATABASE_URL`, I verify | none (rolls back by removing `DATABASE_URL`) |
| 7 | You | `DATABASE_SSL_CA` (1.5); branch protection (2.3) | none |
| 8 | Me | Rerun the 71 tests and live checks; update the playbook | none |

Sources: [Supabase pricing](https://supabase.com/pricing.md) (backups, PITR, free-plan pausing); Next.js 16 bundled docs `data-security.md` and `server-actions.md` (Origin check, 1 MB action limit).


---

# PHASE 3: Performance, caching and scalability

## 3.1 Core Web Vitals (measured)

**How it was measured:** the production build, served locally with the test listings. A Pixel 7–sized phone emulated with 4× CPU slowdown and a ~1.6 Mbps network with 150 ms latency, roughly what Lighthouse uses for mobile.

| Page | LCP | CLS | TBT | Tap → next frame | JS (compressed) | Requests |
| --- | --- | --- | --- | --- | --- | --- |
| `/` (Philippines home) | 1.29 s | 0 | **635 ms** | 34 ms | 217 KB | 16 |
| `/uae` | 0.64 s | 0 | **366 ms** | 36 ms | 225 KB | 18 |
| `/search?location=Metro Manila` | 1.03 s | 0 | **236 ms** | 37 ms | 275 KB | 21 |
| `/property/…` (PH) | 1.13 s | 0 | **347 ms** | 34 ms | 267 KB | 24 |
| `/property/…` (UAE) | 1.01 s | 0 | **213 ms** | 22 ms | 275 KB | 26 |
| `/calculator` | 0.57 s | 0 | **210 ms** | 26 ms | 222 KB | 17 |
| `/agent/sign-up` | 0.50 s | 0 | **225 ms** | 22 ms | 222 KB | 16 |

**Targets ("good"):**
- **LCP** under 2.5 s: ✅ everywhere.
- **CLS** under 0.1: ✅ (0, since every image has fixed dimensions).
- **INP** under 200 ms: ✅ (tap-to-frame 22–37 ms).
- **TBT**, the lab stand-in for responsiveness while a page loads, under 200 ms: ❌ on every page. The home page is worst at 635 ms.

**Caveats:**
- The test listings use placeholder SVG photos, so LCP with real listing photos will be higher. Keep `priority` and `sizes` on each page's first photo.
- These are local numbers, with no CDN in front. Real-user numbers will come from Vercel Speed Insights (4.3).

### Where the JavaScript goes (home page, uncompressed)

| Chunk | Size | What |
| --- | --- | --- |
| React DOM | 230 KB | The framework; unavoidable |
| App + Next runtime | 165 KB | Router, server-action client, our components |
| **`motion`** | **159 KB** | **Only used for the hero's photo crossfade** (`scenic-hero.tsx`) |
| Icons + data | 31 KB | lucide icons and location names |
| Rest | ~77 KB | Small chunks |

**Fix (largest win):** load only the animation features the hero uses. This saves about 100 KB uncompressed (about 30–35 KB compressed) on every page that has the header and hero, and most of the home page's blocking time:

```tsx
// src/components/ph/scenic-hero.tsx
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
// ...
<LazyMotion features={domAnimation} strict>
  <AnimatePresence>
    <m.div key={scene} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /* ... */ />
  </AnimatePresence>
</LazyMotion>
// replace every <motion.x> with <m.x>; `strict` throws if a full `motion` component sneaks back in
```

A CSS-only crossfade (`@keyframes` on opacity) would remove the library entirely. It is the simplest option, but more of a rewrite.

## 3.2 What is static, what renders per request (from the build)

| Kind | Routes | Served from |
| --- | --- | --- |
| **Static** (○) | `/about`, `/contact`, `/terms`, `/privacy`, `/calculator`, `/uae/calculator`, `/saved`, `/robots.txt` | CDN, `s-maxage=31536000`. Measured 983 requests/s on one local instance |
| **Partial prerender** (◐) | `/`, `/uae`, `/search`, `/uae/search`, `/property/[slug]`, agent pages | Static shell from the CDN. **Listings render per request** (`private, no-store`) and query the database every time |
| **Dynamic** (ƒ) | `/api/*`, `/auth/confirm`, `/sitemap.xml` | Function every time |
| **Static assets** | `/_next/static/*` | `public, max-age=31536000, immutable` ✅ |

## 3.3 Caching listings (the change that matters most for scale)

Today every home, search and listing view runs the listing queries. Listings change a few times a day, but visitors arrive every second, so the results can be cached for a minute.

Next 16 `cacheComponents` is already on, so this is a directive rather than new infrastructure (bundled docs: `use-cache.md`, `cacheLife.md`, `cacheTag.md`):

```ts
// src/lib/server/listings-repo.ts
import { cacheLife, cacheTag } from "next/cache";

export async function latestListings(n = 6, country: CountryCode = "PH") {
  "use cache";
  cacheLife("minutes");                 // serve from cache, refresh in the background about every minute
  cacheTag("listings", `listings:${country}`);
  if (SAMPLE_DATA) return withAgents(sampleLatest(n, country));
  return query(/* unchanged */);
}
// Same for searchListings(f) (the filters become the cache key) and getListing(slug) (tag `listing:${slug}`).
// Remove `await connection()` from those three: "use cache" replaces it.

// Wherever listings change (dashboard actions now, an admin tool later):
import { updateTag } from "next/cache";
updateTag("listings");
```

**What it changes:**
- A listing edited by SQL, or an agent suspended, shows on the site within about a minute, instead of on the next request. The playbook will say so.
- The rate limiter, leads, sessions and the dashboard stay per request. They read cookies or write data, so they can't use `"use cache"`.

**Expected effect:** most page views become cache hits. Cached pages ran at 983 requests/s locally, against 45 requests/s rendered per request (3.4).

## 3.4 Load test (measured locally)

**Setup:** one production server on a 2-vCPU machine, with the test database. Each URL ran for 12 seconds.

| URL | 20 concurrent users | 50 concurrent users | Errors |
| --- | --- | --- | --- |
| `/api/health` (database ping) | 781 req/s, p50 24 ms, p99 49 ms | 750 req/s, p50 65 ms, p99 87 ms | 0 |
| `/about` (static) | 983 req/s, p50 18 ms, p99 47 ms | — | 0 |
| `/` (listings per request) | 46 req/s, p50 66 ms, **p99 1.7 s** | 45 req/s, p50 53 ms, **p99 4.2 s** | 0 |
| `/search?location=Metro Manila` | 53 req/s, p50 64 ms, p99 1.6 s | 44 req/s, p50 74 ms, **p99 5.8 s** | 0 |
| `/property/…` | 45 req/s, p50 73 ms, p99 2.1 s | 39 req/s, p50 79 ms, **p99 4.4 s** | 0 |

**What it shows:**
1. **Nothing broke:** zero errors, zero timeouts, and the database pool held.
2. **Pages that render listings per request are CPU-bound:** about 45 per second per 2-vCPU instance, roughly 40 ms of CPU each. Beyond that, requests queue, which is why the tail latency (p99) climbs while the median stays fast. Vercel adds instances under load, so production won't queue like one box does. But every render costs CPU time.
3. **Cost ceiling on Vercel Hobby:** the plan includes **4 active CPU-hours a month** ([Vercel Hobby](https://vercel.com/docs/plans/hobby)). At about 40 ms per uncached page, that is around 360,000 page views a month. 5,000 visitors a day at 5 pages each is about 750,000. **Caching (3.3) and Vercel Pro are both needed before marketing traffic.**
4. **Distance:** the functions run in Dublin (`dub1`, next to the database in eu-west-1), so database calls are short. Visitors in Manila and Dubai are 120–250 ms of network away from Dublin for anything not cached at the edge. Caching the shell and listings hides most of it. Moving the database to Singapore or Mumbai is a later decision.

### Latency budgets (enforced by the k6 script)

| Request kind | p95 | p99 | Error rate |
| --- | --- | --- | --- |
| Pages | < 800 ms | < 2 s | < 1% |
| Static assets | < 300 ms | — | — |
| `/api/health` | < 500 ms | — | — |

### Production load test: `tests/load/k6.js` (added to the repo)

```bash
k6 run -e BASE=https://gosearchproperty.com -e PROFILE=smoke tests/load/k6.js        # 2 pages/s for 1 min: safe any time
k6 run -e BASE=https://<preview>.vercel.app  -e PROFILE=peak   tests/load/k6.js       # 20 pages/s for 5 min (~3x a busy hour)
k6 run -e BASE=https://<preview>.vercel.app  -e PROFILE=stress tests/load/k6.js       # ramps to 120 pages/s: finds the breaking point
```

- **Read-only:** it never sends inquiries or sign-ins, so it creates no leads and trips no rate limits.
- **Traffic mix:** home pages 35%, searches 35%, listing pages 22% (real slugs from the sitemap), static pages 5%, health 3%. It also checks that static assets are immutable.
- **Before `peak` or `stress`:** run them after Vercel Pro and the caching change, off-peak, against a preview deployment. On Hobby they would use a large share of the month's CPU allowance.

---

# PHASE 4: Observability, logging and alerting

## 4.1 What exists

| Piece | State |
| --- | --- |
| Structured logs | ✅ One JSON line per event: `level`, `event`, `at`, plus `requestId` (Vercel's id), `ipHash`, `listingId`, `agentId`, `status`/`code`. **No names, emails or phones.** Event catalogue: playbook §8 |
| Health check | ✅ `/api/health`: database ping with a 2 s cap, deployed commit, `no-store`. Returns 503 when the database is down |
| Error boundaries | ✅ `error.tsx` (inside the layout) and `global-error.tsx`. Visitors see a generic message plus a digest that matches the server log |
| Runtime error grouping | ✅ Vercel groups errors. **Found:** 3× "Couldn't find all resumable slots… fallback to client rendering" on `/`, on 2 Nov, old deployment `dpl_B2M6…`, none since. That is the deployment-skew signature: a shell from one deployment resumed by another. Fixed by Skew Protection (5.3) |
| Log retention | ⚠️ **1 hour on Hobby**, no log drains ([Vercel Hobby](https://vercel.com/docs/plans/hobby)). Pro keeps 1 day and allows drains |
| Uptime monitoring and alerts | ❌ None |
| Error tracking | ❌ Server errors only reach Vercel's 1-hour logs; browser errors only reach the visitor's console |
| Third-party latency | ❌ Auth and breach-check calls have timeouts (5 s, 3 s) but their duration isn't logged |

## 4.2 Changes (code)

**a) Every unhandled server error becomes one structured line** (built into Next 16, no vendor needed). Add `src/instrumentation.ts`:
```ts
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as { message?: string; digest?: string; name?: string };
  console.error(JSON.stringify({
    level: "error", event: "request.error", at: new Date().toISOString(),
    name: e?.name, message: e?.message?.slice(0, 500), digest: e?.digest,
    method: request.method, path: request.path.split("?")[0],          // no query string: it can hold emails
    route: context.routePath, routeType: context.routeType, renderType: context.renderType,
    requestId: (request.headers["x-vercel-id"] as string | undefined) ?? null,
  }));
};
```

**b) Slow third-party calls are logged.** In `authFetch` (`supabase-config.ts`) and `isBreached` (`password-policy.ts`):
```ts
const started = performance.now();
try { return await fetch(input, { ...init, signal }); }
finally {
  const ms = Math.round(performance.now() - started);
  if (ms > 1000) log("warn", "auth.slow", { ms, path: new URL(String(input)).pathname }); // "hibp.slow" in isBreached
}
```

**c) Browser errors are reported** (optional, once a tracker is chosen). Sentry's free tier covers this scale. Running `npx @sentry/wizard@latest -i nextjs` adds the config files; then:
- set `sendDefaultPii: false` and `tracesSampleRate: 0.1`;
- add the Sentry ingest host to the CSP's `connect-src`;
- keep the `beforeSend` scrubber from the wizard.

## 4.3 Monitors and alerts (no code)

| Monitor | Tool (free tier) | Check | Alert when | Who/where |
| --- | --- | --- | --- | --- |
| Site and database up | Better Stack Uptime or UptimeRobot | `GET https://gosearchproperty.com/api/health` every 1 min, expect 200 **and** body contains `"database":"ok"` | 2 failures in a row | Email + phone push; Slack if used |
| Home page renders | same | `GET /`, expect 200 and the keyword "Go Search Property" | 2 failures | Email |
| Sign-in reachable | same | `GET /agent/sign-in`, expect 200 | 3 failures | Email |
| UAE home | same | `GET /uae`, expect 200 | 3 failures | Email |
| Certificate | same | SSL expiry for both hostnames | under 14 days left (auto-renews ~30 days before 29 Jan 2027) | Email |
| Supabase usage | Supabase → Organization → Usage, and **Pro: spend cap** | Database size, egress, Auth emails | 80% of plan | Email |
| Vercel usage | Vercel → Settings → Billing → **Spend Management** (Pro) | CPU, invocations, bandwidth | 50% / 80% / 100% | Email; set a hard cap |
| Errors | Vercel Observability (Pro) or Sentry | `request.error`, `lead.save_failed`, `agent.signin_unavailable`, `signup.unavailable`, `db.pool_error` | any `lead.save_failed`; more than 5 others in 10 min | Email |
| Real-user speed | Vercel Speed Insights (10k events/30 days free) | LCP, INP, CLS on real phones | p75 LCP > 2.5 s or INP > 200 ms | Weekly look |

The 1-minute health monitor also keeps the free Supabase project from pausing, until Pro removes pausing.

**Response targets** for a small team (no PagerDuty needed yet):
- Health down: acknowledge within 15 min, then follow the playbook (§0, §6.1–6.2).
- `lead.save_failed`: same day. Buyers were told an inquiry was sent.
- Everything else: next business day.

---

# PHASE 5: Go-live checklist and deployment sequence

## 5.1 Domain, DNS and TLS (checked live)

| Check | Result |
| --- | --- |
| Domains on the project | `gosearchproperty.com` (production), `www.gosearchproperty.com` → **308** to apex, `newproject04.vercel.app`. All verified |
| DNS | Nameservers at GoDaddy (`ns33/34.domaincontrol.com`). Apex `A 76.76.21.21`. Vercel reports **not misconfigured, no conflicts** |
| Vercel's newer IPs | Vercel now ranks `216.198.79.1` and `64.29.17.1` first ("optional change"). Switching the apex A records at GoDaddy is optional, with no downtime if you add the new ones before removing the old |
| Certificates | Let's Encrypt via HTTP-01 for both hostnames, **auto-renew on**, expire **29 Jan 2027** (renewed automatically before then) |
| HSTS | `max-age=63072000; includeSubDomains; preload` on every response ✅. **Don't submit to hstspreload.org yet:** preloading is hard to undo and forces HTTPS on every future subdomain (e.g. a mail provider's tracking domain). Revisit after 3 months |
| Other headers | CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy and Permissions-Policy, all live ✅ |
| Propagation | DNS was moved on 31 Oct; Vercel verified it and issued certificates, so propagation is complete |

## 5.2 How a release goes out (the standard sequence)

Vercel deployments are **immutable and atomic**. Each push builds a separate deployment, and "going live" is an instant switch of the domain to point at it. That switch is the blue-green step; nothing is half-deployed.

```text
1. Branch + pull request          git switch -c fix/xyz … git push -u origin fix/xyz; open the PR
2. Preview deployment             Vercel builds https://newproject04-<hash>-gosearchproperty.vercel.app
3. Required checks (2.3)          CI (lint, types, build) + E2E (72 tests) + CodeQL must pass
4. Database first, if any         apply the migration (additive only), verify with its check query
5. Merge (squash)                 Vercel builds production from main
6. Verify (≤ 5 min)               /api/health shows the new commit and "database":"ok"
                                  k6 smoke: k6 run -e BASE=https://gosearchproperty.com -e PROFILE=smoke tests/load/k6.js
                                  open /, /uae, a listing, /agent/sign-in on a phone
7. Watch (15 min)                 Vercel → Logs / runtime errors: no new error groups
8. Record                         note the deployment id + commit in the playbook's change log
```

**Canary releases:** Vercel *Rolling Releases* (Pro or Enterprise) send a percentage of traffic to the new deployment first, e.g. 10% for 15 minutes, then 100%. Worth turning on once there is steady traffic. At today's volume, a 10% canary would see too few visits to tell anything.

## 5.3 Rollback (instant)

| What broke | Undo | Time |
| --- | --- | --- |
| Code | Vercel → Deployments → last good one → **⋯ → Instant Rollback** (or `vercel rollback <deployment-url> --scope gosearchproperty`). Then `git revert <sha>` on `main`, or the next push brings the bug back | under 1 min |
| A migration | Its down SQL (each migration file carries one; migration 7 is in 1.2) | minutes |
| Bad data | Restore from backup (1.1): Pro daily backup in the dashboard, or the encrypted nightly dump | ~30–60 min |
| An env var change | Restore the old value in Vercel, then **redeploy**. A rollback keeps the *current* env vars | ~2 min |
| `NEXT_PUBLIC_*` change | Read at build time: redeploy after changing it | ~2 min |

A rollback does **not** undo database changes, which is why migrations stay additive: the previous deployment must keep working on the new schema.

**Skew Protection** (Pro or Enterprise; Settings → Advanced): browsers that loaded an older deployment keep talking to it until they navigate, instead of mixing old and new code. That is the cure for the "resumable slots" error in 4.1. It is on by default for new Pro projects; check it after upgrading.

## 5.4 Go-live checklist

| # | Item | State |
| --- | --- | --- |
| 1 | Supabase **Pro** (backups, no pausing) | ⏳ You |
| 2 | Vercel **Pro** (commercial use allowed, 1-day logs, drains, Skew Protection, spend caps; Hobby is non-commercial only) | ⏳ You |
| 3 | Delete 5 unused secrets in Vercel; rotate the Supabase JWT secret (2.1) | ⏳ You |
| 4 | Supabase Auth: sign-ups on, confirm email, min length 12, signup template, **custom SMTP** (2.4) | ⏳ You |
| 5 | Backup secrets in GitHub; first manual run of *Database backup*; one restore drill (1.1) | ⏳ You, then me |
| 6 | Branch protection on `main` (2.3) | ⏳ You |
| 7 | Uptime monitors (4.3) | ⏳ You (10 minutes) |
| 8 | Caching listings (3.3), slimmer animation (3.1), error and latency logging (4.2a–b) | ⏳ Me, one PR, on your go |
| 9 | App database role + `DATABASE_SSL_CA` (1.3, 1.5) | ⏳ Together |
| 10 | k6 smoke on production; k6 peak on a preview after items 2 and 8 | ⏳ Me / you (k6 runs from your machine or CI) |
| 11 | Legal review of Terms (version `2026-10-31`) and Privacy for PH and UAE | ⏳ You |
| 12 | Verified agents only, indexes, migration 7, body limit, backup job | ✅ Done |
| 13 | DNS, TLS, HSTS, security headers | ✅ Done |
| 14 | 72 end-to-end tests, CI, CodeQL | ✅ Done |

Sources: [Supabase pricing](https://supabase.com/pricing.md); [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) (CPU allowance, log retention, drains, non-commercial use); [Vercel Skew Protection](https://vercel.com/docs/skew-protection.md); Next.js 16 bundled docs (`instrumentation.md`, `use-cache.md`, `cacheLife.md`, `cacheTag.md`, `data-security.md`, `server-actions.md`).
