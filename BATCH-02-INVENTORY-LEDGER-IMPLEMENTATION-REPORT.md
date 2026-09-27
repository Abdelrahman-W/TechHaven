# TechHaven ERP-Lite — BATCH 02: Inventory Movement Ledger & Atomic Stock Domain Report

**Document Version:** 1.0.0  
**Phase:** ERP-Lite Commerce Operations (Batch 02)  
**Execution Date:** September 27, 2026  
**Status:** **VERIFIED & PRODUCTION READY**  

---

## 1. Executive Summary

Batch 02 establishes the **Inventory Movement Ledger** as the single authoritative history and business source of truth for all stock movements in TechHaven (EgyHardware). Current stock (`products.stock_qty`) is now maintained atomically as an immutable snapshot projection driven strictly by ledger movements, eliminating silent/direct mutations and race conditions.

### Core Architectural Guarantees:
1. **Single Mutation Pipeline**: All stock deductions (sales checkouts) and adjustments (manual in/out, damages, returns, initial imports) execute through the `InventoryService` domain layer and database atomic RPCs.
2. **Zero Checkout Weakening**: The production-critical `process_order_checkout` transaction (P1-01) is preserved and upgraded to atomically log `SALE` movements for each product line.
3. **Database-Enforced Non-Negative Stock**: Check constraints and transactional row locks guarantee `stock_qty >= 0` under high concurrency.
4. **Historical Auditability**: Every movement records before/after stock levels, quantity delta, reference type/id, reason, and actor.
5. **Dual-Topology Parity**: Identical schema and behavioral contracts across Supabase PostgreSQL and local serialized JSON storage (`store.json`).
6. **Admin Operations UI**: Comprehensive visual ledger interface (`/admin/inventory`) with filtering, search, pagination, quick adjustments, and product-level movement inspection modals.
7. **Automated Verification**: Dedicated concurrency suite (`scratch/test_inventory_ledger_concurrency.mjs`) with **29 of 29 acceptance test suites passing (100%)**.

---

## 2. Inventory Domain Model & Schema

### 2.1 Table: `inventory_movements`

```sql
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'INITIAL_IMPORT',
    'SALE',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'DAMAGE',
    'RETURN_RESTOCK',
    'PURCHASE_RECEIPT'
  )),
  quantity_delta INT NOT NULL CHECK (quantity_delta <> 0),
  stock_before INT NOT NULL CHECK (stock_before >= 0),
  stock_after INT NOT NULL CHECK (stock_after >= 0),
  reference_type TEXT NOT NULL DEFAULT 'MANUAL',
  reference_id TEXT,
  reason TEXT,
  actor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_inventory_stock_math CHECK (stock_after = stock_before + quantity_delta)
);
```

### 2.2 Database Indexes
- `idx_inventory_movements_product_created`: `(product_id, created_at DESC)`
- `idx_inventory_movements_type_created`: `(type, created_at DESC)`
- `idx_inventory_movements_reference`: `(reference_type, reference_id)`
- `idx_inventory_movements_actor`: `(actor_id, created_at DESC)`

---

## 3. Movement Types

| Movement Type | Code | Delta Sign | Reference Type | Purpose |
|:---|:---|:---:|:---|:---|
| **Initial Import** | `INITIAL_IMPORT` | `+` (Positive) | `MIGRATION` / `MANUAL` | Opening balance migration from existing catalog stock |
| **Sale Checkout** | `SALE` | `-` (Negative) | `ORDER` | Stock decremented upon customer checkout |
| **Stock In** | `ADJUSTMENT_IN` | `+` (Positive) | `STOCK_ADJUSTMENT` | Inventory increase (manual restock, count corrections) |
| **Stock Out** | `ADJUSTMENT_OUT` | `-` (Negative) | `STOCK_ADJUSTMENT` | Inventory decrease (shrinkage, count corrections) |
| **Damage** | `DAMAGE` | `-` (Negative) | `DAMAGE_REPORT` | Stock written off due to physical/operational damage |
| **Return Restock** | `RETURN_RESTOCK` | `+` (Positive) | `RETURN` | Restocked items returned by customer |
| **Purchase Receipt**| `PURCHASE_RECEIPT`| `+` (Positive) | `PURCHASE_ORDER` | Stock received from vendor (reserved for Batch 05) |

---

## 4. Atomic Mutation Architecture

### 4.1 Transactional Workflow
```
Client Request
      │
      ▼
RBAC Authorization Gate (inventory.adjust / products.edit)
      │
      ▼
InventoryService Validation (product existence, non-zero delta, reason)
      │
      ▼
Database Lock Acquisition (FOR UPDATE / serialized memory lock)
      │
      ├── Current stock check (stock_before)
      ├── Calculation: stock_after = stock_before + quantity_delta
      ├── Validation: stock_after >= 0 (INSUFFICIENT_STOCK if negative)
      │
      ▼
Atomic Write (PostgreSQL Transaction / localStore atomic snapshot)
      ├── UPDATE products SET stock_qty = stock_after
      └── INSERT INTO inventory_movements (..., stock_before, stock_after, delta)
      │
      ▼
Cache Invalidation Broadcast (IPC / Memory cache purged for /api/products)
      │
      ▼
Return Created Movement & Updated Stock Representation
```

