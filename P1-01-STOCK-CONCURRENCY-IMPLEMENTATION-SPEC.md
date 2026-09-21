# P1-01 STOCK CONCURRENCY IMPLEMENTATION SPECIFICATION

**Document Version:** 1.0.0  
**Date:** September 16, 2026  
**System:** TechHaven (EgyHardware Full-Stack Platform)  
**Target Milestone:** P1-01 — Concurrent Stock Decrement / TOCTOU Implementation Specification  
**Execution Mode:** STRICT DESIGN/PLANNING SPECIFICATION (Zero Production Edits, Zero Store Mutations)  
**Deliverable Document:** `P1-01-STOCK-CONCURRENCY-IMPLEMENTATION-SPEC.md`

---

## 1. Current Order Contract & Codebase Audit

Inspection of `server/routes/orders.js:130-296` and `server/lib/supabase.js:1366-1380` establishes the active contract:

### 1.1 Request Payload (`POST /api/orders`)
```json
{
  "customer": {
    "fullName": "أحمد محمود",
    "phone": "01012345678",
    "email": "ahmed@example.com",
    "address": "شارع التحرير، الدقي",
    "city": "الجيزة",
    "paymentMethod": "cod"
  },
  "items": [
    {
      "productId": "prod-phone",
      "quantity": 2
    }
  ],
  "notes": "يرجى الاتصال قبل التوصيل"
}
```

### 1.2 Execution Lifecycle Breakdown

| Lifecycle Step | Current Implementation | Proposed Architectural Placement | Rationale |
|---|---|---|---|
| **Input Validation** | `orders.js:139-146` (name, phone, address, city, non-empty items) | **Node.js Express Middleware** | Fast-fail rejection of malformed requests before touching database connections. |
| **User Identification** | `orders.js:132` (`getOptionalUser(req)`) & `req.headers['x-session-id']` | **Node.js Express Middleware** | JWT verification and session extraction are HTTP transport concerns. |
| **Product Lookup & Price Verification** | `orders.js:159-178` (`db.getProduct`) | **Inside DB Transaction / RPC** | Must be locked and read authoritatively to prevent TOCTOU stale price/stock reads. |
| **Shipping Calculation** | `orders.js:195-210` (threshold $\ge 2500$ EGP, Cairo=55, Giza=80, other=75) | **Node.js Express Middleware** | City and threshold rules remain server-authoritative; calculated value passed into RPC. |
| **Discount Calculation** | `orders.js:212` (`serverAuthorizedDiscount = 0`) | **Node.js Express Middleware** | Server-enforced discount rules passed into RPC. |
| **Order ID & Reference** | `orders.js:215-216` (`TH-YYYY-XXXXXX`, `order-${Date.now()}`) | **Node.js Express Middleware** | Unique identifiers generated upfront and passed to DB. |
| **Stock Lock & Verification** | `orders.js:167-172` (non-atomic JS check) | **Inside DB Transaction / RPC (`FOR UPDATE`)** | **CRITICAL FIX**: Locks product rows in DB, checks `stock_qty >= qty`. |
| **Stock Decrement** | `orders.js:275-281` (sequential loop after order write) | **Inside DB Transaction / RPC** | **CRITICAL FIX**: Atomic relative decrement `stock_qty = stock_qty - qty`. |
| **Order & Items Persistence** | `orders.js:272` (`db.createOrder`) | **Inside DB Transaction / RPC** | Atomically commits order and items within the same `BEGIN...COMMIT` block. |
| **Cart Clearing** | `orders.js:284-286` (`db.clearCart`) | **Post-Commit Hook (Node.js)** | Cart clearing happens only after successful transaction commit. Non-critical failure does not fail order. |
| **Success Response** | `orders.js:288-292` (`201 Created`) | **Node.js HTTP Handler** | Emits standard `{ success: true, message: '...', data: order }`. |

---

## 2. Implementation Boundary

To ensure complete safety and isolation, the implementation boundary is strictly defined:

