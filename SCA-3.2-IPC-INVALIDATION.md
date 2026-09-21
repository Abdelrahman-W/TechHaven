# SCA-3.2 CLUSTER IPC CACHE INVALIDATION REPORT

**Status:** ✅ **COMPLETED & FULLY VERIFIED**  
**Architecture:** Node.js Native Cluster IPC Broadcast Invalidation  
**Primary Test Suite:** `scratch/test_sca3_2.mjs` (55 Passed, 0 Failed)  
**Database Integrity:** `server/data/store.json` MD5 `34e2394b5c02a873ee55841d332baec6` (Unchanged)

---

## 1. Architecture & Design Overview

TechHaven utilizes a multi-core Node.js cluster in production (`cluster.fork()` managed by the primary process in `server/index.js`). While each worker process maintains an in-memory `Map` cache for ultra-fast, zero-overhead response serving, mutations performed by one worker previously left sibling workers with stale in-memory cached responses until TTL expiration.

**SCA-3.2** implements a robust, lightweight, and zero-external-dependency cache invalidation mechanism using native Node.js Cluster Inter-Process Communication (IPC).

```
   ┌─────────────────────────────────────────────────────────┐
   │                     Primary Process                     │
   │               (setupPrimaryCacheIPC)                    │
   │   - Listens for CACHE_INVALIDATE from mutating worker   │
   │   - Filters active, connected sibling workers           │
   │   - Broadcasts IPC event (Excluding Origin Worker)      │
   └─────────────────▲─────────────────────┬─────────────────┘
                     │ (process.send)      │ (worker.send)
         [Mutation Event]                  │ [Broadcast Event]
                     │                     ▼
   ┌─────────────────┴────────┐   ┌──────────────────────────┐
   │     Worker 1 (Origin)    │   │    Worker 2 (Sibling)    │
   │ - Mutates Catalog/Data   │   │ - Receives IPC Message   │
   │ - Evicts Local Cache     │   │ - Evicts Local Cache     │
   │ - Emits IPC to Primary   │   │ - No Echo / No Loop      │
   └──────────────────────────┘   └──────────────────────────┘
```

---

## 2. Invalidation Event & Message Protocol

The IPC message contract is strictly internal, minimal, and non-persisted:

```typescript
interface CacheInvalidationMessage {
  type: 'CACHE_INVALIDATE';
  scope: 'products' | 'categories' | 'settings' | string;
  pattern: string;
  sourceWorkerId: number | string;
}
```

### Key Protocol Guarantees:
- **Directionality:** Worker $\to$ Primary $\to$ Sibling Workers.
- **Echo Suppression:** The primary process compares `targetWorker.id !== sourceWorkerId` to ensure the mutating worker never receives an echo of its own event.
- **Loop Prevention:** Workers executing invalidation from IPC flag `{ fromIPC: true }`, ensuring received messages are NEVER re-sent to the primary process.
- **Malformed Payload Rejection:** Both primary and worker handlers validate message structure, data types, and non-empty strings before processing. Any malformed payload is dropped silently without throwing.

---

## 3. Scope & Granularity Model

Invalidations are granular and strictly scoped to affected data paths. Blind cache flushing (`clearAllCache`) is avoided:

| Scope | Trigger Endpoints / Actions | Invalidation Target | Preserved Caches |
|---|---|---|---|
| `products` | `POST /api/products` (Create)<br>`PUT /api/products/:id` (Update)<br>`DELETE /api/products/:id` (Delete)<br>`POST /api/products/:id/review` (Review) | `/api/products` (all catalog keys & sub-queries) | `/api/categories`, `/api/settings` |
| `categories` | `POST /api/categories`<br>`PUT /api/categories/:id`<br>`DELETE /api/categories/:id` | `/api/categories` | `/api/products`, `/api/settings` |
| `settings` | `PUT /api/settings` | `/api/settings` | `/api/products`, `/api/categories` |

---

## 4. Fault Tolerance & Edge Case Defenses

1. **Non-Cluster / Single Process Safe:**
   When running in development, unit tests, or single-process mode (`cluster.isWorker` is false or `process.send` is undefined), `invalidateCache` operates purely locally without throwing or attempting IPC calls.
2. **Worker Exit / Crash During Broadcast:**
   The primary broadcast handler checks `targetWorker.isConnected()` and `!targetWorker.isDead()` and wraps `targetWorker.send()` in `try...catch` blocks to seamlessly handle workers exiting or dying mid-broadcast.
3. **Worker Startup & Re-forking:**
   When a new worker is forked by the primary, its in-memory cache begins clean and empty ($0$ keys), naturally eliminating any stale data.
4. **Duplicate Events:**
   Evicting an already-deleted key in JavaScript's `Map` is an idempotent no-op ($O(1)$).
5. **Mutation Resiliency:**
   Any hypothetical IPC failure is swallowed inside a `try...catch` and logged/handled without ever aborting or throwing in the underlying business transaction.

---

## 5. Verification & Test Matrix (`scratch/test_sca3_2.mjs`)

A comprehensive test suite of 55 tests across 5 groups was executed and verified:

