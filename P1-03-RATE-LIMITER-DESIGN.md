# P1-03 — Rate Limiter Architecture Design

**Date:** September 17, 2026
**Task:** TECHHAVEN P1-03 — Cluster-Aware Rate Limiting
**Type:** ARCHITECTURE DESIGN (no implementation)
**Status:** `P1-03 RATE LIMITER DESIGN = COMPLETE`

---

## 1. Scope

This document designs a production-grade, cluster-aware rate limiting architecture for the TechHaven API, replacing the current process-local in-memory `express-rate-limit` default store. The design addresses the core P1-03 finding: **rate-limit counters multiply by worker count in multi-process clusters**, and covers additional production readiness gaps discovered during analysis.

---

## 2. Current Architecture (Baseline Audit)

**File:** `server/middleware/rateLimiter.js`
**Library:** `express-rate-limit` v7.5.1
**Store:** Built-in `MemoryStore` (process-local, ephemeral)

### 2.1 Rate Limiter Definitions

| Limiter | Mount Point | Window | Limit | Target |
|---------|-------------|--------|-------|--------|
| `rateLimiter` | `/api` | 60s | 1,000 req/min | General API traffic |
| `authLimiter` | `/api/auth` | 60s | 30 req/min | Login/register attempts |
| `adminLimiter` | `/api/admin` | 60s | 2,000 req/min | Admin panel operations |

### 2.2 Mounting Order (server/index.js:122-125)

```js
app.use('/api', rateLimiter);           // All /api/* → 1,000/min
app.use('/api/auth', authLimiter);      // Overrides /api for auth routes → 30/min
app.use('/api/admin', adminLimiter);    // Overrides /api for admin routes → 2,000/min
```

Express middleware runs in mount order. `/api/auth` limiter runs AFTER `/api` limiter, so auth requests are counted by BOTH limiters. The strictest one triggers first for rate-limited responses.

### 2.3 Configuration Gaps

| Gap | Severity | Impact |
|-----|----------|--------|
| **No `trustProxy`** | HIGH | Behind Railway/nginx, all clients share the proxy's IP. `X-Forwarded-For` header is ignored. |
| **Cluster amplification** | CRITICAL | N workers → N× effective rate limit. 4 workers × 30 auth = 120 attempts/min. |
| **Restart amnesia** | MEDIUM | All counters evaporate on worker restart/restart. Rate-limit state is lost. |
| **No key differentiation** | LOW | Authenticated users share limits with anonymous users. |
| **Fixed window** | LOW | Burst-then-block pattern. No sliding window. |
| **No skip/whitelist** | LOW | Internal services and health checks consume rate limit quota. |
| **No monitoring** | LOW | No visibility into rate-limit rejections without log parsing. |

---

## 3. Root Cause: The Multi-Worker Amplification Problem

### 3.1 How MemoryStore Works

Each `express-rate-limit` instance creates a new `MemoryStore`. Each store holds an in-process `Map<key, {totalHits, resetTime}>`:

```
Worker 1:  Map { "192.168.1.5" → {hits: 25, reset: 17:00:30} }
Worker 2:  Map { "192.168.1.5" → {hits: 18, reset: 17:00:30} }
Worker 3:  Map { "192.168.1.5" → {hits: 22, reset: 17:00:30} }
Worker 4:  Map { "192.168.1.5" → {hits: 15, reset: 17:00:30} }
```

