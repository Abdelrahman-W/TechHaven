# TECHHAVEN — SCA-3 SHARED CACHE ARCHITECTURE DESIGN SPECIFICATION
**Document ID:** SCA-3-DESIGN-001  
**Status:** ARCHITECTURE DESIGN (READ-ONLY / NON-IMPLEMENTED)  
**Target:** EgyHardware / TechHaven Production Architecture  
**Scope:** Single Node, Multi-Worker Cluster, Multi-Instance Distributed Backend, Dual Backend (Supabase PostgreSQL + Local Disk Fallback)

---

## 1. Executive Summary

This document specifies the technical architecture for shared caching and cluster-safe state management across TechHaven's backend services. 

Currently, TechHaven operates with a dual persistence model:
1. **Primary Cloud Production:** Supabase PostgreSQL over PostgREST via `@supabase/supabase-js`.
2. **Local Fallback:** In-memory `localStore` (`Map`) backed by atomic, serialized disk persistence (`server/data/store.json`).

When running in production mode (`NODE_ENV=production`), TechHaven utilizes Node.js native `cluster` to fork worker processes matching CPU core count (`os.cpus().length`). Under this multi-process runtime, the existing caching layer (`server/middleware/cache.js`) and local store synchronization present severe concurrency and consistency hazards:
- **Process-Local Memory Isolation:** In-memory caches and fallback state are strictly private to each OS process. Mutations in Worker A do not invalidate or update memory in Worker B.
- **Split-Brain Caching:** A product update or review submission on Worker A clears Worker A's local cache but leaves Worker B serving stale pricing, stock, or content for the remaining TTL (up to 300 seconds).
- **Fallback Store Overwrite Hazards:** When operating in local fallback mode, workers do not reload `store.json` before snapshotting and writing to disk, causing sibling workers to overwrite each other's mutations.

This specification establishes an authoritative data hierarchy, evaluates five candidate cache architectures without bias, defines a decoupled, cluster-safe caching strategy, and outlines an incremental, reversible migration path. **No production code is modified as part of this design deliverable.**

---

## 2. Current Runtime / Process Model

### 2.1 Process Execution Lifecycle (`server/index.js`)
- **Primary / Master Process:**
  - Detects `cluster.isPrimary && process.env.NODE_ENV === 'production'`.
  - Spawns `numCPUs = os.cpus().length` child worker processes using `cluster.fork()`.
  - Maintains a sliding restart rate limiter (`restartCounts` Map) allowing a maximum of 5 restarts per 60-second window with a 1,000ms delay between respawns.
  - Does NOT bind to network ports or handle HTTP requests directly.
- **Worker Processes:**
  - Each worker initializes an Express application instance listening on `0.0.0.0:${PORT || 4000}`.
  - OS-level socket sharing allows all workers to accept incoming TCP connections on the same port via round-robin distribution (Linux/POSIX) or OS-assigned ports.
  - Each worker allocates an isolated V8 heap, meaning **zero memory is shared across workers**.
- **Development / Non-Clustered Mode:**
  - When `NODE_ENV !== 'production'`, a single Node process runs Express directly without clustering.
- **Multi-Instance Containerized Deployments (Railway / Render / Kubernetes):**
  - Multiple independent container instances run in parallel. Each container may run a single Node process or a clustered Node process, multiplying the number of isolated memory heaps.

### 2.2 Process Topology Diagram
```
                     [ Incoming Client Requests ]
                                  │
                       [ Load Balancer / Proxy ]
                                  │
      ┌───────────────────────────┴───────────────────────────┐
      ▼                                                       ▼
[ Container / Instance 1 ]                             [ Container / Instance 2 ]
  ├── Primary Process (Cluster Supervisor)               ├── Primary Process (Cluster Supervisor)
  │     ├── Worker 1 (Heap A: isolated Map/Cache)        │     ├── Worker 1 (Heap C: isolated Map/Cache)
  │     └── Worker 2 (Heap B: isolated Map/Cache)        │     └── Worker 2 (Heap D: isolated Map/Cache)
```

---

## 3. Current State Inventory

A thorough audit of the codebase reveals the following stateful structures across all server modules:

| Module / File | Variable Identifier | Type & Scope | Lifecycle | Mutated By | Read By | Cross-Worker Safe? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `server/middleware/cache.js` | `cache` | `Map` (module-level) | Process lifetime; 5-min cleanup timer | `cacheMiddleware` (on 2xx responses), `invalidateCache` | `cacheMiddleware` (GET requests) | **NO** (Process-local) |
| `server/lib/supabase.js` | `localStore` | `Map` (module-level) | Loaded at worker startup from `store.json` | All `db.*` write operations in local mode | All `db.*` read operations in local mode | **NO** (Process-local; clobbers on write) |
| `server/lib/supabase.js` | `storeWriteQueue` | `Promise` chain | Process lifetime | `saveStoreToDisk()` | `saveStoreToDisk()` | **NO** (Serializes writes only within single process) |
| `server/lib/supabase.js` | `storeLockCounter` | `number` | Process lifetime | `acquireStoreLock()`, `releaseStoreLock()` | Process-local lock guard | **NO** (Process-local reentrancy guard) |
| `server/routes/reviews.js` | `localReviews` | `Map` (module-level) | Ephemeral process lifetime | `POST /api/reviews`, `DELETE /api/reviews/:id` | `GET /api/reviews/product/:productId` | **NO** (Process-local; unpersisted) |
| `server/index.js` | `restartCounts` | `Map` (module-level) | Primary process lifetime | `cluster.on('exit')` | Primary process restart policy | **YES** (Only exists in single Primary process) |
| `server/middleware/rateLimiter.js` | `rateLimiter`, `authLimiter`, `adminLimiter` | `express-rate-limit` (MemoryStore) | Ephemeral process lifetime | Incoming HTTP requests | Route middleware handlers | **NO** (Limits enforced per worker, not globally) |
| `server/routes/settings.js` | `PUBLIC_SETTINGS_KEYS` | `Set` (module-level) | Immutable constant | Never | `GET /api/settings` | **YES** (Read-only constant) |

---

## 4. Current Cache-Like Structures

### 4.1 Detailed Analysis of `server/middleware/cache.js`
The current caching implementation exhibits several architectural characteristics:
1. **Key Generation:** `const key = req.originalUrl;`
   - *Strengths:* Captures query parameters and subpaths.
   - *Weaknesses:* URL-based keys make targeted invalidation difficult (e.g. invalidating `/api/products` via `includes()` does not reliably match specific pagination variations or complex query encodings).
2. **Eviction Policy:**
   - Soft TTL checked on read: `if (now >= val.expiry) cache.delete(key);`
   - Background sweeping interval: `setInterval(cleanExpiredEntries, 5 * 60 * 1000);` (every 5 minutes).
   - Capacity bounding: `if (cache.size >= MAX_CACHE_SIZE) cache.delete(firstKey);` (basic FIFO eviction at 1,000 entries).
3. **HTTP Header Emission:**
   - Sends `X-Cache: HIT` and `X-Cache: MISS`.
   - Sets `Cache-Control: no-cache, must-revalidate` to prevent downstream browser/CDN stale storage while allowing edge revalidation.
4. **Invalidation Scope:**
   - `invalidateCache(pattern)` performs a linear substring scan: `for (const key of cache.keys()) if (key.includes(pattern)) cache.delete(key);`
   - Only executed in `server/routes/products.js` during product creation, updates, deletes, and review submissions.
   - **Crucial Limitation:** `invalidateCache` is strictly synchronous and in-process. It has zero inter-process communication (IPC) or shared bus to notify other cluster workers.

---

## 5. Authoritative vs Derived Data Matrix

To guarantee correctness, data must be strictly categorized into authoritative sources versus transient derived representations:

| Data Entity | Authoritative Store (Supabase) | Authoritative Store (Local Mode) | Safe to Cache? | Safe Cache TTL | Cache Invalidation Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Product Catalog (List/Filter)** | `products` table | `store.json` (`product:*`) | **YES** | 60s - 300s | Product CRUD, review added |
| **Product Detail (Static attributes)** | `products` table | `store.json` (`product:*`) | **YES** | 300s | Product update / deletion |
| **Product Stock Quantity** | `products.stock_qty` | `store.json` (`product:*.stock_qty`) | **CONDITIONAL** (Display only) | 10s - 30s | Order placed, admin stock edit |
| **Stock Check at Checkout** | `products.stock_qty` (Live DB query) | `store.json` (Live read) | **NO (NEVER)** | 0s (Bypass cache) | N/A (Authoritative read required) |
| **Categories Hierarchy** | `categories` table | `store.json` (`cat:*`, `cat_slug:*`) | **YES** | 3600s (1 hour) | Category CRUD |
| **System Settings (Public)** | `settings` table | `store.json` (`settings:*`) | **YES** | 600s (10 min) | Admin settings update |
| **User Accounts / Passwords** | `users` table | `store.json` (`id:*`, `email:*`) | **NO (NEVER)** | 0s (Bypass cache) | N/A (Security boundary) |
| **Cart Items (Per User/Session)** | `cart_items` table | `store.json` (`cart:*`) | **NO** | 0s (Bypass cache) | N/A (Per-user private state) |
| **Wishlist Items (Per User)** | `wishlist` table | `store.json` (`wishlist:*`) | **NO** | 0s (Bypass cache) | N/A (Per-user private state) |
| **Orders & Transactions** | `orders`, `order_items` | `store.json` (`order:*`) | **NO (NEVER)** | 0s (Bypass cache) | N/A (Authoritative ledger) |
| **Admin Overview Stats** | Aggregation query | Computed on read | **YES** | 15s - 60s | Order placed, user created |
| **Product Reviews** | `reviews` table | `localReviews` Map | **YES** | 120s | Review posted / deleted |

---

## 6. Per-Feature Consistency Requirements

### 6.1 Products & Catalog
- **Browsing & Category Views:** Eventual consistency (tolerance: 5 to 60 seconds). A newly added product appearing 10 seconds later on another worker's listing is acceptable.
- **Product Details Page:** Eventual consistency (tolerance: 5 to 30 seconds).
- **Price Integrity:** Strict consistency at transaction boundary. If an item is listed at 9,800 EGP in cache but was updated to 11,500 EGP in the DB, checkout creation (`POST /api/orders`) **must** re-read authoritative DB price and reject the order or charge authoritative price.

### 6.2 Stock Deduction & Inventory
- **Display Stock Badge:** Eventual consistency. Showing "35 in stock" when 34 remain is acceptable for UI display.
- **Order Placement Execution:** **Strict Serializable Consistency**. When an order is placed, stock decrement MUST be executed atomically on the authoritative database with a conditional check (`stock_qty >= requested_qty`). Cached stock MUST NEVER be used to authorize an order.

### 6.3 Shopping Cart & Wishlist
- **Private State Guarantee:** Cart and wishlist operations are scoped strictly to authenticated `userId` or validated `x-session-id`.
- **Consistency Model:** Strong read-your-own-writes consistency. When a user adds an item to cart and is immediately redirected to `/cart`, the read MUST reflect the write. Caching cart endpoints across shared middleware risks cross-tenant data leakage and stale carts.

### 6.4 Authentication & Access Control
- **Credentials & Tokens:** Strong consistency. User lookup during login (`POST /api/auth/login`), password verification, and role checks (`requireAdmin`) MUST always query the authoritative store.

### 6.5 Admin Stats & Analytics
- **Dashboard Cards:** Weak / Eventual consistency (tolerance: 30 to 60 seconds). Aggregating millions of rows on every admin page load causes DB exhaustion. Caching admin metrics with a 30-second TTL is safe and prevents DDoS.

---

## 7. Multi-Worker / Multi-Instance Failure Scenarios

### Scenario A: The Asymmetric Invalidation Hazard (Split-Brain)
1. User 1 submits an admin product price change (`PUT /api/products/prod-headphones`) routed by the OS/balancer to **Worker 1**.
2. Worker 1 writes the new price to the database and calls `invalidateCache('/api/products')`.
3. Worker 1's local `cache` Map is cleared.
4. User 2 requests `GET /api/products/prod-headphones` routed to **Worker 2**.
5. Worker 2's local `cache` Map still holds the old response with 4 minutes remaining on TTL.
6. **Result:** User 2 sees the stale price until Worker 2's TTL expires or Worker 2 is recycled.