- **What Will Change in Implementation Phase**:
  1. Addition of Supabase SQL migration `004_process_order_checkout.sql` declaring PostgreSQL function `process_order_checkout`.
  2. Addition of `db.processOrderCheckout(orderData, items)` in `server/lib/supabase.js`.
  3. Refactoring of `POST /api/orders` in `server/routes/orders.js` to delegate order creation and stock decrement to `db.processOrderCheckout`.
  4. Implementation of atomic single-process transaction logic in `server/lib/supabase.js` local fallback.
- **What Will NOT Change**:
  - Zero changes to Cart API (`/api/cart`), Wishlist API (`/api/wishlist`), Auth API (`/api/auth`), or Admin routes.
  - Zero changes to SCA-3 Cache middleware or cache invalidation logic.
  - Zero changes to HTTP request payload or frontend checkout client code.
  - Zero changes to shipping calculation tables or city zoning rules.

---

## 3. Supabase PostgreSQL RPC Contract

### 3.1 Function Signature
```sql
CREATE OR REPLACE FUNCTION process_order_checkout(
  p_order_id TEXT,
  p_reference TEXT,
  p_user_id UUID,
  p_session_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_customer_city TEXT,
  p_customer_address TEXT,
  p_customer_notes TEXT,
  p_payment_method TEXT,
  p_payment_status TEXT,
  p_status TEXT,
  p_subtotal NUMERIC,
  p_shipping_cost NUMERIC,
  p_discount_amount NUMERIC,
  p_coupon_code TEXT,
  p_total NUMERIC,
  p_items JSONB,
  p_timeline JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
...
$$;
```

### 3.2 Input JSON Schema for `p_items`
```json
[
  {
    "id": "uuid-line-item-1",
    "product_id": "prod-phone",
    "quantity": 2,
    "unit_price": 49999,
    "total_price": 99998,
    "product_name": "TH Phone 15 Pro Max 256GB Titanium",
    "thumbnail": "/images/prod-phone.jpg"
  }
]
```

### 3.3 Return Structures

#### Success Response (`JSONB`):
Returns the complete order row with embedded `order_items` array:
```json
{
  "id": "order-1773756800000",
  "reference": "TH-2026-894123",
  "order_number": "TH-2026-894123",
  "user_id": "user-uuid-or-null",
  "session_id": "session-id-or-null",
  "customer_name": "أحمد محمود",
  "customer_phone": "01012345678",
  "customer_email": "ahmed@example.com",
  "customer_city": "الجيزة",
  "customer_address": "شارع التحرير، الدقي",
  "customer_notes": "يرجى الاتصال قبل التوصيل",
  "payment_method": "cod",
  "payment_status": "pending_cod",
  "status": "confirmed",
  "subtotal": 99998,
  "shipping_cost": 0,
  "discount_amount": 0,
  "coupon_code": null,
  "total": 99998,
  "timeline": [
    { "status": "created", "label": "تم إنشاء الطلب بنجاح", "time": "2026-09-16T19:00:00.000Z" },
    { "status": "confirmed", "label": "تم تأكيد الطلب وجاري تجهيز الشحنة للدفع عند الاستلام", "time": "2026-09-16T19:00:00.000Z" }
  ],
  "created_at": "2026-09-16T19:00:00.000Z",
  "updated_at": "2026-09-16T19:00:00.000Z",
  "order_items": [
    {
      "id": "uuid-line-item-1",
      "order_id": "order-1773756800000",
      "product_id": "prod-phone",
      "product_name": "TH Phone 15 Pro Max 256GB Titanium",
      "quantity": 2,
      "unit_price": 49999,
      "total_price": 99998,
      "thumbnail": "/images/prod-phone.jpg"
    }
  ]
}
```

#### Error Exceptions Raised by RPC:
- **Insufficient Stock**:
  ```sql
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = json_build_object(
      'code', 'INSUFFICIENT_STOCK',
      'product_id', v_product_id,
      'product_name', v_product_name,
      'available_stock', v_available_stock,
      'requested_qty', v_requested_qty
    )::text;
  ```
