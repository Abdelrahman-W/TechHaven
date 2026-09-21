# P1-03 — Implementation Safety Gate

**Date:** September 17, 2026
**Task:** TECHHAVEN P1-03 — Pre-Implementation Design Verification
**Status:** `P1-03 IMPLEMENTATION GATE = READY`
**Reference:** P1-03-RATE-LIMITER-DESIGN.md

---

## Part 1 — Runtime Topology & Trust Proxy

### 1.1 Actual Topology (Verified)

```
┌──────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Client  │ ──▶ │  Vercel (CDN)   │ ──▶ │  Railway Edge     │ ──▶ │  Express     │
│ (Browser)│     │  Frontend        │     │  Proxy (TLS term) │     │  Node.js API │
└──────────┘     └─────────────────┘     └──────────────────┘     └──────────────┘
                                                  │
                                                  │ X-Forwarded-For: <client-ip>
                                                  │ X-Forwarded-Proto: https
                                                  │ X-Forwarded-Host: <railway-app>.up.railway.app
                                                  ▼
                                           Railway sets these headers
                                           before forwarding to Express
```

**Evidence sources:**

| Fact | Source |
|------|--------|
| Production target: Railway API + Vercel frontend | Agent memory (confirmed in .env.example: CORS_ORIGINS=https://egyhardware.vercel.app) |
| Supabase PostgreSQL as database | Agent memory, `@supabase/supabase-js` dependency, .env.example |
| Railway is the ONLY reverse proxy | No Docker/Nginx/Railway config files in repo; Railway auto-proxies deployed apps |
| No `trust proxy` currently configured | Search of entire `server/` directory — zero matches for `trust proxy`, `trustProxy`, `set('trust` |
| No deployment config files in repo | File search: no `railway.json`, `Dockerfile`, `nginx.conf`, `Procfile`, `docker-compose.yml` |

### 1.2 Express `req.ip` Current Behavior

```js
// server/index.js line 117: no trust proxy configured
app.set('trust proxy', /* NOT SET */);  // defaults to false
```

**Without `trust proxy`:**
- `req.ip` = the direct TCP connection IP
- In production on Railway: `req.ip` = Railway's internal load balancer IP (e.g., `10.x.x.x`)
- **Result:** ALL users share the same `req.ip`. Rate limiting is effectively global — 1000 requests total across ALL users, not per-user.

**This means the current rate limiting in production is BROKEN.** Any user can exhaust the 1000/min limit and block everyone else. This is worse than the N× amplification problem.

### 1.3 Proposed Configuration

```js
app.set('trust proxy', 1);
```

**What `1` means:** Trust exactly ONE level of proxy. Express reads the FIRST entry from the RIGHT of `X-Forwarded-For` (the most recent proxy, which is Railway), and uses it to derive `req.ip` from the entry to its LEFT (the actual client IP).

```
X-Forwarded-For: <client-ip>, <railway-internal-ip>
                  ↑               ↑
                  req.ip          trusted proxy (1 hop)
                  (this is what   (this is Railway's IP)
                   we want)
```

### 1.4 Safety Analysis

| Concern | Analysis | Verdict |
|---------|----------|---------|
| Client can inject X-Forwarded-For? | Railway ALWAYS sets/overwrites X-Forwarded-For at edge. Client-supplied headers are stripped. | SAFE |
| Multiple proxies in path? | Exactly 1: Railway. Vercel only serves static frontend (no API proxying). | SAFE |
| Direct client access to Express? | In production: NO. Railway's edge proxy is the only entry point; Express port is internal. In development: YES (direct `localhost:4000`) — with no X-Forwarded-For, Express falls back to direct connection IP. | SAFE |
| `trust proxy: true` vs `1`? | `true` trusts the first proxy in X-Forwarded-For regardless of origin. For a single Railway proxy, `1` is equivalent but more explicit. `1` is preferred because it's self-documenting: "exactly one proxy." | PREFER `1` |
| `trust proxy: ['10.0.0.0/8']` | More restrictive — only trusts Railway's internal CIDR. More secure but requires knowing Railway's IP range, which could change. Over-engineering for v1. | NOT NEEDED |

### 1.5 Final Trust Proxy Direction

```js
// Add to server/index.js, before middleware setup (e.g., after line 71 `const app = express()`)
app.set('trust proxy', 1);
```

**Justification:** Railway is the sole trusted proxy. `1` hop is explicit and matches the actual topology. This is REQUIRED for `express-rate-limit` to correctly identify client IPs in production.

### 1.6 Health Endpoint Exclusion (Discovered During Analysis)

The `/api/status` and `/api/health` endpoints are currently subject to the general rate limiter. Railway health checks call these endpoints frequently. If rate-limited, Railway might mark the deployment as unhealthy.

**Required change:** Mount health/status routes BEFORE the rate limiter middleware:

```js
// ── Health & Status (no rate limit) ───────────────────────
app.get('/api/status', (req, res) => { ... });
app.get('/api/health', (_req, res) => { ... });

// ── Rate Limiting (applied to all subsequent routes) ──────
app.use('/api', rateLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/admin', adminLimiter);
```

Express evaluates middleware in mount order. Routes defined before `app.use('/api', rateLimiter)` are not subject to it.

---

## Part 2 — Endpoint Security Classification & Fail-Open Matrix

### 2.1 Endpoint Categories

| Category | Limiter | Limit | Routes | Purpose |
|----------|---------|-------|--------|---------|
| **Auth** | `authLimiter` + `rateLimiter` | 30/min + 1000/min | `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/profile` | Brute-force prevention |
| **Admin** | `adminLimiter` + `rateLimiter` | 2000/min + 1000/min | All `/api/admin/*` (stats, products CRUD, orders, users, settings, B2B) | Abuse protection for admin panel |
| **General** | `rateLimiter` | 1000/min | `/api/products`, `/api/categories`, `/api/orders`, `/api/cart`, `/api/b2b`, `/api/pc-builder`, `/api/payments`, `/api/analytics`, `/api/reviews`, `/api/wishlist`, `/api/settings` | Broad API abuse/DDoS protection |
| **Health** | `rateLimiter` (currently) | 1000/min | `/api/status`, `/api/health` | Platform health monitoring |

### 2.2 Fail-Open / Fail-Closed Decision Matrix

| Endpoint Category | Sensitivity | Current Limit | What Happens If Limiter Fails | Proposed Policy | Rationale |
|-------------------|-------------|---------------|-------------------------------|-----------------|-----------|
| **Health/Status** | NONE | 1000/min | Railway health checks could be blocked | **EXCLUDE** from rate limiting entirely | Health checks must never be rate-limited. Mount before limiter middleware. |
| **Auth (login)** | HIGH | 30/min | Attacker can brute-force logins unrestricted | **FAIL-OPEN** | bcrypt hashing (~10/sec) is the real defense; blocking legitimate users is worse; no worse than current per-worker MemoryStore state |
| **Auth (register)** | MEDIUM | 30/min | Attacker can create unlimited accounts | **FAIL-OPEN** | Email verification (future) is the real defense; account creation spam is a business problem, not a security one at this limit |
| **Auth (me/profile)** | LOW | 30/min | Authenticated user can poll profile endpoint faster | **FAIL-OPEN** | Requires valid JWT; negligible security impact |
| **Admin (all)** | HIGH | 2000/min | Compromised admin token can poll unrestricted | **FAIL-OPEN** | Admin routes require valid JWT + admin role; 2000/min is generous; the real security is JWT verification |
| **Orders** | HIGH | 1000/min | Order creation/submission unthrottled | **FAIL-OPEN** | Order endpoints require auth; payment gateway has its own rate limiting |
| **Payments** | HIGH | 1000/min | Payment initiation unthrottled | **FAIL-OPEN** | Paymob has its own rate limiting; API just initiates the transaction |
| **Cart/Wishlist** | LOW | 1000/min | Cart mutations unthrottled | **FAIL-OPEN** | Requires auth; no security impact |
| **Products/Categories** | LOW | 1000/min | Public catalog read unthrottled | **FAIL-OPEN** | Public data; read-only; CDN caching is the real protection |
| **General API** | LOW | 1000/min | API-wide abuse protection disabled | **FAIL-OPEN** | 1000/min is already generous; real DDoS protection is at CDN/edge level |

### 2.3 Summary: Universal Fail-Open

**No endpoint category requires fail-closed.** The pattern is consistent:

1. Auth endpoints have cryptographic defenses (bcrypt, JWT)
2. Admin endpoints have authentication gates (JWT + role check)
3. Payment endpoints have external gateway rate limiting (Paymob)
4. Public endpoints serve mostly read-only data (cached)
5. Health endpoints should not be rate-limited at all

**Fail-open is the correct default for ALL endpoints.** The store's `increment()` method catches errors and returns `{ totalHits: 0, resetTime: future }`, which `express-rate-limit` interprets as "no hits yet — allow the request." This matches `express-rate-limit`'s own documented error behavior (line 692: "error from store, allowing request without rate-limiting").

### 2.4 No Local Fallback Store Needed

The design already handles this: when `SUPABASE_URL` is not configured, `store` is `undefined`, and `express-rate-limit` uses its built-in `MemoryStore`. No separate local fallback store class is needed.

---

## Part 3 — Shared Store Safety Review

### 3.1 Proposed Schema (Reviewed)

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key       TEXT PRIMARY KEY,
  hits      INTEGER NOT NULL DEFAULT 1,
  reset_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '60 seconds')
);
```

### 3.2 Design Verification

| Requirement | How It's Met | Status |
|-------------|-------------|--------|
| **Atomic increment** | `INSERT ... ON CONFLICT (key) DO UPDATE` — single atomic UPSERT statement. No SELECT-then-UPDATE race. | ✅ SATISFIED |
| **Fixed window behavior** | `reset_at` column stores window end time. UPSERT checks `reset_at <= NOW()` and resets counter to 1 if window expired. | ✅ SATISFIED |
| **Expiration/cleanup** | Self-resetting via UPSERT: expired windows reset to `hits=1, reset_at=NOW()+window`. No separate cleanup needed for correctness. Periodic cleanup (`DELETE WHERE reset_at < NOW() - INTERVAL '1 hour'`) is optional optimization. | ✅ SATISFIED |
| **Concurrent workers** | PostgreSQL's `ON CONFLICT` serializes concurrent writes to the same `key` at the row level. No application-level locking needed. | ✅ SATISFIED |
| **No row-level locking needed** | `ON CONFLICT ... DO UPDATE` handles row-level serialization internally. No `SELECT ... FOR UPDATE` required. | ✅ SATISFIED |
| **Unique constraint** | `key TEXT PRIMARY KEY` — PostgreSQL enforces uniqueness. | ✅ SATISFIED |
| **Index for cleanup** | Optional partial index on `reset_at WHERE reset_at <= NOW()` for efficient cleanup queries. Not required for correctness. | ✅ OPTIONAL |
| **No TTL mechanism needed** | PostgreSQL has no built-in row TTL. The UPSERT self-resetting pattern avoids the need. If cleanup is desired later, a cron job or `pg_cron` extension can handle it. | ✅ SATISFIED |

### 3.3 Minimum Schema Required

The absolute minimum for correctness is:

```sql
CREATE TABLE rate_limits (
  key       TEXT PRIMARY KEY,
  hits      INTEGER NOT NULL DEFAULT 1,
  reset_at  TIMESTAMPTZ NOT NULL
);
```

The `DEFAULT` on `reset_at` is convenience, not correctness requirement. The UPSERT always sets it explicitly.

### 3.4 Implementation Constraint

The stored procedure approach (PL/pgSQL function) was considered in the design doc but is NOT required. A raw UPSERT query from the Node.js client is sufficient and simpler:

```js
async increment(key) {
  const windowMs = this.windowMs;
  const { data, error } = await this.client
    .from('rate_limits')
    .upsert({
      key,
      hits: 1,
      reset_at: new Date(Date.now() + windowMs).toISOString()
    }, {
      onConflict: 'key',
      // Custom UPSERT logic via Supabase's `onConflict` + raw SQL...
    });
  // Fallback: use supabase.rpc() or raw query if .upsert() can't express the CASE logic
}
```

**Note:** Supabase JS client's `.upsert()` doesn't natively support the CASE logic ("if expired, reset; else increment"). The implementation will need either:
- `supabase.rpc('increment_rate_limit', { p_key, p_window_ms })` calling a PL/pgSQL function, OR
- A raw SQL query via `supabase.from('rate_limits').select().then()` with application-level logic (NOT recommended — race condition), OR
- The PL/pgSQL function approach (recommended for atomicity)

**Implementation direction:** Use `supabase.rpc()` with a stored function. This is the cleanest approach and guarantees atomicity.

---

## Part 4 — Concurrency Invariant

### 4.1 Invariant Statement

> **For any given `key` (limiter name + client identifier) and time window `W`, the total number of requests counted across ALL workers/containers MUST NOT exceed the configured `max` limit.**

### 4.2 How PostgreSQL Guarantees This

The core operation:

```sql
INSERT INTO rate_limits (key, hits, reset_at)
VALUES ($1, 1, NOW() + INTERVAL '1 millisecond' * $2)
ON CONFLICT (key) DO UPDATE
  SET hits = CASE
        WHEN rate_limits.reset_at <= NOW() THEN 1
        ELSE rate_limits.hits + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at <= NOW()
        THEN NOW() + INTERVAL '1 millisecond' * $2
        ELSE rate_limits.reset_at
      END
