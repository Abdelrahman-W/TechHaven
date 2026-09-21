# TECHHAVEN — P1-02 Phase 1: Single-Process Enforcement

**Status:** `P1-02 PHASE 1 = PASS`  
**Date:** September 17, 2026  
**Branch:** (no git repo)

---

## 1. Baseline (Before Change)

| Metric | Before |
|--------|--------|
| `server/index.js` line 28 | `const numCPUs = os.cpus().length;` |
| Local fallback workers | `os.cpus().length` workers (multi-process) |
| Supabase mode workers | `os.cpus().length` workers |
| Supabase detection in index.js | None |
| Multi-worker local fallback | **Possible** — each worker had own stale `localStore` Map |
| `store.json` MD5 | `34e2394b5c02a873ee55841d332baec6` |
| `package.json` MD5 | `bd146115d99178d7bacc95e7e0ad5d47` |

---

## 2. Verified Startup Topology

### Detection chain (server/lib/supabase.js, lines 7-23):

```
process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL   → supabaseUrl
process.env.SUPABASE_SERVICE_ROLE_KEY || VITE_SUPABASE_ANON_KEY → supabaseKey
!!supabaseUrl && !!supabaseKey                              → isSupabaseConfigured
```

### Critical finding: `supabaseUrl` is a module-level `const` — resolved once at import, never reassigned.

Every `db.method()` in supabase.js branches on `if (!supabaseUrl)` at call-time. Since `supabaseUrl` never changes mid-process, the fallback decision is fixed for the lifetime of the process.

### Cluster topology (before change):

```
Primary (cluster.isPrimary && NODE_ENV === 'production')
  → forks os.cpus().length workers, regardless of database mode
  → worker restart re-forks with same env → same supabaseUrl → same path
```

---

## 3. Effective Fallback Detection

| Scenario | `supabaseUrl` truthy? | `supabaseKey` truthy? | `isSupabaseConfigured` | Workers |
|----------|----------------------|----------------------|------------------------|---------|
| Both env vars set | ✅ | ✅ | `true` | `os.cpus().length` |
| URL only (VITE_SUPABASE_URL set, no key) | ✅ | ❌ | `false` | **1** |
| Key only (ANON_KEY set, no URL) | ❌ | ✅ | `false` | **1** |
| Neither set | ❌ | ❌ | `false` | **1** |

**The detection is at module-load time.** Once `supabaseUrl` is truthy and `supabaseKey` is truthy, the app takes the Supabase path. If Supabase becomes unreachable, the Supabase client throws errors — there is NO dynamic re-detection and NO silent fallback to local store.

---

## 4. Exact Code Change

**File:** `server/index.js` (lines 28 → 27-36)

```diff
-const numCPUs = os.cpus().length;
+// ── P1-02: Local-fallback topology enforcement ─────────────────
+// Supabase-configured production → full CPU cluster.
+// Local JSON fallback            → exactly 1 worker.
+// Detection mirrors server/lib/supabase.js (lines 7-8, 23).
+const _supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
+const _supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
+const isSupabaseConfigured = !!_supabaseUrl && !!_supabaseKey;
+
+const numCPUs = isSupabaseConfigured ? os.cpus().length : 1;
```

**Why it's surgical:**
- 9 lines added (detection logic + comment + ternary)
- 1 line modified (`numCPUs` assignment)
- No new imports
- No changed exports
- No changed worker lifecycle (fork/restart/exit unchanged)
- Detection mirrors supabase.js identically

---

## 5. Why It Prevents Stale Worker Snapshots

**Root cause (from P1-02 analysis):** Each cluster worker calls `initLocalStore()` at startup, loading `store.json` into a per-worker `localStore` Map. Workers never re-read the file. Worker A writes → Worker B still reads from stale Map.

**Fix:** Local fallback now runs as exactly 1 process. There is exactly one `localStore` Map, one writer, one `store.json` on disk. No sibling to diverge from. Every read sees the same in-memory state.

**Supabase mode is unaffected:** The cluster continues with `os.cpus().length` workers, but all DB operations go to Supabase (the `isSupabaseConfigured` flag is true → `supabaseUrl` is truthy → all `db.method()` calls take the Supabase path). No local store is ever consulted.

---

## 6. Supabase Mode Verification

**Confirmed:** When `VITE_SUPABASE_URL` (or `SUPABASE_URL`) AND `SUPABASE_SERVICE_ROLE_KEY` (or `VITE_SUPABASE_ANON_KEY`) are both set:
- `isSupabaseConfigured` = `true`
- `numCPUs` = `os.cpus().length`
- Cluster topology unchanged from before

Worker lifecycle (fork, exit, restart with 1s delay, restart-policy window) is unmodified.

---

## 7. Fallback-After-Supabase-Failure Analysis

### Question: Can the app silently enter multi-worker local fallback after Supabase failure?

**Answer: NO.** Here's why:

1. `supabaseUrl` is a module-level `const` — resolved at process startup from env vars.
2. It is never reassigned anywhere in the codebase (verified: exactly 1 assignment).
3. All 68+ `db.method()` calls check `if (!supabaseUrl)` — a const, never re-evaluated.
4. If Supabase becomes unreachable, the Supabase client throws errors. The app does NOT retry by re-checking `supabaseUrl` — that would be a no-op since the const hasn't changed.
5. Worker restart re-forks with the same env → same `supabaseUrl` → same Supabase path.

**The app does not implement a dynamic fallback mechanism.** There is no "if Supabase errors, switch to local." Supabase errors propagate as 500 responses. This is by design — the split between Supabase path and local path is a compile-time (startup-time) decision, not a runtime one.

### Structural guarantee:

```
supabaseUrl truthy → Supabase path → never local → multi-worker safe
supabaseUrl falsy  → local path   → always local → single-worker enforced
```

**There is no possible state where `supabaseUrl` is both truthy (enabling multi-worker via `isSupabaseConfigured`) and the app operates on local store.** The two are mutually exclusive.

---

## 8. Test Results

**Suite:** `scratch/p1-02/test_local_fallback_topology.mjs`

| Group | Tests | Result |
|-------|-------|--------|
| A/B — Static Worker-Count Logic | 9 | ✅ All passed |
| C/D — localStore Correctness | 2 | ✅ All passed |
| E — Restart Persistence | 1 | ✅ Passed |
| F/G — File Locking & Atomic Persistence | 6 | ✅ All passed |
| H/I/J — Supabase-Failure Analysis | 5 | ✅ All passed |
| Cluster Analysis | 3 | ✅ All passed |
| **Total** | **26** | **✅ 26/26 Passed** |

---

## 9. Regression Results

| Check | Result |
|-------|--------|
| `npm run build` | ✅ Passed (5.57s, 1892 modules) |
| ESLint `server/index.js` | ✅ Clean (0 warnings, 0 errors) |
| `store.json` MD5 | `34e2394b5c02a873ee55841d332baec6` — **unchanged** |
| `package.json` MD5 | `bd146115d99178d7bacc95e7e0ad5d47` — **unchanged** |
| No test records in store.json | ✅ Confirmed |
| No unrelated production changes | ✅ Only `server/index.js` modified |
| No dependency changes | ✅ Confirmed (package.json unchanged) |

**Note:** P1-01, SCA-1, SCA-2, SCA-3.1, SCA-3.2, SCA-3.3, Cart, Wishlist, Auth, Orders test suites do not exist yet in the repository — this is the first test suite being created under `scratch/p1-02/`.

---

## 10. Data Integrity

| File | Expected MD5 | Actual MD5 | Match |
|------|-------------|------------|-------|
| `server/data/store.json` | `34e2394b5c02a873ee55841d332baec6` | `34e2394b5c02a873ee55841d332baec6` | ✅ |
| `package.json` | (baseline) | `bd146115d99178d7bacc95e7e0ad5d47` | ✅ |

No test records, no unrelated production changes, no dependency changes.

---

## 11. Remaining P1-02 Risks

| Risk | Severity | Notes |
|------|----------|-------|
| **Rate limiter is still per-worker in-memory** | Medium | Phase 1 doesn't address this (scoped out per spec). With single-worker fallback, it's effectively global. |
| **localReviews is never persisted to disk** | Medium | Separate module-level Map in `server/routes/reviews.js`. Not in `localStore`, not in `store.json`. Survives restart only via in-memory (lost on restart). Out of P1-02 scope. |
| **Cache middleware is per-worker** | Low | With single-worker fallback, cache state is consistent. IPC is not needed for single-worker. |
| **storeWriteQueue is single-process** | None | With 1 worker, no contention. Queue still works correctly. |
| **No automatic Supabase→local reconnection** | Design | If Supabase fails mid-flight, errors propagate to clients. No auto-fallback. This matches the current architecture. |

---

## 12. Files Changed

| File | Change |
|------|--------|
| `server/index.js` | 9 lines added (detection + ternary guard), 1 line modified |
| `scratch/p1-02/test_local_fallback_topology.mjs` | Created (26 tests) |
| `P1-02-LOCAL-FALLBACK-CONSISTENCY-DESIGN.md` | Created (from previous design phase) |
| `P1-02-PHASE1-SINGLE-PROCESS-ENFORCEMENT.md` | This file |

**No other files modified. No files deleted.**

---

## Final Status

```
P1-02 PHASE 1 = PASS
```

**Reasoning:**
- ✅ Local fallback is provably single-process (`numCPUs = 1`)
- ✅ Supabase cluster behavior remains intact (`os.cpus().length` when configured)
- ✅ All 26 P1-02 tests pass
- ✅ Build passes
- ✅ ESLint passes
- ✅ `store.json` unchanged (MD5 verified)
- ✅ No unrelated production changes
- ✅ No dependency changes
- ✅ Multi-worker local fallback is structurally impossible (detection is at startup, const, never dynamic)