- **Product Not Found**:
  ```sql
  RAISE EXCEPTION USING
    ERRCODE = 'P0002',
    MESSAGE = json_build_object(
      'code', 'PRODUCT_NOT_FOUND',
      'product_id', v_product_id
    )::text;
  ```

---

## 4. Transaction Boundary Specification

The transactional block inside PostgreSQL / LocalStore follows this sequence:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BEGIN TRANSACTION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. EXTRACT & SORT UNIQUE PRODUCT IDs                                        │
│    - Aggregate quantities if same product appears multiple times.           │
│    - Sort product IDs alphabetically (ASC) to establish global lock order.  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. PESSIMISTIC ROW LOCKING (`SELECT ... FOR UPDATE`)                        │
│    - Lock all requested product rows simultaneously.                        │
│    - Blocks concurrent checkouts touching the same products.                │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. VERIFY PRODUCT EXISTENCE                                                 │
│    - If any locked row is missing -> RAISE EXCEPTION 'PRODUCT_NOT_FOUND'    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. AUTHORITATIVE STOCK & PRICE VERIFICATION                                 │
│    - For each item: IF (stock_qty < requested_qty)                         │
│        -> RAISE EXCEPTION 'INSUFFICIENT_STOCK'                              │
│    - Verify price matches authoritative DB price.                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. ATOMIC STOCK DECREMENT                                                   │
│    - UPDATE products SET stock_qty = stock_qty - requested_qty,             │
│                          updated_at = NOW()                                 │
│      WHERE id = item.product_id;                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 6. INSERT ORDER HEADER                                                      │
│    - INSERT INTO orders (...) VALUES (...) RETURNING *;                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 7. INSERT ORDER ITEMS                                                       │
│    - INSERT INTO order_items (...) VALUES (...);                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                             COMMIT TRANSACTION                              │
│ (On any exception: automatic ROLLBACK -> zero state mutations occur)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Row Locking & Deadlock Elimination Strategy

### 5.1 The Deadlock Problem Under Concurrent Checkouts
If Client 1 checks out `[Product A, Product B]` and Client 2 checks out `[Product B, Product A]`:
- Client 1 acquires lock on `Product A`, waits for `Product B`.
- Client 2 acquires lock on `Product B`, waits for `Product A`.
- Result: **Database Deadlock** (`40P01: deadlock detected`), aborting one or both transactions.

### 5.2 Deterministic Global Lock Ordering Solution
To eliminate deadlock vulnerability across multi-item checkouts:
1. **Quantity Aggregation**: If a request payload contains duplicate entries for the same SKU, sum the requested quantities:
   $$\text{TotalQty}(\text{prod\_id}) = \sum \text{quantity}$$
2. **Alphabetical Lock Ordering**: Product rows are locked deterministically by sorting unique IDs in ascending lexicographical order:
   ```sql
   SELECT id, name, price, stock_qty
   FROM products
   WHERE id = ANY(v_unique_product_ids)
   ORDER BY id ASC
   FOR UPDATE;
   ```
3. **Deadlock Invariant**: Because all transactions acquire locks in the exact same global order ($A \rightarrow B \rightarrow C$), circular lock waiting is mathematically impossible.

---

## 6. Stock Invariants

The implementation guarantees the following formal invariants:

| # | Formal Invariant | Verification Mechanism |
|---|---|---|
| **I-1** | Product stock quantity is never negative ($\text{stock\_qty} \ge 0$). | Enforced by `stock_qty >= requested_qty` check inside exclusive lock. |
| **I-2** | Successful checkout decrements stock by exactly the ordered quantity. | Enforced by `SET stock_qty = stock_qty - requested_qty` SQL decrement. |
| **I-3** | Failed checkout (stock, validation, network, syntax) consumes 0 stock. | Enforced by atomic PostgreSQL `ROLLBACK` on exception. |
| **I-4** | Insufficient stock on any single item in a multi-item basket cancels the entire order. | Enforced by all-or-nothing transactional boundary. |
| **I-5** | Order header and line items consistency is 100% atomic. | Enforced by committing `orders` and `order_items` in the same transaction. |
| **I-6** | Concurrent requests for the final unit ($\text{stock}=1$) permit exactly 1 winner. | Enforced by row locking (`FOR UPDATE`); subsequent transactions observe updated stock ($0$) and fail cleanly. |

