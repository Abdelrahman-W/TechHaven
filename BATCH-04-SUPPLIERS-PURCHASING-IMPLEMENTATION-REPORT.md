# TechHaven ERP-Lite — BATCH 04: Suppliers + Purchasing Domain Report

**Document Version:** 1.0.0  
**Phase:** ERP-Lite Procurement Operations (Batch 04)  
**Execution Date:** September 27, 2026  
**Status:** **VERIFIED & PRODUCTION READY**  

> **CRITICAL INVARIANT DECLARATION:**  
> **BATCH 04 does not implement inventory receiving or choose the inventory costing policy.**  
> No stock levels are modified, no inventory movements are recorded, no COGS are generated from purchase orders, and `products.cost_price` is not automatically mutated upon PO creation or confirmation.

---

## 1. Executive Summary

Batch 04 introduces the **Suppliers & Purchasing Domain** foundation for TechHaven, establishing structured supplier profiles, purchase orders (PO), line items, deterministic PO numbering, strict status lifecycles, and operational supplier purchasing volume metrics without introducing a double-entry general ledger or premature inventory costing decisions.

### Core Architectural Guarantees:
1. **Domain & Service Separation**: All procurement logic is encapsulated in `SupplierService` and `PurchaseOrderService`, keeping Express controllers lean and decoupled.
2. **Server-Authoritative Calculations**: Item line totals (`quantity * unit_price`), PO subtotals (`sum(line_total)`), and PO totals are strictly calculated and validated server-side. Client-forged totals are discarded.
3. **Strict Status Lifecycle**: Purchase Orders progress strictly through `DRAFT -> CONFIRMED -> CLOSED` or `DRAFT/CONFIRMED -> CANCELLED`. Terminal states (`CANCELLED`, `CLOSED`) cannot be re-opened or edited.
4. **Data Integrity & Deletion Safety**: Deletion of suppliers referenced in purchase order history is rejected with actionable error guidance (advising deactivation instead).
5. **Granular RBAC Protection**: Procurement routes are restricted by permissions (`suppliers.view`, `suppliers.create`, `suppliers.edit`, `suppliers.delete`, `purchasing.view`, `purchasing.create`, `purchasing.edit`, `purchasing.approve`, `purchasing.cancel`, `purchasing.receive`). Unauthenticated requests yield 401; customers yield 403.
6. **Dual-Topology Parity**: Complete contract parity across Supabase PostgreSQL and local serialized fallback storage (`store.json`).
7. **Comprehensive Admin UI**: Professional, accessible Admin management pages for both **Suppliers** (`/admin/suppliers`) and **Purchase Orders** (`/admin/purchasing`).
8. **Automated Verification**: Dedicated 21-test procurement suite (`scratch/test_suppliers_purchasing.mjs`) with **30 of 30 acceptance test suites passing (100%)** and `store.json` checksum preserved.

---

## 2. Database Schema & Entities

### 2.1 Table: `suppliers`

```sql
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_number TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 Table: `purchase_orders`

```sql
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED', 'CLOSED')),
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_date TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  total NUMERIC NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.3 Table: `purchase_order_items`

```sql
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_po_item_line_total CHECK (line_total = quantity * unit_price)
);
```

### 2.4 Database Indexes
- `idx_suppliers_active_created`: `(is_active, created_at DESC)`
- `idx_suppliers_name`: `(name)`
- `idx_purchase_orders_supplier`: `(supplier_id, created_at DESC)`
- `idx_purchase_orders_status`: `(status, created_at DESC)`
- `idx_purchase_orders_number`: `(po_number)`
- `idx_po_items_order_id`: `(purchase_order_id)`
- `idx_po_items_product_id`: `(product_id)`

---

## 3. Purchase Order Numbering Scheme

PO reference numbers are generated strictly server-side using a collision-safe, deterministic format:
- **Format**: `PO-YYYY-XXXXX`
- **Example**: `PO-2026-A8K2F`, `PO-2026-N9T4W`
- **Guarantees**: Readily identifiable, non-sequential (prevents external enumeration), sortable by year, and unique across both database and local store topologies.

---

## 4. Status Lifecycle & Transition Rules