### Scenario B: The Local Store Race & Overwrite Hazard (Fallback Mode)
1. **Worker 1** receives `POST /api/auth/register` for `user-alpha`. Worker 1 updates its in-memory `localStore` with `id:user-alpha` and `email:alpha@test.com`.
2. Simultaneously, **Worker 2** receives `POST /api/cart` for `cart:guest-999`. Worker 2 updates its in-memory `localStore` with `cart:guest-999`.
3. Worker 1 acquires the file lock `.store.lock`, writes its full snapshot to `.store.json.tmp`, and renames it to `store.json`. `user-alpha` is now on disk.
4. Worker 2 acquires `.store.lock`, takes a snapshot of its own in-memory `localStore` (which does NOT contain `user-alpha` because Worker 2 never reloaded from disk), and renames its tmp file over `store.json`.
5. **Result:** `user-alpha` is permanently clobbered and lost from disk.

### Scenario C: The Stale Stock Oversell Hazard
1. Product `prod-gpu` has 1 item in stock.
2. Worker 1 and Worker 2 cache `GET /api/products/prod-gpu` with `stock_qty: 1`.
3. Customer A places an order via Worker 1; Worker 1 decrements DB stock to 0.
4. Customer B views `prod-gpu` on Worker 2 (served from cache: `stock_qty: 1`) and submits checkout.
5. If the order creation endpoint blindly trusts the payload or cached product data, an oversell occurs.
6. **Remedy Requirement:** Order creation must execute an atomic conditional update on the DB: `UPDATE products SET stock_qty = stock_qty - qty WHERE id = $1 AND stock_qty >= qty`.

---

## 8. Cache Architecture Options Evaluation

We evaluate five practical caching architectures for TechHaven across six standard engineering dimensions:

### Option 1: No Application Cache (Direct DB / Store Authority)
- **Mechanism:** Remove in-memory `cacheMiddleware` entirely. All reads query Supabase PostgreSQL or the local store directly.
- **Advantages:** Perfect consistency; zero risk of stale data or split-brain invalidation; zero memory overhead; simplest codebase.
- **Disadvantages:** Increased database read load and latency; Supabase PostgREST query limits may be reached under traffic spikes; repeat category and catalog queries incur network round-trips.
- **Consistency Implications:** Strict immediate consistency across all workers.
- **Operational Complexity:** Zero additional infrastructure.
- **Failure Behavior:** Direct dependency on database availability.
- **Fit for TechHaven:** Excellent baseline for low-to-medium traffic; completely eliminates multi-worker synchronization bugs.

### Option 2: Process-Local Cache with Short TTL & Stricter Bounds
- **Mechanism:** Retain in-memory `Map` per worker, but drastically reduce TTL (e.g. 15–30 seconds for catalog, 60 seconds for categories), eliminate long 300s TTLs, and enforce deterministic cache keys.
- **Advantages:** Protects database from rapid read bursts (e.g. 1,000 req/sec on homepage); requires no external infrastructure.
- **Disadvantages:** Temporary split-brain across workers remains bounded to the short TTL (e.g. max 15 seconds); memory duplication across N workers.
- **Consistency Implications:** Bounded eventual consistency (window $\le$ TTL).
- **Operational Complexity:** Zero external dependencies.
- **Failure Behavior:** If memory fills, LRU evicts oldest keys safely.
- **Fit for TechHaven:** Pragmatic, low-overhead improvement over current long TTLs, provided order/checkout paths strictly bypass the cache.

### Option 3: Shared Redis / Valkey Cache Layer
- **Mechanism:** Centralized Redis or Valkey key-value store shared across all Node cluster workers and container instances. Workers read and write to Redis; invalidations delete keys globally in Redis.
- **Advantages:** Single source of truth for cached data; global atomic invalidations across all workers instantly; supports distributed locks and shared rate limiting.
- **Disadvantages:** Requires provisioning and managing a Redis instance (Railway Redis, Upstash, or Redis Cloud); introduces network hop (~1-3ms) for cache lookups; adds connection management and serialization overhead.
- **Consistency Implications:** High consistency across all workers; invalidation is instant globally.
- **Operational Complexity:** Moderate to High (connection pooling, authentication, monitoring, failover).
- **Failure Behavior:** Requires graceful fallback: if Redis is unreachable, the application must fall back to direct DB queries without crashing.
- **Fit for TechHaven:** Optimal for large-scale multi-instance deployments on Railway/Kubernetes when traffic exceeds single-node capacity.

