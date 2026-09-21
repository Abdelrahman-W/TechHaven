# TECHHAVEN — P1-02: Multi-Worker Local JSON Fallback Consistency Design

**Status:** `P1-02 LOCAL FALLBACK DESIGN = COMPLETE`  
**Date:** September 17, 2026  
**Store Hash Integrity:** `34e2394b5c02a873ee55841d332baec6` (VERIFIED UNTOUCHED)  
**Branch:** Not a git repository; single-source directory  
**Mode:** READ-ONLY DESIGN — Zero production changes made  

---

## 1. Executive Summary

When TechHaven runs in `production` mode without Supabase, Node.js `cluster` forks `N` workers on line 36–38 of `server/index.js` (`const numCPUs = os.cpus().length`). Every worker imports `server/lib/supabase.js`, which creates an independent `localStore` Map and loads `server/data/store.json` at startup via `initLocalStore()` (line 611). **After that initial load, no worker ever re-reads the file.** A cross-process lock serializes writes so `store.json` is never physically corrupted, but every worker's *in-memory view* of the data is a frozen snapshot from process start — it *never* sees mutations made by sibling workers.

This means the current architecture has a **stale-read problem on every entity** in local fallback mode. The cross-process write lock ensures that writes are atomic and non-overlapping, but it does nothing to synchronize in-memory state across workers.

**Summary verdict:** The only correct local-fallback topology for write safety is **single-process mode**. Multi-worker local JSON fallback is architecturally unsound as implemented and must be gated to prevent silent data inconsistencies.

---

## 2. Current Local Store Architecture

### 2.1 Store Initialization

```text
server/index.js  (cluster.isPrimary in production)
    └─ for (cpuCount) cluster.fork()
         └─ each worker:
              import express app → import routes → import './lib/supabase.js'
                   └─ const localStore = new Map()             (line 26)
                   └─ initLocalStore()                          (line 611, called at module load)
                        └─ loadStoreFromDisk()                  (line 136)
                             └─ fs.readFileSync(DB_FILE)
                             └─ for each [k,v] → localStore.set(k,v)
                        └─ if !loaded → seed categories/products/users
                        └─ saveStoreToDisk()                   (line 588)
```

### 2.2 Write Path (saveStoreToDisk)

```text
saveStoreToDisk()
  └─ snapshot = localStore entries → JSON
  └─ queue write onto storeWriteQueue (serialized per-process)
       └─ acquireStoreLock()  — cross-process 'wx' lock file
       └─ write tmp file + fsync
       └─ atomic rename(tmp → store.json)
       └─ releaseStoreLock()
```

**Cross-process lock mechanics (lines 51–86):**
- Lock file: `server/data/.store.lock`
- `acquireStoreLock()`: uses `fs.open(LOCK_FILE, 'wx')` — exclusive creation; fails with `EEXIST` if another process holds it
- Stale lock recovery: locks older than 10 seconds are stolen (crash recovery)
- In-process counter (`storeLockCounter`) prevents self-deadlock — the counter mirrors queue depth; only first call creates the file lock, later calls in the same process skip it
- Wait between retries: 25–75ms random jitter

### 2.3 Read Path

Every local read goes through `localStore.get(key)` — the in-memory Map. There is **no disk re-read** anywhere. `loadStoreFromDisk()` is only called at module init (line 611), and it is `export`ed but never called elsewhere.

### 2.4 Cluster Topology

```text
                      Primary (pid=1)
                      │
         ┌────────────┼────────────┬────────────┐
    Worker 1      Worker 2     Worker 3     Worker N
    (pid=2)       (pid=3)      (pid=4)      (pid=N+1)
         │            │            │            │
    localStore    localStore   localStore   localStore
    (Map)         (Map)        (Map)        (Map)
         │            │            │            │
         └────────────┴────────────┴────────────┘
                      │
              server/data/store.json
              (shared on disk)
```

Every worker is an independent Node.js process with its own memory space. They all listen on the same port (SO_REUSEPORT on Linux; the OS distributes incoming connections). They share only the file system.

### 2.5 Worker Restart