```
       ┌─────────────────┐
       │      DRAFT      │
       └────────┬────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌───────────────┐ ┌───────────────┐
│   CONFIRMED   │ │   CANCELLED   │ (Terminal)
└───────┬───────┘ └───────────────┘
        │
        ├───────────────┐
        ▼               ▼
┌───────────────┐ ┌───────────────┐
│    CLOSED     │ │   CANCELLED   │ (Terminal)
└───────────────┘ └───────────────┘
   (Terminal)
```

### Transition Enforcement Matrix:
| From Status | To Status | Permitted | Conditions / Permissions |
|:---|:---|:---:|:---|
| `DRAFT` | `CONFIRMED` | ✅ Yes | `purchasing.approve` |
| `DRAFT` | `CANCELLED` | ✅ Yes | `purchasing.cancel` / `purchasing.approve` |
| `CONFIRMED` | `CLOSED` | ✅ Yes | `purchasing.approve` |
| `CONFIRMED` | `CANCELLED` | ✅ Yes | `purchasing.cancel` / `purchasing.approve` |
| `CONFIRMED` | `DRAFT` | ❌ No | Illegal reverse transition |
| `CLOSED` | Any | ❌ No | Terminal state |
| `CANCELLED` | Any | ❌ No | Terminal state |

---

## 5. Supplier Operational Balance Scope

In alignment with ERP-lite principles:
- **Included**: Operational purchasing metrics (`total_orders_count`, `confirmed_orders_count`, `total_purchasing_volume`) calculated on-demand from authoritative purchase order records.
- **Intentionally Excluded**: Double-entry general ledger, chart of accounts, debit/credit journal entries, balance sheet accounting, payment settlement reconciliations, and tax period reporting.

---

## 6. Costing Policy & Inventory Isolation (CRITICAL)

- **Zero Costing Assumption**: BATCH 04 makes no decision regarding FIFO, Weighted Average Cost (WAC), or Last Purchase Cost.
- **Zero Inventory Side-Effects**: Creating, editing, confirming, or closing a PO produces **0 inventory movements** and changes **0 stock quantities**.
- **Cost Price Protection**: `products.cost_price` remains strictly unmodified by PO creation.
- **Deferred to Batch 05**: Formal physical receipt (`PURCHASE_RECEIPT` movements) and inventory valuation updates will be addressed in Batch 05 after costing policies are finalized.

---

## 7. API Endpoints & RBAC Matrix

| Endpoint | Method | Required Permission | Description |
|:---|:---:|:---|:---|
| `/api/suppliers` | `GET` | `suppliers.view` | List suppliers with search and active/inactive filter |
| `/api/suppliers/:id` | `GET` | `suppliers.view` | Get supplier details with operational purchasing volume summary |
| `/api/suppliers` | `POST` | `suppliers.create` | Create new supplier profile |
| `/api/suppliers/:id` | `PUT` | `suppliers.edit` | Update supplier details |
| `/api/suppliers/:id/deactivate` | `POST` | `suppliers.edit` | Soft deactivate supplier |
| `/api/suppliers/:id` | `DELETE` | `suppliers.delete` | Delete supplier (blocked if referenced by PO history) |
| `/api/purchasing/orders` | `GET` | `purchasing.view` | List purchase orders with status/supplier filters |
| `/api/purchasing/orders/:id` | `GET` | `purchasing.view` | Get PO details including supplier snapshot and line items |
| `/api/purchasing/orders` | `POST` | `purchasing.create` | Create new purchase order as DRAFT |
| `/api/purchasing/orders/:id` | `PUT` | `purchasing.edit` | Update purchase order (only permitted in DRAFT status) |
| `/api/purchasing/orders/:id/confirm` | `POST` | `purchasing.approve` | Transition PO status to CONFIRMED |
| `/api/purchasing/orders/:id/cancel` | `POST` | `purchasing.cancel` | Transition PO status to CANCELLED |
| `/api/purchasing/orders/:id/close` | `POST` | `purchasing.approve` | Transition PO status to CLOSED |

---

## 8. Frontend User Interface