---

## 7. Monetary Integrity & Server Authority

All financial calculations remain strictly server-authoritative:

1. **Client Price Stripping**: Any `it.price` or `it.unit_price` submitted in `POST /api/orders` is discarded by the API layer. Authoritative product prices are read directly from the locked database records.
2. **Authoritative Subtotal**: Calculated as:
   $$\text{Subtotal} = \sum_{i=1}^{n} (\text{db\_price}_i \times \text{quantity}_i)$$
3. **Server-Enforced Shipping**: Computed by API middleware based on authoritative subtotal threshold and normalized customer city:
   $$\text{Shipping} = \begin{cases} 0 & \text{if Subtotal} \ge 2500 \\ 55 & \text{if Cairo} \\ 80 & \text{if Giza} \\ 75 & \text{otherwise} \end{cases}$$
4. **Discount Hardening**: `serverAuthorizedDiscount` is set to `0` (or computed via backend promotional rules), completely overriding any client-supplied discount.
5. **Final Total**:
   $$\text{Total} = \max(0, \text{Subtotal} + \text{Shipping} - \text{Discount})$$

---

## 8. Local Fallback Design (`server/data/store.json`)

When Supabase is not configured (`isSupabaseConfigured === false`), the local JSON store provides atomic consistency under the following design:

### 8.1 Single-Process Architecture
- To prevent cross-worker memory partitioning, running without Supabase defaults to single-process mode (`WEB_CONCURRENCY=1`).

### 8.2 Synchronous In-Memory Transaction Block
JavaScript in a single Node.js process executes on a single event-loop thread. A fully synchronous validation and mutation block guarantees thread safety across concurrent asynchronous requests:

```js
// Synchronous atomic transaction execution in server/lib/supabase.js
async processOrderCheckoutLocal(orderData, items) {
  // 1. Synchronous validation phase (no await points)
  for (const it of items) {
    const product = localStore.get(`product:${it.product_id}`);
    if (!product) {
      const err = new Error(JSON.stringify({ code: 'PRODUCT_NOT_FOUND', product_id: it.product_id }));
      err.code = 'PRODUCT_NOT_FOUND';
      throw err;
    }
    const availableStock = Number(product.stock_qty ?? product.stock ?? 0);
    if (availableStock < it.quantity) {
      const err = new Error(JSON.stringify({
        code: 'INSUFFICIENT_STOCK',
        product_id: it.product_id,
        product_name: product.name,
        available_stock: availableStock,
        requested_qty: it.quantity
      }));
      err.code = 'INSUFFICIENT_STOCK';
      throw err;
    }
  }

  // 2. Synchronous mutation phase (all items guaranteed valid)
  for (const it of items) {
    const product = localStore.get(`product:${it.product_id}`);
    const availableStock = Number(product.stock_qty ?? product.stock ?? 0);
    product.stock_qty = Math.max(0, availableStock - it.quantity);
    product.updated_at = new Date().toISOString();
  }

  orderData.order_items = items;
  localStore.set(`order:${orderData.id}`, orderData);

  // 3. Persist to disk via existing atomic write queue
  await saveStoreToDisk();

  return orderData;
}
```

### 8.3 Guarantees & Limitations
- **Guarantee**: Synchronous execution prevents TOCTOU race conditions within the Node.js process.
- **Limitation**: Crash resilience is bounded by filesystem sync (`fs.promises.sync()`). If OS power fails mid-flush, the atomic rename ensures `store.json` remains in the prior uncorrupted state.

---

## 9. Error Mapping Matrix