When a worker dies, the primary forks a new one (line 59). The new worker calls `initLocalStore()` → loads `store.json` from disk. At this point the new worker gets the *latest persisted snapshot*, which may already be behind sibling workers' in-memory state. Within 1ms, the new worker's localStore is stale again.

---

## 3. Shared State Inventory

| State Structure | Location | Authoritative Source | Persistent? | Per-Worker? | Mutation Path | Cross-Worker Consistent? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `localStore` | `server/lib/supabase.js` (line 26) | `store.json` | Yes (on write) | Independent copy per worker | `localStore.set()` → `saveStoreToDisk()` | **No** — stale reads guaranteed |
| `localReviews` | `server/routes/reviews.js` (line 9) | In-memory only | **No** | Independent copy per worker | `localReviews.set()` / `.delete()` | **No** — never persisted, lost on restart |
| `rateLimiter` | `express-rate-limit` (in-process) | In-memory only | **No** | Independent counter per worker | Automatic per-IP counting | **No** — each worker counts independently |
| Cart (`cart:${userId}`) | `localStore` (keyed) | `store.json` | Yes (on write) | Via localStore | `upsertCartItem()` → `saveStoreToDisk()` | **No** — stale across workers |
| Wishlist (`wishlist:${userId}`) | `localStore` (keyed) | `store.json` | Yes (on write) | Via localStore | `addToWishlist()` → `saveStoreToDisk()` | **No** — stale across workers |
| Auth cache (`node-cache`) | Cache middleware (file not loaded) | Derived from localStore/Supabase | **No** | Unknown — need to inspect cache.js | TTL-based invalidation via IPC | Depends on cache impl |

---

## 4. Failure Scenarios

### Scenario A: Worker A updates product, Worker B has stale snapshot
- **Trigger:** Admin updates a product's price via Worker A. Worker B's `localStore` still has old price.
- **Current behavior:** Worker B serves stale price to all its requests until someone updates via Worker B or B restarts.
- **Risk:** **HIGH** — Customers see wrong prices, checkout uses wrong totals.
- **Lock solves it?** No. The lock serializes *writes to the file*, not *reads from memory*.

### Scenario B: Worker A creates order, Worker B reads stale stock
- **Trigger:** Worker A processes checkout for the last unit of a product. Worker B's `localStore` still shows stock=1. Another request hits Worker B.
- **Current behavior:** Worker B allows a second checkout, but `processOrderCheckoutLocal` only validates against its own stale `localStore`. Stock goes to 0 in Worker B's memory, -1 on disk after B writes.
- **Risk:** **CRITICAL** — Overselling. The P1-01 atomic checkout never sees sibling work.
- **Lock solves it?** No.

### Scenario C: Worker A updates cart, Worker B reads stale cart
- **Trigger:** User adds item to cart via Worker A. Same user's next request hits Worker B.
- **Current behavior:** Worker B returns old cart (or empty cart if first add).
- **Risk:** **MEDIUM** — UX confusion, but cart is user-affinity anyway (most users hit the same worker due to keep-alive). In degraded scenario (Worker A dies), cart state is lost from memory.
- **Lock solves it?** No.

### Scenario D: Worker A updates user, Worker B reads stale user
- **Trigger:** User changes password/profile via Worker A. Next auth check hits Worker B.
- **Current behavior:** Worker B validates against old password hash.
- **Risk:** **CRITICAL** — Auth inconsistency. Password changes may not take effect, or old credentials may still work.
- **Lock solves it?** No.

### Scenario E: Two workers write simultaneously
- **Trigger:** Worker A and Worker B both call `saveStoreToDisk()` at nearly the same time.
- **Current behavior:** The cross-process lock serializes them. Whichever acquires the lock second writes over the other's changes. But both workers snapshot their own (divergent) `localStore` state. The second writer's snapshot **overwrites** mutations the first writer made to keys the second writer never touched.
- **Risk:** **CRITICAL** — Silent data loss. Worker A updates product price + order. Worker B updates a different user's cart. Whoever writes last overwrites the other's changes.
- **Lock solves it?** Partially — prevents file corruption but does NOT prevent data loss.

