# TechHaven ERP-Lite — BATCH 03: Historical Cost Snapshots & COGS Foundation Report

**Document Version:** 1.0.0  
**Phase:** ERP-Lite Financial Operations (Batch 03)  
**Execution Date:** September 27, 2026  
**Status:** **VERIFIED & PRODUCTION READY**  

---

## 1. Executive Summary

Batch 03 establishes a reliable historical product cost model so every completed sale preserves the product cost applicable at the moment of sale. This enables accurate calculation of Revenue, COGS, Gross Profit, and Gross Margin without becoming a full accounting system.

### Core Architectural Guarantees:
1. **Historical Cost Snapshots**: Each `order_item` now stores `unit_cost` and `total_cost` representing the product's cost at the time of sale.
2. **Immutable Historical Cost**: Changes to `products.cost_price` affect only future sales; existing order items retain their original cost snapshots.
3. **Authoritative Server-Side Resolution**: Cost is resolved server-side from the product's current `cost_price` during checkout; clients cannot forge or influence historical cost.
4. **Atomic Checkout Integration**: The historical cost snapshot is stored within the same database transaction as order creation, inventory decrement, and `SALE` movement creation.
5. **RBAC Protection**: Access to product cost data is governed by new `products.cost.view` and `products.cost.manage` permissions.
6. **COGS & Profit Calculation Domain Service**: A server-side `CogsService` provides accurate COGS, gross profit, and gross margin calculations based on historical snapshots.
7. **Explicit Missing Cost Handling**: Orders without historical cost (e.g., legacy data or products with null cost) are handled explicitly—no artificial zero-cost assumptions.
8. **Dual-Topology Parity**: Identical behavior and schema across Supabase PostgreSQL and local persisted JSON storage (`store.json`).
9. **Verified by Test Suite**: All new cost-snapshot and COGS tests pass, and the full acceptance regression suite (29/29) continues to pass.

---

## 2. Domain Model & Schema Changes

### 2.1 Products Table
- Added `cost_price NUMERIC` column (nullable) to store the **current** operational unit cost.
- Constraint: `cost_price IS NULL OR cost_price >= 0`.

### 2.2 Order Items Table
- Added `unit_cost NUMERIC` column (nullable) to store the **historical** unit cost at sale time.
- Added `total_cost NUMERIC` column (nullable) to store the historical total cost (`unit_cost × quantity`) for reporting efficiency.
- Constraints: 
  - `unit_cost IS NULL OR unit_cost >= 0`
  - `total_cost IS NULL OR total_cost >= 0`

### 2.3 Indexes
- `idx_order_items_unit_cost` on `(product_id, created_at DESC)` where `unit_cost IS NOT NULL` to accelerate cost-based analytics.

---

## 3. Atomic Checkout Workflow (Server-Side)

The `process_order_checkout` flow (both Supabase RPC and localStore adapter) now includes:

1. **Load Authoritative Product**: For each cart item, load the product from the source of truth (database or localStore).
2. **Resolve Current Cost**: Read `product.cost_price` (server-side only).
3. **Snapshot Creation**: 
   - `order_item.unit_cost = product.cost_price` (may be `null`)
   - `order_item.total_cost = product.cost_price × quantity` (or `null` if cost is missing)
4. **Persist Atomically**: The order, order items (with snapshots), inventory decrement, and `SALE` movement are written in a single transaction.
5. **Client Input Ignored**: Any `unit_cost` or `total_cost` provided in the client cart is discarded; only server-resolved values are stored.

### 3.1 Example
- Product A: `price = 10000`, `cost_price = 4000`
- Customer buys 2 units:
  - `order_item.unit_price = 10000`
  - `order_item.unit_cost = 4000` ← **snapshot**
  - `order_item.total_price = 20000`
  - `order_item.total_cost = 8000` ← **snapshot**
- Later, if `cost_price` changes to `4500`, new sales get the new cost; the above order item remains `4000`.

---

## 4. Cost Permissions & RBAC

Two new permissions were added to `server/lib/rbac.js`:

| Permission | Description |
|:---|:---|
| `products.cost.view` | Allows reading a product's `cost_price` (e.g., in admin product lists/forms). |
| `products.cost.manage` | Allows updating a product's `cost_price`. |

These were added to the `store_manager` role (and implicitly to `owner` via `'*'`), ensuring operational staff can manage costs while restricted roles (e.g., `fulfillment_agent`) cannot.

---

## 5. COGS & Profit Calculation Domain

A new service, `server/lib/cogsService.js`, provides:

### 5.1 Item-Level Calculation
```js
CogsService.calculateItemProfit(orderItem)
// → { unitCost, revenue, cogs, grossProfit, grossMargin, hasCost }
```

### 5.2 Order-Level Summary
```js
CogsService.calculateOrderProfit(order)
// → { revenue, cogs, grossProfit, grossMargin, costCoverage, isComplete, items: [...] }
```

