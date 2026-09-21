# P1-01 SUPABASE ATOMIC CHECKOUT RPC IMPLEMENTATION & VERIFICATION

**Date:** September 16, 2026  
**System:** TechHaven (EgyHardware Full-Stack Platform)  
**Milestone:** P1-01 — Phase 2: Supabase/PostgreSQL Atomic Checkout RPC  
**Status:** **P1-01 PHASE 2 SUPABASE RPC = PASS**  
**Execution Boundary:** STRICT PHASE 2 ONLY (Database/RPC Definition + Isolated Verification; No Application Integration)

---

## 1. Current Schema Verified

The canonical PostgreSQL schema was verified directly from `database/schema.sql` and `server/lib/supabase.js`:

| Table | Primary Key | Relevant Columns & Types | Constraints & Foreign Keys |
|---|---|---|---|
| **`products`** | `id` (`UUID`) | `sku` (`text`), `name` (`text`), `price` (`decimal(12,2)`), `stock_qty` (`int`), `reserved_qty` (`int`), `thumbnail` (`text`), `is_active` (`boolean`), `updated_at` (`timestamptz`) | `check (price >= 0)`, `check (stock_qty >= 0)`, `unique(sku)`, `unique(slug)` |
| **`orders`** | `id` (`UUID`) | `reference` (`text`), `user_id` (`UUID` nullable), `customer_name` (`text`), `customer_email` (`text`), `customer_phone` (`text`), `customer_city` (`text`), `customer_address` (`text`), `customer_notes` (`text`), `payment_method` (`text`), `payment_status` (`text`), `status` (`text`), `subtotal` (`decimal(12,2)`), `shipping_cost` (`decimal(12,2)`), `tax_amount` (`decimal(12,2)`), `discount_amount` (`decimal(12,2)`), `total` (`decimal(12,2)`), `created_at` (`timestamptz`), `updated_at` (`timestamptz`) | `unique(reference)`, `references public.users(id)` |
| **`order_items`** | `id` (`UUID`) | `order_id` (`UUID`), `product_id` (`UUID`), `product_name` (`text`), `product_sku` (`text`), `product_image` (`text`), `quantity` (`int`), `unit_price` (`decimal(12,2)`), `total_price` (`decimal(12,2)`), `specs_snapshot` (`jsonb`), `created_at` (`timestamptz`) | `foreign key (order_id) references orders(id) on delete cascade`, `check (quantity > 0)` |
| **`users`** | `id` (`UUID`) | `email` (`text`), `full_name` (`text`), `phone` (`text`), `role` (`text`) | `unique(email)` |

---

## 2. Supabase RPC Signature

The PostgreSQL PL/pgSQL function is created in the `public` schema as `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION public.process_order_checkout(
  p_order_id UUID DEFAULT uuid_generate_v4(),
  p_reference TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT '',
  p_customer_phone TEXT DEFAULT '',
  p_customer_email TEXT DEFAULT '',
  p_customer_city TEXT DEFAULT '',
  p_customer_address TEXT DEFAULT '',
  p_customer_notes TEXT DEFAULT '',
  p_payment_method TEXT DEFAULT 'cod',
  p_payment_status TEXT DEFAULT 'pending',
  p_status TEXT DEFAULT 'pending',
  p_shipping_cost NUMERIC DEFAULT 0,
  p_discount_amount NUMERIC DEFAULT 0,
  p_coupon_code TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb,
  p_timeline JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER;
```

---

## 3. Transaction Boundary

The RPC executes within a single ACID transaction managed entirely inside PostgreSQL:

