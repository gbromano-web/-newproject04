# Pre-launch audit: Phases 1–2 (database, security)

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

## Order to apply (Phases 1–2)

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