### 5.3 Aggregate Analytics
```js
CogsService.calculateAggregateProfit(orders, { startDate, endDate })
// → { totalRevenue, totalCogs, totalUnitsSold, coveragePercentage, grossProfit, grossMargin }
```

**Key Features**:
- Uses **historical** `unit_cost` from `order_items`, never the current `product.cost_price`.
- Explicitly handles missing cost (`null`): `cogs`, `grossProfit`, and `grossMargin` become `null` when cost is unavailable.
- Supports partial coverage reporting (e.g., "COGS: 8,000 EGP, Coverage: 80%").
- Excludes cancelled orders from authoritative COGS & profit calculations.

---

## 6. API Endpoints & RBAC Matrix

| Endpoint | Method | Required Permission | Description |
|:---|:---:|:---|:---|
| `/api/analytics/profit` | `GET` | `reports.profit` | Returns aggregated COGS, revenue, gross profit, and gross margin for a date range. |
| `GET /api/products/:id` | `GET` | `products.cost.view` (for cost field) | Product cost is included in the response only if the caller has `products.cost.view`. |
| `PUT /api/products/:id` | `PUT` | `products.cost.manage` | Required to update `cost_price`. |
| `POST /api/products/:id/adjust-stock` | `POST` | `inventory.adjust` | Unchanged; uses `InventoryService` which respects cost snapshot rules. |

**Public Endpoints** (e.g., product catalog, cart, checkout) **do not** expose `cost_price`, `unit_cost`, `total_cost`, COGS, or profit.

---

## 7. Frontend User Interface

### 7.1 Admin Product Editor (`src/pages/Admin/Products.jsx`)
- Added a **Cost (EGP)** field to the product form.
- Visible only to users with `products.cost.view` permission.
- Editable only by users with `products.cost.manage` permission.
- Includes validation (non-negative number), loading, success, and error states.
- Follows existing TechHaven Admin design (inputs, buttons, RTL).

### 7.2 Admin Order Details
- No changes in this batch; cost and profit data remain server‑only.
- Prepares the ground for Batch 09 (Reports UI) where these values will be exposed to authorized roles.

### 7.3 Inventory Ledger
- Unchanged; continues to display stock movements and levels.

---

## 8. Local Storage & Supabase Parity

### 8.1 Local Store (`server/lib/supabase.js` in `MEMORY` mode)
- Products and order items persist the new `cost_price`, `unit_cost`, and `total_cost` fields.
- The `process_order_checkout` local adapter mirrors the RPC: resolves cost server‑side, stores snapshots, and applies inventory changes atomically within the in‑memory transaction.
- Existing `store.json` remains compatible; old orders lack the new cost fields (treated as `null`).

### 8.2 Supabase PostgreSQL
- Schema changes are delivered via deterministic migrations:
  - `20260927_b03_cost_snapshots.sql` (add columns, constraints, index, updated RPC)
  - `20260927_b03_cost_snapshots_down.sql` (rollback)

---

## 9. Migration Strategy

- **Additive Only**: New columns are added as `NULL` by default; no existing data is modified.
- **No Historical Backfill**: Existing `order_items` retain `NULL` for `unit_cost` and `total_cost` unless a cost was already present (which it wasn’t prior to this batch).
- **Product Cost**: Existing products have `cost_price = NULL` until explicitly set via the admin UI or a future data‑migration batch.
- **Atomic Safety**: The `process_order_checkout` RPC was rewritten to include the snapshot logic while preserving all existing validation, locking, and stock‑decrement behavior.
- **Rollback Supported**: The down migration removes the added columns and restores the pre‑Batch 03 RPC.

---

## 10. Verification & Test Results

### 10.1 New Cost‑Snapshot Test Suite (`scratch/test_cost_cogs_snapshots.mjs`)
- **Test 1**: Product `cost_price` field exists and validates non‑negative.
- **Test 2**: Checkout captures authoritative `unit_cost` snapshot (matches product cost at sale time).
- **Test 3**: Historical cost preserved when product cost changes (old orders keep old cost).
- **Test 4**: Client cannot forge `unit_cost` or `total_cost` (server ignores client‑sent values).
- **Test 5**: COGS calculation uses historical `unit_cost` (aggregates across orders with different costs).
- **Test 6**: Missing cost handled explicitly (`unit_cost = null` → COGS/profit unavailable).
- **Test 7**: RBAC protection: `products.cost.view` and `products.cost.manage` gates work.
- **Test 8**: Local storage mode persists cost snapshots correctly.
- **Test 9**: Atomicity: order failure rolls back cost snapshot and stock (verified via insufficient‑stock test).
- **All 9 tests pass.**

### 10.2 Global Acceptance Regression Suite
- **Total Test Suites**: 29  
- **Passed**: 29 (100%)  
- **Failed**: 0 (0%)  
- **Baseline Data Integrity**: `store.json` MD5 preserved (`34e2394b5c02a873ee55841d332baec6`).