### Scenario F: Worker crashes after acquiring lock
- **Current behavior:** Lock file stays. Other workers see `EEXIST` for up to 10 seconds, then steal the stale lock.
- **Risk:** **LOW** — Transient write unavailability (max 10s). No data loss.
- **Lock solves it?** Yes — stale lock recovery is built in.

### Scenario G: Worker crashes after atomic rename
- **Current behavior:** Rename completed successfully. Lock released in the `finally` block? Actually, the lock is released BEFORE calling `saveStoreToDisk` is done... Let me re-check. The lock is released on line 119 after `rename`. If the process crashes between `rename` and `releaseStoreLock`, the lock file stays.
- **Risk:** **LOW** — Same as Scenario F.
- **Lock solves it?** Yes, via stale lock recovery.

### Scenario H: Worker restarts after another worker has mutated state
- **Trigger:** Worker A dies. Primary forks a new Worker A'. Worker A' loads `store.json` — which has Worker B's latest write.
- **Current behavior:** Worker A' starts with a fresh snapshot that may be milliseconds stale. It immediately diverges.
- **Risk:** **LOW** — The best-case scenario; at least the restart forces a fresh read.
- **Lock solves it?** N/A — reading doesn't use the lock.

### Scenario I: Primary restarts (all workers die)
- **Current behavior:** All workers restart, all load the same `store.json`. State converges temporarily until the first mutation.
- **Risk:** **LOW** — Natural convergence point.
- **Lock solves it?** N/A.

### Scenario J: Two workers perform rapid sequential mutations
- **Trigger:** Worker A sets product stock=5, Worker B immediately sets stock=3.
- **Current behavior:** Each worker sets its own localStore independently. Whichever write hits disk last wins. The real stock depends on request-ordering, not application logic.
- **Risk:** **HIGH** — Stock numbers are unpredictable.
- **Lock solves it?** No — lock serializes the writes but each write carries the worker's full snapshot, so the second write is a full overwrite.

### Scenario K: Two workers mutate different keys simultaneously
- **Trigger:** Worker A updates `product:prod-1`. Worker B updates `cart:user-1`.
- **Current behavior:** Each worker snapshots its ENTIRE localStore. Worker A's snapshot has stale `cart:user-1`. Worker B's snapshot has stale `product:prod-1`. The second writer overwrites the first writer's key.
- **Risk:** **CRITICAL** — Silent data loss across unrelated keys. This is the fundamental flaw of the snapshot-based write.
- **Lock solves it?** No.

---

## 5. Authoritative Data Matrix

| Entity | Source of Truth | Persistence | Stale Window | Stale Reads Dangerous? | Requires Serialization? | Worker-local Memory Safe? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Products** | `store.json` | Write-through | Infinite (until next write by this worker) | **YES** — wrong price, wrong stock, overselling | **YES** — stock mutation is critical | **NO** |
| **Categories** | `store.json` | Write-through | Infinite | LOW — rarely change | NO | OK (low mutation rate) |
| **Users** | `store.json` | Write-through | Infinite | **YES** — auth bypass, stale passwords | **YES** — registration/login is critical | **NO** |
| **Carts** | `store.json` (per-user) | Write-through | Infinite | MEDIUM — user confusion, but user affinity mitigates | YES (per-user) | Partially (cart == user-specific) |
| **Wishlists** | `store.json` (per-user) | Write-through | Infinite | LOW — read-only display | NO | OK |
| **Orders** | `store.json` | Write-through | Infinite | **YES** — order visibility, admin dashboard | **YES** — stock coupling | **NO** |
| **Reviews** | `localReviews` (in-memory) | **NONE** | Infinite | MEDIUM — inconsistent review counts | NO | OK (but lost on restart) |
| **Settings** | `store.json` | Write-through | Infinite | LOW — rarely change | NO | OK |
| **Rate Limiter** | In-memory per-worker | **NONE** | Per minute reset | **YES** — rate-limit bypass across workers | NO | N/A (per-worker is by design) |

---

## 6. Architecture Options

