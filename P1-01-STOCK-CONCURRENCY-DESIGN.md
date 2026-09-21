# P1-01 CONCURRENT STOCK DECREMENT / TOCTOU DESIGN AUDIT REPORT

**Audit Date:** September 16, 2026  
**System:** TechHaven (EgyHardware Full-Stack Platform)  
**Target Scope:** P1-01 — Concurrent Stock Decrement / Time-of-Check to Time-of-Use (TOCTOU) Analysis & Design  
**Execution Mode:** STRICT READ-ONLY DESIGN AUDIT (Zero Production Code Edits, Zero Store Mutations)  
**Deliverable Document:** `P1-01-STOCK-CONCURRENCY-DESIGN.md`

---

## 1. Executive Summary

This design audit evaluates the end-to-end checkout and stock lifecycle in TechHaven to resolve finding **P1-01 (Concurrent Stock Decrement / TOCTOU Race Condition)**. 

### Core Audit Findings:
1. **Current Vulnerability Confirmed**: In `server/routes/orders.js:159-281`, product stock is read and validated in an early loop, and then updated via `db.updateProduct(id, { stock_qty: newStock })` **after** order insertion in a subsequent loop. The update passes an absolute calculated number (`newStock`), rather than performing a conditional relative decrement (`stock_qty = stock_qty - qty WHERE stock_qty >= qty`).
2. **Race Window**: Two or more concurrent checkout requests for the same SKU can both read the identical available inventory, both pass stock validation, both create orders, and sequentially overwrite `stock_qty`, resulting in **overselling** (negative inventory in reality) and **lost updates** (corrupted inventory counts).
3. **Partial Failure & Atomicity Gap**: `db.createOrder` and `db.updateProduct` are separate non-transactional network calls. If stock updating fails for item $N$ in a multi-item basket, or if the server crashes after order insertion, the order exists in the database while inventory remains un-decremented.
4. **Dual Backend Analysis**: The consistency characteristics of the Supabase PostgreSQL production backend and the local JSON fallback store were modeled independently, identifying distinct failure modes for each.
5. **Zero Disruption Guarantee**: A comprehensive, backward-compatible transactional architecture was designed that preserves all existing API contracts and frontend interfaces without requiring breaking changes.

---

## 2. Current Stock / Order Flow Trace

The complete order and stock lifecycle was traced directly from current source code:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             POST /api/orders                                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                        1. Validate Payload & Items
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. READ & VALIDATE LOOP (server/routes/orders.js:153-193)                   │
│    - dbProduct = await db.getProduct(productId)                             │
│    - availableStock = dbProduct.stock_qty || dbProduct.stock                │
│    - if (availableStock < qty) return 400 INSUFFICIENT_STOCK                │
│    - newStock = Math.max(0, availableStock - qty)                           │
│    - productsToUpdateStock.push({ product, newStock })                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                      [CRITICAL CONCURRENCY WINDOW]
     (Sibling requests can execute Step 2 simultaneously on same stock)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. CREATE ORDER (server/routes/orders.js:272)                               │
│    - created = await db.createOrder(newOrder, newOrder.items)               │
│    - Writes to 'orders' and 'order_items' (Supabase or localStore)          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. DECREMENT STOCK LOOP (server/routes/orders.js:275-281)                   │
│    - for ({ product, newStock } of productsToUpdateStock)                   │
│         await db.updateProduct(product.id, { stock_qty: newStock })         │
│    - Note: Uses absolute newStock write; errors are swallowed in catch!     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. FINALIZATION & RESPONSE (server/routes/orders.js:283-292)                │
│    - await db.clearCart(user.userId)                                        │
│    - return res.status(201).json({ success: true, data: created })          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Trace Step Breakdown:
1. **Stock Read Location**: `server/routes/orders.js:159` calls `db.getProduct(productId)`.
2. **Stock Validation Location**: `server/routes/orders.js:167-172` checks `if (availableStock < qty)`.
3. **Order Creation Location**: `server/routes/orders.js:272` calls `db.createOrder(newOrder, newOrder.items)`.
4. **Stock Decrement Location**: `server/routes/orders.js:275-281` iterates through `productsToUpdateStock` calling `db.updateProduct(product.id, { stock_qty: newStock })`.
5. **Persistence Trigger**:
   - Supabase: Individual REST calls to PostgREST for order insert, order items insert, and product updates.
   - Local Fallback: Mutations to in-memory `localStore` Map followed by `saveStoreToDisk()` queue.
