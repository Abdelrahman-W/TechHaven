/**
 * TechHaven Reports & Executive Analytics Domain Service (Batch 09)
 *
 * CRITICAL ACCOUNTING BOUNDARY:
 * This module produces operational e-commerce analytics from authoritative
 * operational records. It is not a General Ledger, double-entry accounting,
 * tax accounting, or a formal financial statement system.
 */

import { db } from './supabase.js';
import CogsService from './cogsService.js';
import ReorderService from './reorderService.js';
import B2BBalanceService from './b2bBalanceService.js';
import AutomationService from './automationService.js';
import { hasPermission } from './rbac.js';

const MAX_PAGE_SIZE = 100;
const MAX_REPORT_ROWS = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;

function asFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Math.round(asFiniteNumber(value) * 100) / 100;
}

function safeQuantity(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function error(message, code, status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

function dayStartUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function nextDayUTC(date) {
  return new Date(date.getTime() + DAY_MS);
}

function csvCell(value) {
  const raw = String(value ?? '');
  const neutralized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export class ReportingService {
  static canUserViewCost(user) {
    if (!user) return false;
    if (user.role === 'owner' || user.role === 'admin') return true;
    if (Array.isArray(user.permissions) && (
      user.permissions.includes('*') ||
      user.permissions.includes('reports.profit') ||
      user.permissions.includes('products.cost.view')
    )) return true;

    return hasPermission(user.role, 'reports.profit') || hasPermission(user.role, 'products.cost.view');
  }

  static normalizeDateRange(params = {}) {
    const { from, to, period } = params;
    const now = new Date();
    const today = dayStartUTC(now);
    let start = null;
    let end = null;
    let periodName = 'all_time';

    if (period !== undefined && period !== '' && (from || to)) {
      throw error('لا يمكن استخدام period مع from أو to في نفس الطلب', 'AMBIGUOUS_DATE_RANGE');
    }

    if (period !== undefined && period !== '') {
      const normalizedPeriod = String(period).toLowerCase();
      periodName = normalizedPeriod;
      switch (normalizedPeriod) {
        case 'today':
          start = today;
          end = nextDayUTC(today);
          break;
        case 'yesterday':
          end = today;
          start = new Date(today.getTime() - DAY_MS);
          break;
        case 'last_7_days':
        case '7d':
          start = new Date(today.getTime() - (6 * DAY_MS));
          end = nextDayUTC(today);
          periodName = 'last_7_days';
          break;
        case 'last_30_days':
        case '30d':
          start = new Date(today.getTime() - (29 * DAY_MS));
          end = nextDayUTC(today);
          periodName = 'last_30_days';
          break;
        case 'last_90_days':
        case '90d':
          start = new Date(today.getTime() - (89 * DAY_MS));
          end = nextDayUTC(today);
          periodName = 'last_90_days';
          break;
        case 'this_month':
          start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
          end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
          break;
        case 'last_month':
          start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
          end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
          break;
        case 'this_year':
          start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
          end = new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1));
          break;
        case 'all_time':
          start = null;
          end = null;
          break;
        default:
          throw error('الفترة المحددة غير مدعومة', 'INVALID_PERIOD');
      }
    } else if (from || to) {
      periodName = 'custom';
      if (from) {
        const parsed = new Date(from);
        if (Number.isNaN(parsed.getTime())) throw error('تاريخ البدء غير صالح', 'INVALID_DATE_FORMAT');
        start = String(from).length === 10 ? dayStartUTC(parsed) : parsed;
      }
      if (to) {
        const parsed = new Date(to);
        if (Number.isNaN(parsed.getTime())) throw error('تاريخ الانتهاء غير صالح', 'INVALID_DATE_FORMAT');
        end = String(to).length === 10 ? dayStartUTC(parsed) : parsed;
      }
    }

    if (start && end && start.getTime() >= end.getTime()) {
      throw error('تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء', 'INVALID_DATE_RANGE');
    }

    return {
      startDate: start ? start.toISOString() : null,
      endDate: end ? end.toISOString() : null,
      periodName,
      interval: '[start,end)',
    };
  }

  static normalizePagination(params = {}) {
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, parseInt(params.limit, 10) || 25));
    return { page, limit };
  }

  static filterByDate(records = [], startDate = null, endDate = null, field = 'created_at') {
    return (Array.isArray(records) ? records : []).filter((record) => {
      if (!record?.[field]) return false;
      const timestamp = new Date(record[field]).getTime();
      if (Number.isNaN(timestamp)) return false;
      return (!startDate || timestamp >= new Date(startDate).getTime()) &&
        (!endDate || timestamp < new Date(endDate).getTime());
    });
  }

  static getOrderItems(order) {
    const items = order?.items || order?.order_items || [];
    return Array.isArray(items) ? items : [];
  }

  static getRecognizedSalesOrders(orders = []) {
    return (Array.isArray(orders) ? orders : []).filter(
      (order) => String(order?.status || '').toLowerCase() !== 'cancelled'
    );
  }

  static async getOrderAnalytics(params = {}) {
    const range = this.normalizeDateRange(params);
    const allOrders = await db.getOrders();
    const periodOrders = this.filterByDate(allOrders, range.startDate, range.endDate);
    const recognizedOrders = this.getRecognizedSalesOrders(periodOrders);
    const cogs = CogsService.calculateAggregateProfit(recognizedOrders);

    let cancelledOrdersCount = 0;
    let paidOrConfirmedOrdersCount = 0;
    let pendingFulfillmentCount = 0;
    for (const order of periodOrders) {
      const status = String(order.status || '').toLowerCase();
      if (status === 'cancelled') {
        cancelledOrdersCount += 1;
        continue;
      }
      const paymentStatus = String(order.payment_status || '').toLowerCase();
      if (paymentStatus === 'paid' || ['confirmed', 'processing', 'shipped', 'delivered'].includes(status)) {
        paidOrConfirmedOrdersCount += 1;
      }
      if (['pending', 'confirmed', 'processing'].includes(status)) pendingFulfillmentCount += 1;
    }

    return {
      ...range,
      periodOrders,
      recognizedOrders,
      cogs,
      cancelledOrdersCount,
      paidOrConfirmedOrdersCount,
      pendingFulfillmentCount,
    };
  }

  static buildSalesSummary(analytics) {
    const revenue = roundMoney(analytics.cogs.totalRevenue);
    const recognizedCount = analytics.recognizedOrders.length;
    return {
      period: analytics.periodName,
      start_date: analytics.startDate,
      end_date: analytics.endDate,
      date_interval: analytics.interval,
      total_orders: analytics.periodOrders.length,
      recognized_sales_orders_count: recognizedCount,
      paid_or_confirmed_orders_count: analytics.paidOrConfirmedOrdersCount,
      pending_fulfillment_count: analytics.pendingFulfillmentCount,
      cancelled_orders_count: analytics.cancelledOrdersCount,
      gross_sales_revenue: revenue,
      total_units_sold: analytics.cogs.totalUnitsSold,
      average_order_value: recognizedCount ? roundMoney(revenue / recognizedCount) : 0,
      revenue_basis: 'Historical order-item unit-price snapshots; cancelled orders excluded',
    };
  }

  static buildProfitabilitySummary(analytics, user) {
    const authorized = this.canUserViewCost(user);
    const complete = analytics.cogs.coverageStatus === 'FULL';
    const revenue = roundMoney(analytics.cogs.totalRevenue);
    return {
      period: analytics.periodName,
      start_date: analytics.startDate,
      end_date: analytics.endDate,
      date_interval: analytics.interval,
      authorized,
      total_orders: analytics.recognizedOrders.length,
      total_units_sold: analytics.cogs.totalUnitsSold,
      units_with_cost: analytics.cogs.unitsWithCost,
      incomplete_cost_units: Math.max(0, analytics.cogs.totalUnitsSold - analytics.cogs.unitsWithCost),
      cogs_coverage_percentage: analytics.cogs.coveragePercentage,
      coverage_status: analytics.cogs.coverageStatus,
      profit_complete: complete,
      gross_sales_revenue: revenue,
      known_cogs: authorized ? analytics.cogs.totalCogs : null,
      cogs: authorized && complete ? analytics.cogs.totalCogs : null,
      gross_profit: authorized && complete ? analytics.cogs.grossProfit : null,
      gross_margin: authorized && complete ? analytics.cogs.grossMargin : null,
      cost_basis: authorized
        ? 'Historical order-item unit-cost snapshots; cost totals are withheld from profit metrics until coverage is full'
        : 'Restricted internal cost data',
    };
  }

  static async getSalesSummary(params = {}, _user = null) {
    return this.buildSalesSummary(await this.getOrderAnalytics(params));
  }

  static async getProfitabilitySummary(params = {}, user = null) {
    return this.buildProfitabilitySummary(await this.getOrderAnalytics(params), user);
  }

  static async getSalesTrend(params = {}, user = null) {
    const interval = String(params.interval || 'daily').toLowerCase();
    if (!['daily', 'weekly', 'monthly'].includes(interval)) {
      throw error('الفاصل الزمني غير صالح', 'INVALID_INTERVAL');
    }

    const analytics = await this.getOrderAnalytics(params);
    const authorized = this.canUserViewCost(user);
    const buckets = new Map();

    for (const order of analytics.recognizedOrders) {
      const date = new Date(order.created_at);
      let key;
      if (interval === 'monthly') {
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      } else if (interval === 'weekly') {
        const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const day = copy.getUTCDay() || 7;
        copy.setUTCDate(copy.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
        const week = Math.ceil((((copy - yearStart) / DAY_MS) + 1) / 7);
        key = `${copy.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
      } else {
        key = date.toISOString().slice(0, 10);
      }
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(order);
    }

    const data = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, orders]) => {
      const cogs = CogsService.calculateAggregateProfit(orders);
      const complete = cogs.coverageStatus === 'FULL';
      return {
        date,
        order_count: orders.length,
        units_sold: cogs.totalUnitsSold,
        revenue: roundMoney(cogs.totalRevenue),
        cogs_coverage_percentage: cogs.coveragePercentage,
        coverage_status: cogs.coverageStatus,
        cogs: authorized && complete ? cogs.totalCogs : null,
        gross_profit: authorized && complete ? cogs.grossProfit : null,
        gross_margin: authorized && complete ? cogs.grossMargin : null,
      };
    });

    return {
      period: analytics.periodName,
      start_date: analytics.startDate,
      end_date: analytics.endDate,
      date_interval: analytics.interval,
      interval,
      data,
    };
  }

  static async getProductCatalogContext() {
    const [products, categories] = await Promise.all([db.getAllProducts(), db.getAllCategories()]);
    const categoryNames = new Map((categories || []).map((category) => [
      category.id,
      category.name || category.name_ar || category.slug || category.id,
    ]));
    return { products: products || [], categoryNames };
  }

  static buildProductStats(orders = []) {
    const stats = new Map();
    for (const order of orders) {
      for (const item of this.getOrderItems(order)) {
        const productId = item.product_id || item.productId || item.id;
        if (!productId) continue;
        if (!stats.has(productId)) {
          stats.set(productId, { quantity_sold: 0, revenue: 0, known_cogs: 0, units_with_cost: 0 });
        }
        const value = stats.get(productId);
        const quantity = safeQuantity(item.quantity);
        const revenue = asFiniteNumber(item.unit_price ?? item.price, 0) * quantity;
        const rawCost = item.unit_cost;
        const hasCost = rawCost !== undefined && rawCost !== null && Number.isFinite(Number(rawCost));
        value.quantity_sold += quantity;
        value.revenue += revenue;
        if (hasCost) {
          value.known_cogs += Math.max(0, Number(rawCost)) * quantity;
          value.units_with_cost += quantity;
        }
      }
    }
    return stats;
  }

  static buildProductRow(product, stat, categoryNames, canViewCost) {
    const categoryId = product.category_id || product.category || null;
    const categoryName = categoryNames.get(categoryId) || product.category_name || product.category || 'غير مصنف';
    const quantity = stat.quantity_sold;
    const coverage = quantity ? Number(((stat.units_with_cost / quantity) * 100).toFixed(1)) : 100;
    const complete = quantity === 0 || stat.units_with_cost === quantity;
    const stock = asFiniteNumber(product.stock_qty ?? product.stock, 0);
    const currentCost = asFiniteNumber(product.cost_price, 0);
    const revenue = roundMoney(stat.revenue);
    const knownCogs = roundMoney(stat.known_cogs);

    return {
      product_id: product.id,
      name: product.name || 'منتج بدون اسم',
      sku: product.sku || '',
      category_id: categoryId,
      category: categoryName,
      current_stock: stock,
      quantity_sold: quantity,
      revenue,
      cogs_coverage_percentage: coverage,
      coverage_status: complete ? 'FULL' : stat.units_with_cost ? 'PARTIAL' : 'UNAVAILABLE',
      current_cost: canViewCost ? currentCost : null,
      current_stock_valuation: canViewCost ? roundMoney(Math.max(0, stock) * currentCost) : null,
      known_cogs: canViewCost ? knownCogs : null,
      cogs: canViewCost && complete ? knownCogs : null,
      gross_profit: canViewCost && complete ? roundMoney(revenue - knownCogs) : null,
      gross_margin: canViewCost && complete && revenue > 0
        ? Number((((revenue - knownCogs) / revenue) * 100).toFixed(2))
        : null,
    };
  }

  static async getProductPerformance(params = {}, user = null) {
    const analytics = await this.getOrderAnalytics(params);
    const { page, limit } = this.normalizePagination(params);
    const allowedSorts = new Set(['revenue', 'quantity_sold', 'gross_profit', 'gross_margin', 'current_stock', 'name']);
    const sort = params.sort || 'revenue';
    if (!allowedSorts.has(sort)) throw error('حقل الفرز غير صالح', 'INVALID_SORT');
    const direction = String(params.direction || params.order || 'desc').toLowerCase();
    if (!['asc', 'desc'].includes(direction)) throw error('اتجاه الفرز غير صالح', 'INVALID_SORT_DIRECTION');

    const [catalog, stats] = await Promise.all([
      this.getProductCatalogContext(),
      Promise.resolve(this.buildProductStats(analytics.recognizedOrders)),
    ]);
    const canViewCost = this.canUserViewCost(user);
    let data = catalog.products.map((product) => this.buildProductRow(
      product,
      stats.get(product.id) || { quantity_sold: 0, revenue: 0, known_cogs: 0, units_with_cost: 0 },
      catalog.categoryNames,
      canViewCost,
    ));

    if (params.category && params.category !== 'ALL') {
      const wanted = String(params.category).toLowerCase();
      data = data.filter((row) => String(row.category_id || '').toLowerCase() === wanted || String(row.category).toLowerCase() === wanted);
    }
    if (params.search) {
      const query = String(params.search).toLowerCase().trim();
      data = data.filter((row) => row.name.toLowerCase().includes(query) || row.sku.toLowerCase().includes(query));
    }

    const multiplier = direction === 'asc' ? 1 : -1;
    data.sort((left, right) => {
      const a = left[sort];
      const b = right[sort];
      if (typeof a === 'string' || typeof b === 'string') return String(a || '').localeCompare(String(b || ''), 'ar') * multiplier;
      return (asFiniteNumber(a, -Infinity) - asFiniteNumber(b, -Infinity)) * multiplier;
    });

    const total = data.length;
    return {
      period: analytics.periodName,
      start_date: analytics.startDate,
      end_date: analytics.endDate,
      date_interval: analytics.interval,
      data: data.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getCategoryPerformance(params = {}, user = null) {
    const analytics = await this.getOrderAnalytics(params);
    const { products, categoryNames } = await this.getProductCatalogContext();
    const productMap = new Map(products.map((product) => [product.id, product]));
    const stats = this.buildProductStats(analytics.recognizedOrders);
    const canViewCost = this.canUserViewCost(user);
    const categories = new Map();

    for (const [productId, stat] of stats.entries()) {
      const product = productMap.get(productId) || {};
      const categoryId = product.category_id || product.category || 'uncategorized';
      const name = categoryNames.get(categoryId) || product.category_name || product.category || 'غير مصنف';
      if (!categories.has(categoryId)) categories.set(categoryId, { category_id: categoryId, category: name, quantity_sold: 0, revenue: 0, known_cogs: 0, units_with_cost: 0 });
      const row = categories.get(categoryId);
      row.quantity_sold += stat.quantity_sold;
      row.revenue += stat.revenue;
      row.known_cogs += stat.known_cogs;
      row.units_with_cost += stat.units_with_cost;
    }

    const data = [...categories.values()].map((row) => {
      const coverage = row.quantity_sold ? Number(((row.units_with_cost / row.quantity_sold) * 100).toFixed(1)) : 100;
      const complete = row.quantity_sold === 0 || row.units_with_cost === row.quantity_sold;
      const revenue = roundMoney(row.revenue);
      const knownCogs = roundMoney(row.known_cogs);
      return {
        category_id: row.category_id,
        category: row.category,
        quantity_sold: row.quantity_sold,
        revenue,
        cogs_coverage_percentage: coverage,
        coverage_status: complete ? 'FULL' : row.units_with_cost ? 'PARTIAL' : 'UNAVAILABLE',
        known_cogs: canViewCost ? knownCogs : null,
        cogs: canViewCost && complete ? knownCogs : null,
        gross_profit: canViewCost && complete ? roundMoney(revenue - knownCogs) : null,
        gross_margin: canViewCost && complete && revenue > 0 ? Number((((revenue - knownCogs) / revenue) * 100).toFixed(2)) : null,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return {
      period: analytics.periodName,
      start_date: analytics.startDate,
      end_date: analytics.endDate,
      date_interval: analytics.interval,
      data,
    };
  }

  static async getInventoryReport(_params = {}, user = null) {
    const [products, reorder] = await Promise.all([db.getAllProducts(), ReorderService.getReorderSummary(user)]);
    const canViewCost = this.canUserViewCost(user);
    let unitsOnHand = 0;
    let valuation = 0;
    for (const product of products || []) {
      const stock = Math.max(0, asFiniteNumber(product.stock_qty ?? product.stock, 0));
      unitsOnHand += stock;
      valuation += stock * Math.max(0, asFiniteNumber(product.cost_price, 0));
    }

    return {
      total_skus: (products || []).length,
      in_stock_skus: Math.max(0, (products || []).length - reorder.out_of_stock_count),
      out_of_stock_skus: reorder.out_of_stock_count,
      low_stock_skus: reorder.low_stock_count,
      no_reorder_rule_skus: reorder.no_rule_count,
      total_units_on_hand: unitsOnHand,
      inventory_valuation_egp: canViewCost ? roundMoney(valuation) : null,
      valuation_basis: 'Current operational weighted-average unit cost; not formal accounting valuation',
      stock_health_basis: 'ReorderService server-authoritative stock health',
    };
  }

  static async getInventoryMovementsReport(params = {}, _user = null) {
    const range = this.normalizeDateRange(params);
    const movements = await this.fetchBoundedPages(
      (query) => db.getInventoryMovements(query),
      { startDate: range.startDate, endDate: range.endDate },
      'inventory movements',
    );
    const byMovementType = {};
    let inflow = 0;
    let outflow = 0;
    for (const movement of movements) {
      const quantity = asFiniteNumber(movement.quantity_delta ?? movement.quantity_change, 0);
      const type = movement.type || movement.movement_type || 'UNKNOWN';
      if (!byMovementType[type]) byMovementType[type] = { count: 0, quantity: 0 };
      byMovementType[type].count += 1;
      byMovementType[type].quantity += quantity;
      if (quantity >= 0) inflow += quantity;
      else outflow += Math.abs(quantity);
    }
    return {
      period: range.periodName,
      start_date: range.startDate,
      end_date: range.endDate,
      date_interval: range.interval,
      total_movements_count: movements.length,
      total_inflow_quantity: inflow,
      total_outflow_quantity: outflow,
      net_quantity_change: inflow - outflow,
      by_movement_type: byMovementType,
    };
  }

  static async getPurchasingReport(params = {}, _user = null) {
    const range = this.normalizeDateRange(params);
    const purchaseOrders = await this.fetchBoundedPages(
      (query) => db.getPurchaseOrders(query),
      { startDate: range.startDate, endDate: range.endDate, supplier_id: params.supplier_id || params.supplier },
      'purchase orders',
    );
    const suppliers = new Map();
    const statusCounts = { DRAFT: 0, CONFIRMED: 0, CLOSED: 0, CANCELLED: 0 };
    let purchasingValue = 0;
    let ordered = 0;
    let received = 0;

    for (const purchaseOrder of purchaseOrders) {
      const supplierId = purchaseOrder.supplier_id || 'UNKNOWN';
      const supplierName = purchaseOrder.supplier?.name || purchaseOrder.supplier_name || 'مورد غير محدد';
      if (!suppliers.has(supplierId)) suppliers.set(supplierId, { supplier_id: supplierId, supplier_name: supplierName, po_count: 0, purchased_value: 0, ordered_quantity: 0, received_quantity: 0 });
      const supplier = suppliers.get(supplierId);
      const status = String(purchaseOrder.status || '').toUpperCase();
      if (statusCounts[status] !== undefined) statusCounts[status] += 1;
      const total = roundMoney(purchaseOrder.total ?? purchaseOrder.total_amount ?? purchaseOrder.subtotal);
      supplier.po_count += 1;
      if (status !== 'CANCELLED') {
        purchasingValue += total;
        supplier.purchased_value += total;
      }
      for (const item of (purchaseOrder.items || [])) {
        const orderedQuantity = Math.max(0, asFiniteNumber(item.quantity, 0));
        const receivedQuantity = Math.max(0, asFiniteNumber(item.received_quantity, 0));
        ordered += orderedQuantity;
        received += receivedQuantity;
        supplier.ordered_quantity += orderedQuantity;
        supplier.received_quantity += receivedQuantity;
      }
    }

    const suppliersBreakdown = [...suppliers.values()]
      .map((supplier) => ({ ...supplier, purchased_value: roundMoney(supplier.purchased_value) }))
      .sort((a, b) => b.purchased_value - a.purchased_value);
    return {
      period: range.periodName,
      start_date: range.startDate,
      end_date: range.endDate,
      date_interval: range.interval,
      total_purchase_orders: purchaseOrders.length,
      draft_pos_count: statusCounts.DRAFT,
      confirmed_pos_count: statusCounts.CONFIRMED,
      closed_pos_count: statusCounts.CLOSED,
      cancelled_pos_count: statusCounts.CANCELLED,
      total_purchasing_value: roundMoney(purchasingValue),
      total_ordered_quantity: ordered,
      total_received_quantity: received,
      total_outstanding_quantity: Math.max(0, ordered - received),
      receiving_completion_percentage: ordered ? Number(((received / ordered) * 100).toFixed(1)) : 100,
      suppliers_breakdown: suppliersBreakdown,
    };
  }

  static async getB2BReport(_params = {}, _user = null) {
    const summary = await B2BBalanceService.getBalancesSummary();
    return {
      ...summary,
      report_time: new Date().toISOString(),
      as_of: new Date().toISOString(),
      balance_semantics: 'Positive balance means the customer owes TechHaven; negative balance means operational customer credit.',
      scope: 'Current operational B2B balance snapshot, not an accounts-receivable ledger.',
    };
  }

  static async getOperationalAlertsReport(_params = {}, _user = null) {
    const summary = await AutomationService.getSummary();
    return { ...summary, report_time: new Date().toISOString() };
  }

  static async getExecutiveSummary(params = {}, user = null) {
    const analytics = await this.getOrderAnalytics(params);
    const [inventory, purchasing, b2b, alerts] = await Promise.all([
      this.getInventoryReport({}, user),
      this.getPurchasingReport({ from: analytics.startDate, to: analytics.endDate }, user),
      this.getB2BReport({}, user),
      this.getOperationalAlertsReport({}, user),
    ]);
    const sales = this.buildSalesSummary(analytics);
    const profitability = this.buildProfitabilitySummary(analytics, user);
    return {
      period: analytics.periodName,
      start_date: analytics.startDate,
      end_date: analytics.endDate,
      date_interval: analytics.interval,
      generated_at: new Date().toISOString(),
      sales: {
        gross_revenue: sales.gross_sales_revenue,
        total_orders: sales.total_orders,
        recognized_orders: sales.recognized_sales_orders_count,
        paid_or_confirmed_orders: sales.paid_or_confirmed_orders_count,
        average_order_value: sales.average_order_value,
        units_sold: sales.total_units_sold,
      },
      profitability: {
        authorized: profitability.authorized,
        profit_complete: profitability.profit_complete,
        cogs: profitability.cogs,
        gross_profit: profitability.gross_profit,
        gross_margin: profitability.gross_margin,
        cogs_coverage_percentage: profitability.cogs_coverage_percentage,
      },
      inventory: {
        total_skus: inventory.total_skus,
        in_stock_skus: inventory.in_stock_skus,
        low_stock_skus: inventory.low_stock_skus,
        out_of_stock_skus: inventory.out_of_stock_skus,
        total_units_on_hand: inventory.total_units_on_hand,
        inventory_valuation_egp: inventory.inventory_valuation_egp,
      },
      purchasing: {
        total_pos: purchasing.total_purchase_orders,
        confirmed_pos: purchasing.confirmed_pos_count,
        purchasing_value: purchasing.total_purchasing_value,
        outstanding_receiving_qty: purchasing.total_outstanding_quantity,
        completion_rate: purchasing.receiving_completion_percentage,
      },
      b2b: {
        total_customers: b2b.total_b2b_customers,
        total_outstanding_debt: b2b.total_outstanding,
        total_operational_credit: b2b.total_operational_credit,
        customers_with_debt: b2b.customers_with_debt_count,
      },
      operations: {
        total_active_alerts: alerts.total_active_alerts,
        critical_alerts: alerts.critical_count,
        warning_alerts: alerts.warning_count,
      },
    };
  }

  static assertExportPermission(reportType, user) {
    if (!hasPermission(user?.role, 'reports.export')) throw error('غير مصرح لك بتصدير التقارير', 'FORBIDDEN', 403);
    const requirements = {
      sales: 'reports.sales',
      products: 'reports.sales',
      inventory: 'reports.inventory',
      purchasing: 'reports.purchasing',
      suppliers: 'reports.purchasing',
    };
    const required = requirements[reportType];
    if (!required) throw error('نوع التقرير غير مدعوم للتصدير', 'INVALID_REPORT_TYPE');
    if (!hasPermission(user?.role, required)) throw error('غير مصرح لك بهذا التقرير', 'FORBIDDEN', 403);
  }

  static async exportReportCSV(reportType, params = {}, user = null) {
    this.assertExportPermission(reportType, user);
    const withCost = this.canUserViewCost(user);
    let rows = [];

    if (reportType === 'sales') {
      const report = await this.getSalesTrend({ ...params, interval: 'daily' }, user);
      rows = [['التاريخ', 'عدد الطلبات', 'القطع المباعة', 'إجمالي المبيعات (ج.م)'], ...report.data.map((row) => [row.date, row.order_count, row.units_sold, row.revenue])];
    } else if (reportType === 'products') {
      const report = await this.getProductPerformance({ ...params, page: 1, limit: 2000 }, user);
      const header = ['معرف المنتج', 'اسم المنتج', 'SKU', 'القسم', 'الرصيد الحالي', 'القطع المباعة', 'المبيعات (ج.م)'];
      if (withCost) header.push('تغطية التكلفة %', 'COGS المعروف', 'COGS الكامل', 'الربح الإجمالي', 'هامش الربح %');
      rows = [header, ...report.data.map((row) => {
        const line = [row.product_id, row.name, row.sku, row.category, row.current_stock, row.quantity_sold, row.revenue];
        if (withCost) line.push(row.cogs_coverage_percentage, row.known_cogs ?? '', row.cogs ?? '', row.gross_profit ?? '', row.gross_margin ?? '');
        return line;
      })];
    } else if (reportType === 'inventory') {
      const products = await db.getAllProducts();
      const header = ['معرف المنتج', 'اسم المنتج', 'SKU', 'الرصيد الحالي', 'سعر البيع'];
      if (withCost) header.push('سعر التكلفة', 'قيمة المخزون (ج.م)');
      rows = [header, ...(products || []).map((product) => {
        const stock = asFiniteNumber(product.stock_qty ?? product.stock, 0);
        const line = [product.id, product.name, product.sku || '', stock, asFiniteNumber(product.price, 0)];
        if (withCost) line.push(asFiniteNumber(product.cost_price, 0), roundMoney(stock * asFiniteNumber(product.cost_price, 0)));
        return line;
      })];
    } else {
      const report = await this.getPurchasingReport(params, user);
      rows = [['المورد', 'عدد أوامر الشراء', 'إجمالي المشتريات (ج.م)', 'الكميات المطلوبة', 'الكميات المستلمة'], ...report.suppliers_breakdown.map((supplier) => [supplier.supplier_name, supplier.po_count, supplier.purchased_value, supplier.ordered_quantity, supplier.received_quantity])];
    }

    return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
  }
}

export default ReportingService;