| Internal Database / RPC Outcome | HTTP Status | Error Code (`code`) | Client Error Message (`error`) |
|---|---|---|---|
| **Stock Insufficient on Item** | `400 Bad Request` | `INSUFFICIENT_STOCK` | `الكمية المطلوبة من (${product_name}) غير متوفرة. المتاح حالياً: ${available_stock}` |
| **Product ID Missing / Inactive** | `400 Bad Request` | `PRODUCT_NOT_FOUND` | `المنتج غير موجود: ${product_id}` |
| **Missing Customer Fields** | `400 Bad Request` | `INVALID_DATA` | `يرجى إكمال جميع بيانات العميل والعنوان` |
| **Empty Cart / Items** | `400 Bad Request` | `EMPTY_CART` | `سلة المشتريات فارغة` |
| **Invalid Quantity ($\le 0$ / non-int)** | `400 Bad Request` | `INVALID_ITEM` | `بيانات المنتج غير صالحة` |
| **Transaction Deadlock / DB Error** | `500 Internal Server Error` | `CHECKOUT_FAILED` | `حدث خطأ أثناء معالجة الطلب، يرجى المحاولة مرة أخرى` |

---

## 10. Retry & Duplicate Request Analysis

### Current State:
- The current API endpoint `POST /api/orders` generates a fresh `orderId = order-${Date.now()}` and `reference = TH-YYYY-XXXXXX` on each invocation.
- If a client experiences a network timeout after the server committed the transaction, a browser retry will submit a second checkout request, potentially creating a duplicate order and deducting double stock if inventory allows.

### Future Hardening Recommendation (Out of Scope for P1-01 Fix):
- Introduce an optional `Idempotency-Key` HTTP header (or client-generated `client_order_token`).
- Store idempotency tokens in a dedicated table with a 24-hour TTL.
- For P1-01, existing client behavior is preserved; duplicate submission prevention is handled on frontend via checkout button disable state.

---

## 11. Incremental Phased Migration Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Baseline Characterization Tests                    │
│ Inputs: Non-destructive concurrency test harness            │
│ Expected: Verify reproduction of race condition in baseline │
│ Production Impact: NONE                                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Supabase RPC & Schema Migration                    │
│ Inputs: supabase/migrations/004_order_checkout_rpc.sql      │
│ Expected: process_order_checkout deployed to Supabase      │
│ Production Impact: Safe addition of function (non-breaking) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Backend Integration (orders.js & supabase.js)      │
│ Inputs: db.processOrderCheckout implementation              │
│ Expected: API delegates checkout to transactional RPC       │
│ Production Impact: Zero API contract change                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Local Fallback Parity Implementation               │
│ Inputs: Synchronous atomic commit in supabase.js            │
│ Expected: 100% race-condition elimination in localStore     │
│ Production Impact: NONE                                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: Concurrency & Chaos Stress Testing                 │
│ Inputs: Multi-worker race test suite (50 concurrent checkouts)
│ Expected: Exactly N winners, zero negative stock, 0 corrupt │
│ Production Impact: Isolated test suite                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 6: Production Rollout                                 │
│ Inputs: Deploy to Railway with ENABLE_RPC_CHECKOUT=true     │
│ Expected: Production checkout protected under live traffic  │
│ Rollback Path: Set ENABLE_RPC_CHECKOUT=false                │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Test Matrix Specification