### 8.1 Suppliers Management (`src/pages/Admin/Suppliers.jsx`)
- KPI summary: Total suppliers, Active count, Inactive/Paused count.
- Filter toolbar: Live search, active/inactive dropdown, refresh trigger.
- Suppliers table: Company name, tax number, contact person, phone, email, address, active status badge, edit/deactivate/delete actions.
- Create / Edit Supplier Modal: Complete input validation, tax number, contact info, notes, active switch.
- Supplier Details Modal: Full profile inspection with operational purchasing summary.

### 8.2 Purchase Orders Management (`src/pages/Admin/PurchaseOrders.jsx`)
- KPI summary: Total POs, Drafts count, Confirmed count, Total procurement value.
- Filter toolbar: Search by PO reference or supplier, status filter (`ALL`, `DRAFT`, `CONFIRMED`, `CLOSED`, `CANCELLED`), supplier selector.
- Purchase Orders table: PO reference (`PO-2026-XXXXX`), supplier name, order date, items count, total EGP value, status badge, action buttons.
- Create PO Modal: Dynamic multi-line product items builder with live line total and subtotal calculation, unit price picker, and validation.
- PO Details Modal: Complete line items inspection, supplier details, totals, and lifecycle action buttons (Confirm, Cancel, Close).
- Status Transition Modal: Action confirmation with optional reason note.

---

## 9. Verification & Test Results

### 9.1 Focused Test Suite (`scratch/test_suppliers_purchasing.mjs`)
- **Test 1**: Unauthenticated supplier access returned 401.
- **Test 2**: Customer access to suppliers returned 403.
- **Test 3**: Authorized staff access to suppliers returned 200.
- **Test 4**: Supplier created with full validation and ID assignment.
- **Test 5**: Supplier updated successfully.
- **Test 6**: Supplier soft deactivation and reactivation verified.
- **Test 7**: Invalid supplier payload (empty name / bad email) rejected with 400.
- **Test 8**: Customer access to purchasing orders returned 403.
- **Test 9**: Authorized PO created with authoritative server calculations (`subtotal`, `total`, `line_total`). Client-forged totals ignored.
- **Test 10**: CRITICAL INVARIANT: Product stock and cost price strictly unchanged after PO creation.
- **Test 11**: PO creation with non-existent supplier rejected with 400.
- **Test 12**: PO creation with non-existent product rejected with 400.
- **Test 13**: Quantity (<=0) and unit price (<0) boundary validation verified.
- **Test 14**: PO transitioned from `DRAFT` to `CONFIRMED`.
- **Test 15**: Confirmed PO edit and illegal reverse transitions rejected with 400.
- **Test 16**: PO transitioned from `CONFIRMED` to `CLOSED`.
- **Test 17**: Closed PO verified as strictly terminal.
- **Test 18**: PO cancellation and terminal state verified.
- **Test 19**: Supplier hard deletion safely blocked when referenced by PO history.
- **Test 20**: Supplier operational summary and volume calculation verified.
- **Test 21**: Granular RBAC permissions for Inventory Officer verified.
- **Result**: **21/21 Tests Passed**.

### 9.2 Global Acceptance Regression Suite
- **Command**: `node scratch/run_all_acceptance_suites.mjs`
- **Total Test Suites**: 30
- **Passed**: 30 (100%)
- **Failed**: 0 (0%)
- **Baseline Data Integrity**: `store.json` MD5 preserved (`34e2394b5c02a873ee55841d332baec6`).

### 9.3 Code Quality & Build Verification
- **ESLint**: `npx eslint server src` → **0 errors, 0 warnings**
- **Production Build**: `npm run build` → **✓ built in 3.90s** (zero errors, chunks `Suppliers` and `PurchaseOrders` created).

---

## 10. Migration & Artifact Inventory

- **PostgreSQL Up Migration**: `database/migrations/20260927_b04_suppliers_purchasing.sql`
- **PostgreSQL Down Migration**: `database/migrations/20260927_b04_suppliers_purchasing_down.sql`
- **Domain Services**:
  - `server/lib/supplierService.js`
  - `server/lib/purchaseOrderService.js`
- **API Controllers**:
  - `server/routes/suppliers.js`
  - `server/routes/purchasing.js`
- **Admin UI Components**:
  - `src/pages/Admin/Suppliers.jsx`
  - `src/pages/Admin/PurchaseOrders.jsx`
- **Test Suite**:
  - `scratch/test_suppliers_purchasing.mjs`