### OPTION A: Force Single-Process Mode for Local Fallback

Force `NODE_ENV=production` with no Supabase to run only 1 worker.

**Correctness:** ✅ Perfect — single process = single source of truth. No stale reads, no write conflicts.

**Multi-worker safety:** ❌ Disabled — but that's the point.

**Performance:** ⚠️ Single-threaded event loop for all requests. Acceptable for small-medium traffic; breaks at high concurrency.

**Complexity:** Very low. One-line change: `const numCPUs = supabaseUrl ? os.cpus().length : 1;`

**Failure behavior:** If the single process crashes, the primary restarts it. No stale state from siblings (there are none). `store.json` is always authoritative.

**Recovery:** Restart loads `store.json` — full state recovery.

**Implementation impact:** Minimal — one guard in `server/index.js`. No changes to supabase.js, routes, or locks.

**Operational:** Operators must understand that local fallback caps at one worker. Document prominently.

**Compatibility:** 100% backward compatible. Supabase mode unchanged.

---

### OPTION B: Primary-Process Mutation Owner (IPC Commands)

Primary process (cluster master) owns all localStore mutations. Workers send mutation commands via IPC.

**Correctness:** ✅ Good — single writer eliminates conflicts.

**Multi-worker safety:** ✅ Worker isolation with authoritative primary.

**Performance:** ⚠️ Every mutation crosses IPC boundary. Acceptable for low-frequency writes (orders, user updates); heavy for high-frequency (product list updates, cart operations). Bottleneck at primary.

**Complexity:** High. Requires: IPC protocol, serialization, request/response queuing, error forwarding, timeout handling. Touches every mutation method in `db`.

**Failure behavior:** If primary dies, all workers lose write capability. Cluster manager restarts primary; during restart window all writes fail.

**Recovery:** Primary loads `store.json` at restart — consistent state.

**Implementation impact:** Major rewrite of `db` mutation layer + primary IPC handler + worker stubs.

---

### OPTION C: Fresh-Read-Before-Mutate + Conditional Write

Workers re-read `store.json` after acquiring the lock, merge, and write.

**Correctness:** ⚠️ Partial — solves issue for single-key mutations but still has TOCTOU gaps for multi-key operations (e.g., order checkout reads stock + writes order).

**Multi-worker safety:** ⚠️ Fragile — lock window covers the write but not the read-validate-mutate cycle. Two workers can both read stock=1, both pass validation, one writes first, the second still writes.

**Complexity:** Medium. Modify `saveStoreToDisk` to re-read before write, or add `refreshFromDisk()` that must be called before mutation.

**Failure behavior:** Stale reads still possible during the window between disk read and lock acquisition.

**Recovery:** Each write forces a fresh read — auto-healing.

**Implementation impact:** Moderate changes to `saveStoreToDisk` and mutation callers.

---

### OPTION D: Shared External Persistence (SQLite, etc.)

Add a lightweight embedded database (better-sqlite3, SQL.js) for local fallback.

**Correctness:** ✅ Excellent — WAL-mode SQLite gives ACID, concurrent readers, single writer.

**Multi-worker safety:** ✅ Multiple workers can read while one writes (WAL mode). Row-level locking. True ACID.

**Performance:** ✅ Very good — SQLite handles high read concurrency. Writes serialize but at microsecond scale.

**Complexity:** Medium-High. Need to: add dependency, migrate `localStore` Map to SQL tables, rewrite all `db` methods, handle migrations, handle cluster-aware WAL.

**Failure behavior:** SQLite is crash-safe with WAL journal. Power loss during write = auto-rollback on next open.

**Recovery:** Automatic.

**Implementation impact:** Large — rewrites the entire local persistence layer. But yields a production-grade local DB.

**Operational:** One file (`store.db`), no server to manage. Single dependency (`better-sqlite3`).

---

### OPTION E: Hybrid — Option A + Optional D Upgrade Path

Phase 1 (now): Force single-process mode (Option A) for local fallback. This is the only safe topology for the current architecture.