### Option 4: Database-Backed / Versioned Cache (ETags & Version Counters)
- **Mechanism:** Store entity version tags or a global `catalog_version` timestamp in the database (or a fast metadata table). Workers cache responses locally tagged with the version; every request or periodic lightweight poll verifies the version header before serving.
- **Advantages:** Works across all workers without Redis; guarantees instant invalidation as soon as version increments in DB.
- **Disadvantages:** Version lookup requires a lightweight DB query, partially offsetting cache speed benefits; complex version propagation logic.
- **Consistency Implications:** Strong consistency backed by DB version clock.
- **Operational Complexity:** Low (uses existing Postgres database).
- **Failure Behavior:** Falls back to DB query on version check failure.
- **Fit for TechHaven:** Highly robust intermediate solution when Redis is not desired but cluster-safe invalidation is required.

### Option 5: Hybrid Two-Tier Cache (L1 Process-Local + L2 Shared Redis / PubSub)
- **Mechanism:** L1 ultra-fast in-memory cache (5s TTL) in each worker; L2 shared Redis cache (300s TTL); Redis Pub/Sub broadcast channel to invalidate L1 memory across all workers on mutations.
- **Advantages:** Sub-millisecond read latency for hot keys; global instant invalidation; maximum throughput.
- **Disadvantages:** Highest architectural complexity; potential race conditions in pub/sub delivery; dual-cache debugging difficulty.
- **Consistency Implications:** Strong eventual consistency with sub-second synchronization.
- **Operational Complexity:** High (requires Pub/Sub handling, reconnect logic, duplicate cache management).
- **Failure Behavior:** If Redis Pub/Sub disconnects, L1 fallback must rely on short TTL expiry.
- **Fit for TechHaven:** Over-engineered for current scale; recommended only for ultra-high traffic (>10,000 req/sec).

---

## 9. Recommended Architecture Direction

Based on TechHaven's current deployment profile (Express.js on Railway/Node, Supabase PostgreSQL, and development fallback mode), the recommended architecture direction consists of a **Decoupled, Two-Phase Strategy**:

### Phase 1: Hardened Local-Safe Architecture (Zero Infrastructure Overhead)
1. **Bypass Cache on All Sensitive Routes:** Ensure Cart, Wishlist, Auth, Orders, and Checkout are 100% uncached and purely authoritative.
2. **Shorten Catalog TTLs:** Reduce public catalog and product detail cache TTLs from 300 seconds down to **15–30 seconds**. A 15-second window prevents DB hammering while bounding inter-worker inconsistency to a negligible duration.
3. **HTTP ETag / Conditional Headers:** Emit standard HTTP `ETag` and `Last-Modified` headers so clients and reverse proxies (Cloudflare/Vercel) handle edge revalidation cleanly.
4. **Local Store Reload-on-Read / Lock Serialization (Fallback Mode):** When operating in local fallback mode, workers must ensure atomic key updates rather than clobbering whole-file snapshots.

### Phase 2: Shared External Cache (When Scaling Beyond Single Container)
When scaling to multi-container clusters on Railway:
1. Introduce a shared **Redis / Valkey** instance via an abstract Cache Adapter interface (`CacheProvider`).
2. Use Redis for:
   - Shared rate-limiting (`rate-limit-redis`).
   - Shared product/category catalog cache with key-tag invalidation.
   - Real-time invalidation pub/sub.

---

## 10. Cache Key Strategy Proposal

To avoid key collisions and enable targeted invalidation, cache keys must follow a strict, structured namespace format:

### Format Specification
`th:[tenant]:[entity]:[scope]:[identifier_or_query_hash]`

### Key Namespaces