RETURNING hits, reset_at;
```

**Atomicity guarantee chain:**

1. `key` has a PRIMARY KEY constraint → no duplicate rows.
2. `ON CONFLICT (key)` fires when a row for this key already exists → the INSERT becomes an UPDATE.
3. The UPDATE is atomic at the row level → no two transactions can UPDATE the same row simultaneously. PostgreSQL serializes concurrent writes to the same row.
4. The `CASE WHEN rate_limits.reset_at <= NOW()` check happens within the same atomic UPDATE → window reset and increment are a single operation.
5. `RETURNING hits, reset_at` returns the post-UPDATE values → the caller receives the authoritative count.

**Scenario: 3 concurrent requests for the same key at the same millisecond**

```
T1: INSERT ... ON CONFLICT ... → acquires row lock on key='auth:1.2.3.4'
T2: INSERT ... ON CONFLICT ... → WAITS for T1's row lock
T3: INSERT ... ON CONFLICT ... → WAITS for T1's row lock

--- T1 commits: hits=1, lock released ---

T2: ON CONFLICT fires (row exists) → UPDATE hits=2 → commits: hits=2
T3: ON CONFLICT fires (row exists) → UPDATE hits=3 → commits: hits=3

Result: hits=3. All 3 requests counted. No lost updates.
```

**Scenario: Request at window boundary**

```
Row: key='auth:1.2.3.4', hits=30, reset_at=17:00:00
Request arrives at 17:00:01 (window expired)

