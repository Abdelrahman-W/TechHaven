# TechHaven ERP-Lite — Architecture & Domain Reconnaissance Blueprint (Batch 00)

**Document Version:** 1.0.0  
**Architectural Tier:** Staff Engineer / Systems Architecture Blueprint  
**Target Platform:** TechHaven (EgyHardware) E-Commerce & Commerce Operations  
**Evaluation Date:** September 27, 2026  
**Status:** **APPROVED FOR IMPLEMENTATION PLANNING**  

---

## 1. Executive Summary

TechHaven is an active, production-grade Egyptian hardware marketplace operating on a Vite/React SPA frontend and an Express.js backend with dual storage topology (Supabase PostgreSQL in production, localized atomic JSON store `store.json` in local development). 

This blueprint defines the architecture for the **ERP-Lite / Commerce Operations** evolution. The goal is to provide the store owner and operations staff with operational control (inventory ledger, cost tracking, historical profitability, purchase orders, receiving, supplier management, granular permissions, and server-side audit trails) **without introducing the bloat or rigidity of an enterprise ERP (no HR, payroll, general ledger, balance sheets, or manufacturing)**.

### Core Architectural Guarantees:
1. **Zero Disruption to Active Storefront**: Public catalog, PC Builder, Cart, Checkout, Egyptian shipping calculations, and Paymob payments remain 100% operational.
2. **Unified Stock Mutation Pipeline**: All inventory additions, sales decrements, warehouse adjustments, and purchase order receipts flow through a single, concurrency-safe service layer backed by PostgreSQL atomic RPCs (`process_order_checkout`, `record_inventory_movement`).
3. **Historical Profitability Preservation**: Snapshotting `cost_price` at the moment of order placement ensures historical COGS, Gross Profit, and Gross Margin metrics remain immutable regardless of future supplier price shifts.
4. **Dual-Topology Parity**: Every ERP-Lite domain entity and service maintains identical API and contract behaviors across both Supabase PostgreSQL and local fallback storage.

---