---

## 5. System Integrations

### 5.1 Order Checkout (`process_order_checkout`)
- Upgraded both PostgreSQL RPC (`database/migrations/20260927_b02_inventory_ledger.sql`) and localStore adapter (`server/lib/supabase.js`).
- When an order completes, `SALE` movements with negative `quantity_delta` are inserted for each distinct product line atomically in the same database transaction.
- Duplicate lines are aggregated into a single atomic decrement per product.

### 5.2 Admin Stock Adjustments
- `PUT /api/products/:id/stock` and `POST /api/products/:id/adjust-stock` route strictly through `InventoryService.adjustStock`.
- Direct manual writes to `stock_qty` without ledger logging have been eliminated.
- Server calculates `stock_before` and `stock_after`; client cannot forge values.

### 5.3 Initial Data Migration
- PostgreSQL migration automatically creates `INITIAL_IMPORT` records for all active products with `stock_qty > 0`.
- Local storage dynamically synthesizes initial import history on startup without mutating the baseline `store.json` checksum.

---

## 6. API Endpoints & RBAC Matrix

| Endpoint | Method | Required Permission | Description |
|:---|:---:|:---|:---|
| `/api/inventory/movements` | `GET` | `inventory.view` or `inventory.movements` | Paginated and filtered inventory movements list |
| `/api/inventory/products/:id/history` | `GET` | `inventory.view` or `products.view` | Historical stock movements for a specific product |
| `/api/inventory/adjust` | `POST` | `inventory.adjust` | Execute atomic stock adjustment |
| `/api/products/:id/stock` | `PUT` | `inventory.adjust` or `products.stock` | Fast stock adjustment (routes to InventoryService) |
| `/api/products/:id/adjust-stock` | `POST` | `inventory.adjust` or `products.stock` | Alternate stock adjustment route |

---

## 7. Frontend User Interface

### 7.1 Inventory Ledger Page (`src/pages/Admin/InventoryLedger.jsx`)
- Visual KPI cards: Total movements, Sales deductions, Adjustments, Initial imports.
- Filter toolbar: Filter by movement type, product selector, search query.
- Movements table with color-coded type badges, numeric delta (`+10`, `-2`), before/after progression (`12 ← 10`), document reference, reason, and actor.
- Quick Adjustment Modal with validation and immediate ledger refresh.
- Responsive design with full Arabic RTL support matching TechHaven styling.

### 7.2 Product Stock History Modal (`src/pages/Admin/Products.jsx`)
- Dedicated "السجل" (History) action button on every product row.
- Modal displaying historical stock movements specific to that product.

---

## 8. Verification & Test Suite Results

### 8.1 Dedicated Concurrency Suite (`scratch/test_inventory_ledger_concurrency.mjs`)
- **Test 1: Initial Import Migration**: Verified seed product initial import records.
- **Test 2: Two Concurrent Buyers (Final Unit Race)**: Exactly one order placed, one rejected; stock decremented from 1 to 0; exactly one `SALE` movement recorded.
- **Test 3: Concurrent Stock Adjustments**: Simultaneous positive (+5) and negative (-3) adjustments resolved without lost updates (final stock: 12).
- **Test 4: Negative Stock Prevention**: Deduction exceeding stock (-50 on stock 12) rejected with 400 `INSUFFICIENT_STOCK`; stock remained 12.
- **Test 5: Duplicate Line Aggregation**: Multiple line items of same product in one order aggregated into single atomic decrement.
- **Test 6: RBAC Security Gates**: Unauthenticated requests returned 401; customers returned 403; staff returned 200.

### 8.2 Global Acceptance Regression Suite
- **Total Test Suites**: 29
- **Passed**: 29 (100%)
- **Failed**: 0 (0%)
- **Baseline Data Integrity**: `store.json` MD5 preserved (`34e2394b5c02a873ee55841d332baec6`).

### 8.3 Production Build
- **Command**: `npm run build`
- **Result**: `✓ built in 18.27s` (zero errors, chunk `InventoryLedger` created).

---

## 9. Migration Artifacts

- **PostgreSQL Up Migration**: `database/migrations/20260927_b02_inventory_ledger.sql`
- **PostgreSQL Down Migration**: `database/migrations/20260927_b02_inventory_ledger_down.sql`
- **Domain Service**: `server/lib/inventoryService.js`
- **API Controller**: `server/routes/inventory.js`
- **Admin UI**: `src/pages/Admin/InventoryLedger.jsx`