```
[RPC INVOCATION: public.process_order_checkout]
                      │
                      ▼
            [1. Validate Inputs]
  (Customer Name, Phone, Address, Non-empty Items, Positive Quantities)
                      │
                      ▼
     [2. Aggregate Duplicate Product Lines]
        (SUM(quantity) GROUP BY product_id)
                      │
                      ▼
     [3. Acquire Row-Level Locks (FOR UPDATE)]
        (Locked strictly in ASCENDING UUID order)
                      │
                      ▼
   [4. Authoritative Stock & Existence Check]
        (If available_stock < requested_qty ──▶ RAISE EXCEPTION 'INSUFFICIENT_STOCK')
        (If missing product ──▶ RAISE EXCEPTION 'PRODUCT_NOT_FOUND')
                      │
                      ▼
         [5. Decrement Product Stock]
 (UPDATE products SET stock_qty = stock_qty - qty, updated_at = NOW())
                      │
                      ▼
       [6. Recompute Authoritative Totals]
   (Subtotal = SUM(db_price * qty); Total = Subtotal + Shipping - Discount)
                      │
                      ▼
           [7. Insert Order Record]
         (INSERT INTO public.orders ...)
                      │
                      ▼
         [8. Insert Order Item Records]
       (INSERT INTO public.order_items ...)
                      │
                      ▼
     [9. Assemble JSON & COMMIT TRANSACTION]
   (Returns complete order object matching API schema)
                      │
                      ▼
        [EXCEPTION ANYWHERE ──▶ ROLLBACK]
  (Zero records inserted, zero stock decremented, clean error returned)
```

---

## 4. Duplicate Line Handling

When a basket contains multiple lines referencing the same product ID:
- **Aggregation Strategy:** The RPC loads items into a temporary aggregation structure and computes `SUM(quantity) GROUP BY product_id`.
- **Validation:** Total requested quantity is validated against authoritative stock once per product.
- **Decrement:** A single `UPDATE products SET stock_qty = stock_qty - total_qty` is executed per distinct product.
- **Item Preservation:** Multiple line items in the basket remain preserved as distinct rows in `order_items`.

---

## 5. Row Lock Ordering & Deadlock Prevention

To eliminate PostgreSQL deadlocks (`40P01`) under concurrent overlapping carts:
- Distinct product IDs are sorted in **ascending lexical order** (`ORDER BY p.id ASC`).
- Row-level locks are acquired deterministically:
  ```sql
  SELECT p.id, p.name, p.sku, p.price, p.stock_qty, p.thumbnail, t.total_qty
  FROM public.products p
  JOIN _temp_order_checkout_agg t ON p.id = t.prod_id
  ORDER BY p.id ASC
  FOR UPDATE OF p;
  ```
- Any two concurrent transactions touching overlapping sets of products (e.g. `[A, B]` and `[B, A]`) always lock `A` first, then `B`.

---

## 6. Stock Invariants Verified

| Invariant | Description | Enforcement Mechanism | Status |
|---|---|---|---|
| **I1** | Stock never becomes negative ($\text{stock\_qty} \ge 0$). | Check constraint on `products` + `FOR UPDATE` stock validation. | **ENFORCED** |
| **I2** | Decrement matches aggregate quantity sold. | `SUM(quantity) GROUP BY product_id` update. | **ENFORCED** |
| **I3** | Failed checkout decrements 0 stock. | PostgreSQL transaction rollback. | **ENFORCED** |
| **I4** | Insufficient stock produces 0 orders. | Stock check precedes all `INSERT` statements. | **ENFORCED** |
| **I5** | Order and order items are 100% consistent. | Co-located in the same transaction block. | **ENFORCED** |
| **I6** | Two concurrent final-unit checkouts cannot both succeed. | `FOR UPDATE` lock forces serialization; 2nd transaction sees stock = 0. | **ENFORCED** |
| **I7** | Duplicate lines cannot cause double/stale decrement. | Aggregation before decrement. | **ENFORCED** |
| **I8** | Stock update failure cannot leave a committed order behind. | Single ACID transaction boundary. | **ENFORCED** |

---

## 7. Error Outcomes & API Mapping

The RPC raises structured exceptions with custom JSON messages:

| Error Case | SQL State | RPC Error JSON Message | Intended API HTTP Status & Code |
|---|---|---|---|
| Insufficient Stock | `P0001` | `{"code": "INSUFFICIENT_STOCK", "error": "الكمية المطلوبة من (...) غير متوفرة. المتاح حالياً: X", "product_id": "...", "product_name": "...", "available_stock": N, "requested_qty": M}` | `400 Bad Request` + `code: 'INSUFFICIENT_STOCK'` |
| Missing Product | `P0001` | `{"code": "PRODUCT_NOT_FOUND", "error": "واحد أو أكثر من المنتجات المطلوبة غير متوفر في النظام"}` | `400 Bad Request` + `code: 'PRODUCT_NOT_FOUND'` |
| Incomplete Customer Data | `P0001` | `{"code": "INVALID_DATA", "error": "يرجى إكمال جميع بيانات العميل والعنوان"}` | `400 Bad Request` + `code: 'INVALID_DATA'` |
| Empty Cart | `P0001` | `{"code": "EMPTY_CART", "error": "سلة المشتريات فارغة"}` | `400 Bad Request` + `code: 'EMPTY_CART'` |
| Invalid Quantity ($\le 0$) | `P0001` | `{"code": "INVALID_QUANTITY", "error": "الكمية المطلوبة يجب أن تكون 1 أو أكثر"}` | `400 Bad Request` + `code: 'INVALID_QUANTITY'` |
| System / DB Error | Internal | PostgreSQL standard error / deadlock timeout | `500 Internal Server Error` + `code: 'CHECKOUT_FAILED'` |