| Test ID | Test Scenario | Initial Setup | Execution Action | Expected Invariant / Outcome |
|---|---|---|---|---|
| **TEST-A** | Single Standard Checkout | Prod A stock = 10 | 1 request for 2 units | Order created, 201 Created, final stock = 8. |
| **TEST-B** | Insufficient Stock Checkout | Prod A stock = 1 | 1 request for 2 units | 400 `INSUFFICIENT_STOCK`, stock unchanged at 1. |
| **TEST-C** | Exact Final Quantity | Prod A stock = 3 | 1 request for 3 units | Order created, 201 Created, final stock = 0. |
| **TEST-D** | Two Concurrent Final-Unit Requests | Prod A stock = 1 | 2 simultaneous requests for 1 unit | Exactly 1 request gets 201; 1 request gets 400. Stock = 0. |
| **TEST-E** | Three Concurrent Buyers Overlapping | Prod A stock = 10 | 3 simultaneous requests for 4 units each | Exactly 2 requests get 201 (8 units sold); 1 gets 400. Stock = 2. |
| **TEST-F** | Overlapping Multi-Item Checkouts | Prod A stock = 5, Prod B stock = 2 | Req 1: [A:3, B:2], Req 2: [A:3, B:1] | 1 request gets 201; 1 gets 400. Zero partial state. |
| **TEST-G** | Multi-Worker Cluster Concurrency | Prod A stock = 4 | 20 requests distributed across 4 cluster workers | Exactly 4 units sold total. Stock = 0. Zero clobbering. |
| **TEST-H** | Repeated Identical Requests | Prod A stock = 5 | 5 sequential requests for 1 unit | 5 orders created, final stock = 0. |
| **TEST-I** | Database Transaction Failure | Prod A stock = 5 | Injected DB syntax error during order items insert | RPC raises error; product stock rolled back to 5. |
| **TEST-J** | Order Creation Failure | Prod A stock = 5 | Constraint violation on order reference | Transaction rolls back; zero stock decremented. |
| **TEST-K** | Stock Decrement Failure | Prod A stock = 0 | Checkout submitted | Order not created; error returned immediately. |
| **TEST-L** | Cart Finalization Failure | Prod A stock = 5 | `clearCart` throws after order commit | Order remains 201 Created; warning logged. |
| **TEST-M** | Database Network Interruption | Prod A stock = 5 | Connection drops mid-transaction | PostgreSQL closes connection and rolls back. |
| **TEST-N** | Local Fallback Concurrency | Prod A stock = 2 (Local JSON) | 10 concurrent async checkout calls in Node.js | Exactly 2 succeed, 8 fail with 400. Stock = 0. |
| **TEST-O** | Negative / Zero Quantity Attack | Prod A stock = 5 | Request with `quantity: -5` or `0` | Rejected with 400 `INVALID_ITEM`; stock untouched. |
| **TEST-P** | Duplicate Product Lines in Basket | Prod A stock = 5 | Basket with `[Prod A (qty 2), Prod A (qty 2)]` | Aggregates to 4 units; 1 order created; stock = 1. |
| **TEST-Q** | Forged Client Price Tampering | Prod A DB price = 1000 | Request payload with `price: 1` | Server overrides with 1000; total = 1000. |
| **TEST-R** | Forged Client Total Tampering | Subtotal = 5000 | Request payload with `total: 50` | Server recalculates total = 5000. |
| **TEST-S** | Forged Free Shipping Tampering | Subtotal = 500 (Giza) | Request payload with `shipping_cost: 0` | Server charges 80 EGP shipping authoritatively. |
| **TEST-T** | Forged Discount Tampering | Subtotal = 2000 | Request payload with `discount: 1000` | Server overrides discount = 0. |
| **TEST-U** | Guest Checkout Verification | Guest user | Checkout with valid guest phone & address | 201 Created; guest order privacy preserved. |
| **TEST-V** | Authenticated User Checkout | User logged in | Checkout with JWT token | 201 Created; cart cleared; user orders linked. |

---

## 13. Observability & Telemetry Requirements

Following implementation, the system will expose structured log events and metrics:

- **Metrics**:
  - `checkout_requests_total{status="success|insufficient_stock|error", payment_method="..."}`
  - `checkout_concurrency_conflicts_total{product_id="..."}`
  - `checkout_rpc_latency_ms` (Histogram)
- **Structured Log Example (`order.checkout.insufficient_stock`)**:
  ```json
  {
    "timestamp": "2026-09-16T19:00:00.000Z",
    "event": "order.checkout.insufficient_stock",
    "orderId": "order-1773756800000",
    "productId": "prod-phone",
    "requestedQty": 2,
    "availableStock": 1,
    "durationMs": 14.2
  }
  ```

---

## 14. API Compatibility & Contract Stability

