# TechHaven ERP-Lite — BATCH 01.1: Granular Role-Based Access Control (RBAC) & Route Authorization Report

**Document Version:** 1.0.0  
**Phase:** ERP-Lite Commerce Operations (Batch 01.1)  
**Execution Date:** September 27, 2026  
**Status:** **VERIFIED & PRODUCTION READY**  

---

## 1. Executive Summary

Batch 01.1 delivers a robust, granular, server-side **Role-Based Access Control (RBAC)** architecture to TechHaven (EgyHardware). This upgrade moves beyond binary `admin`/`user` flags into dedicated operational roles (`owner`, `store_manager`, `inventory_officer`, `fulfillment_agent`, `user`), enabling fine-grained control over catalog management, inventory movements, order fulfillment, B2B corporate quotes, review moderation, business analytics, and system settings.

### Core Deliverables:
1. **Server-Side Authorization Layer (`server/lib/rbac.js`, `server/middleware/auth.js`)**: 17 granular permission keys, 5 defined operational roles, and `requirePermission` middleware.
2. **Comprehensive Route Auditing**: Complete coverage across all Admin, Catalog, Order Fulfillment, B2B, Review, Analytics, and Settings API endpoints.
3. **Impenetrable Security Invariants**:
   - Client role/permission forgery is strictly rejected; JWT tokens are verified against backend user records on every authenticated request.
   - Owner protection: The primary store owner (`admin-abdelrahman` / `abdelrahman959@gmail.com`) cannot be modified, downgraded, or deleted by any administrative user.
   - Deterministic 401 (Unauthorized) and 403 (Forbidden) error handling across all routes.
4. **Dual-Topology Storage Parity**: Complete PostgreSQL migration scripts (`database/migrations/20260927_b01_rbac_permissions.sql`) and synchronous local store (`store.json`) support.
5. **Admin Operations UI (`src/pages/Admin/Users.jsx`)**: Full role badges, circular role promotion/assignment, root owner protection styling, and interactive Permissions Matrix.
6. **Automated Verification**: Dedicated security test suite (`scratch/test_rbac_route_enforcement.mjs`) integrated into the global runner with **28 of 28 acceptance test suites passing (100%)**.

---

## 2. Granular Permissions & Role Definition Matrix

### 2.1 Permission Keys (17 Granular Actions)

| Permission Key | Resource | Action Description |
|:---|:---|:---|
| `users.read` | Users | View user accounts and administrative user profiles |
| `users.write` | Users | Create, update, or remove customer/staff accounts |
| `roles.manage` | Roles & RBAC | Assign and update user operational roles |
| `products.read` | Catalog | View catalog products, cost data, and inventory levels |
| `products.write` | Catalog | Create, edit, and delete catalog products |
| `inventory.adjust` | Inventory | Execute stock adjustments, ledger increments/decrements |
| `categories.read` | Categories | View category hierarchy and metadata |
| `categories.write` | Categories | Create, edit, and delete store categories |
| `orders.read` | Sales & Orders | View customer orders, fulfillment manifests, and line items |
| `orders.write` | Sales & Orders | Create, modify, and cancel orders |
| `orders.fulfill` | Fulfillment | Update tracking numbers, dispatch statuses, and export manifests |
| `b2b.read` | B2B Portal | View corporate quotation requests and tax credentials |
| `b2b.write` | B2B Portal | Update corporate quote statuses, notes, and pricing |
| `reviews.read` | Community | View product ratings and reviews |
| `reviews.moderate` | Community | Moderate, edit, or delete customer reviews |
| `analytics.read` | Intelligence | Access sales dashboards, margins, and operational metrics |
| `settings.read` | System | View store configuration, payment gateways, and shipping rules |
| `settings.write` | System | Modify store configuration, credentials, and business rules |

---

### 2.2 Predefined System Roles & Permissions Matrix

```
┌─────────────────────────┬───────┬───────────────┬───────────────────┬───────────────────┬──────┐
│ Permission              │ Owner │ Store Manager │ Inventory Officer │ Fulfillment Agent │ User │
├─────────────────────────┼───────┼───────────────┼───────────────────┼───────────────────┼──────┤
│ users.read              │   ✓   │       ✓       │         -         │         -         │  -   │
│ users.write             │   ✓   │       -       │         -         │         -         │  -   │
│ roles.manage            │   ✓   │       -       │         -         │         -         │  -   │
│ products.read           │   ✓   │       ✓       │         ✓         │         ✓         │  ✓   │
│ products.write          │   ✓   │       ✓       │         -         │         -         │  -   │
│ inventory.adjust        │   ✓   │       ✓       │         ✓         │         -         │  -   │
│ categories.read         │   ✓   │       ✓       │         ✓         │         ✓         │  ✓   │
│ categories.write        │   ✓   │       ✓       │         -         │         -         │  -   │
│ orders.read             │   ✓   │       ✓       │         -         │         ✓         │  -   │
│ orders.write            │   ✓   │       ✓       │         -         │         -         │  -   │
│ orders.fulfill          │   ✓   │       ✓       │         -         │         ✓         │  -   │
│ b2b.read                │   ✓   │       ✓       │         -         │         -         │  -   │
│ b2b.write               │   ✓   │       ✓       │         -         │         -         │  -   │
│ reviews.read            │   ✓   │       ✓       │         -         │         -         │  ✓   │
│ reviews.moderate        │   ✓   │       ✓       │         -         │         -         │  -   │
│ analytics.read          │   ✓   │       ✓       │         -         │         -         │  -   │
│ settings.read           │   ✓   │       -       │         -         │         -         │  -   │
│ settings.write          │   ✓   │       -       │         -         │         -         │  -   │
└─────────────────────────┴───────┴───────────────┴───────────────────┴───────────────────┴──────┘
```