Each worker independently counts the SAME IP. With 4 workers and a round-robin load balancer (cluster's default), a single IP can make ~120 auth requests per minute (4 × 30) before ALL workers block further requests.

### 3.2 P1-02 Interaction

| P1-02 Mode | Workers | Amplification Factor | Risk |
|------------|---------|---------------------|------|
| Local fallback | 1 | 1× (no amplification) | LOW — MemoryStore is sufficient |
| Supabase production | N (CPU count) | N× | CRITICAL — Rate limits are proportional to core count |

**Critical insight:** P1-02's `numCPUs = 1` for local fallback eliminates cluster amplification for local mode, but Supabase production mode still has the full N× amplification. P1-03 fixes the Supabase production case.

---

## 4. Design Goals

1. **Shared counter store**: All workers/cluster processes share one rate-limit counter namespace.
2. **Minimal new infrastructure**: Leverage existing resources (Supabase PostgreSQL) before introducing Redis.
3. **Graceful degradation**: Store failure must NOT block requests — fail open with warning.
4. **Proxy-aware**: Respect `X-Forwarded-For` behind Railway.
5. **Backward compatible**: Same `express-rate-limit` API surface. No route changes.
6. **Monitorable**: Structured logging for rate-limit events.

---

## 5. Architecture Options (Evaluated)

### 5.1 Option A: Supabase PostgreSQL Store

**Approach:** Implement `express-rate-limit` `Store` interface backed by a `rate_limits` table in the existing Supabase PostgreSQL database.

**Store implementation pseudocode:**
```
CREATE TABLE rate_limits (
  key       TEXT PRIMARY KEY,
  hits      INTEGER NOT NULL DEFAULT 1,
  reset_at  TIMESTAMPTZ NOT NULL
);

increment(key):
  INSERT INTO rate_limits (key, hits, reset_at)
  VALUES ($1, 1, now() + window)
  ON CONFLICT (key) DO UPDATE
    SET hits = CASE WHEN reset_at <= now() THEN 1 ELSE hits + 1 END,
        reset_at = CASE WHEN reset_at <= now() THEN now() + window ELSE reset_at END
  RETURNING hits, reset_at;
```

| Pros | Cons |
|------|------|
| Zero new infrastructure (uses existing Supabase) | DB contention under extreme load |
| Atomic increment via `ON CONFLICT ... DO UPDATE` | Write amplification: every API request → 1 DB write |
| Survives worker/container restarts | 50ms+ latency overhead per request (network round-trip to Supabase) |
| Counters shared across ALL containers (not just same-machine workers) | Each rate-limited request becomes blocking I/O |

**Verdict:** ✅ **RECOMMENDED for Phase 1.** While DB-per-request has latency implications, TechHaven is not operating at scale where this matters. The simplicity of zero new infrastructure outweighs the latency tradeoff. Expected ~10-50ms overhead on Railway ↔ Supabase, acceptable for an Egyptian marketplace.

### 5.2 Option B: Redis/Valkey Store

**Approach:** Provision a Redis instance and use `rate-limit-redis` or `@express-rate-limit/redis-store`.

| Pros | Cons |
|------|------|
| Sub-millisecond latency | New infrastructure cost ($7-15/month on Railway) |
| Battle-tested at scale | Additional service to monitor and maintain |
| Built-in key eviction (perfect for rate limits) | New failure mode to handle |

**Verdict:** Hold for Phase 2. Introduce when DB contention becomes a measurable bottleneck or when the cache layer (SCA-3 Shared Cache Design) already provisions Redis and the rate-limit store can piggyback on it.

### 5.3 Option C: IPC Counter Aggregation

**Approach:** Primary process aggregates worker counters over Node.js IPC messages (`process.send`). Workers report local counts every 100ms; primary broadcasts global counts.

| Pros | Cons |
|------|------|
| Zero external dependencies | Complex: custom counter protocol, timing issues, race conditions |
| Low latency (in-process) | Does NOT work across containers (only same-machine cluster) |
| | Counter aggregation inherently stale (100ms window) |
| | Primary becomes a bottleneck and single point of failure |

**Verdict:** ❌ REJECTED. Too complex, too brittle, doesn't solve multi-container deployment.

### 5.4 Option D: Hybrid (Local Bucket + Periodic Flush)

**Approach:** Each worker maintains a local counter bucket, flushed to a shared store every N seconds or when close to limit. Combines local speed with shared accuracy.

| Pros | Cons |
|------|------|
| Low latency for normal traffic | Rate limits are approximate, not exact |
| Bounded DB writes (periodic, not per-request) | Complex implementation |
| | Early-stage over-engineering |

**Verdict:** Hold for Phase 3 if scale demands it. Overkill for v1.

---

## 6. Recommended Architecture: Supabase PostgreSQL Store

### 6.1 Decision

**Phase 1 (now):** Implement a `SupabaseRateLimitStore` class conforming to the `express-rate-limit` `Store` interface (v7.x), backed by a single `rate_limits` table in the existing Supabase PostgreSQL database.

**Phase 2 (future, when Redis is provisioned for caching):** Swap to Redis store via `@express-rate-limit/redis-store` or `rate-limit-redis`. The `Store` interface is the same — a one-line configuration change.

### 6.2 Database Schema

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key       TEXT PRIMARY KEY,
  hits      INTEGER NOT NULL DEFAULT 1,
  reset_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '60 seconds')
);

