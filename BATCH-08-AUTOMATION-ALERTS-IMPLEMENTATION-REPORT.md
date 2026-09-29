# BATCH 08 — AUTOMATION & OPERATIONAL ALERTS IMPLEMENTATION REPORT

## 1. Status
**PASS** — All operational automation, alert lifecycle, deduplication, error isolation, RBAC route guards, Admin UI, dual topology persistence, and 34 full acceptance suites passed with 100% success.

---

## 2. Critical Safety Boundary & Principle
> **"Automation and alerts are operational projections. They are not a source of truth for inventory, orders, purchasing, or financial balances."**

- **Advisory by Default**: The automation layer detects conditions, projects alerts, updates timestamps, resolves alerts whose underlying conditions cleared, and aggregates operational metrics.
- **Zero Silent Mutations**: Automation NEVER silently modifies stock levels, creates inventory movements, updates cost fields, approves/cancels orders, receives purchase orders, records payments, or alters customer balances.

---

## 3. Architecture Recon & Existing Integration
- Reused **`ReorderService` (Batch 06)** for authoritative stock health, reorder points, target stocks, and recommended replenishment quantities.
- Reused **`B2BBalanceService` (Batch 07)** for authoritative customer balances, credit limits, and available credit evaluations.
- Integrated with **`PurchaseOrderService` (Batch 04/05)** for purchasing statuses (`DRAFT`, `CONFIRMED`, `PARTIALLY_RECEIVED`, `FULLY_RECEIVED`).
- Integrated with **`OrderService`** for order fulfillment statuses (`pending`, `confirmed`, `processing` vs `shipped`, `delivered`, `cancelled`).
- Implemented lightweight, decoupled Domain Service in `server/lib/automationService.js` and dedicated REST routes in `server/routes/alerts.js` and `server/routes/automation.js`.

---

## 4. Alert Domain & Data Model
### Entity: `operational_alerts`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `VARCHAR(64) PRIMARY KEY` | Unique alert ID (`alt-...`) |
| `type` | `VARCHAR(64) NOT NULL` | Alert classification type |
| `severity` | `VARCHAR(20) NOT NULL` | `INFO`, `WARNING`, or `CRITICAL` |
| `status` | `VARCHAR(20) NOT NULL` | `OPEN`, `ACKNOWLEDGED`, or `RESOLVED` |
| `title` | `VARCHAR(255) NOT NULL` | Human-readable Arabic alert headline |
| `message` | `TEXT NOT NULL` | Detailed operational context and explanation |
| `entity_type` | `VARCHAR(50) NOT NULL` | `PRODUCT`, `PURCHASE_ORDER`, `B2B_CUSTOMER`, `ORDER`, `SYSTEM` |
| `entity_id` | `VARCHAR(100)` | Primary key of the affected business entity |
| `metadata` | `JSONB` | Non-authoritative contextual JSON payload |
| `deduplication_key` | `VARCHAR(255) UNIQUE` | Unique key (`TYPE:ENTITY_TYPE:ENTITY_ID`) |
| `first_detected_at` | `TIMESTAMPTZ NOT NULL` | When condition first emerged |
| `last_detected_at` | `TIMESTAMPTZ NOT NULL` | Most recent detection timestamp |
| `acknowledged_at` | `TIMESTAMPTZ` | Timestamp of staff acknowledgement |
| `acknowledged_by` | `VARCHAR(64)` | User ID who acknowledged |
| `resolved_at` | `TIMESTAMPTZ` | Timestamp when condition cleared or manually resolved |
| `resolved_by` | `VARCHAR(64)` | User ID or `system:automation` |

### Entity: `automation_runs`
Tracks observability, execution timing, duration, trigger source (`MANUAL`, `CRON_JOB`), alert counters (`created`, `updated`, `resolved`), and isolated error details.

---