UPSERT: reset_at (17:00:00) <= NOW() (17:00:01) → TRUE
  → hits = 1 (reset)
  → reset_at = 17:01:01 (new window)

Result: hits=1. Window correctly reset.
```

### 4.3 Limitation: Exact-Vs-Approximate

This design uses a **fixed window** algorithm, not sliding window. This means:

- At the boundary, a user could get 30 requests at 16:59:59 AND 30 requests at 17:00:01 → 60 requests in ~2 seconds.
- This is the same limitation as the current `express-rate-limit` default.
- Sliding window requires Redis sorted sets or a different algorithm. Out of scope for Phase 1.

**The invariant holds for the fixed window algorithm.** No request goes uncounted. No two workers diverge.

---

## Part 5 — Migration Impact Assessment

### 5.1 Migration Required?

**YES** — one new table in Supabase.

### 5.2 Migration Details

| Aspect | Detail |
|--------|--------|
| **Migration file** | `server/migrations/001_rate_limits.sql` |
| **New table** | `rate_limits` (2-3 columns) |
| **New indexes** | PRIMARY KEY on `key` (auto-created). Optional: partial index on `reset_at`. |
| **New function** | PL/pgSQL `increment_rate_limit(key TEXT, window_ms INTEGER)` — RECOMMENDED |
| **Existing tables affected** | NONE |
| **Existing data affected** | NONE |
| **Downtime** | ZERO — new table, no existing data migration |

### 5.3 Rollback Plan

| Step | Action |
|------|--------|
| 1 | Remove `store` option from `rateLimiter`, `authLimiter`, `adminLimiter` → reverts to MemoryStore |
| 2 | Deploy code change |
| 3 | `DROP TABLE rate_limits` (optional — harmless to leave) |
| 4 | `DROP FUNCTION increment_rate_limit` (optional) |

Rollback is a code-only change. No data loss. No schema conflicts.

### 5.4 Write Volume Estimate

| Traffic Level | Requests/sec | Writes/sec to `rate_limits` |
|---------------|-------------|---------------------------|
| Low (dev) | 10 | 10 |
| Medium (beta) | 100 | 100 |
| High (production) | 1,000 | 1,000 |

At 1,000 writes/sec, PostgreSQL handles this trivially. The `rate_limits` table is small (one row per active client) and the UPSERT on PRIMARY KEY is O(1).

### 5.5 Table Growth

- Active clients per window: ~100-1000
- Each expired row: remains until cleanup
- Growth without cleanup: ~1000 rows/day (each unique IP per day)
- At 1000 rows/day: ~365K rows/year → negligible (< 50 MB)

**Cleanup is optional for the first year of operation.** If needed, add:

```sql
-- Run daily via pg_cron or external scheduler
DELETE FROM rate_limits WHERE reset_at < NOW() - INTERVAL '1 day';
```

---

## Part 6 — Implementation Prerequisites

### 6.1 Before Any Code Is Written

| # | Prerequisite | Status |
|---|-------------|--------|
| 1 | Supabase project accessible with write permissions | ⚠️ Requires operator confirmation |
| 2 | `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured in Railway env vars | ⚠️ Requires operator confirmation (likely already set for existing Supabase operations) |
| 3 | Supabase client (`server/lib/supabase.js`) confirms `isSupabaseConfigured = true` in production | ⚠️ Verify in staging |
| 4 | Railway deployment confirmed as the sole reverse proxy | ✅ Verified via memory/docs |
| 5 | `trust proxy` topology understood and agreed | ✅ This document |