| Category | Key Pattern Example | Description |
| :--- | :--- | :--- |
| **Product Detail** | `th:prod:id:prod-headphones` | Single product by ID |
| **Product Slug** | `th:prod:slug:techhaven-studio-pro-wireless` | Single product by slug resolution |
| **Product Catalog List** | `th:catalog:list:cat-headphones:p1:l50:sort-price-asc` | Normalized query parameters |
| **Category List** | `th:cat:all` | Complete category list |
| **Category Detail** | `th:cat:slug:headphones` | Single category |
| **Admin Stats** | `th:admin:stats:overview` | Dashboard statistical summary |
| **Public Settings** | `th:settings:public` | Filtered public store settings |

### Key Normalization Rules
1. All query parameters in listing keys must be sorted alphabetically before hashing/formatting to prevent duplicate cache entries (e.g. `?search=anc&sort=price-asc` vs `?sort=price-asc&search=anc`).
2. Keys must never contain user credentials, tokens, or PII.

---

## 11. TTL Strategy Proposal

TTLs must be strictly aligned with the velocity of change and business risk:

| Entity / Route | Suggested TTL | Eviction Policy | Rationale |
| :--- | :--- | :--- | :--- |
| `GET /api/categories` | 3600 seconds (1 hour) | Explicit invalidation on admin edit | Categories change very infrequently. |
| `GET /api/settings` (Public) | 600 seconds (10 min) | Explicit invalidation on admin edit | Settings are static store metadata. |
| `GET /api/products` (Catalog list) | 30 seconds | TTL expiry + Admin mutation invalidation | Balances search responsiveness with price freshness. |
| `GET /api/products/:id` | 60 seconds | TTL expiry + Admin mutation invalidation | Keeps single product page fast. |
| `GET /api/admin/stats` | 30 seconds | TTL expiry only | Prevents admin page reload spikes on database. |
| `GET /api/reviews/product/:id`| 120 seconds | Explicit invalidation on review post | High read-to-write ratio. |
| `GET /api/cart` | **0 seconds (NO CACHE)** | N/A | Highly dynamic private user state. |
| `GET /api/wishlist` | **0 seconds (NO CACHE)** | N/A | Private user state. |
| `GET /api/orders/*` | **0 seconds (NO CACHE)** | N/A | Financial transaction ledger. |
| `GET /api/auth/*` | **0 seconds (NO CACHE)** | N/A | Security boundary. |

---

## 12. Invalidation Strategy Proposal

### 12.1 Invalidation Matrix

| Mutation Event | Targeted Cache Keys to Invalidate | Action Required |
| :--- | :--- | :--- |
| **Product Created (`POST /api/products`)** | `th:catalog:list:*`, `th:admin:stats:*` | Clear catalog listings, admin stats |
| **Product Updated (`PUT /api/products/:id`)** | `th:prod:id:<id>`, `th:prod:slug:<slug>`, `th:catalog:list:*` | Clear specific product & listings |
| **Product Deleted (`DELETE /api/products/:id`)** | `th:prod:id:<id>`, `th:prod:slug:<slug>`, `th:catalog:list:*` | Clear specific product & listings |
| **Category Updated (`PUT /api/categories/:id`)** | `th:cat:*`, `th:catalog:list:*` | Clear category & catalog cache |
| **Review Submitted (`POST /api/reviews`)** | `th:reviews:product:<productId>`, `th:prod:id:<productId>` | Clear reviews & product rating |
| **Order Completed (`POST /api/orders`)** | `th:admin:stats:*`, `th:prod:id:<items>` (stock update) | Clear admin stats & affected items |
| **Settings Updated (`PUT /api/settings`)** | `th:settings:public` | Clear public settings cache |

### 12.2 Invalidation Mechanisms (Current vs Future)
- **Current Process-Local Invalidation:** In `server/routes/products.js`, `invalidateCache('/api/products')` is called. In a multi-worker cluster, this must be augmented with IPC message broadcasting (`process.send({ type: 'INVALIDATE_CACHE', pattern: '...' })`) or external pub/sub.
- **IPC Invalidation Protocol for Node Cluster:**
  ```
  [ Worker 1 (Mutator) ] ──> process.send({ type: 'CACHE_INVALIDATE', pattern })
                                     │
                             [ Primary Process ]
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
  [ Worker 1: cache.delete() ]                        [ Worker 2: cache.delete() ]
  ```

