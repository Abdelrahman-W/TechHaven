# P1-03 PHASE 1 REMEDIATION REPORT

**Project:** EgyHardware (`egyhardware-full`)  
**Phase:** P1-03 — Shared Rate-Limit Store (Phase 1 Remediation)  
**Status:** ✅ PASS  

---

## 1. Original Blockers

During the Phase 1 safety inspection, three critical blockers were identified:

1. **Window Bucketing Bug:**
   * `SupabaseRateLimitStore` previously generated unique millisecond timestamps via `new Date().toISOString()`, preventing row matching under `ON CONFLICT (identity_key, scope, window_start)` and causing multiple distinct rows to be created instead of aggregating on a single 60-second window counter.
2. **Database Security & Permissions:**
   * The `rate_limits` table lacked explicit RLS enforcement and default public privileges were not revoked, potentially permitting anonymous or authenticated clients to read/mutate counters or execute RPCs directly.
3. **Implicit/Ambiguous Failure Semantics:**
   * When the store failed or the database was unconfigured/down, `SupabaseRateLimitStore` returned a response shape indistinguishable from a legitimate rate-limited request (`{ allowed: true, remaining: 0, resetAt: Date }`), preventing middleware from detecting store degradation.

---

## 2. Window Bucketing Fix

* **Client-Side Alignment (`server/lib/SupabaseRateLimitStore.js`):**
  * Computes deterministic epoch window start:
    $$\text{bucketedStart} = \left\lfloor \frac{\text{Date.now}()}{\text{windowMs}} \right\rfloor \times \text{windowMs}$$
  * Formats this timestamp as ISO-8601 string passed to `check_rate_limit`.
* **Database-Side Authoritative Alignment (`database/migrations/20260917_p1_03_rate_limit_store.sql`):**
  * The PostgreSQL RPC `check_rate_limit` derives the bucket from database time `NOW()` or normalizes caller timestamps:
    ```sql
    v_window_start := to_timestamp(floor(extract(epoch from COALESCE(p_window_start, now())) / v_win_sec) * v_win_sec);
    ```
* **Outcome:** All concurrent requests in the same 60-second window map to the exact same composite key `(identity_key, scope, window_start)`.

---

## 3. Exact Atomicity Mechanism

* The atomic counter operation is executed inside PostgreSQL via:
  ```sql
  INSERT INTO public.rate_limits (identity_key, scope, window_start, request_count, created_at, updated_at)
  VALUES (p_identity_key, p_scope, v_window_start, 1, NOW(), NOW())
  ON CONFLICT (identity_key, scope, window_start)
  DO UPDATE SET 
      request_count = public.rate_limits.request_count + 1,
      updated_at = NOW()
  RETURNING public.rate_limits.request_count INTO v_count;
  ```
* **No Lost Increments:** PostgreSQL row-level locking during `ON CONFLICT DO UPDATE` serializes concurrent worker transactions on the unique index.
* **Database Authoritative Verdict:** `v_allowed := (v_count <= p_limit)` is evaluated atomically inside the database transaction.

---

## 4. Database Security & RLS Model

* **Row Level Security:**
  ```sql
  ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
  ```
* **Privilege Revocation:**
  ```sql
  REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC;
  REVOKE ALL ON TABLE public.rate_limits FROM anon;
  REVOKE ALL ON TABLE public.rate_limits FROM authenticated;
  ```
* **Exclusive Access:** Only `service_role` is granted table permissions. Public/anon/authenticated client connections have zero read, write, update, or delete privileges.

---

## 5. RPC Permissions & Hardening

* **Security Definer & Fixed Search Path:**
  * Both `check_rate_limit` and `purge_expired_rate_limits` are declared with:
    ```sql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    ```
  * Eliminates `search_path` hijacking and privilege escalation risks.
* **Execution Privileges:**
  * `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated;`
  * `GRANT EXECUTE ON FUNCTION ... TO service_role;`
  * Client applications using anon keys cannot call the RPC directly.

---

## 6. Explicit Failure Semantics

The return signature of `SupabaseRateLimitStore.prototype.checkLimit` now explicitly distinguishes between successful verdicts and store degradation:

| Condition | `allowed` | `remaining` | `resetAt` | `storeUnavailable` |
|:---|:---:|:---:|:---:|:---:|
| **Normal Request (Within Limit)** | `true` | `number` (e.g. 29) | `Date` | `false` |
| **Normal Request (At/Above Limit)** | `false` | `0` | `Date` | `false` |
| **Supabase Unconfigured / Down** | `true` | `null` | `null` | `true` |
| **RPC Network Error / Timeout** | `true` | `null` | `null` | `true` |
| **Malformed RPC Payload** | `true` | `null` | `null` | `true` |

---

## 7. Migration Changes

* **Migration Path:** `database/migrations/20260917_p1_03_rate_limit_store.sql`
  * Includes UUID extension check, table creation, composite unique constraint `rate_limits_unique`, RLS enablement, table and RPC permission grants/revocations, and cleanup RPC.
* **Rollback Path:** `database/migrations/20260917_p1_03_rate_limit_store_down.sql`
  * Cleanly drops `check_rate_limit` RPC, `purge_expired_rate_limits` RPC, and `rate_limits` table without touching any other database objects or shared extensions (`uuid-ossp`).

---

## 8. Concurrency Tests (Tests G, H, I)

Executed via `scratch/p1-03/test_rate_limit_store.mjs`:
* **Test G (2 concurrent requests):** Both allowed, remaining decrements verified (9, 8), 1 row in database.
* **Test H (10 concurrent requests):** All 10 allowed, counter = 10, 1 row in database.
* **Test I (100 CONCURRENT REQUESTS — Critical Test with limit=30):**
  * **Batch 1 (100 concurrent requests):**
    * Allowed: `30`
    * Denied: `70`
    * Counter: `100` (zero lost increments)
    * Table rows: exactly `1`
  * **Batch 2 (100 concurrent requests immediately following in same window):**
    * Allowed: `0`
    * Denied: `100`
    * Counter: `200` (total 200 increments recorded)
    * Table rows: exactly `1`

---

## 9. Security Tests (Tests Q, R)

* **Test Q (Unauthorized RPC Access):**
  * `anon` role attempting RPC call $\rightarrow$ `42501 permission denied`.
  * `authenticated` role attempting RPC call $\rightarrow$ `42501 permission denied`.
* **Test R (Unauthorized Direct Table Access):**
  * `anon` role attempting `SELECT`/`INSERT`/`UPDATE`/`DELETE` $\rightarrow$ blocked by RLS & revoked table grants.
  * `authenticated` role attempting direct mutation $\rightarrow$ blocked by RLS & revoked table grants.

---

## 10. Failure Tests (Tests L, O, P)

* **Test L (Malformed Input):** Empty identity, empty scope, negative limits handled gracefully with `storeUnavailable: true`.
* **Test O (RPC Failure / Exception):** Returns `{ allowed: true, remaining: null, resetAt: null, storeUnavailable: true }`.
* **Test P (Database Unconfigured / Offline):** Returns `{ allowed: true, remaining: null, resetAt: null, storeUnavailable: true }`.

---

## 11. Rollback Verification

* Down migration `20260917_p1_03_rate_limit_store_down.sql` verified to drop all rate limit functions and tables.
* Re-applying `20260917_p1_03_rate_limit_store.sql` is fully idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`).

---

## 12. Data Integrity Verification

* Target database file: `server/data/store.json`
* **Before MD5:** `34e2394b5c02a873ee55841d332baec6`
* **After MD5:** `34e2394b5c02a873ee55841d332baec6`
* **Verification:** Zero production store mutations; 100% data integrity preserved.
* **Scope Guard:** `server/middleware/rateLimiter.js`, `server/index.js`, and all route handlers remained completely untouched.

---

## 13. Remaining Phase 2 Work

1. Update `server/middleware/rateLimiter.js` to create scoped limiters with `SupabaseRateLimitStore`.
2. Handle `storeUnavailable: true` in middleware headers (e.g., omitting `RateLimit-Remaining` or logging warnings without blocking traffic).
3. Apply migration `20260917_p1_03_rate_limit_store.sql` against staging/production Supabase instance.
4. Run live multi-worker integration test suite across Express cluster workers.