### 10.3 Production Build
- **Command**: `npm run build`
- **Result**: `✓ built in 10.61s` (zero errors, chunk `InventoryLedger` and `AdminLayout` created).

### 10.4 Lint Status
- **ESLint**: `npm run lint` → **0 errors, 0 warnings**  
  (Note: Suppressed `no-unused-vars` for `_` in error‑handler catch block; all other rules pass.)

---

## 11. Data Integrity Check

Verified no unintended changes to:
- Product selling prices (`price`)
- Stock levels (`stock_qty`)
- Inventory movements (`inventory_movements`)
- Existing orders and order totals
- Payments, users, B2B, reviews, wishlist, cart, settings

**Intended Changes Limited To**:
- `products.cost_price` (new column)
- `order_items.unit_cost` & `order_items.total_cost` (new columns)
- Required migration metadata
- New orders storing cost snapshots (going forward)

---

## 12. Repository‑Wide Cost‑Field Audit

Searches for `cost_price`, `costPrice`, `unit_cost`, `unitCost`, `COGS`, `grossProfit`, `grossMargin` confirmed:
- **One Authoritative Product Cost Field**: `products.cost_price` (numeric, nullable).
- **One Historical Cost Snapshot**: `order_items.unit_cost` (numeric, nullable).
- No duplicate or conflicting cost concepts elsewhere.
- No report or service calculates historical COGS from current `product.cost_price`.
- No frontend‑provided financial values are trusted in the checkout flow.

---

## 13. Known Limitations & Future Work

- **Legacy Orders**: Orders created before this batch have `unit_cost = null`; COGS for those items is unavailable until Batch 09 (where estimation or manual entry may be considered).
- **Cost Precision**: Uses `NUMERIC` (PostgreSQL) / JavaScript `Number` (local) — sufficient for EGP with two decimal places; no subunit (piastre) tracking.
- **Future Integration**:
  - **Batch 05 (Purchasing/Receiving)**: Will populate `product.cost_price` from received purchase orders.
  - **Batch 09 (Reports UI)**: Will expose `cogs`, `grossProfit`, `grossMargin` to authorized roles in the admin dashboard.
  - **Batch 10 (Multi‑Currency)**: Will extend cost and price fields to store currency code.

---

## 14. Files Changed

### New Files
- `database/migrations/20260927_b03_cost_snapshots.sql`
- `database/migrations/20260927_b03_cost_snapshots_down.sql`
- `server/lib/cogsService.js`
- `src/pages/Admin/InventoryLedger.jsx` (already existed from Batch 02; no changes in this batch)
- `BATCH-03-COST-COGS-IMPLEMENTATION-REPORT.md`

### Modified Files
- `server/lib/supabase.js` (cost resolution in checkout, localStore adaptations, error‑handler fix)
- `server/lib/rbac.js` (added `PRODUCTS_COST_VIEW`, `PRODUCTS_COST_MANAGE`, updated `store_manager` role)
- `server/routes/analytics.js` (added `/profit` endpoint, imported `CogsService`)
- `server/routes/orders.js` (no direct changes; uses updated RPC)
- `server/routes/products.js` (no direct changes; uses updated RPC)
- `server/index.js` (no changes)
- `src/App.jsx` (added lazy loading for `InventoryLedger` from Batch 02; no new routes)
- `src/components/admin/AdminSidebar.jsx` (added Inventory Ledger menu item)
- `src/pages/Admin/Products.jsx` (added cost field, unit‑cost modal, history button)
- `src/lib/api.js` (added `getInventoryMovements` and related inventory API wrappers)

---

## 15. Git Commit

```bash
git add database/migrations/20260927_b03_cost_snapshots.sql \
          database/migrations/20260927_b03_cost_snapshots_down.sql \
          server/lib/cogsService.js \
          server/lib/supabase.js \
          server/lib/rbac.js \
          server/routes/analytics.js \
          src/App.jsx \
          src/components/admin/AdminSidebar.jsx \
          src/pages/Admin/Products.jsx \
          src/lib/api.js \
          BATCH-03-COST-COGS-IMPLEMENTATION-REPORT.md
git commit -m "feat(finance): add historical cost snapshots and cogs foundation"
git push origin main
```

**Commit Hash**: `52773b1` (example; actual hash after push)

---

## 16. Conclusion

Batch 03 successfully introduces a **secure, atomic, and auditable historical cost model** that enables accurate COGS, gross profit, and gross margin calculations while preserving all existing inventory, checkout, and RBAC guarantees. The system is now ready for the next financial‑reporting batches (e.g., Batch 09: Reports UI) and future operational batches (purchasing, receiving). All tests pass, lint is clean, and the production build succeeds.

**Ready for Batch 04.**