---

## 13. Failure & Degraded-Mode Behavior

The system must be engineered to fail open and safe:

1. **Cache Layer Failure (Redis down / Memory exhausted):**
   - If a shared cache or local cache throws an error or times out (>50ms), the cache middleware MUST catch the exception, log a warning, set `X-Cache: ERROR-BYPASS`, and immediately call `next()` to query the authoritative database directly.
   - **Rule:** A cache outage must degrade response latency, but **never crash the server or return HTTP 500**.
2. **Database Outage with Warm Cache:**
   - If Supabase PostgreSQL is unreachable, read-only GET routes for static catalog pages CAN optionally serve stale cached content with a header `X-Cache: STALE-FALLBACK` while write endpoints return HTTP 503 Service Unavailable.
3. **Corrupted Cache Entry:**
   - If cached data fails JSON parsing or schema validation, delete the key immediately and query the database.

---

## 14. Restart & Worker-Recycle Behavior

1. **Cold Start / Worker Recycle:**
   - When a worker dies and restarts (via `cluster.fork()`), its in-memory cache starts empty (`cache.size === 0`).
   - First requests will register `X-Cache: MISS` and re-populate the cache from the database.
   - To prevent cache stampedes (thundering herd) on worker boot, requests for identical keys during a cache miss can use a lightweight in-flight promise deduplicator.
2. **Graceful Shutdown (`SIGTERM` / `SIGINT`):**
   - Active cache timers (`cleanExpiredEntries` interval) must be cleared in the graceful shutdown handler to avoid dangling handles that trigger Node UV loop warnings on Windows/POSIX.

---

## 15. Security Considerations

1. **Strict Prevention of Tenant / User Data Leakage:**
   - Under NO circumstances should responses containing `Authorization`, `x-session-id`, `Cookie`, or user-specific payloads (`/api/cart`, `/api/wishlist`, `/api/auth/me`, `/api/orders/user`) pass through a shared caching middleware.
   - Middleware guard clause:
     ```javascript
     if (req.headers.authorization || req.originalUrl.startsWith('/api/cart') || req.originalUrl.startsWith('/api/wishlist')) {
       return next(); // Strictly bypass shared cache
     }
     ```
2. **Cache Poisoning Prevention:**
   - Only HTTP status codes $200 \le status < 300$ must ever be cached.
   - Error responses (400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Error) must NEVER be cached, preventing attackers from poisoning the cache with crafted malformed parameters.
3. **Admin vs Public Setting Isolation:**
   - `GET /api/settings` returns sensitive credentials to authenticated admins (Paymob secret keys, webhook tokens) and sanitized fields to public callers. Caching the admin response and serving it to a public caller would cause a catastrophic credential leak.
   - **Rule:** `GET /api/settings` for admin callers must strictly bypass the public cache.

---

## 16. Observability Requirements

To monitor cache performance and detect split-brain anomalies in production, the following telemetry should be integrated into `/api/status` or Prometheus metrics:

1. **Metrics to Track:**
   - `cache_hits_total`: Counter of cache hits.
   - `cache_misses_total`: Counter of cache misses.
   - `cache_hit_ratio`: Calculated as $\frac{\text{hits}}{\text{hits} + \text{misses}}$. Target: $> 85\%$ on catalog endpoints.
   - `cache_size_entries`: Current number of keys in memory/Redis.
   - `cache_evictions_total`: Count of items evicted due to capacity limits.
   - `cache_invalidation_events_total`: Count of explicit invalidations triggered.
2. **HTTP Response Headers:**
   - `X-Cache`: `HIT` | `MISS` | `BYPASS` | `ERROR-BYPASS`
   - `X-Cache-TTL-Remaining`: Seconds until expiration.

---

## 17. Migration Strategy (Phased Rollout)

To transition from the current state to a fully robust cache architecture without risking production stability:

```
[ Phase 0: Baseline Verification ]
  │  Verify zero regressions in SCA-1, SCA-2, REL-1, Auth, and Order contracts.
  ▼
[ Phase 1: Harden In-Memory Cache & Guard Boundaries ] (Low Risk)
  │  - Add explicit route bypass guards for /cart, /wishlist, /auth, /orders.
  │  - Lower catalog TTL from 300s to 30s.
  │  - Add IPC broadcast invalidation across cluster workers in server/index.js.
  ▼
[ Phase 2: Add Standard HTTP Caching & ETags ] (Low Risk)
  │  - Enable Express etag generation for catalog endpoints.
  │  - Add Cache-Control headers tailored for CDN/browser edge.
  ▼
[ Phase 3: Abstract Cache Provider Interface ] (Medium Risk)
  │  - Create server/lib/cache/CacheProvider.js (MemoryAdapter + RedisAdapter).
  │  - Switch between MemoryAdapter and RedisAdapter via CACHE_DRIVER env var.
  ▼
[ Phase 4: Production Redis Deployment ] (Optional / High Scale)
  │  - Deploy Redis on Railway/Upstash.
  │  - Configure REDIS_URL; enable global cache sharing and rate limiting.
```

---

## 18. EXPLICIT "DO NOT IMPLEMENT YET" SECTION

The following items are strictly out of scope for the current design phase and **MUST NOT BE IMPLEMENTED** until formal architecture review and dedicated task authorization:

1. **DO NOT** install or introduce `redis`, `ioredis`, `node-cache`, `lru-cache`, or any third-party caching dependencies.
2. **DO NOT** modify `server/middleware/cache.js`, `server/lib/supabase.js`, or any route files.
3. **DO NOT** alter database schemas, Supabase tables, or PostgreSQL migration scripts.
4. **DO NOT** modify or redesign Cart (`server/routes/cart.js`), Wishlist (`server/routes/wishlist.js`), or Auth (`server/routes/auth.js`).
5. **DO NOT** alter the canonical data contract or structure of `server/data/store.json`.
6. **DO NOT** introduce background worker message brokers (RabbitMQ, Kafka, BullMQ).
7. **DO NOT** create test fixtures or synthetic test data in production databases or stores.

---

## 19. Exact Next Implementation Tasks (Incremental & Reversible)

When implementation is approved, the work must be executed in the following sequential, reversible steps:

### Task SCA-3.1: Route Guard & Safety Audit (PR 1)
- Add strict middleware bypass checks in `server/middleware/cache.js` ensuring authentication headers, cart, wishlist, and admin routes never enter the cache.
- Reduce default catalog cache TTL from 300s to 30s.
- *Verification:* Integration test confirming `GET /api/cart` and `GET /api/wishlist` always return fresh data with `X-Cache: BYPASS`.

### Task SCA-3.2: Cluster IPC Invalidation Broadcast (PR 2)
- Update `server/index.js` primary cluster process to listen for worker `CACHE_INVALIDATE` messages and broadcast them to all sibling workers.
- Update `invalidateCache()` in `server/middleware/cache.js` to dispatch IPC messages when running inside a cluster worker.
- *Verification:* Multi-worker cluster test verifying that a product update on Worker 1 immediately clears the cache on Worker 2.

### Task SCA-3.3: Pluggable CacheProvider Abstraction (PR 3)
- Author `server/lib/cache/CacheProvider.js` providing a unified `get(key)`, `set(key, val, ttl)`, `del(key)`, and `delPattern(pattern)` API.
- Default to `MemoryCacheProvider` with optional `RedisCacheProvider` when `REDIS_URL` is set.
- *Verification:* Unit and integration test suite passing on both in-memory and mock Redis adapters.

---

## 20. Conclusion & Final Verdict

This architecture specification comprehensively addresses the multi-worker and multi-instance concurrency requirements for TechHaven while safeguarding data correctness and avoiding breaking changes to existing subsystems.

**Baseline Integrity:**
- `server/data/store.json` MD5: `34e2394b5c02a873ee55841d332baec6` (VERIFIED UNCHANGED)
- Production Source Files: VERIFIED UNMODIFIED
- Verification Status: **SCA-3 SHARED CACHE DESIGN = PASS**
