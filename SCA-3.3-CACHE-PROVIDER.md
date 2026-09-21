# SCA-3.3 — PLUGGABLE CACHE PROVIDER ABSTRACTION DOCUMENTATION

**Status:** ✅ **IMPLEMENTED & VERIFIED**  
**Module:** `server/cache/CacheProvider.js`, `server/cache/MemoryCacheProvider.js`, `server/middleware/cache.js`

---

## 1. Executive Summary & Architectural Overview

SCA-3.3 introduces a clean, pluggable caching contract (`CacheProvider`) and a default in-memory implementation (`MemoryCacheProvider`), fully decoupling HTTP caching middleware, route handlers, and cluster IPC invalidation from the underlying cache storage mechanism.

### Key Tenets & Boundaries:
1. **Derived / Transient Data Only**: The cache abstraction is strictly dedicated to read-heavy, derived, and transient query responses (`/api/products`, `/api/categories`, `/api/settings`).
2. **Never for Authoritative State**: Authoritative, transactional, and user-specific state (`Cart`, `Wishlist`, `Auth`, `Orders`, `Payments`, `B2B`, `Admin`) must **never** be cached and are strictly protected by bypass guards.
3. **No External Dependency Requirement**: Retains 100% zero-external-dependency operation using `MemoryCacheProvider`.
4. **Pluggable Contract**: Defines an abstract interface (`CacheProvider`) ready to support external/distributed providers in the future without touching Express route handlers or middleware guards.
5. **Fail-Safe Degradation**: If any cache provider operation (`get`, `set`, `clear`) throws an error, the middleware catches the exception, logs/handles it safely, sets `X-Cache: BYPASS`, and allows the underlying HTTP request or database mutation to proceed without failure.

---

## 2. Core Components & Interface Specifications

### 2.1 Abstract Contract: `server/cache/CacheProvider.js`
Defines the uniform interface for all cache implementations:
- `get(key)`: Retrieves cached value or returns `undefined`/`null` if missing or expired.
- `set(key, value, ttlSeconds)`: Stores a value with a time-to-live.
- `delete(key)`: Removes a single key from cache.
- `has(key)`: Checks if a key exists and is unexpired.
- `clear(patternOrScope)`: Invalidates all keys matching a substring pattern / logical scope, or clears all entries when no argument is supplied.
- `size`: Getter returning the count of stored entries.

### 2.2 In-Memory Provider: `server/cache/MemoryCacheProvider.js`
Extends `CacheProvider` with high-performance, process-local memory caching semantics:
- **Fast Lookup**: Map-backed $O(1)$ operations.
- **TTL Validation**: Automatic expiration verification on `get()` and background interval sweeps.
- **Capacity Management**: Default `maxSize = 1000` entries. Oldest entries are evicted when capacity is reached to prevent memory leaks.
- **Scope & Pattern Invalidation**: Supports standard scopes (`products`, `categories`, `settings`) and custom substring patterns.
- **Resource Lifecycle**: Background interval uses `.unref()` so it never prevents Node.js process exit; includes `.destroy()` for clean test teardown.

### 2.3 Cache Middleware Integration: `server/middleware/cache.js`
- **Provider Registry**: Exports `getCacheProvider()` and `setCacheProvider(provider)` for dependency injection and testing.
- **Resilient Execution**:
  - `cacheMiddleware(ttlSeconds)` intercepts requests and handles provider errors gracefully with `X-Cache: BYPASS`.
  - `invalidateCache(patternOrScope, options)` clears local provider storage safely and broadcasts via Cluster IPC if running in a Node.js cluster worker.
- **Backward Compatibility**: Preserves all existing exports (`cacheMiddleware`, `invalidateCache`, `clearAllCache`, `getCacheSize`, `getNormalizedCacheKey`, `shouldBypassCache`, `SCOPES`, `handlePrimaryIPCMessage`, `setupPrimaryCacheIPC`, `handleWorkerIPCMessage`).

---

## 3. Verification & Test Matrix

### 3.1 SCA-3.3 Test Suite (`scratch/test_sca3_3.mjs`)
Comprehensive verification covering 61 assertions across 6 test groups:
- **Group 1: MemoryCacheProvider Unit Tests**: Get, set, TTL expiry, delete, has, clear by scope, capacity FIFO/LRU eviction.
- **Group 2: Abstract CacheProvider Contract Tests**: Verification that un-implemented base methods throw proper descriptive errors.
- **Group 3: Pluggability & Dependency Injection**: Ability to swap active provider using `setCacheProvider` and verify mock/custom provider invocation.
- **Group 4: Middleware Integration & Route Safety Guards**:
  - Cache HIT/MISS verification and headers (`X-Cache`, `Cache-Control`).
  - Query parameter normalization and language isolation.
  - Bypass verification for Cart, Wishlist, Auth, Orders, Payments, B2B, Admin, Analytics, and authenticated product queries.
  - Safe error degradation when provider throws.
- **Group 5: Local Invalidation Integrity**: Invalidation on single-process mutations.
- **Group 6: Multi-Worker Cluster IPC Invalidation**: End-to-end multi-worker cache invalidation via primary IPC broker.

**Result:** **61 / 61 PASSED (0 FAILED)**

### 3.2 Regression Verification Across All Suites
- **SCA-1 Test Suite (`scratch/test_sca1.mjs`)**: PASSED
- **SCA-2 Test Suite (`scratch/sca2/run-sca2.sh`)**: PASSED
- **SCA-3.1 Test Suite (`scratch/test_sca3_1.mjs`)**: PASSED
- **SCA-3.2 Test Suite (`scratch/test_sca3_2.mjs`)**: PASSED
- **ESLint Linting**: 0 errors, 0 warnings across all production files.
- **Vite Production Build**: Built successfully without errors.
- **Database Integrity**: `server/data/store.json` MD5 verified unchanged (`34e2394b5c02a873ee55841d332baec6`).