## 2. TechHaven Current Architecture Snapshot

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite 6 + React 18 SPA)                         │
│  Storefront · PC Builder · Compare · Cart · Checkout · Customer Account · Admin   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTP / REST (/api/*) + Bearer JWT
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                       BACKEND (Node.js + Express.js API)                         │
│  Helmet (CSP) · Morgan/Logger (X-Request-Id) · RateLimiter · Cache (Memory/IPC)  │
│  Auth Middleware (JWT/RBAC) · 14 Express Route Controllers                       │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Unified `db` Adapter (server/lib/supabase.js)
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
┌───────────────────────────────────────┐ ┌────────────────────────────────────────┐
│      SUPABASE POSTGRESQL (Prod)       │ │      LOCAL ATOMIC STORE (Dev/Test)     │
│ Clustered Multi-Worker Node Topology  │ │ Single-Worker Dedicated Memory Map     │
│ PostgreSQL Tables, Views & Atomic RPCs│ │ Debounced Async Disk Flush (store.json)│
└───────────────────────────────────────┘ └────────────────────────────────────────┘
```

### Key Technical Characteristics:
- **Database Abstraction**: Centralized in `server/lib/supabase.js` (`db` object). All route controllers consume `db` methods rather than invoking raw database queries directly.
- **Stock Decrement Protection**: Implemented via PostgreSQL `process_order_checkout` RPC (P1-01) with row-level locks (`FOR UPDATE`) and local serialized queues.
- **Cache Invalidation (SCA-3)**: Multi-worker cache with IPC broadcast invalidating `/api/products` and `/api/categories` upon catalog mutations.
- **Security & Headers**: Strict CSP (`script-src 'self'`, `object-src 'none'`), CORS allowlisting, and automated request correlation tracing (`X-Request-Id`).

---

## 3. Current Domain Entity Map

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Categories  │ 1─────N │   Products   │ 1─────N │   Reviews    │
└──────────────┘         └──────┬───────┘         └──────────────┘
                                │ 1
                                │
                                │ N
┌──────────────┐ 1       N ┌────┴─────────┐       ┌──────────────┐
│    Users     ├───────────┤  CartItems   │       │   Wishlist   │
└──────┬───────┘           └──────────────┘       └──────────────┘
       │ 1
       │
       │ N
┌──────┴───────┐ 1       N ┌──────────────┐
│    Orders    ├───────────┤  OrderItems  │
└──────┬───────┘           └──────────────┘
       │ 1
       │
       │ 1..N
┌──────┴───────────────┐                          ┌──────────────┐
│ Paymob Transactions  │                          │ B2B Requests │
└──────────────────────┘                          └──────────────┘
```

### Existing Database Tables & Schemas:
1. `users`: `id`, `email`, `password_hash`, `full_name`, `phone`, `role` ('user' | 'admin' | 'seller'), `last_login`, `created_at`.
2. `categories`: `id`, `slug`, `name`, `name_en`, `icon`, `is_active`, `sort_order`.
3. `products`: `id`, `sku`, `name`, `name_en`, `slug`, `category_id`, `brand`, `model`, `price`, `old_price`, `cost_price`, `stock_qty`, `reserved_qty`, `min_order_qty`, `specs` (JSONB), `is_featured`, `is_active`.
4. `orders`: `id`, `reference`, `user_id`, `status` ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'), `payment_status`, `payment_method`, `subtotal`, `shipping_cost`, `total`, `customer_name`, `customer_phone`, `customer_address`, `customer_city`.
5. `order_items`: `id`, `order_id`, `product_id`, `product_name`, `product_sku`, `quantity`, `unit_price`, `total_price`, `specs_snapshot`.
6. `reviews`: `id`, `product_id`, `user_id`, `user_name`, `rating`, `comment`, `created_at`.
7. `wishlist`: `id`, `user_id`, `product_id`, `created_at`.
8. `cart_items`: `id`, `user_id`, `product_id`, `quantity`, `unit_price`.
9. `b2b_requests`: `id`, `quote_ref`, `company_name`, `contact_person`, `phone`, `email`, `city`, `business_type`, `device_count`, `estimated_budget`, `spec_requirements`, `tax_id`, `status` ('new', 'pending', 'quoted', 'contracted', 'closed', 'cancelled'), `admin_notes`.
10. `rate_limits`: `id`, `identity_key`, `scope`, `window_start`, `request_count`.
11. `settings`: Store configuration, shipping fees, Paymob keys, OAuth pre-config.

---

## 4. Mutation Map & Stock Concurrency Architecture

| Operation | Triggering Route | Controller / Service | Database Operation | Concurrency Protection | Cache Invalidation |
|:---|:---|:---|:---|:---:|:---|
| **Order Placement (B2C)** | `POST /api/orders` | `orders.js` $\rightarrow$ `db.createOrder` | Calls `process_order_checkout` RPC / atomic `localStore` | `FOR UPDATE` Row Lock & Stock $\ge$ Qty check | `/api/products`, `/api/products/:id` |
| **Direct Stock Restock** | `PUT /api/products/:id/stock` | `products.js` $\rightarrow$ `db.updateProduct` | Updates `stock_qty` & `stock` | Server authoritative single-point mutation | `/api/products`, `/api/products/:id` |
| **Catalog Product Edit** | `PUT /api/products/:id` | `products.js` $\rightarrow$ `db.updateProduct` | Updates product record & metadata | DB constraint `stock_qty >= 0` | `/api/products`, `/api/products/:id` |
| **Order Status Update** | `PUT /api/orders/:id/status` | `orders.js` $\rightarrow$ `db.updateOrderStatus` | Updates `status` and `timeline` | Idempotent status transition validation | N/A |
| **B2B Inquiry Progression**| `PUT /api/b2b/:id/status` | `b2b.js` $\rightarrow$ `db.updateB2BRequest` | Updates status & `admin_notes` | Allowed status whitelist | N/A |
| **User Role Change** | `PUT /api/admin/users/:id` | `admin.js` $\rightarrow$ `db.updateUser` | Updates `role` | Protected root admin check | N/A |
| **Review Deletion** | `DELETE /api/reviews/:id` | `reviews.js` $\rightarrow$ `db.deleteReviewById` | Deletes review row | Owner ID check or Admin role check | `/api/reviews`, `/api/products/:id` |
| **Settings Update** | `PUT /api/settings` | `settings.js` $\rightarrow$ `db.updateSettings` | Upserts `settings` table | Admin only (`requireAdmin`) | `/api/settings` (scope: 'settings') |

---

## 5. Source of Truth & Data Integrity Model

| Domain Attribute | Source of Truth | Classification | Current Problem / Gap | Target ERP-Lite Resolution |
|:---|:---|:---:|:---|:---|
| **Product Selling Price** | `products.price` | **AUTHORITATIVE** | None | Maintained as active catalog price. |
| **Product Cost Price** | `products.cost_price` | **AUTHORITATIVE** | Nullable; no cost history | Track standard/moving average cost. |
| **Stock on Hand** | `products.stock_qty` | **AUTHORITATIVE** | Direct overwrite; no ledger | Stock on hand = sum of ledger deltas. |
| **Order Item Unit Price** | `order_items.unit_price` | **AUTHORITATIVE** | None | Snapshotted at checkout. |
| **Order Item Unit Cost** | `order_items.unit_cost` | **MISSING** | Historical COGS impossible if product cost changes | **Snapshot `cost_price` into `order_items.unit_cost` at sale time**. |
| **Order Total & Subtotal** | Calculated in RPC | **AUTHORITATIVE** | None | Server-authoritative calculation. |
| **Shipping Fees** | `settings.shipping_*` | **AUTHORITATIVE** | None | Server-authoritative governorate rules. |
| **Payment Status** | `orders.payment_status` | **AUTHORITATIVE** | Manual reconciliation | Webhook & gateway reconciliation. |
| **Customer Role** | `users.role` | **AUTHORITATIVE** | Coarse (admin/user only) | Expand to `role_permissions`. |

---

## 6. Inventory Ledger & Stock Movement Architecture

### 6.1 The Double-Entry Stock Movement Ledger
To prevent discrepancies between warehouse reality, purchase orders, returns, and sales, all stock mutations will create an immutable row in `inventory_movements`:

```sql
CREATE TYPE inventory_movement_type AS ENUM (
  'SALE',              -- B2C order placed / stock deducted
  'PURCHASE_RECEIPT',  -- Stock received against Purchase Order
  'ADJUSTMENT_IN',     -- Manual inventory adjustment (Found stock / restock)
  'ADJUSTMENT_OUT',    -- Manual inventory adjustment (Shrinkage / count correction)
  'DAMAGE',            -- Damaged in warehouse / transit
  'RETURN_RESTOCK',    -- Customer order return back to stock
  'INITIAL_IMPORT'     -- Initial baseline inventory setup
);

CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  movement_type inventory_movement_type NOT NULL,
  quantity_delta INT NOT NULL,            -- Positive (IN) or Negative (OUT)
  previous_stock INT NOT NULL,            -- Stock before this movement
  new_stock INT NOT NULL,                 -- Stock after this movement
  unit_cost DECIMAL(12,2),                -- Cost per unit at time of movement
  reference_type TEXT,                    -- 'ORDER', 'PURCHASE_ORDER', 'ADJUSTMENT'
  reference_id TEXT,                      -- e.g. order UUID or PO reference
  reason TEXT,                            -- Explanation / audit note
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inv_movements_product ON public.inventory_movements(product_id);
CREATE INDEX idx_inv_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX idx_inv_movements_created ON public.inventory_movements(created_at);
```

### 6.2 Atomic Concurrency & Reconciled Stock Update
All stock operations execute within a transactional boundary:
1. Lock product row (`FOR UPDATE`).
2. Verify constraint (`stock_qty + delta >= 0`).
3. Update `products.stock_qty = products.stock_qty + delta`.
4. Insert into `inventory_movements`.
5. Invalidate `/api/products` cache via IPC broadcast.

---

## 7. Financial Data Architecture (Cost Snapshots & Profitability)

### 7.1 Historical Profitability Preservation Rule
When a product's replacement cost increases (e.g. GPU cost rises from 20,000 EGP to 24,000 EGP), orders placed last month at 20,000 EGP cost must retain their historical margin.

```sql
-- Schema migration for order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,2) DEFAULT 0;
```

### 7.2 Core Financial Formulas:
$$\text{Revenue} = \sum (\text{order\_items.total\_price})$$
$$\text{COGS} = \sum (\text{order\_items.unit\_cost} \times \text{order\_items.quantity})$$
$$\text{Gross Profit} = \text{Revenue} - \text{COGS}$$
$$\text{Gross Margin \%} = \left( \frac{\text{Gross Profit}}{\text{Revenue}} \right) \times 100$$

---

## 8. Granular RBAC & Permissions Architecture

### 8.1 Permission Tokens (`resource.action`)
```
products.view          products.create       products.edit         products.delete
inventory.view         inventory.adjust      inventory.movements
orders.view            orders.edit           orders.cancel         orders.export
purchasing.view        purchasing.create     purchasing.receive
b2b.view               b2b.manage
reviews.view           reviews.moderate
reports.sales          reports.profit        reports.inventory
users.view             users.manage          settings.manage
```

### 8.2 Role Definitions:
- **`owner`**: All permissions ($*$). Full administrative override.
- **`store_manager`**: Catalog, orders, inventory, B2B, reviews, sales reports.
- **`inventory_officer`**: Inventory view, stock adjustment, PO receiving, inventory reports.
- **`fulfillment_agent`**: Orders view, status progression, courier manifest export.
- **`user`**: Standard customer (own profile, cart, orders, wishlist).

---

## 9. Suppliers & Purchase Orders (Procurement & Receiving)

```
┌──────────────┐ 1       N ┌─────────────────┐ 1       N ┌──────────────────────┐
│  Suppliers   ├───────────┤ Purchase Orders ├───────────┤ Purchase Order Items │
└──────────────┘           └────────┬────────┘           └──────────────────────┘
                                    │ Received
                                    ▼
                         ┌──────────────────────┐
                         │ Inventory Movements  │
                         │ (PURCHASE_RECEIPT)   │
                         └──────────────────────┘
```

### Proposed Schema:
```sql
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  tax_id TEXT,
  address TEXT,
  city TEXT,
  payment_terms TEXT,                    -- 'Cash', 'Net 15', 'Net 30'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT UNIQUE NOT NULL,         -- e.g. PO-2026-001
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status in ('draft', 'ordered', 'partial', 'received', 'cancelled')),
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  expected_delivery TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  ordered_qty INT NOT NULL CHECK (ordered_qty > 0),
  received_qty INT NOT NULL DEFAULT 0 CHECK (received_qty >= 0),
  unit_cost DECIMAL(12,2) NOT NULL CHECK (unit_cost >= 0),
  total_cost DECIMAL(12,2) NOT NULL CHECK (total_cost >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 10. Audit Logging Infrastructure Architecture

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.users(id),
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,                  -- e.g. 'PRODUCT_PRICE_UPDATED'
  entity_type TEXT NOT NULL,             -- e.g. 'product', 'order', 'stock'
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,                       -- Correlates with X-Request-Id
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);
```

---

## 11. Proposed Admin Information Architecture

```
Admin Dashboard (TechHaven Operations Center)
├── لوحة التحكم (Overview, Live Sales, Alerts)
├── المنتجات والمخزون (Catalog & Inventory)
│   ├── قائمة المنتجات (Catalog CRUD & Fast Stock)
│   ├── حركة المخزون (Inventory Ledger & Adjustments)
│   └── تنبيهات النواقص (Reorder Intelligence)
├── المشتريات والموردين (Purchasing & Suppliers)
│   ├── الموردين (Suppliers Directory)
│   ├── أوامر الشراء (Purchase Orders & Status)
│   └── استلام البضائع (Receiving & Stock In)
├── المبيعات والطلبات (Sales & Fulfillment)
│   ├── الطلبات والشحن (Orders & Courier Manifest)
│   └── طلبات الشركات B2B (Corporate Inquiries)
├── العملاء والتقييمات (Customers & Community)
│   ├── العملاء والمستخدمين (Customer Accounts & Roles)
│   └── إدارة التقييمات (Review Moderation)
├── التقارير والأرباح (Operations & Profit Intelligence)
│   ├── تقرير المبيعات والأرباح (Gross Profit & Margin)
│   └── تقرير حركة المخزون (Inventory Turnover)
└── إعدادات النظام (System Configuration)
    ├── إعدادات المتجر والهوية (Store Info & Shipping Rules)
    ├── بوابات الدفع (Paymob & Wallets)
    ├── موفري تسجيل الدخول (OAuth Pre-Config)
    ├── الصلاحيات والأدوار (Granular Permissions)
    └── سجل العمليات (Audit Trail Logs)
```

---

## 12. Phased Implementation Roadmap

```
┌────────────────────────┐
│  BATCH 00 (Current)    │ ── Architecture & Domain Reconnaissance (Audit Blueprint Only)
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  BATCH 01              │ ── Granular Permissions (RBAC) & Persistent Audit Logging
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  BATCH 02              │ ── Inventory Ledger (`inventory_movements`) & Concurrency Adjustments
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  BATCH 03              │ ── Cost Snapshots (`unit_cost`) & Gross Profit / Margin Analytics
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  BATCH 04              │ ── Suppliers Directory & Purchase Orders (PO) Management
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  BATCH 05              │ ── Receiving Workflow (PO $\rightarrow$ Stock Movement $\rightarrow$ Stock Qty)
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  BATCH 06              │ ── Reorder Points & Low-Stock Operational Intelligence
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  BATCH 07              │ ── B2B Customer Balances & Corporate Credit Accounts
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  BATCH 08              │ ── Operational Automation, Stock Alerts & Final E2E QA
└────────────────────────┘
```

---

## 13. Critical Architectural Invariants

1. **Atomic Invariant**: `products.stock_qty` must always equal the current on-hand inventory. Every stock change must create an `inventory_movements` record.
2. **Financial Invariant**: `order_items.unit_cost` is snapshotted at checkout time and is immutable.
3. **Security Invariant**: Permissions and authorization are enforced server-side on route entry. Frontend visibility is for UX only.
4. **Data Isolation Invariant**: Sensitive API keys and OAuth secrets are strictly excluded from public settings payloads.
5. **Simplicity Invariant**: No full accounting (no debit/credit balance sheets, no payroll, no general ledger).

---

## 14. Validation & Acceptance Standards for Future Batches

Every subsequent batch must satisfy:
- 100% pass on all 27 existing baseline regression suites.
- Dedicated positive and negative test suites for new endpoints.
- ESLint: 0 errors, 0 warnings.
- Production build: `npm run build` passing.
- Database parity: local `store.json` and Supabase PostgreSQL verified.
- Git cleanliness: no secrets, no `.env`, no test residue.