```
====================================================
🔄 RUNNING SCA-3.2 CLUSTER IPC INVALIDATION SUITE
====================================================

--- TEST GROUP 1: Primary Broadcast & Protocol Unit Tests ---
  ✅ PASS: Origin Worker 1 does NOT receive echo broadcast
  ✅ PASS: Sibling Worker 2 received broadcast
  ✅ PASS: Broadcast message has type CACHE_INVALIDATE
  ✅ PASS: Broadcast message has correct scope
  ✅ PASS: Broadcast message has correct pattern
  ✅ PASS: Broadcast message includes origin worker id
  ✅ PASS: Disconnected Worker 3 skipped safely
  ✅ PASS: Dead Worker 4 skipped safely
  ✅ PASS: Worker 5 socket error swallowed safely without crashing Primary
  ✅ PASS: Malformed/unknown messages safely ignored without secondary broadcasts
  ✅ PASS: Dummy server cached 2 routes (size: 2)
  ✅ PASS: Worker IPC message invalidated only /api/products cache
  ✅ PASS: Malformed worker IPC message handled safely without error
  ✅ PASS: Primary handled 50 rapid sequential invalidations successfully

--- TEST GROUP 2: Scope & Granularity Model ---
  ✅ PASS: Populated cache with products, categories, settings (size 3)
  ✅ PASS: Invalidating products scope removed 1 entry (products)
  ✅ PASS: Categories cache remained HIT
  ✅ PASS: Settings cache remained HIT
  ✅ PASS: Invalidating categories scope removed 1 entry
  ✅ PASS: Settings cache still HIT
  ✅ PASS: Invalidating settings scope left cache empty

--- TEST GROUP 3: HTTP Route Mutation Triggers & Method Safety ---
  ✅ PASS: First GET /api/products is MISS
  ✅ PASS: Second GET /api/products is HIT
  ✅ PASS: POST review succeeded
  ✅ PASS: Subsequent GET /api/products is MISS after review mutation
  ✅ PASS: Repopulated GET /api/products is HIT
  ✅ PASS: PUT /api/products/:id succeeded
  ✅ PASS: Subsequent GET /api/products is MISS after product update
  ✅ PASS: POST /api/products succeeded
  ✅ PASS: Subsequent GET /api/products is MISS after product creation
  ✅ PASS: DELETE /api/products/:id succeeded
  ✅ PASS: Subsequent GET /api/products is MISS after product deletion
  ✅ PASS: First GET /api/categories is MISS
  ✅ PASS: Second GET /api/categories is HIT
  ✅ PASS: POST /api/categories succeeded
  ✅ PASS: GET /api/categories is MISS after category creation
  ✅ PASS: First GET /api/settings is MISS
  ✅ PASS: Second GET /api/settings is HIT
  ✅ PASS: PUT /api/settings succeeded
  ✅ PASS: GET /api/settings is MISS after settings update

--- TEST GROUP 4: SCA-3.1 Route Guards & Observability Preserved ---
  ✅ PASS: GET /api/cart returns X-Cache: BYPASS
  ✅ PASS: GET /api/wishlist returns X-Cache: BYPASS
  ✅ PASS: GET /api/auth/me returns X-Cache: BYPASS
  ✅ PASS: GET /api/orders returns X-Cache: BYPASS
  ✅ PASS: GET /api/admin/stats returns X-Cache: BYPASS
  ✅ PASS: GET /api/products with Authorization header returns X-Cache: BYPASS

--- TEST GROUP 5: End-to-End Real Multi-Worker Cluster Process Verification ---
  Worker 1 listening on port 60640, Worker 2 listening on port 60641
  ✅ PASS: Worker 1 initial GET is MISS
  ✅ PASS: Worker 1 second GET is HIT
  ✅ PASS: Worker 2 initial GET is MISS
  ✅ PASS: Worker 2 second GET is HIT
  ✅ PASS: Worker 1 successfully executed mutation
  ✅ PASS: Worker 1 local cache was invalidated (MISS)
  ✅ PASS: Worker 2 cache was invalidated via IPC broadcast from Primary (MISS)
  ✅ PASS: Worker 1 subsequent request is HIT
  ✅ PASS: Worker 2 subsequent request is HIT

====================================================
SCA-3.2 TEST SUMMARY: 55 PASSED, 0 FAILED (TOTAL: 55)
====================================================
```

---

## 6. Regression & Integrity Verification

1. **SCA-1 Suite:** `node scratch/test_sca1.mjs` $\to$ **Passed**
2. **SCA-2 Suite:** `bash scratch/sca2/run-sca2.sh` $\to$ **Passed**
3. **SCA-3.1 Suite:** `node scratch/test_sca3_1.mjs` $\to$ **Passed**
4. **SCA-3.2 Suite:** `node scratch/test_sca3_2.mjs` $\to$ **Passed (55/55)**
5. **ESLint:** Zero warnings/errors across all touched server code.
6. **Frontend Build:** `npm run build` completed successfully.
7. **Database Hash:** `server/data/store.json` MD5 hash remains `34e2394b5c02a873ee55841d332baec6`.
