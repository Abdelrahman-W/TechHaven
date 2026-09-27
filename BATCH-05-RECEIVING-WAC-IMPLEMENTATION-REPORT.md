# TechHaven ERP-Lite — BATCH 05: Purchase Order Receiving + Weighted Average Cost (WAC) Report

**Document Version:** 1.0.0  
**Phase:** ERP-Lite Inventory Costing & Procurement Operations (Batch 05)  
**Execution Date:** September 27, 2026  
**Status:** **VERIFIED & PRODUCTION READY**  

> **COSTING POLICY DECLARATION:**  
> **TechHaven uses Weighted Average Cost (WAC) for current operational inventory cost.**  
> **Historical `order_items.unit_cost` snapshots remain strictly immutable and are never recalculated from current WAC.**

---

## 1. Executive Summary

Batch 05 delivers the end-to-end **Physical Purchase Order Receiving** workflow, connecting purchase orders, physical receiving records, authoritative inventory ledger movements (`PURCHASE_RECEIPT`), stock projection updates, and automated **Weighted Average Cost (WAC)** valuation updates into a single atomic transaction.

### Core Architectural Guarantees:
1. **Fixed Costing Policy (WAC)**: Strictly implements Weighted Average Costing. No FIFO, no Last Purchase Cost, and no arbitrary costing.
2. **Server-Authoritative Atomicity**: All receiving operations (stock increment, WAC recalculation, `PURCHASE_RECEIPT` movements, receiving record creation, and PO status progression) execute atomically with full rollback safety across dual topologies (PostgreSQL transactional RPC `process_purchase_order_receiving` & Local serialized in-memory/disk store).
3. **Immutable Historical Cost Protection**: Sales order items capture fixed unit cost at checkout (`order_items.unit_cost`). Future PO receipts and WAC recalculations do not alter past COGS or sale cost snapshots.
4. **Strict Status Lifecycle**: Only `CONFIRMED` purchase orders can be received. Receipts transition POs to `PARTIALLY_RECEIVED` or `FULLY_RECEIVED` (auto-closing to `CLOSED`). `DRAFT`, `CANCELLED`, and `CLOSED` POs reject receipts.
5. **Over-Receiving Guard**: Receiving quantities are strictly validated server-side (`received_qty <= remaining_qty`). Over-receiving is rejected with 400.
6. **Concurrency & Idempotency Protection**: Idempotent receiving supported via `x-idempotency-key` / `idempotency_key` preventing duplicate submissions, double-clicks, or replay attacks. Row-level locks prevent lost updates during concurrent receipts.
7. **Granular RBAC**: Enforced via `purchasing.receive`. Inventory Officers, Store Managers, and Owners can receive goods; customers and unauthenticated users receive 403/401.
8. **Automated Verification**: Dedicated 18-test suite (`scratch/test_receiving_wac.mjs`) with **31 of 31 acceptance test suites passing (100%)** and `store.json` checksum preserved.

---

## 2. Weighted Average Cost (WAC) Implementation

### 2.1 Formula & Logic

For an existing product receiving inventory:
```
old_qty           = current products.stock_qty (or 0)
old_cost          = current products.cost_price
receipt_qty       = quantity being physically received (> 0)
receipt_unit_cost = authoritative purchase price from PO line item (>= 0)

old_value         = old_qty * old_cost
receipt_value     = receipt_qty * receipt_unit_cost
new_qty           = old_qty + receipt_qty

new_cost          = ROUND((old_value + receipt_value) / new_qty, 2)
```

### 2.2 Boundary & Zero-Stock Behavior
- **Zero Old Stock (`old_qty == 0` or unset `cost_price`)**: `new_cost = receipt_unit_cost`. The incoming purchase price directly initializes the product's operational WAC without division by zero.
- **Precision**: Monetary rounding to 2 decimal places (`EGP 0.01` precision) using standard half-up rounding.
- **Zero-Cost Receipt (`receipt_unit_cost == 0`)**: Mathematically supported (`new_cost = (old_qty * old_cost) / (old_qty + receipt_qty)`).
- **Validation**: Negative quantities (`<= 0`) and negative purchase prices (`< 0`) are rejected at domain service and database constraint levels.

---

## 3. Database Schema & RPC Architecture

### 3.1 PostgreSQL Migration (`database/migrations/20260927_b05_receiving_wac.sql`)