## 5. Alert Types & Severities
| Alert Type | Severity | Domain | Trigger Condition |
| :--- | :--- | :--- | :--- |
| `INVENTORY_OUT_OF_STOCK` | `CRITICAL` | Inventory | Product current stock $\le 0$ |
| `INVENTORY_LOW_STOCK` | `WARNING` | Inventory | Product stock $\le$ reorder point or $\le 5$ (reorder disabled) |
| `REORDER_RECOMMENDED` | `WARNING` | Reorder | Product stock $\le$ reorder point and `reorder_enabled === true` |
| `PURCHASE_ORDER_PENDING` | `INFO` | Purchasing | PO in `DRAFT` (awaiting approval) or `CONFIRMED` unreceived |
| `PURCHASE_ORDER_PARTIALLY_RECEIVED` | `WARNING` | Purchasing | PO in `CONFIRMED` with `receiving_status === 'PARTIALLY_RECEIVED'` |
| `B2B_CREDIT_LIMIT_REACHED` | `WARNING` | B2B | Customer balance $\ge$ credit limit ($> 0$) |
| `B2B_CREDIT_LIMIT_EXCEEDED` | `CRITICAL` | B2B | Customer balance $>$ credit limit ($> 0$) |
| `ORDER_REQUIRES_FULFILLMENT` | `INFO` | Orders | Store order in `pending`, `confirmed`, or `processing` status |
| `AUTOMATION_FAILURE` | `CRITICAL` | System | Domain evaluation encountered an unhandled exception |

---

## 6. Alert Lifecycle & Deduplication
1. **Deduplication Engine**:
   - Every condition maps deterministically: `${type}:${entityType.toUpperCase()}:${entityId}`.
   - If condition is detected again while `OPEN` or `ACKNOWLEDGED`: updates `last_detected_at` and message without creating duplicate rows.
   - If condition is resolved and later returns: automatically reopens the alert to `OPEN`, resets `first_detected_at`/`last_detected_at`, and clears resolution timestamps.
2. **Automatic Resolution**:
   - When the underlying business entity recovers (e.g. stock replenished, PO received, B2B balance settled, order shipped), the evaluator automatically transitions the active alert to `RESOLVED` with `resolved_by = 'system:automation'`.
3. **Staff Actions**:
   - `PUT /api/alerts/:id/acknowledge`: Transitions `OPEN` $\rightarrow$ `ACKNOWLEDGED`.
   - `PUT /api/alerts/:id/resolve`: Transitions `OPEN`/`ACKNOWLEDGED` $\rightarrow$ `RESOLVED`.
   - Validates state transitions (attempting to acknowledge an already resolved alert throws `400 ALERT_ALREADY_RESOLVED`).

---

## 7. Automation Engine & Error Isolation
- **`server/lib/automationService.js`**:
  - Independent evaluator functions: `evaluateInventoryAndReorder()`, `evaluatePurchasing()`, `evaluateB2BBalances()`, `evaluateOrderFulfillment()`.
  - Executed inside individual `try/catch` sandboxes.
  - If one evaluator throws (e.g. temporary DB timeout), remaining evaluators execute uninterrupted, the failure is logged to `automation_runs`, and an `AUTOMATION_FAILURE` alert is surfaced.

---

## 8. RBAC & Security Scoping
| Permission | Description | Assigned Roles |
| :--- | :--- | :--- |
| `alerts.view` | View active and historical alerts and summaries | `owner`, `store_manager`, `inventory_officer`, `fulfillment_agent` |
| `alerts.manage` | Acknowledge and resolve operational alerts | `owner`, `store_manager`, `inventory_officer` |
| `automation.evaluate` | Trigger on-demand automation evaluations | `owner`, `store_manager`, `inventory_officer` |
| `automation.manage` | Configure automation rules and policies | `owner`, `store_manager` |
| `admin.alerts.view` | View Alerts Center in Admin Dashboard | `owner`, `store_manager`, `inventory_officer`, `fulfillment_agent` |

- **Customer & B2B Customer Scoping**: Normal customers and external B2B clients receive strict `401 Unauthorized` / `403 Forbidden` responses when attempting to query internal operational alerts or trigger evaluations.