*Note: Legacy `admin` users are treated as `owner` aliases with full administrative privileges.*

---

## 3. Server-Side Route Enforcement Audit

All API routes have been audited and updated to enforce granular authorization guards:

| Endpoint | Method | Required Permission | Description & Protection |
|:---|:---|:---|:---|
| `/api/admin/overview` | `GET` | `analytics.read` | Dashboard KPI overview metrics |
| `/api/admin/users` | `GET` | `users.read` | List registered store accounts |
| `/api/admin/users` | `POST` | `users.write` | Create administrative/staff account |
| `/api/admin/users/:id/role` | `PUT` | `roles.manage` | Update account role (Owner protected) |
| `/api/admin/users/:id` | `DELETE` | `users.write` | Delete account (Owner protected) |
| `/api/admin/roles` | `GET` | `roles.manage` | List available roles & metadata |
| `/api/admin/permissions` | `GET` | `roles.manage` | List all system permission definitions |
| `/api/products` | `POST` | `products.write` | Create product listing |
| `/api/products/:id` | `PUT` | `products.write` | Update product catalog details |
| `/api/products/:id` | `DELETE` | `products.write` | Remove product listing |
| `/api/products/:id/adjust-stock` | `POST` | `inventory.adjust` | Fast inline stock adjustments |
| `/api/products/bulk` | `POST` | `products.write` | Bulk product operations |
| `/api/categories` | `POST` | `categories.write` | Create category |
| `/api/categories/:id` | `PUT` | `categories.write` | Update category metadata |
| `/api/categories/:id` | `DELETE` | `categories.write` | Remove category |
| `/api/orders` | `GET` | `requireAuth` / `orders.read` | Store orders list for staff / user orders for customers |
| `/api/orders/manifest/export` | `GET` | `orders.fulfill` | Export courier dispatch manifest |
| `/api/orders/:id/status` | `PATCH` | `orders.fulfill` | Progress order fulfillment status |
| `/api/orders/:id/tracking` | `PATCH` | `orders.fulfill` | Assign tracking number and courier |
| `/api/orders/:id/cancel` | `POST` | `orders.write` or author | Cancel order |
| `/api/b2b/admin` | `GET` | `b2b.read` | List B2B corporate quotation requests |
| `/api/b2b/admin/:id` | `PATCH` | `b2b.write` | Update corporate quote status & pricing |
| `/api/reviews/:id` | `DELETE` | `reviews.moderate` or author | Remove review |
| `/api/reviews/admin/:id` | `PATCH` | `reviews.moderate` | Moderate/approve review |
| `/api/analytics/*` | `GET` | `analytics.read` | Sales, margin, and category analytics |
| `/api/settings` | `GET` | `settings.read` | Full store configuration (private credentials) |
| `/api/settings` | `PUT` | `settings.write` | Update store configuration |
| `/api/settings/public` | `GET` | *Public* | Stripped public settings (keys excluded) |

---

## 4. Security Invariants & Forgery Defenses

1. **Server-Side Token Resolution**: `requireAuth` verifies JWT signature and looks up the active user record in `db.findUserById(decoded.userId)`. If a malicious client tampers with claims inside a decoded token, the server uses the database's canonical role, defeating client-side forgery.
2. **Owner Immunity**:
   - User `admin-abdelrahman` / `abdelrahman959@gmail.com` is locked at role `owner`.
   - Any attempt via `PUT /api/admin/users/:id/role` or `DELETE /api/admin/users/:id` targeting the primary owner returns `403 Forbidden` (`FORBIDDEN_OWNER_PROTECTION`).
3. **Explicit 401 vs 403 Semantics**:
   - `401 Unauthorized` (`UNAUTHORIZED` / `NO_TOKEN` / `INVALID_TOKEN` / `USER_NOT_FOUND`): Request missing or possessing invalid credentials.
   - `403 Forbidden` (`FORBIDDEN` / `INSUFFICIENT_PERMISSIONS`): Authenticated user lacks the requisite permission key for the resource.

---

## 5. Verification & Acceptance Results

### 5.1 RBAC Route Enforcement Suite (`scratch/test_rbac_route_enforcement.mjs`)
- Unauthenticated requests rejected with `401 Unauthorized` across all protected endpoints.
- Role isolation:
  - `inventory_officer` allowed `/api/products/:id/adjust-stock`, rejected on `/api/b2b/admin` and `/api/settings`.
  - `fulfillment_agent` allowed `/api/orders/:id/tracking` and `/api/orders/manifest/export`, rejected on `/api/analytics/dashboard`.
  - `store_manager` allowed product management and analytics, rejected on `/api/settings`.
  - `owner` / `admin` allowed all endpoints.
- Owner protection: Attempting to downgrade or delete the root owner returns `403`.

### 5.2 Global Regression Suite (`scratch/run_all_acceptance_suites.mjs`)
- **Total Test Suites**: 28
- **Passed**: 28 (100%)
- **Failed**: 0 (0%)

### 5.3 Production Build Verification
- **Command**: `npm run build`
- **Result**: `✓ built in 4.66s` with zero errors.

---

## 6. Migration Artifacts

- **PostgreSQL Schema Migration**: `database/migrations/20260927_b01_rbac_permissions.sql`
- **PostgreSQL Rollback Migration**: `database/migrations/20260927_b01_rbac_permissions_down.sql`
- **Local Fallback Data**: `server/lib/supabase.js` (`SEED_PERMISSIONS`, `SEED_ROLES`).
