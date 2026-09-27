# BATCH 06 — REORDER INTELLIGENCE IMPLEMENTATION REPORT

## 1. Status
**PASS** — Reorder Intelligence domain layer, server-authoritative calculations, RBAC cost isolation, dual database migration / local persistence, and Admin UI have been fully implemented, verified against 32 acceptance test suites, passed ESLint and Vite production build.

> **Advisory Rule**: Reorder Intelligence is strictly advisory and does not automatically mutate inventory or create purchase orders.

---

## 2. Definitions
- **`reorder_point`**: The operational stock threshold at or below which inventory replenishment is recommended (`current_stock <= reorder_point`). Integer $\ge 0$.
- **`target_stock`**: The desired stock level to reach after replenishment. Integer $\ge 0$ (and $\ge \text{reorder\_point}$ when reorder tracking is enabled).
- **`reorder_quantity`**: Suggested replenishment units needed: $\max(\text{target\_stock} - \text{current\_stock}, 0)$ when at or below reorder point, otherwise $0$.
- **`reorder_enabled`**: Boolean flag indicating whether reorder rules and notifications are active for a specific product.
- **`current_stock`**: Operational stock level directly projected from `products.stock_qty`.

---

## 3. Data Model
Extended `products` table and local fallback store with 3 dedicated replenishment attributes:
- `reorder_point` (`INT NOT NULL DEFAULT 0 CHECK (reorder_point >= 0)`)
- `target_stock` (`INT NOT NULL DEFAULT 0 CHECK (target_stock >= 0)`)
- `reorder_enabled` (`BOOLEAN NOT NULL DEFAULT FALSE`)
- Index: `idx_products_reorder` on `(reorder_enabled, stock_qty, reorder_point)`

---

## 4. Reorder Formulas
Authoritative server-side formula in `server/lib/reorderService.js`:
```javascript
if (current_stock <= 0) {
  stock_status = 'OUT_OF_STOCK';
  reorder_quantity = reorder_enabled ? Math.max(0, target_stock - current_stock) : 0;
} else if (!reorder_enabled) {
  stock_status = 'NO_REORDER_RULE';
  reorder_quantity = 0;
} else if (current_stock <= reorder_point) {
  stock_status = 'LOW_STOCK';
  reorder_quantity = Math.max(0, target_stock - current_stock);
} else {
  stock_status = 'HEALTHY';
  reorder_quantity = 0;
}
```

---

## 5. Stock Status Rules
- **`OUT_OF_STOCK`**: `current_stock <= 0`
- **`LOW_STOCK`**: `reorder_enabled === true` AND `0 < current_stock <= reorder_point`
- **`HEALTHY`**: `reorder_enabled === true` AND `current_stock > reorder_point`
- **`NO_REORDER_RULE`**: `reorder_enabled === false` AND `current_stock > 0`

---

## 6. Domain Service (`server/lib/reorderService.js`)
- `calculateStockHealth(product)`: Core pure function returning health metrics and suggested replenishment quantity.
- `enrichProduct(product, canViewCost)`: Augments product record with stock status, reorder quantity, and strict cost-isolated fields.
- `getReorderList(params, user)`: Paginated, filtered, sorted reorder intelligence with RBAC cost protection.
- `getReorderSummary(user)`: High-level KPI aggregations (`total_products`, `total_tracked_products`, `healthy_count`, `low_stock_count`, `out_of_stock_count`, `total_reorder_suggestions`, `total_suggested_units`, `total_estimated_replenishment_value`).
- `getProductReorder(productId, user)`: Single-product reorder intelligence view.
- `updateProductReorderSettings(productId, settings, actorUser)`: Validated update of reorder thresholds and rules with cache invalidation.

---

## 7. APIs
- `GET /api/inventory/reorder`: List products with reorder calculations, filterable by `status`, `category`, `search`, and sortable by stock, qty, value.
- `GET /api/inventory/reorder/summary`: Reorder intelligence KPI summary.
- `GET /api/products/:id/reorder`: Single-product reorder info.
- `PUT /api/products/:id/reorder-settings`: Update reorder point, target stock, and enabled state.

---