Phase 2 (future): If horizontal scaling becomes needed in local mode, migrate to SQLite (Option D). The migration path is clean: replace `localStore.get/set` with SQL queries, keep the `db` facade intact, no API changes.

**Correctness:** Phase 1 is perfect; Phase 2 is excellent.

**Multi-worker safety:** Phase 1 disables multi-worker; Phase 2 enables it safely.

**Complexity:** Phase 1: trivial. Phase 2: significant but isolated.

**Implementation impact:** Phase 1: one-line change. Phase 2: rewrite persistence layer behind existing `db` facade.

---

## 7. Cart / Wishlist Special Analysis

### Cart
- Cart is user-specific (`cart:${userId}` keyed).
- In local mode, cart mutations are write-through to `localStore` + `saveStoreToDisk()`.
- Cart reads go through `localStore.get()` — stale across workers.
- **User affinity:** In practice, HTTP keep-alive + OS connection distribution means the same user's requests tend to hit the same worker for the duration of a session. This reduces (but does not eliminate) the cross-worker stale-cart problem.
- **Consistency requirement:** Cart state must be consistent for the user's session. A stale cart read after the user just added an item is a UX bug. With single-process (Option A), this is guaranteed. With multi-worker, it's probabilistic.
- **Guest sessions:** `req.headers['x-session-id']` — no user affinity guarantee. Guest carts are particularly vulnerable.
- **Recommendation:** Cart does not require its own consistency mechanism. It inherits safety from the single-process enforcement.

### Wishlist
- Same keying (`wishlist:${userId}`), same persistence path.
- Lower stakes — wishlist is read-only display after mutation.
- A stale wishlist read is a minor UX annoyance, not a data-loss risk.
- **Recommendation:** No special treatment needed. Safe under single-process.

### Login/Register
- User creation is a mutation to `localStore` + `saveStoreToDisk()`.
- Stale user data means: new registration is invisible to other workers, password changes don't propagate.
- **This is the second-most-critical consistency requirement after stock.**
- **Recommendation:** Fixed by single-process enforcement.

---

## 8. Orders / Stock Analysis (P1-01 Interaction)

P1-01 implemented `processOrderCheckoutLocal()` — an atomic checkout that:
1. Validates items and aggregates duplicate lines
2. Checks stock against `localStore` (in-memory)
3. Deducts stock in `localStore`
4. Creates order in `localStore`
5. Calls `saveStoreToDisk()` once

**In single-process mode (Option A):** This is safe and correct. Single writer = no race conditions. The in-process queue + cross-process lock (which is a no-op for single process) = perfectly serialized.

**In multi-worker mode (current):** The atomic checkout is only atomic within ONE worker. A second worker's checkout operates on its own stale copy and can oversell. The cross-process lock only prevents file corruption during the final `saveStoreToDisk()` — it does NOT prevent two workers from both validating stock=1 and both creating orders.

**The P1-01 design spec explicitly calls for single-process safety for local mode** (it says "single-process local mode / serialized mutation"). The current code does not enforce this — it forks N workers regardless.

**Recommendation:** P1-02 does not need to add anything to P1-01. The fix is at the topology level: restrict to 1 worker for local fallback. This makes P1-01's existing atomic checkout fully correct.

---

## 9. Reviews Analysis

`localReviews` is a module-level `Map` in `server/routes/reviews.js` (line 9). It is:
- **Never persisted to disk** — reviews are lost on any process restart.
- **Never synced across workers** — each worker has its own independent review set.
- **Never refreshed** — once created, reviews exist until the worker dies.

**Impact:**
- User posts review on Worker A → Worker B never sees it → inconsistent review counts.
- Worker restart → all in-memory reviews lost.
- Rating aggregation is worker-local and inconsistent.

**Severity:** MEDIUM — reviews are not transactional (no money at stake), but data loss on restart is a real user pain point.

**Recommendation:** Reviews should be persisted to `localStore` (and thus `store.json`) in the same way as orders/carts. This is a pre-existing bug independent of the P1-02 cluster issue, but the cluster makes it visible as inconsistency across workers.

---

## 10. Rate Limiter Analysis