| Contract Element | Before P1-01 Fix | After P1-01 Fix | Status |
|---|---|---|---|
| **HTTP Method & Path** | `POST /api/orders` | `POST /api/orders` | **IDENTICAL** |
| **Request Headers** | `x-session-id`, `authorization` | `x-session-id`, `authorization` | **IDENTICAL** |
| **Request Body Shape** | `{ customer: {...}, items: [...], notes: '...' }` | `{ customer: {...}, items: [...], notes: '...' }` | **IDENTICAL** |
| **Success Status Code** | `201 Created` | `201 Created` | **IDENTICAL** |
| **Success Response JSON** | `{ success: true, message: '...', data: <order> }` | `{ success: true, message: '...', data: <order> }` | **IDENTICAL** |
| **Out of Stock Status** | `400 Bad Request` | `400 Bad Request` | **IDENTICAL** |
| **Out of Stock Code** | `INSUFFICIENT_STOCK` | `INSUFFICIENT_STOCK` | **IDENTICAL** |
| **Out of Stock Message** | `الكمية المطلوبة من (...) غير متوفرة...` | `الكمية المطلوبة من (...) غير متوفرة...` | **IDENTICAL** |
| **Frontend Code Changes Required** | None | None | **ZERO BREAKING CHANGES** |

---

## 15. Safety Boundary & Invariant Shielding

The implementation strictly isolates stock concurrency logic:
1. **Cart & Wishlist Isolation**: Cart state storage, sync mechanisms, and item structures are untouched.
2. **Auth Isolation**: JWT issuance, session validation, and password verification remain untouched.
3. **SCA-3 Cache Isolation**: Cache middleware route guards, cluster IPC broadcasts, and cache provider interfaces are untouched.
4. **Catalog & PC Builder Isolation**: Search, category queries, and compatibility calculators remain untouched.

---

## 16. Exact Implementation Sequence

When authorized to execute the implementation, the following precise steps will be executed:

1. **Step 1: Create SQL Migration**:
   - Create `server/db/migrations/004_order_checkout_rpc.sql` containing the `process_order_checkout` stored procedure.
2. **Step 2: Add RPC Handler in `supabase.js`**:
   - Add `processOrderCheckout(orderData, items)` method inside `server/lib/supabase.js`.
   - Implement Supabase path (`supabase.rpc('process_order_checkout', ...)`) and local fallback path (`processOrderCheckoutLocal`).
3. **Step 3: Update `POST /api/orders` in `orders.js`**:
   - Replace the non-atomic validation/creation/stock-decrement loop with a single call to `db.processOrderCheckout(...)`.
   - Map `INSUFFICIENT_STOCK` and `PRODUCT_NOT_FOUND` errors to existing 400 status codes.
4. **Step 4: Execute Test Suite**:
   - Run the 22-case test suite (`test_stock_concurrency.cjs`) to verify zero overselling under concurrent load.
5. **Step 5: Verify Build & Lint**:
   - Run `npm run lint` and `npm run build`.

---

## 17. Rollback Plan

If any issue arises during or after deployment:
1. **Feature Flag Kill-Switch**: The backend integration will support an environment variable `ENABLE_RPC_CHECKOUT` (default: `true`). Setting `ENABLE_RPC_CHECKOUT=false` immediately falls back to the legacy sequential execution without code redeployment.
2. **Database Rollback**: The PostgreSQL function can be dropped via `DROP FUNCTION IF EXISTS process_order_checkout;` without affecting existing table structures or data.
3. **Zero Data Loss Guarantee**: All orders created by either mechanism write to the exact same standard `orders` and `order_items` tables.

---

## 18. Open Questions & Final Decisions

1. **Deterministic Order Item IDs**:
   - *Decision*: Line item UUIDs are generated in Node.js (`uuidv4()`) and passed into the RPC within `p_items`, ensuring line items have deterministic IDs before insertion.
2. **Local Fallback Multi-Worker Mode**:
   - *Decision*: When `isSupabaseConfigured === false`, Node.js cluster forks are restricted to single-worker mode to prevent cross-process memory divergence.
3. **Payment Expiration Handling**:
   - *Decision*: Online payment methods (`card`, `wallet`, `instapay`) create orders in `pending_payment` with stock reserved. A scheduled 60-minute cleanup worker can be scheduled in a future milestone to release expired stock.