6. **Failure Handling**: If `db.updateProduct` throws, it is caught with `console.warn` (`server/routes/orders.js:278-280`) and swallowed. The API still returns `201 Created`, leaving the order active and stock un-decremented.
7. **Simultaneous Multi-Worker Execution**: Requests interleaved between Step 2 and Step 4 will all succeed and overwrite each other's stock calculations.

---

## 3. Supabase Consistency Analysis

When running against the production target (Supabase / PostgreSQL):

- **Authoritative Source**: PostgreSQL tables (`products`, `orders`, `order_items`).
- **Atomic Stock Decrement?**: **NO**. The update executes as `UPDATE products SET stock_qty = :newStock WHERE id = :id`. This is an unconditional overwrite based on client-side math performed on a potentially stale read.
- **Order Creation & Stock Update Atomicity?**: **NO**. Order creation and product updates are separate HTTP requests sent to Supabase. There is no `BEGIN ... COMMIT` database transaction spanning both operations.
- **Can Two Requests Observe Identical Stock?**: **YES**. Under concurrent execution, two requests read the same row before either writes the new value.
- **Process Crash Behavior**: If the Node.js process crashes after `db.createOrder` succeeds but before `db.updateProduct` executes, the order is permanently saved in the database, but product stock is never decremented.
- **Can an Order Exist Without Stock Decrement?**: **YES** (on process crash, network error during `updateProduct`, or swallowed exception in the stock loop).
- **Can Stock Decrement Happen Without an Order?**: **NO** (order creation is attempted before the stock loop).
- **Can Partial Failure Produce Inconsistency?**: **YES**. In a 3-item order, if item 1 succeeds, item 2 fails, and item 3 is not reached, the order is created with all 3 items, item 1 has reduced stock, and items 2 & 3 have unchanged stock.

---

## 4. Local Fallback Consistency Analysis

When running in local JSON fallback mode (`server/data/store.json`):

- **Authoritative Source**: In-memory `localStore` Map serialized asynchronously to `store.json`.
- **Atomic Stock Decrement?**: **NO**. While Node.js JavaScript execution is single-threaded, `await db.createOrder(...)` yields the event loop, allowing concurrent requests to interleave between the stock check and the stock update.
- **Multi-Worker Cluster Consistency**: When running with Node.js cluster forks (`cluster.isPrimary === false`), each worker process has its own disconnected `localStore = new Map()`. Mutations on worker A are not reflected in worker B's memory. When worker B calls `saveStoreToDisk()`, it writes its entire memory snapshot to disk, clobbering worker A's changes.
- **Order & Stock Atomicity**: **NO**. Order is set in `localStore`, queued to disk, then product is updated in `localStore`, and queued to disk.
- **Crash Recovery**: If the process crashes before the write queue flushes the temp file and renames it to `store.json`, memory state is lost.

---

## 5. Concurrency Scenarios

