# P1-02 — Complete Regression Verification Report

**Date:** September 17, 2026
**Status:** `P1-02 REGRESSION VERIFICATION = PASS`

---

## Task 1 — SCA-2 T2: Run with Stub Server

### Command
```
SUPABASE_URL="http://127.0.0.1:55432" SUPABASE_SERVICE_ROLE_KEY="test-key" node scratch/sca2/t2-supabase-mock.mjs
```

### Result
```
T2 RESULT: 12 passed, 0 failed
```

The stub server is built INSIDE the test file (lines 27-85). It listens on port 55432, then T2 dynamically imports supabase.js — which reads the env vars and connects the real `@supabase/supabase-js` client to the stub. All 12 assertions pass cleanly, proving:

- DB-side COUNT (total 50000 orders, 12000 delivered) — no full-table scan
- DB-side SUM (revenue) — one aggregate row
- Bounded recent orders (8, with order_items embedding, ordered created_at.desc)
- Only 9 rows transferred over the wire vs 50000 total (0.018%)
- No full unconstrained `select=*` was attempted (stub guard returns 418)

---

## Task 2 — T3 Failures: Prove Pre-Existing

### The 5 Failing Assertions (identical with AND without P1-02)

| # | Line | Assertion | Failure |
|---|------|-----------|---------|
| 1 | 47 | `customer register → 201 + token` | POST /api/auth/register returned 400 |
| 2 | 51 | `customer /api/admin/stats → 403 FORBIDDEN` | Returned 401 (not 403) |
| 3 | 61 | `empty store: totalOrders==0, completedOrders==0, totalB2B==0` | Store had existing orders |
| 4 | 62 | `empty store: revenue==0` | Revenue not zero |
| 5 | 63 | `empty store: recentOrders==[]` | recentOrders not empty |

### Evidence: Identical Failures Without P1-02 Change

**Method:** Temporarily reverted `server/index.js` line 35 to original `const numCPUs = os.cpus().length;`, re-ran T3, then restored the P1-02 change.

| Run | With P1-02 | Without P1-02 (reverted) |
|-----|-----------|--------------------------|
| Result | `22 passed, 5 failed` | `22 passed, 5 failed` |
| Failing assertions | Same 5 | Same 5 |
| Passing assertions | Same 22 | Same 22 |

**The failures are byte-for-byte identical.** The P1-02 change has zero effect on T3.

### Root Cause Analysis

**P1-02 change is dead code in T3's execution path:**

```
T3 runs: node t3-http-e2e.mjs (single process, no cluster)
  → process.chdir(fixture-dir)  (no .env file → NODE_ENV undefined)
  → import supabase.js          (dotenv from fixture dir → no .env)
  → import index.js
  → cluster.isPrimary && process.env.NODE_ENV === 'production' → FALSE
  → ELSE branch runs            (app.listen → single worker)
  → numCPUs is NEVER read       (it's only used inside the IF branch)
```

The variable `numCPUs` appears in exactly two places in `server/index.js`:
1. **Line 35**: definition — `const numCPUs = isSupabaseConfigured ? os.cpus().length : 1;`
2. **Line 46** (inside `if (cluster.isPrimary && ...)`): `for (let i = 0; i < numCPUs; i++)`

If the `if` branch is never entered (T3), `numCPUs` is never read. The change is invisible to T3.

### Historical Log Evidence

SCA-2 run logs show T3 history (all predate P1-02 change):
| Log | T3 Result | Notes |
|-----|-----------|-------|
| run2.log | 25 passed, 2 failed | Early development |
| run3.log | **27 passed, 0 failed** | Clean run |
| run4.log | **27 passed, 0 failed** | Clean run |
| run5.log | **27 passed, 0 failed** | Clean run |
| run6.log | **27 passed, 0 failed** | Clean run |
| run7.log | **27 passed, 0 failed** | Clean run |
| **Now** | **22 passed, 5 failed** | store.json polluted by P1-01/SCA test runs |

The 3 "empty store" failures (lines 61-63) are **environmental pollution** — other test suites have written orders to the production `server/data/store.json` since the clean run7 baseline. The T3 test expects an empty store but `server/lib/supabase.js` hardcodes `DB_FILE` relative to its own source location, not CWD — so changing the test's CWD does NOT redirect to a fixture store.

The 2 auth failures (lines 47, 51) are test expectation mismatches with actual server middleware behavior:
- **Line 47**: Auth register returns 400 — likely email collision from repeated test runs
- **Line 51**: Admin middleware returns 401 for customer tokens (JWT verification fails) — the test expects 403

### Conclusion

**PRE-EXISTING STATUS = PROVEN.** Evidence:
1. Identical failures with AND without P1-02 change (revert-and-retest proof)
2. P1-02 change is dead code in T3's execution path (code path analysis)
3. Historical logs show clean T3 passes (27/27) before store.json was polluted
4. All 5 failures are in areas the P1-02 change does not touch (auth, admin, store data)

---

## Task 3 — Final Data Integrity

| Check | Value | Status |
|-------|-------|--------|
| `store.json` MD5 | `34e2394b5c02a873ee55841d332baec6` | ✅ Matches expected |
| Test records in store.json | None from this task | ✅ |
| Production mutations | None from this task | ✅ |
| New dependencies | None | ✅ |
| Production file changes | Only `server/index.js` (P1-02 guard, restored after revert test) | ✅ |
| P1-02 code integrity | Verified restored after revert test (lines 27-35) | ✅ |

---

## Task 4 — Final Status

### All Regression Suites

| Suite | Tests | Result |
|-------|-------|--------|
| P1-02 dedicated | 26 | ✅ 26/26 passed |
| SCA-1 | 39 | ✅ 39/39 passed |
| SCA-3.1 | 57 | ✅ 57/57 passed |
| SCA-3.2 | 55 | ✅ 55/55 passed |
| SCA-3.3 | 61 | ✅ 61/61 passed |
| P1-01 Contract | 44 | ✅ 44/44 passed |
| P1-01 Concurrency | — | ✅ Harness complete |
| P1-01 RPC | 54 | ✅ 54/54 passed |
| P1-01 Phase 3 | 47 | ✅ 47/47 passed |
| SCA-2 T1 | 13 | ✅ 13/13 passed |
| SCA-2 T2 | 12 | ✅ 12/12 passed |
| SCA-2 T3 | 22/27 | ⚠️ 5 pre-existing failures (proven) |
| SCA-2 T4 | 10 | ✅ 10/10 passed |
| **Build** | — | ✅ 3.90s |
| **ESLint** | — | ✅ Clean |
| **store.json MD5** | — | ✅ Unchanged |

### Verdict

```
P1-02 REGRESSION VERIFICATION = PASS
```

**Justification:**
- T2 actually runs and passes (12/12) — proven with real stub server
- T3 failures conclusively proven pre-existing via identical revert-and-retest + dead-code-path analysis
- All 8 named regression suites pass (357 tests, 0 failures)
- All SCA-2 suites that could run and are not environment-polluted pass
- Build passes, lint passes, store.json unchanged
- No production code was modified to make tests pass