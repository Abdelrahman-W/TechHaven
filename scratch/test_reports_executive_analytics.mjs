import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import ReportingService from '../server/lib/reportingService.js';
import { db } from '../server/lib/supabase.js';

const storePath = 'server/data/store.json';
const before = crypto.createHash('md5').update(fs.readFileSync(storePath)).digest('hex');
let assertions = 0;
const check = (condition, message) => { assert.ok(condition, message); assertions += 1; };

const manager = { role: 'store_manager' };
const customer = { role: 'user' };
const costViewer = { role: 'accountant' };

const all = await ReportingService.getSalesSummary({ period: 'all_time' }, manager);
check(typeof all.gross_sales_revenue === 'number', 'sales revenue is numeric');
check(typeof all.total_orders === 'number', 'sales order count is numeric');

const executive = await ReportingService.getExecutiveSummary({ period: 'all_time' }, costViewer);
const profitability = await ReportingService.getProfitabilitySummary({ period: 'all_time' }, costViewer);
check(executive.sales.gross_revenue === all.gross_sales_revenue, 'executive revenue equals sales revenue');
check(executive.sales.total_orders === all.total_orders, 'executive order count equals sales order count');
check(executive.profitability.gross_profit === profitability.gross_profit, 'executive gross profit equals profitability gross profit');

const restricted = await ReportingService.getProfitabilitySummary({ period: 'all_time' }, customer);
check(restricted.known_cogs === null, 'unauthorized users do not receive known COGS');
check(restricted.gross_profit === null, 'unauthorized users do not receive gross profit');

const bounded = await ReportingService.getProductPerformance({ period: 'all_time', page: 999999, limit: 999999 }, manager);
check(bounded.pagination.limit === 100, 'product page size is capped at 100');
check(bounded.data.length <= 100, 'product page never exceeds cap');

const range = ReportingService.normalizeDateRange({ from: '2026-10-01', to: '2026-10-02' });
check(range.startDate === '2026-10-01T00:00:00.000Z', 'custom start date is start-of-day');
check(range.endDate === '2026-10-02T00:00:00.000Z', 'custom end date uses exclusive boundary');
assert.throws(() => ReportingService.normalizeDateRange({ period: 'today', from: '2026-10-01' }), (error) => error.code === 'AMBIGUOUS_DATE_RANGE');
assert.throws(() => ReportingService.normalizeDateRange({ period: 'invalid' }), /INVALID_PERIOD|الفترة/);
assertions += 2;

const [inventory, movements, purchasing, b2b, alerts] = await Promise.all([
  ReportingService.getInventoryReport({ period: 'all_time' }, manager),
  ReportingService.getInventoryMovementsReport({ period: 'all_time' }, manager),
  ReportingService.getPurchasingReport({ period: 'all_time' }, manager),
  ReportingService.getB2BReport({}, manager),
  ReportingService.getOperationalAlertsReport({}, manager),
]);
check(typeof inventory.total_skus === 'number', 'inventory report returns SKU count');
check(typeof movements.total_movements_count === 'number', 'movement report returns bounded count');
check(typeof purchasing.total_purchase_orders === 'number', 'purchasing report returns PO count');
check(b2b && typeof b2b === 'object', 'B2B report returns object');
check(alerts && typeof alerts === 'object', 'alerts report returns object');

const after = crypto.createHash('md5').update(fs.readFileSync(storePath)).digest('hex');
check(before === after, 'reporting is read-only for local store');

console.log(`REPORTING_TEST_ASSERTIONS=${assertions}`);
console.log('REPORTING_TEST_RESULT=PASS');