| Scenario | Setup | Current System Behavior | Resulting State & Risk |
|---|---|---|---|
| **Scenario A: Final Unit Race** | Product has `stock_qty: 1`. Req 1 orders 1 unit. Req 2 orders 1 unit simultaneously. | Both read stock `1`. Both compute `newStock: 0`. Both create orders. Both update `stock_qty: 0`. | **OVERSELLING (2 units sold, 1 in stock).** Financial/operational liability. |
| **Scenario B: Overlapping Quantities** | Product has `stock_qty: 10`. Req 1 orders 6. Req 2 orders 5. Req 3 orders 4. | All read stock `10`. Req 1 computes `newStock: 4`. Req 2 computes `newStock: 5`. Req 3 computes `newStock: 6`. All create orders. Last write sets stock to `6`. | **MASSIVE CORRUPTION (15 units sold, recorded stock is 6 instead of -5).** |
| **Scenario C: Cross-Worker Mutation** | Worker 1 processing user checkout (stock 10 $\rightarrow$ 9). Worker 2 processing Admin stock restock (stock 10 $\rightarrow$ 50). | Worker 1 reads stock `10`. Worker 2 updates stock to `50`. Worker 1 finishes checkout and writes `stock_qty: 9`. | **LOST UPDATE (Admin restock wiped out, stock drops to 9).** |
| **Scenario D: Order Succeeds, Stock Fails** | Req orders 1 unit. Order inserted. Supabase returns network timeout on `updateProduct`. | Exception caught in `console.warn`. `201 Created` returned to client. | **PHANTOM ORDER (Order recorded, inventory unallocated).** |
| **Scenario E: Stock Succeeds, Order Fails** | Legacy architecture / reversed sequence. | In current code, order runs first, so this specific inversion does not occur. | N/A (Order step precedes stock step). |
| **Scenario F: Process Crash Between Steps** | Process receives SIGKILL / hardware termination immediately after `db.createOrder`. | Order is committed to database; stock update call never dispatched. | **PERMANENT INCONSISTENCY (Orphan order without inventory deduction).** |
| **Scenario G: Database Error on Order Items** | Order header created, but `order_items` insert fails with DB constraint. | `createOrder` logs error on line 1377 but returns header. Stock decremented. | **CORRUPTED ORDER (Header exists, items missing, stock lost).** |

---

## 6. Current Failure Modes Summary

1. **Check-Then-Act (TOCTOU)**: Lack of atomic conditional decrement allows race conditions during peak concurrent load.
2. **Absolute Value Overwrite**: Writing `SET stock_qty = newStock` rather than `SET stock_qty = stock_qty - qty` causes lost updates whenever multiple writes interleave.
3. **Lack of Transactional Boundary**: Separate HTTP calls for order insertion, item insertion, and product stock updates prevent all-or-nothing rollback.
4. **Swallowed Exceptions in Stock Loop**: `catch (stockErr) { console.warn(...) }` prevents the API from returning an error when stock persistence fails, masking inventory degradation.
5. **Cluster Memory Partitioning (Fallback)**: Independent in-memory Map instances across cluster forks lead to disk clobbering in fallback mode.

---

## 7. Architecture Options Comparison

Seven practical architectural strategies were evaluated:

| Strategy | Correctness & Atomicity | Multi-Worker / Multi-Instance | Supabase Fit | Local Fallback Fit | Operational Complexity | Performance Impact |
|---|---|---|---|---|---|---|
| **1. Atomic Conditional SQL Decrement** | High for stock (prevents $< 0$). Does not make order+stock atomic. | 100% Safe (PostgreSQL row locks). | Native (`UPDATE products SET stock_qty = stock_qty - $qty WHERE id = $id AND stock_qty >= $qty`). | Simulated via JS check-and-set. | Very Low | Sub-millisecond (single SQL). |
| **2. Stored Procedure Transaction (RPC)** | **ACID Complete**. Order, items, and stock all commit or roll back together. | 100% Safe across all nodes. | Native (`supabase.rpc('process_order_checkout', payload)`). | Transactional wrapper in local store. | Low to Moderate (1 SQL migration). | **Highest** (1 DB round-trip replaces 4+ REST calls). |
| **3. Row-Level Pessimistic Locking (`SELECT FOR UPDATE`)** | High. Blocks concurrent checkout on same SKU. | 100% Safe in PostgreSQL. | Requires raw DB connection or RPC (not direct PostgREST). | Process-level mutex. | Moderate | Can cause lock contention on single viral SKU. |
| **4. Optimistic Concurrency (`version` column)** | High. Rejects update if version changed. | Safe across nodes. | Native (`.eq('version', v)`). | Version check on object. | Low to Moderate (Schema change required). | High when no contention; retries add latency during flash sales. |
| **5. Application-Level In-Memory Mutex** | High for single process; **Zero** across multi-node. | Fails without distributed Redis Redlock. | Neutral. | Excellent for single-process local dev. | Low (local) / High (Redis). | Negligible in single process; network overhead if distributed. |
| **6. Asynchronous Reservation Queue (BullMQ / SQS)** | High eventual consistency. | 100% Safe across distributed workers. | Compatible. | In-memory queue. | High (Requires queue broker, background workers, polling). | Decouples HTTP request, but adds async state complexity. |
| **7. Two-Phase Reservation with TTL (15-min hold)** | High. Holds stock before payment. | Safe if stored in DB table. | Requires `stock_reservations` table & cron cleaner. | In-memory timer Map. | High (Requires cleanup jobs, hold lifecycle). | Extra DB round-trips during cart add and checkout. |

---

## 8. Recommended Direction (Evidence-Based Architecture)

Based on the verified codebase constraints (Node.js Express + Supabase PostgreSQL target + Local JSON fallback), the most robust, maintainable, and high-performance direction is a **Two-Tiered Transactional Strategy**:

### Tier 1: Production (Supabase PostgreSQL)
Implement a single PostgreSQL RPC Function (`process_order_checkout`) executed via `supabase.rpc('process_order_checkout', {...})`:
1. Opens an explicit database transaction (`BEGIN`).
2. Locks the requested product rows in deterministic ID order (`SELECT stock_qty FROM products WHERE id = ANY(...) FOR UPDATE`) to prevent deadlocks.
3. Verifies that all items satisfy `stock_qty >= requested_qty`. If any item is insufficient, raises an exception with a structured error payload.
4. Decrements each product: `UPDATE products SET stock_qty = stock_qty - qty, updated_at = NOW() WHERE id = item.product_id`.
5. Inserts the order record into `orders`.
6. Inserts the line items into `order_items`.
7. Commits the transaction (`COMMIT`) and returns the complete created order.
8. If any step fails, PostgreSQL automatically rolls back the entire transaction, guaranteeing **zero orphaned orders and zero stock leakage**.

### Tier 2: Local Fallback (`localStore` / Single-Process)
Implement an atomic synchronous execution block in `server/lib/supabase.js`:
1. Executes stock verification synchronously within the event loop tick.
2. If all items pass, updates in-memory `localStore` product entries and order entry together.
3. Flushes snapshot to disk via `saveStoreToDisk()`.
4. If running in cluster mode without Supabase, route fallback write operations through the Primary process or enforce single-worker mode.

---

## 9. Local Fallback Strategy

To ensure data integrity when Supabase is not configured:

1. **Single-Worker Enforcement in Fallback**: When `!isSupabaseConfigured`, disable cluster worker forking in `server/index.js` (run single process). In a single Node.js process, JavaScript event-loop synchronous sections guarantee thread safety without complex distributed locking.
2. **Synchronous Atomic Store Commit**:
   ```js
   // Atomic fallback commit in server/lib/supabase.js
   async createOrderAtomic(orderData, items) {
     // 1. Synchronous validation
     for (const it of items) {
       const prod = localStore.get(`product:${it.product_id}`);
       if (!prod || (prod.stock_qty || 0) < it.quantity) {
         throw new InsufficientStockError(prod?.name || it.product_id);
       }
     }
     // 2. Synchronous in-memory mutation
     for (const it of items) {
       const prod = localStore.get(`product:${it.product_id}`);
       prod.stock_qty -= it.quantity;
       prod.updated_at = new Date().toISOString();
     }
     orderData.order_items = items;
     localStore.set(`order:${orderData.id}`, orderData);
     // 3. Persist to disk
     await saveStoreToDisk();
     return orderData;
   }
   ```