Uses `express-rate-limit` with default in-memory store. Configuration:
- General: 1,000 req/min per IP
- Auth: 30 req/min per IP
- Admin: 2,000 req/min per IP

**Per-worker behavior:** Each worker maintains its own hit counter for each IP. With N workers, a single IP can make N× the configured limit by distributing requests across workers. Example: 4 workers × 30 auth attempts/min = 120 attempts/min actual, not 30.

**Severity:** MEDIUM — rate-limit bypass for auth endpoints is a security concern. For general API, 1,000×N = already very high.

**Status:** This is documented as P1-03 (separate finding). P1-02 only needs to note the interaction: multi-worker mode amplifies the rate-limit bypass by factor N. Single-process enforcement (Option A) eliminates the amplification but doesn't fix the underlying rate-limit architecture.

---

## 11. Security Analysis

### Authorization Inconsistencies
- **Risk:** Stale user records mean role changes, password resets, and account deactivations may not propagate.
- **Verified:** Yes — `findUserByEmail` reads from `localStore`, never from disk after init.
- **Impact:** A deactivated admin account could still have access on a worker that hasn't seen the update.

### Cart Ownership Confusion
- **Risk:** Two users with similar session IDs could theoretically collide in a multi-worker setup.
- **Verified:** LOW — cart keys are specific (`cart:${userId}`), and session IDs are UUIDs.
- **Impact:** Negligible.

### Order Visibility
- **Risk:** Admin on Worker A creates order visible on Worker A but not Worker B.
- **Verified:** Yes — `getOrders` reads from `localStore`. New orders are invisible to sibling workers.
- **Impact:** Admin dashboard is inconsistent across workers.

### Rate-Limit Bypass
- **Risk:** As analyzed in Section 10 — per-worker counters allow N× limit bypass.
- **Impact:** Brute-force auth attacks can scale linearly with worker count.

### Security Policy Divergence
- **Risk:** Environment variables are shared across workers (loaded at process start). No divergence.
- **Impact:** None.

---

## 12. Recommended Architecture Direction

### Primary Recommendation: OPTION A (Single-Process Enforcement)

```javascript
// server/index.js — change line 28
const numCPUs = (supabaseUrl && process.env.NODE_ENV === 'production')
  ? os.cpus().length
  : 1;
```

**Rationale:**
1. The current architecture has fundamental stale-read and write-overwrite flaws in multi-worker mode that cannot be incrementally patched — they require a distributed consistency protocol or a shared database, neither of which exists.
2. Local JSON fallback is a development/lightweight-deployment mode. It should not pretend to be a distributed database.
3. Single-process eliminates every failure scenario in Section 4 with a one-line change.
4. The cross-process lock, atomic write, and in-process queue remain fully functional and still provide crash-safety.
5. No API changes. No test changes. No behavioral changes except topology.

### Authority Boundary

```
┌─────────────────────────────────────────┐
│           SINGLE WORKER                 │
│                                         │
│  localStore (Map) ─── Authoritative     │
│       │                                 │
│       ├─ saveStoreToDisk()              │
│       │   └─ queue → lock → write →     │
│       │      rename (atomic)            │
│       │                                 │
│       └─ loadStoreFromDisk()            │
│           (only at startup)             │
│                                         │
│  localReviews (Map) ─── Non-persistent  │
│  rateLimiter         ─── Per-process    │
└─────────────────────────────────────────┘
```

### Mutation Path
1. Route handler calls `db.someMethod()`
2. `db` method reads from `localStore`
3. `db` method validates, mutates, calls `localStore.set()`
4. `db` method calls `saveStoreToDisk()` (serialized in-process queue)
5. `saveStoreToDisk()` snapshots entire `localStore` → atomic write

### Read Path
1. Route handler calls `db.someMethod()`
2. `db` method calls `localStore.get(key)` — in-memory, no disk I/O

### Worker Behavior
- Single worker handles all HTTP requests.
- If worker crashes, primary restarts it within 1 second.
- New worker loads `store.json` — full state recovery from last persisted snapshot.
- During the restart window (~1s), requests fail with connection refused.