## 8. RBAC
- **`inventory.reorder.view`** / **`admin.reorder.view`**: Required to access reorder intelligence dashboards and summaries. Granted to `owner`, `store_manager`, `inventory_officer`.
- **`inventory.reorder.manage`**: Required to edit reorder thresholds and toggle tracking. Granted to `owner`, `store_manager`, `inventory_officer`.
- **Unauthenticated**: 401 Unauthorized.
- **Customer / Fulfillment Agent (without permission)**: 403 Forbidden.

---

## 9. UI Implementation
- **Dedicated Page**: `src/pages/Admin/ReorderIntelligence.jsx` (`/admin/reorder`) with KPI metric cards, filters (Status, Category, Search, Sort), authoritative data table, and modal dialogs.
- **Admin Sidebar**: Added "ذكاء إعادة الطلب" (`/admin/reorder`) to `AdminSidebar.jsx`.
- **Product Admin Integration**: Reorder settings (Reorder Point, Target Stock, Reorder Enabled switch) directly embedded in Product Create/Edit modal in `Products.jsx`.
- **Inventory Ledger Link**: Added quick navigation button to Reorder Intelligence from `InventoryLedger.jsx`.

---

## 10. Cost Visibility & Isolation
Financial metrics (`cost_price`, `estimated_reorder_value`, and aggregate `total_estimated_replenishment_value`) require the `products.cost.view` permission (or `owner`/`admin` role). Unauthorized roles (e.g. standard warehouse operators without cost visibility) receive `undefined` / `null` for all financial figures.

---

## 11. Estimated Reorder Value
- Formula: $\text{estimated\_reorder\_value} = \text{reorder\_quantity} \times \text{products.cost\_price}$
- Strictly an operational estimate; does not create accounting journal entries, payables, purchase orders, or mutate inventory.

---

## 12. Cache Invalidation
Reorder intelligence cache routes (`/api/inventory/reorder`, `/api/inventory/reorder/summary`) are automatically invalidated across all stock lifecycle events:
- Physical receiving of purchase orders (`receivingService.js`)
- Inventory adjustments, damage write-offs, initial imports (`inventoryService.js`)
- Product reorder settings updates (`reorderService.js`)

---

## 13. Stock Mutation Integration
Stock mutations directly project into `products.stock_qty`. Reorder status updates in real-time based on authoritative current stock without duplicating ledger movements.

---

## 14. Purchase Order Integration
Admin UI includes a guided action "طلب توريد (Create Purchase Order)" on products requiring replenishment. Clicking opens a prefilled modal with suggested quantities and supplier selection, creating a `DRAFT` purchase order that requires explicit administrative review and confirmation.

---

## 15. Local Fallback
Seamless dual-topology parity supported via `server/lib/supabase.js` local JSON persistence.

---

## 16. Supabase Migrations
- `database/migrations/20260927_b06_reorder_intelligence.sql`: Adds `reorder_point`, `target_stock`, `reorder_enabled`, non-negative constraints, and index `idx_products_reorder`.
- `database/migrations/20260927_b06_reorder_intelligence_down.sql`: Safe rollback script.

---

## 17. Security
- Client-forged `current_stock`, `reorder_quantity`, or `stock_status` in request bodies are ignored.
- Negative values and invalid `target_stock < reorder_point` constraints are strictly rejected with 400 Bad Request.
- Token forgery and IDOR protections enforced across all endpoints.

---

## 18. Audit
Changes to reorder configuration record the acting user, target product, and updated settings.

---

## 19. Tests
- **Focused Suite**: `scratch/test_reorder_intelligence.mjs` — **26/26 tests passed**.
- **Full Acceptance Runner**: `scratch/run_all_acceptance_suites.mjs` — **32/32 suites passed (100%)**.
- **ESLint**: 0 errors, 0 warnings.
- **Production Build**: `npm run build` completed cleanly in 3.45s.

---

## 20. Data Integrity
- **Baseline `store.json` MD5**: `34e2394b5c02a873ee55841d332baec6`
- **Post-Run `store.json` MD5**: `34e2394b5c02a873ee55841d332baec6` (MATCHES BASELINE)
- Product stock unchanged by configuration checks: Yes
- Historical costs and orders unchanged: Yes

---

## 21. Git
- Focused functional commit created and pushed to `origin/main`.
- Working tree clean.

---

## 22. Deferred Work
- Multi-warehouse replenishment routing
- Automated supplier ranking & lead-time forecasting
- Machine-learning demand forecasting
- Automated batch purchase order consolidation