-- Support fast UPSERT (the primary operation)
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset
  ON rate_limits (reset_at)
  WHERE reset_at <= NOW();  -- partial index for cleanup queries
```

### 6.3 Store Implementation (`server/lib/SupabaseRateLimitStore.js`)

The store must implement the `Store` interface:

```
interface Store {
  init?(options: Options): void;
  get?(key: string): Promise<ClientRateLimitInfo | undefined>;
  increment(key: string): Promise<ClientRateLimitInfo>;  // REQUIRED
  decrement?(key: string): Promise<void>;
  resetKey?(key: string): Promise<void>;
  resetAll?(): Promise<void>;
  shutdown?(): void;
}
```

**Core method — `increment(key)`:**
```sql
INSERT INTO rate_limits (key, hits, reset_at)
VALUES ($key, 1, NOW() + INTERVAL '${windowMs} milliseconds')
ON CONFLICT (key) DO UPDATE
  SET hits = CASE
        WHEN rate_limits.reset_at <= NOW() THEN 1
        ELSE rate_limits.hits + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at <= NOW()
        THEN NOW() + INTERVAL '${windowMs} milliseconds'
        ELSE rate_limits.reset_at
      END
RETURNING hits AS "totalHits", reset_at AS "resetTime";
```

**Key design decisions:**

| Decision | Rationale |
|----------|-----------|
| Single `ON CONFLICT` UPSERT (not SELECT + INSERT) | Atomic — no race between read and write |
| `reset_at <= NOW()` check in the UPDATE | Self-resetting window: when window expires, counter resets to 1 |
| No explicit cleanup job initially | Rely on UPSERT reset logic; add periodic cleanup (`DELETE WHERE reset_at < NOW() - INTERVAL '1 hour'`) as a cron if table grows |
| `key` format: `rl:<limiter_name>:<client_identifier>` | Encodes limiter name to prevent key collision between auth/general/admin |
| `client_identifier` = `req.ip` (after trust proxy) | Consistent with current behavior; add authenticated user discrimination later |

### 6.4 Graceful Degradation Strategy

```
increment(key):
  TRY:
    result = await supabase.rpc('increment_rate_limit', {key, window_ms})
    return { totalHits: result.hits, resetTime: result.reset_at }
  CATCH (error):
    log.warn('rate-limit store unavailable, allowing request', { error, key })
    return { totalHits: 0, resetTime: new Date(Date.now() + windowMs) }
    // ↑ 0 hits = request is never rate-limited. Fail OPEN.
```

**The store must NEVER block a request.** A DB outage degrades rate limiting but keeps the API available. This is the standard fail-open pattern required by `express-rate-limit`'s own error handling (line 692 in dist/index.mjs: "error from store, allowing request without rate-limiting").

### 6.5 Supabase Client Usage

Reuse existing `supabase` client from `server/lib/supabase.js` (line 17):

```js
import { supabase } from '../lib/supabase.js';
```

No new client, no new connection pool. The rate-limit table lives in the same Supabase project as the application data.

### 6.6 Configuration Changes

**`server/middleware/rateLimiter.js` — modified:**

```js
import rateLimit from 'express-rate-limit';
import { SupabaseRateLimitStore } from '../lib/SupabaseRateLimitStore.js';

// Shared store instance (one for all limiters)
const store = process.env.SUPABASE_URL
  ? new SupabaseRateLimitStore()
  : undefined; // undefined → default MemoryStore (local fallback)

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  store,                          // ← shared store when Supabase configured
  trustProxy: true,               // ← NEW: respect X-Forwarded-For
  message: {
    error: 'كثرة طلباتك، حاول مرة أخرى بعد قليل',
    code: 'RATE_LIMITED',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  store,                          // ← same shared store
  trustProxy: true,
  keyGenerator: (req) => `auth:${req.ip}`,  // ← NEW: namespaced key
  message: { error: 'كثرة محاولات الدخول، حاول بعد دقيقة', code: 'AUTH_RATE_LIMITED' },
});