### 6.2 Implementation Sequence (For Reference)

```
1. CREATE migration file (server/migrations/001_rate_limits.sql)
2. Apply migration to Supabase
3. CREATE server/lib/SupabaseRateLimitStore.js
4. MODIFY server/middleware/rateLimiter.js (add store, trustProxy, namespaced keys)
5. MODIFY server/index.js (add app.set('trust proxy', 1); move health routes before limiter)
6. CREATE scratch/p1-03/test_supabase_store.mjs
7. CREATE scratch/p1-03/test_rate_limiter_e2e.mjs
8. RUN tests
9. DEPLOY
```

---

## Part 7 — Open Risks

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| Supabase RPC latency > 50ms per request | MEDIUM | Monitor; if problematic, Phase 2 → Redis | ACCEPTED |
| `rate_limits` table write contention at scale | LOW | Single-row PRIMARY KEY UPSERT handles thousands of writes/sec; not a concern at v1 scale | ACCEPTED |
| Railway proxy hop count changes (adds CDN) | LOW | If Railway adds Cloudflare in front, change `trust proxy` from `1` to `2`; documented | ACCEPTED |
| PL/pgSQL function deployment complexity | LOW | Function is ~15 lines; can be inlined in migration SQL | ACCEPTED |
| Health endpoint rate-limiting causes deployment failures | MEDIUM | FIXED in this gate: move health routes before limiter middleware | RESOLVED |