3. **Limitation Documentation**: The local JSON fallback is designed for single-node development, testing, and offline previews. It is not an ACID multi-master distributed database.

---

## 10. Order / Stock Atomicity Analysis

- **Can Atomicity Be Achieved Without a Database Transaction?**  
  **No.** In a distributed client-server architecture, separate network calls across an API boundary cannot guarantee ACID atomicity across process crashes, container restarts, or network partitions without a distributed coordinator or database-level transaction.
- **Saga / Compensating Transactions Evaluation**:  
  Without a database transaction, a compensation pattern would attempt to re-increment stock if order insertion fails. However, if the server process dies between the decrement and the compensation, the compensation never runs, leaving permanently leaked inventory.
- **Conclusion**: A stored procedure RPC in PostgreSQL is the only mechanism that guarantees 100% strict atomicity.

---

## 11. API / Contract Impact

Preserving existing API contracts was an explicit design constraint.

- **Request Payload (`POST /api/orders`)**: **UNCHANGED**.  
  Payload remains `{ customer: { fullName, phone, address, city, ... }, items: [...], notes: '...' }`.
- **Success Response (`201 Created`)**: **UNCHANGED**.  
  Response remains `{ success: true, message: 'تم تسجيل طلبك بنجاح!', data: <createdOrder> }`.
- **Out of Stock Error Response (`400 Bad Request`)**: **UNCHANGED**.  
  Response remains `{ error: 'الكمية المطلوبة من (...) غير متوفرة. المتاح حالياً: ...', code: 'INSUFFICIENT_STOCK' }`.
- **Frontend Impact (`src/pages/Checkout.jsx`, `src/context/CartContext.jsx`)**: **ZERO BREAKING CHANGES**.  
  The frontend already handles `400` with `code: 'INSUFFICIENT_STOCK'` by displaying user-friendly Arabic toast messages.

---

## 12. Phased Migration & Rollout Plan

```
Phase 0: Baseline Concurrency Tests (Harness & Metrics)
   │
   ▼
Phase 1: Supabase RPC & Local Atomic Implementation
   │
   ▼
Phase 2: Automated Multi-Worker Concurrency Stress Testing
   │
   ▼
Phase 3: Frontend E2E Validation (Zero UI Regression)
   │
   ▼
Phase 4: Production Deployment (Feature Flag: ENABLE_RPC_CHECKOUT)
   │
   ▼
Phase 5: Rollback Strategy & Verification
```

### Phase Details:
- **Phase 0 (Characterization)**: Create isolated test harness simulating 50 concurrent checkout requests against a product with 5 units of stock to measure baseline race window.
- **Phase 1 (Implementation)**: Author SQL migration `004_order_checkout_rpc.sql` containing `process_order_checkout` function. Add `db.createOrderWithStockReservation` to `server/lib/supabase.js`.
- **Phase 2 (Concurrency Verification)**: Execute automated test suite against both Supabase and local fallback paths.
- **Phase 3 (Frontend Verification)**: Verify error toasts, cart clearing, and order confirmation screens in browser/Vite dev server.
- **Phase 4 (Deployment)**: Deploy Supabase SQL migration, set environment variables, deploy backend API to Railway.
- **Phase 5 (Rollback Strategy)**: If any issue occurs with the RPC in production, setting `ENABLE_RPC_CHECKOUT=false` seamlessly reverts to the fallback path without requiring emergency code redeployments.

---

## 13. Test Plan Design

The test suite must test the following test cases before code acceptance:

1. **Single Product Final-Unit Race**:
   - Initial: Product with `stock_qty: 1`.
   - Action: 20 concurrent `POST /api/orders` requests for 1 unit.
   - Invariant: Exactly 1 request receives `201 Created`; 19 requests receive `400 INSUFFICIENT_STOCK`. Final `stock_qty` is exactly `0`.
2. **Multi-Unit Overlapping Race**:
   - Initial: Product with `stock_qty: 10`.
   - Action: 5 concurrent requests for 3 units each.
   - Invariant: Exactly 3 requests receive `201 Created` (9 units total); 2 requests receive `400 INSUFFICIENT_STOCK`. Final `stock_qty` is exactly `1`.
3. **Multi-Item Basket Partial Failure (All-or-Nothing)**:
   - Initial: Product A (`stock_qty: 5`), Product B (`stock_qty: 0`).
   - Action: Checkout order containing 1 unit of Product A and 1 unit of Product B.
   - Invariant: Request fails with `400 INSUFFICIENT_STOCK`. Product A `stock_qty` remains unchanged at `5` (zero partial reservation).
4. **Deadlock Prevention on Shuffled Basket Items**:
   - Action: Req 1 orders [Prod A, Prod B]. Req 2 orders [Prod B, Prod A] concurrently.
   - Invariant: Deterministic ID sorting in SQL prevents database transaction deadlocks.
5. **Cluster Parity Test**:
   - Action: Run concurrency test across 4 clustered Node.js workers.
   - Invariant: Zero overselling, zero state corruption.

---

## 14. Observability Requirements

Following implementation, the system should expose structured metrics and log events:

- **Metrics**:
  - `orders_checkout_total{status="success|failed", payment_method="..."}`
  - `orders_stock_conflict_total{product_id="..."}`
  - `orders_transaction_duration_ms` (Histogram for RPC execution time)
  - `inventory_oversell_rejection_total`
- **Structured Log Events**:
  - `order.checkout.started`: `{ order_id, item_count, total }`
  - `order.checkout.stock_insufficient`: `{ product_id, requested_qty, available_stock }`
  - `order.checkout.completed`: `{ order_id, duration_ms }`
- **Tracing**: Attach `x-request-id` header to every database RPC call and log line for end-to-end correlation.

---

## 15. Security & Abuse Considerations

1. **Negative / Floating Quantity Manipulation**: Enforce `Math.floor`, `Number.isInteger(qty)`, and `qty >= 1` in validation middleware before any database call to prevent negative-quantity stock inflation exploits.
2. **Cart / Inventory Hoarding Protection**: Orders created via pending payment methods (e.g. Card/InstaPay) must have an automated expiration worker (e.g. 30 minutes) to cancel uncompleted orders and restore inventory.
3. **Price & Shipping Tampering**: Authoritative server-side price calculation is already enforced and must remain inside the transactional boundary.

---

## 16. Explicit Implementation Boundaries

- **Audit Execution**: Strictly READ-ONLY design and architectural modeling.
- **Production Code Status**: Zero modifications to `server/`, `src/`, or configuration files.
- **Database Status**: Zero mutations to `server/data/store.json`.
- **Integrity Verified**: Verified via MD5 hash comparison before and after audit.

---

## 17. Open Architectural Questions for Implementation Phase

1. **RPC Migration Strategy**: Should the Supabase SQL migration for `process_order_checkout` be applied via Supabase CLI in CI/CD, or provided as an idempotent setup script? *(Recommended: versioned migration in `supabase/migrations/`)*.
2. **Payment Expiration Cron**: For online payment orders (InstaPay / Card) that remain in `pending_payment` status, what should be the authoritative TTL before restoring reserved stock? *(Recommended: 60 minutes)*.
3. **Local Dev Cluster Mode**: Should local development default to single-worker mode (`WEB_CONCURRENCY=1`) when Supabase is not configured to avoid multi-worker localStore divergence? *(Recommended: Yes)*.