---

## 8. Monetary Integrity

- **Product Prices:** Client-supplied prices inside items array are completely ignored. Prices are read directly from `products.price` inside the locked transaction.
- **Subtotal:** Recalculated inside the database as $\sum (\text{db\_price} \times \text{qty})$.
- **Shipping & Discounts:** Validated server-side values are passed as `p_shipping_cost` and `p_discount_amount`. Total is computed inside the RPC as $\max(0, \text{subtotal} + \text{shipping} - \text{discount})$.

---

## 9. Concurrency Test Results (`scratch/p1-01/test_supabase_rpc.mjs`)

| Test Scenario | Initial Stock | Concurrency | Outcome | Status |
|---|---|---|---|---|
| **Case F: Two Concurrent Final-Unit Requests** | 1 | 2 requests for 1 unit fired simultaneously (`Promise.allSettled`) | Exactly 1 succeeded (`201`), exactly 1 rejected (`INSUFFICIENT_STOCK`), final stock = 0, exactly 1 order in DB. | **PASS** |
| **Case G: Three Concurrent Buyers for 1 Unit** | 1 | 3 requests for 1 unit fired simultaneously | Exactly 1 succeeded, exactly 2 rejected, final stock = 0, exactly 1 order in DB. | **PASS** |
| **Case D: Duplicate Product Lines** | 10 | 1 request with `[qty: 2, qty: 3]` for same SKU | Subtotal computed for 5 units, stock decremented by exactly 5 (final stock = 5). | **PASS** |
| **Case E: Overlapping Multi-Product Requests** | P1: 4, P2: 4 | Multi-item basket | Both items locked and decremented safely. | **PASS** |

---

## 10. Failure Injection Results

| Injected Failure Point | Mechanism | Observed Behavior | Rollback Verification |
|---|---|---|---|
| **Post-Stock Decrement Failure** | Exception raised after decrement | Transaction rolled back; stock returned to initial value; 0 orders created. | **100% CLEAN ROLLBACK** |
| **Post-Order Insert Failure** | Exception raised after order insert | Transaction rolled back; order record removed; stock restored. | **100% CLEAN ROLLBACK** |
| **Post-Order Items Failure** | Exception raised during item loop | Transaction rolled back; order header and items dropped; stock restored. | **100% CLEAN ROLLBACK** |

---

## 11. Migration Details

- **Migration Up File:** `database/migrations/20260916_p1_01_stock_concurrency_rpc.sql`
- **Migration Down File:** `database/migrations/20260916_p1_01_stock_concurrency_rpc_down.sql`
- **Dependencies:** PostgreSQL $\ge$ 13, `uuid-ossp` extension.
- **Lock Impact:** Zero schema table locks on migration execution (function creation only).
- **Security:** `SECURITY DEFINER` with explicit `GRANT EXECUTE` to `authenticated`, `anon`, and `service_role`.

---

## 12. Rollback Plan

If rollback is required:
```sql
-- Execute rollback migration
\i database/migrations/20260916_p1_01_stock_concurrency_rpc_down.sql
```
Dropping `process_order_checkout` has zero impact on table schemas or existing records.

---

## 13. Remaining Phase 3 Work

The following steps remain for **Phase 3 (Integration & End-to-End Verification)**:
1. Update `server/lib/supabase.js` to call `supabase.rpc('process_order_checkout', ...)` when Supabase is active.
2. Update local fallback implementation in `server/lib/supabase.js` to match transactional semantics and duplicate line aggregation.
3. Update `server/routes/orders.js` error handling to parse RPC error payloads.
4. Run full end-to-end integration tests and regression suites.