### Restart Behavior
- Graceful shutdown (SIGTERM/SIGINT): closes HTTP server, persists store, exits.
- Crash: `store.json` has the last successful write. Restart loads it.
- Primary restart: all workers die, primary re-forks → fresh load.

### Lock Strategy
- Cross-process lock remains for defense-in-depth (future multi-worker if SQLite is added).
- In-process queue remains for serialized persistence.
- No new locking needed.

---

## 13. Migration Plan

### Phase 0 — Characterization (THIS DOCUMENT)
- [x] Trace current architecture
- [x] Inventory all shared state
- [x] Analyze all failure scenarios
- [x] Compare architecture options
- [x] Deliver design document

### Phase 1 — Enforcement (IMPLEMENTATION)
**Scope:** `server/index.js` line 28 — add `? os.cpus().length : 1` guard.

**Expected result:** Multi-worker local fallback impossible. Supabase mode unaffected.

**Rollback:** Revert the one-line change.

**Implementation:** Next task (P1-02-IMPL).

### Phase 2 — Mutation Synchronization (OUT OF SCOPE)
Not needed after Phase 1 enforcement. Only relevant if future SQLite migration.

### Phase 3 — Stale-State Validation (OUT OF SCOPE)
Not needed after Phase 1 enforcement.

### Phase 4 — Concurrency Testing
**Scope:** Isolated test that starts the app in local-only mode, verifies only 1 worker, verifies correct behavior.

### Phase 5 — Deployment Verification
- Verify production cluster config.
- Verify Supabase-configured deployments are NOT affected.
- Run full regression suite.

### Phase 6 — Rollback
- Revert `server/index.js` line 28 change.
- No data migration needed.

---

## 14. Test Plan

### Required Tests (for implementation phase)

| Test ID | Description | Verifies |
| :--- | :--- | :--- |
| T1 | Start server with `SUPABASE_URL=''` and `NODE_ENV=production` | Exactly 1 worker is running |
| T2 | Start server with `SUPABASE_URL=configured` and `NODE_ENV=production` | N workers are running (full CPU count) |
| T3 | Two concurrent checkouts for last stock unit | Only 1 succeeds (single-worker, no race) |
| T4 | Mutate data, kill worker, restart | Data survives restart via `store.json` |
| T5 | Full regression suite (Phase 1/2/3, SCA suites) | All pass |
| T6 | `npm run build` | Build passes |
| T7 | ESLint on changed files | Clean |

---

## 15. Operational Requirements

1. **Documentation:** Warn prominently in README that local fallback mode runs single-process.
2. **Log message:** At startup, log: `"Local-only mode: running single worker for data consistency."`
3. **Environment check:** If `NODE_ENV=production` and `!SUPABASE_URL` and user tries to force `WORKERS=4`, log a warning and enforce single worker.
4. **Health check:** `/api/status` already reports PID — verify single PID in local mode.

---

## 16. Open Questions

1. **Should `localReviews` be persisted?** Currently lost on restart. Recommend persisting to `localStore` (separate task — not P1-02 scope).
2. **Should stale-lock timeout be configurable?** Currently hardcoded at 10s. Acceptable for now.
3. **Future SQLite migration priority?** Would enable multi-worker local mode. Low priority — Supabase is the production path.

---

## 17. Implementation Boundaries

What P1-02 IMPLEMENTATION (next task) is allowed to touch:
- `server/index.js` line 28 — worker count guard
- Logging/startup messages
- Isolated test file(s) in `scratch/p1-02/`

What remains OFF-LIMITS:
- `server/lib/supabase.js`
- `server/routes/orders.js`
- `server/data/store.json`
- `server/routes/reviews.js`
- Supabase logic, Cart, Wishlist, Auth, SCA-3
- Dependencies, migrations

---

## Verification Record

| Check | Value |
| :--- | :--- |
| `store.json` MD5 | `34e2394b5c02a873ee55841d332baec6` |
| Production code modified | **NONE** |
| Store mutated | **NO** |
| Test records created | **NONE** |
| Dependencies added | **NONE** |
| Runtime topology changed | **NO** (design only) |