export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2000,
  store,                          // ← same shared store
  trustProxy: true,
  keyGenerator: (req) => `admin:${req.ip}`,
  message: { error: 'كثرة طلبات الإدارة', code: 'ADMIN_RATE_LIMITED' },
});
```

### 6.7 P1-02 Interaction

When `isSupabaseConfigured` is false (local fallback), `store` is `undefined`, and `express-rate-limit` falls back to its built-in `MemoryStore`. This is safe because P1-02 enforces `numCPUs = 1` in this mode — there is only one worker, so the single MemoryStore correctly counts all requests.

When `isSupabaseConfigured` is true (Supabase production), `store` is a shared `SupabaseRateLimitStore` — all N workers increment the same PostgreSQL counter, eliminating the N× amplification.

---

## 7. trustProxy Configuration

### 7.1 Current Problem

Railway sits in front of the Express server. Client requests arrive as:

```
Client → Railway Proxy → Express (req.ip = proxy IP, not client IP)
```

Without `trustProxy`, `req.ip` is the Railway internal IP. All users behind Railway share the same rate-limit bucket.

### 7.2 Solution

Set `trustProxy: true` in the rate limiter options (and in `app.set('trust proxy', 1)` in index.js). Express reads `X-Forwarded-For` header set by Railway and derives the real client IP.

**Railway sets `X-Forwarded-For` reliably** — it's on their standard proxy stack. No additional configuration needed.

### 7.3 Security Consideration

`trustProxy: true` trusts the FIRST proxy in `X-Forwarded-For`. Railway is the only proxy in the path. If a malicious client injects `X-Forwarded-For` before Railway, Railway overwrites it. Standard Railway security practice.

---

## 8. Production Deployment Sequence

### 8.1 Pre-Deployment

1. Create `rate_limits` table in Supabase (migration SQL).
2. Add `app.set('trust proxy', 1)` to `server/index.js`.
3. Write `SupabaseRateLimitStore` class in `server/lib/SupabaseRateLimitStore.js`.
4. Update `server/middleware/rateLimiter.js` to use shared store when Supabase is configured.
5. Write tests (see Section 10).

### 8.2 Rollout

1. Deploy schema migration.
2. Deploy application code.
3. Monitor Supabase query performance for `rate_limits` UPSERT operations.
4. Set up alert if `rate_limits` table exceeds 100K rows (indicates cleanup needed).

### 8.3 Rollback

Set `store: undefined` in all three limiters — reverts to per-worker MemoryStore with known N× amplification (acceptable as temporary rollback).

---

## 9. Monitoring Design

### 9.1 Metrics to Emit

| Metric | Source | Target |
|--------|--------|--------|
| `rate_limit.hits` (per key) | `increment()` return value | Logs |
| `rate_limit.exceeded` | `onLimitReached` handler | Counter |
| `rate_limit.store_error` | Catch block in `increment()` | Counter + Alert |
| `rate_limit.store_latency_ms` | Timing wrapper around `increment()` | Histogram |

### 9.2 `onLimitReached` Handler (NEW)

```js
const rateLimiter = rateLimit({
  // ... existing config ...
  onLimitReached: (req, res, options) => {
    console.warn('[RATE-LIMIT] exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      limit: options.max,
      windowMs: options.windowMs,
    });
  },
});
```

No external service dependency. Plain console logging, suitable for Railway log drain integration.

---

## 10. Test Strategy

### 10.1 Unit Tests for `SupabaseRateLimitStore`

| Test | What it verifies |
|------|-----------------|
| First request → `totalHits: 1` | Initial increment works |
| Second request within window → `totalHits: 2` | Consecutive increments accumulate |
| Request after window expiry → `totalHits: 1` | Window reset logic |
| Concurrent requests (same key) → no duplicates | Atomic UPSERT under load |
| Store error → `totalHits: 0` (fail open) | Graceful degradation |
| `decrement(key)` → reduces hits | Decrement support |
| `resetKey(key)` → clears hits | Reset support |

### 10.2 Integration Tests

| Test | What it verifies |
|------|-----------------|
| 31st auth request within window → 429 | Auth limiter enforces 30/min with shared store |
| Requests to different workers counted together | Shared store eliminates N× amplification |
| X-Forwarded-For respected | Real client IP used, not proxy IP |
| Store unavailable → request succeeds | Fail-open behavior |

### 10.3 Test Location

Tests are scoped to verify the Supabase store behavior. They do not require the full Express server:

- `scratch/p1-03/test_supabase_store.mjs` — Unit tests for the store class
- `scratch/p1-03/test_rate_limiter_e2e.mjs` — End-to-end with real Supabase

### 10.4 Test Infrastructure

No external stub server needed. Tests use a dedicated Supabase project or a local PostgreSQL instance. The store's Supabase client is injectable for testing (dependency injection pattern):

```js
class SupabaseRateLimitStore {
  constructor(supabaseClient = supabase) {
    this.client = supabaseClient;
  }
}
```

Tests inject a client pointing to a test database/schema.

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| DB write per request overloads Supabase | LOW (at current scale) | MEDIUM | UPSERT is lightweight; monitor query latency; Phase 2 Redis migration path |
| Supabase outage → rate limiting disabled | LOW | MEDIUM | Fail-open: store errors allow all requests. Acceptable degradation. |
| `rate_limits` table grows unbounded | MEDIUM | LOW | Self-resetting via UPSERT logic; add periodic cleanup if needed |
| `trustProxy` misconfiguration exposes real IPs | LOW | MEDIUM | Railway is the only proxy; test in staging with Railway first |
| Store latency adds 10-50ms per API request | HIGH | LOW | Acceptable overhead; most routes already make DB calls |

---

## 12. Related Findings & Future Work

### 12.1 P1-02 Interaction Summary

| P1-02 Mode | Workers | Rate Limit Store | Effective Limit |
|------------|---------|-----------------|-----------------|
| Local fallback | 1 | MemoryStore (default) | Correct (1×) |
| Supabase production | N | `SupabaseRateLimitStore` (shared) | Correct (1×) |

### 12.2 SCA-3 Shared Cache Design Alignment

SCA-3's Phase 2 proposes Redis for cache + rate limiting. When that phase is reached:

1. Swap `SupabaseRateLimitStore` → `RedisStore` from `rate-limit-redis`.
2. The `Store` interface is identical — no middleware changes needed.
3. Rate-limit keys share the Redis instance with cache keys, with prefix isolation (`rl:` vs `cache:`).

### 12.3 Future Enhancements (Out of P1-03 Scope)

| Enhancement | Phase | Rationale |
|-------------|-------|-----------|
| Authenticated vs anonymous differentiation | P2 | Key by `userId` for authenticated, `ip` for anonymous |
| Burst allowance (sliding window) | P2 | `express-rate-limit` v8+ sliding window support |
| Geo-based rate limiting | P3 | Not relevant for Egypt-only marketplace |
| WAF-level rate limiting (Cloudflare) | P3 | CDN edge blocking before request reaches origin |

---

## 13. File Manifest

### Files to CREATE

| File | Purpose |
|------|---------|
| `server/lib/SupabaseRateLimitStore.js` | PostgreSQL-backed Store implementation |
| `server/migrations/001_rate_limits.sql` | Schema migration for `rate_limits` table |
| `scratch/p1-03/test_supabase_store.mjs` | Unit tests for store class |
| `scratch/p1-03/test_rate_limiter_e2e.mjs` | End-to-end rate limiter tests |

### Files to MODIFY

| File | Change |
|------|--------|
| `server/middleware/rateLimiter.js` | Add shared store, trustProxy, namespaced keys, onLimitReached handler |
| `server/index.js` | Add `app.set('trust proxy', 1)` |

### Files UNCHANGED

All other files. No route modifications, no package.json changes (all dependencies already present).

---

## 14. Design Decision Log

| Decision | Chosen | Alternative Rejected | Rationale |
|----------|--------|---------------------|-----------|
| Store backend | Supabase PostgreSQL | Redis, IPC, Hybrid | Zero new infrastructure; simple; sufficient for v1 scale |
| Fail-open on store error | Yes | Fail-closed | Availability > rate limiting accuracy |
| Single shared store instance | Yes | Per-limiter store instances | One `rate_limits` table for all namespaced keys |
| `trustProxy: true` | Yes | Manual IP extraction | Standard `express-rate-limit` feature |
| Key format: `rl:<name>:<ip>` | Yes | Raw IP only | Prevents key collision between auth (30/min) and general (1000/min) |
| No DB cleanup job (initially) | Yes | Scheduled cleanup | UPSERT self-resetting; add cleanup only if table grows |

---

## 15. Final Status

```
P1-03 RATE LIMITER DESIGN = COMPLETE
```

The architecture is fully designed, validated against P1-02 topology enforcement, aligned with SCA-3's future Redis migration path, and ready for Phase 1 implementation. No production code has been modified — this document is the design specification only.