#### Table: `receivings`
```sql
CREATE TABLE IF NOT EXISTS public.receivings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_number TEXT NOT NULL UNIQUE,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
  notes TEXT,
  received_by TEXT,
  total_items_count INT NOT NULL DEFAULT 0,
  total_received_qty INT NOT NULL DEFAULT 0,
  total_receipt_value NUMERIC NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Table: `receiving_items`
```sql
CREATE TABLE IF NOT EXISTS public.receiving_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_id UUID NOT NULL REFERENCES public.receivings(id) ON DELETE CASCADE,
  purchase_order_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  received_quantity INT NOT NULL CHECK (received_quantity > 0),
  unit_cost NUMERIC NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC NOT NULL CHECK (total_cost >= 0),
  old_stock INT NOT NULL DEFAULT 0,
  new_stock INT NOT NULL DEFAULT 0,
  old_cost_price NUMERIC,
  new_cost_price NUMERIC NOT NULL CHECK (new_cost_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_receiving_item_total CHECK (total_cost = received_quantity * unit_cost)
);
```

#### Columns Added to Existing Entities:
- `purchase_order_items.received_quantity` (`INT NOT NULL DEFAULT 0 CHECK (received_quantity >= 0 AND received_quantity <= quantity)`)
- `purchase_orders.receiving_status` (`TEXT NOT NULL DEFAULT 'UNRECEIVED' CHECK (receiving_status IN ('UNRECEIVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'))`)

### 3.2 Atomic RPC Function (`process_purchase_order_receiving`)
- Locks purchase order and product rows (`FOR UPDATE`).
- Verifies PO status eligibility (`status = 'CONFIRMED'`) and checks against `FULLY_RECEIVED`.
- Iterates line items, ensures `received_quantity + recv_qty <= quantity`.
- Computes new stock quantity and new WAC `cost_price`.
- Updates `products` stock and cost price.
- Inserts `inventory_movements` record (`type = 'PURCHASE_RECEIPT'`, `reference_type = 'PURCHASE_RECEIPT'`, `reference_id = receiving_id`).
- Inserts `receiving_items` capturing immutable receipt cost.
- Updates `purchase_orders.receiving_status` and auto-closes PO to `CLOSED` when all items are fully received.

---

## 4. API Endpoints & RBAC Matrix

| Endpoint | Method | Required Permission | Description |
|:---|:---:|:---|:---|
| `/api/purchasing/orders/:id/receive` | `POST` | `purchasing.receive` | Process physical receipt of goods, update stock, WAC, and ledger |
| `/api/purchasing/orders/:id/receivings` | `GET` | `purchasing.view` | List all historical receiving records for a purchase order |
| `/api/purchasing/receivings/:id` | `GET` | `purchasing.view` | Retrieve specific receiving record and line item breakdown |

---

## 5. Frontend Admin Integration

### Admin Purchase Orders (`src/pages/Admin/PurchaseOrders.jsx`)
- **Action Buttons**: Added "استلام" (Receive) button on table rows and details modal for confirmed orders that are not fully received.
- **Item Breakdown**: Shows Ordered, Received, and Remaining quantities with clear visual status indicators.
- **Physical Receiving Modal**:
  - Live table of PO items with Remaining and Receive Qty inputs.
  - Automatic validation preventing submission if receive quantity exceeds remaining.
  - Optional Notes and Idempotency Key inputs.
  - Real-time total receipt value computation.
  - On submit: calls `api.receivePurchaseOrder`, updates stock, reloads PO details, and invalidates caches.

---

## 6. Verification & Test Results

### 6.1 Focused Acceptance Suite (`scratch/test_receiving_wac.mjs`)
- **Test 1**: Guest access to receiving endpoint rejected with 401.
- **Test 2**: Customer access to receiving endpoint rejected with 403.
- **Test 3**: Fulfillment agent without `purchasing.receive` rejected with 403.
- **Test 4**: Attempt to receive a `DRAFT` purchase order rejected with 400 (`PO_NOT_ELIGIBLE_FOR_RECEIVING`).
- **Test 5**: Over-receiving beyond ordered quantity rejected with 400 (`OVER_RECEIVING_NOT_ALLOWED`).
- **Test 6**: Zero/negative receiving quantity rejected with 400 (`INVALID_RECEIVING_QUANTITY`).
- **Test 7**: Partial receiving succeeds and sets `receiving_status = PARTIALLY_RECEIVED`.
- **Test 8**: Stock and WAC cost price updated atomically.
- **Test 9**: `PURCHASE_RECEIPT` movement logged with accurate `stock_before` and `stock_after`.
- **Test 10**: Receiving master and line items accurately capture immutable receipt costs.
- **Test 11**: Full receipt updates status to `FULLY_RECEIVED` and automatically transitions PO to `CLOSED`.
- **Test 12**: Attempt to receive on `CLOSED` / `FULLY_RECEIVED` PO rejected with 400.
- **Test 13**: Zero-stock product correctly initializes WAC `cost_price` to receipt unit cost.
- **Test 14**: Multi-stage sequential WAC mathematical exactness verified (`(20*150 + 20*250)/40 = 200 EGP`).
- **Test 15**: All-or-nothing rollback atomicity verified on multi-item partial failure.
- **Test 16**: Idempotency key prevents duplicate receiving and protects against network replays.
- **Test 17**: Historical sales order item costs (`order_items.unit_cost`) verified immutable.
- **Test 18**: Concurrent receipts execute safely without lost updates.
- **Result**: **18/18 Tests Passed (100%)**.

### 6.2 Full Regression Suite (`scratch/run_all_acceptance_suites.mjs`)
- **Total Test Suites**: 31
- **Passed**: 31 (100%)
- **Failed**: 0 (0%)
- **Data Integrity**: `store.json` MD5 preserved (`34e2394b5c02a873ee55841d332baec6`).

### 6.3 Code Quality & Build Verification
- **ESLint**: `npx eslint server/lib/receivingService.js server/routes/purchasing.js src/pages/Admin/PurchaseOrders.jsx src/lib/api.js server/lib/supabase.js` → **0 errors, 0 warnings**.
- **Production Build**: `npm run build` → **✓ built in 3.47s** (zero errors).

---

## 7. Artifact Inventory

- **PostgreSQL Up Migration**: `database/migrations/20260927_b05_receiving_wac.sql`
- **PostgreSQL Down Migration**: `database/migrations/20260927_b05_receiving_wac_down.sql`
- **Domain Service**: `server/lib/receivingService.js`
- **Database Adapter Extension**: `server/lib/supabase.js`
- **API Controller**: `server/routes/purchasing.js`
- **Frontend Client**: `src/lib/api.js`
- **Admin UI**: `src/pages/Admin/PurchaseOrders.jsx`
- **Acceptance Test Suite**: `scratch/test_receiving_wac.mjs`