---

## 9. API Routes Contract
| Endpoint | Method | Permission | Description |
| :--- | :---: | :--- | :--- |
| `/api/alerts` | `GET` | `alerts.view` | Paginated alerts with filters (`status`, `severity`, `type`, `entity_type`, `search`) |
| `/api/alerts/summary` | `GET` | `alerts.view` | Aggregated counts (`critical_count`, `warning_count`, `info_count`, `total_active_alerts`, entity breakdown) |
| `/api/alerts/:id` | `GET` | `alerts.view` | Retrieve single alert details |
| `/api/alerts/:id/acknowledge` | `PUT` | `alerts.manage` | Acknowledge alert |
| `/api/alerts/:id/resolve` | `PUT` | `alerts.manage` | Resolve and close alert |
| `/api/automation/evaluate` | `POST` | `automation.evaluate` | Trigger comprehensive automation run |

---

## 10. Admin UI (`/admin/alerts`)
- Created `src/pages/Admin/Alerts.jsx`:
  - **4 KPI Metric Cards**: Critical Alerts, Operational Warnings, Informational Notices, Total Active Alerts.
  - **Filter & Search Bar**: Status tabs (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `ALL`), Severity dropdown, Entity Type dropdown, and realtime keyword search.
  - **Alerts Table**: Severity icon badge with pulse styling, Title, Message, Related Entity link (direct jump to Products, Reorder, Purchasing, B2B, or Orders), Last Detected timestamp, Status badge, and Quick Actions (Acknowledge, Resolve).
  - **Interactive Automation Trigger**: "فحص وتقييم أوتوماتيكي الآن (Run Automation Evaluation)" button with tactile feedback.
- Integrated into `src/App.jsx` (route `/admin/alerts`) and `src/components/admin/AdminSidebar.jsx` with `Bell` icon.
- Integrated into `src/pages/Admin/Dashboard.jsx` with operational alerts card banner.

---

## 11. Dual Topology Parity & Migrations
- **Supabase / PostgreSQL**:
  - `database/migrations/20260929_b08_automation_alerts.sql`
  - `database/migrations/20260929_b08_automation_alerts_down.sql`
- **Local Fallback**:
  - Implemented in `server/lib/supabase.js`: `createOperationalAlert`, `updateOperationalAlert`, `getOperationalAlert`, `getOperationalAlertByDedupKey`, `getOperationalAlerts`, `createAutomationRun`, `updateAutomationRun`.
  - Atomically persisted via `saveStoreToDisk()` with deduplication index tracking.

---

## 12. Verification & Safety Test Results
- **Dedicated Test Suite (`scratch/test_automation_alerts.mjs`)**:
  - **66/66 tests passed (100%)**
  - Verified Alert Creation across all 8 operational types.
  - Verified Deduplication and Idempotency (zero duplicates on multiple runs).
  - Verified Automatic Resolution and Reopening.
  - Verified Staff Lifecycle Actions (Acknowledge, Resolve, Invalid transition prevention).
  - Verified Error Isolation & Automation Failure Observability.
  - Verified Summary Metrics.
  - Verified RBAC Permissions matrix.
  - Verified Critical Non-Mutation Safety Rules (Stock, Customer Balances, PO Statuses, Order Totals unchanged).
  - Verified HTTP REST API Route Contracts & Security (401, 403, 200).
- **Global Acceptance Test Runner (`scratch/run_all_acceptance_suites.mjs`)**:
  - **34/34 test suites passed (100%)**
  - Baseline `store.json` MD5 verified unchanged (`34e2394b5c02a873ee55841d332baec6`).
- **Code Quality**:
  - `npm run lint`: **0 errors, 0 warnings**
  - `npm run build`: **Vite production build passed cleanly**

---

## 13. Deferred Work
- Realtime WebSocket / SSE push streaming (future phase).
- Email / SMS / Webhook notification dispatchers.
- AI predictive anomaly detection or automated purchasing actions.