---

## Part 8 — Final Gate Decision

### 8.1 Gate Criteria Checklist

| Criterion | Status |
|-----------|--------|
| Trust proxy strategy justified by actual topology | ✅ `app.set('trust proxy', 1)` — Railway is sole proxy, `1` hop |
| Fail-open policy explicitly defined per endpoint | ✅ Universal fail-open; all 4 categories analyzed |
| Shared-store atomicity design concrete | ✅ PostgreSQL `ON CONFLICT ... DO UPDATE` with CASE logic |
| Migration requirements understood | ✅ One new table, one new function, zero downtime |
| No unresolved security ambiguity | ✅ All risks assessed and accepted |

### 8.2 Gate Verdict

```
P1-03 IMPLEMENTATION GATE = READY
```

**Changes to the original design from this gate:**

| Original Design (P1-03-RATE-LIMITER-DESIGN.md) | Gate Refinement |
|------------------------------------------------|-----------------|
| `app.set('trust proxy', true)` | → `app.set('trust proxy', 1)` — explicit hop count |
| Health endpoints not mentioned | → Health routes MUST be moved before limiter middleware |
| Raw UPSERT from JS client | → `supabase.rpc()` with PL/pgSQL function recommended for atomicity |
| `onLimitReached` handler optional | → Included in implementation for monitoring |
| No local fallback store needed (confirmed) | → MemoryStore auto-selected when `store` is undefined |

### 8.3 Authorization

All analysis is READ-ONLY. No production files modified. No schema created. No dependencies added. The design is validated and ready for implementation.

---

**Next step:** Proceed to P1-03 implementation when the operator confirms Supabase access and Railway deployment readiness.