/**
 * TechHaven Automation & Operational Alerts Domain Service (Batch 08)
 *
 * CRITICAL SAFETY BOUNDARY:
 * Automation is purely advisory and operational.
 * It NEVER mutates stock, costs, inventory ledger movements, purchase orders,
 * payments, customer balances, order statuses, or financial records.
 *
 * Alerts are non-authoritative projections/events to highlight actionable conditions.
 */

import { db } from './supabase.js';
import { ReorderService, STOCK_STATUSES } from './reorderService.js';
import { invalidateCache } from '../middleware/cache.js';

export const ALERT_TYPES = {
  // Inventory
  INVENTORY_OUT_OF_STOCK: 'INVENTORY_OUT_OF_STOCK',
  INVENTORY_LOW_STOCK: 'INVENTORY_LOW_STOCK',

  // Reorder
  REORDER_RECOMMENDED: 'REORDER_RECOMMENDED',

  // Purchasing
  PURCHASE_ORDER_PENDING: 'PURCHASE_ORDER_PENDING',
  PURCHASE_ORDER_PARTIALLY_RECEIVED: 'PURCHASE_ORDER_PARTIALLY_RECEIVED',

  // B2B Balances
  B2B_CREDIT_LIMIT_REACHED: 'B2B_CREDIT_LIMIT_REACHED',
  B2B_CREDIT_LIMIT_EXCEEDED: 'B2B_CREDIT_LIMIT_EXCEEDED',

  // Order Fulfillment
  ORDER_REQUIRES_FULFILLMENT: 'ORDER_REQUIRES_FULFILLMENT',

  // System
  AUTOMATION_FAILURE: 'AUTOMATION_FAILURE',
};

export const ALERT_SEVERITIES = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
};

export const ALERT_STATUSES = {
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
};

export const ENTITY_TYPES = {
  PRODUCT: 'PRODUCT',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  B2B_CUSTOMER: 'B2B_CUSTOMER',
  ORDER: 'ORDER',
  SYSTEM: 'SYSTEM',
};

export class AutomationService {
  /**
   * Deterministic Deduplication Key builder
   */
  static buildDedupKey(type, entityType, entityId) {
    const cleanType = String(type || '').trim().toUpperCase();
    const cleanEntity = String(entityType || 'SYSTEM').trim().toUpperCase();
    const cleanId = String(entityId || 'GLOBAL').trim();
    return `${cleanType}:${cleanEntity}:${cleanId}`;
  }

  /**
   * Maintain alert state: Create new, update existing, or reopen resolved alert
   */
  static async syncAlert(spec, stats = { created: 0, updated: 0, resolved: 0 }) {
    const {
      type,
      severity = ALERT_SEVERITIES.INFO,
      title,
      message,
      entity_type,
      entity_id = null,
      metadata = {},
    } = spec;

    const dedupKey = this.buildDedupKey(type, entity_type, entity_id);
    const existing = await db.getOperationalAlertByDedupKey(dedupKey);

    const now = new Date().toISOString();

    if (!existing) {
      // Create new OPEN alert
      await db.createOperationalAlert({
        type,
        severity,
        status: ALERT_STATUSES.OPEN,
        title,
        message,
        entity_type,
        entity_id: entity_id ? String(entity_id) : null,
        metadata,
        deduplication_key: dedupKey,
        first_detected_at: now,
        last_detected_at: now,
      });
      stats.created++;
      return;
    }

    if (existing.status === ALERT_STATUSES.RESOLVED) {
      // Reopen previously resolved alert if condition has returned
      await db.updateOperationalAlert(existing.id, {
        status: ALERT_STATUSES.OPEN,
        severity,
        title,
        message,
        metadata,
        first_detected_at: now,
        last_detected_at: now,
        resolved_at: null,
        resolved_by: null,
        acknowledged_at: null,
        acknowledged_by: null,
      });
      stats.created++;
      return;
    }

    // Condition persists: update last_detected_at, title, message, and metadata
    await db.updateOperationalAlert(existing.id, {
      severity,
      title,
      message,
      metadata,
      last_detected_at: now,
    });
    stats.updated++;
  }

  /**
   * Automatically resolve an alert when condition no longer exists
   */
  static async autoResolveAlert(type, entityType, entityId, stats = { created: 0, updated: 0, resolved: 0 }) {
    const dedupKey = this.buildDedupKey(type, entityType, entityId);
    const existing = await db.getOperationalAlertByDedupKey(dedupKey);

    if (existing && (existing.status === ALERT_STATUSES.OPEN || existing.status === ALERT_STATUSES.ACKNOWLEDGED)) {
      await db.updateOperationalAlert(existing.id, {
        status: ALERT_STATUSES.RESOLVED,
        resolved_at: new Date().toISOString(),
        resolved_by: 'system:automation',
      });
      stats.resolved++;
    }
  }

  /**
   * 1. Evaluator: Inventory & Reorder Conditions
   */
  static async evaluateInventoryAndReorder(stats) {
    const products = await db.getAllProducts();

    for (const product of products) {
      const stock = Number(product.stock_qty !== undefined ? product.stock_qty : (product.stock || 0));
      const health = ReorderService.calculateStockHealth(product);
      const reorderEnabled = Boolean(product.reorder_enabled);
      const reorderPoint = Number(product.reorder_point || 0);
      const targetStock = Number(product.target_stock || 0);

      // 1.1 Out of stock condition
      if (stock <= 0) {
        await this.syncAlert({
          type: ALERT_TYPES.INVENTORY_OUT_OF_STOCK,
          severity: ALERT_SEVERITIES.CRITICAL,
          title: `نفاد مخزون: ${product.name}`,
          message: `المنتج "${product.name}" (SKU: ${product.sku || 'N/A'}) نفد من المخزن تماماً (الرصيد: ${stock}).`,
          entity_type: ENTITY_TYPES.PRODUCT,
          entity_id: product.id,
          metadata: {
            sku: product.sku,
            current_stock: stock,
            reorder_point: reorderPoint,
            target_stock: targetStock,
          },
        }, stats);

        // Resolve low stock (out of stock is more critical)
        await this.autoResolveAlert(ALERT_TYPES.INVENTORY_LOW_STOCK, ENTITY_TYPES.PRODUCT, product.id, stats);
      } else {
        // Product has stock > 0 => resolve out of stock
        await this.autoResolveAlert(ALERT_TYPES.INVENTORY_OUT_OF_STOCK, ENTITY_TYPES.PRODUCT, product.id, stats);
      }

      // 1.2 Low stock & Reorder conditions
      if (stock > 0 && stock <= reorderPoint && reorderPoint > 0) {
        if (reorderEnabled) {
          await this.syncAlert({
            type: ALERT_TYPES.REORDER_RECOMMENDED,
            severity: ALERT_SEVERITIES.WARNING,
            title: `توصية إعادة طلب: ${product.name}`,
            message: `رصيد المنتج (${stock}) وصل لنقطة إعادة الطلب (${reorderPoint}). الكمية المقترحة: ${health.reorder_quantity} قطعة.`,
            entity_type: ENTITY_TYPES.PRODUCT,
            entity_id: product.id,
            metadata: {
              sku: product.sku,
              current_stock: stock,
              reorder_point: reorderPoint,
              target_stock: targetStock,
              reorder_quantity: health.reorder_quantity,
            },
          }, stats);
        } else {
          await this.syncAlert({
            type: ALERT_TYPES.INVENTORY_LOW_STOCK,
            severity: ALERT_SEVERITIES.WARNING,
            title: `مخزون منخفض: ${product.name}`,
            message: `رصيد المنتج الحالي (${stock}) منخفض.`,
            entity_type: ENTITY_TYPES.PRODUCT,
            entity_id: product.id,
            metadata: {
              sku: product.sku,
              current_stock: stock,
              reorder_point: reorderPoint,
            },
          }, stats);
          await this.autoResolveAlert(ALERT_TYPES.REORDER_RECOMMENDED, ENTITY_TYPES.PRODUCT, product.id, stats);
        }
      } else if (stock > reorderPoint || (reorderPoint === 0 && stock > 5)) {
        // Healthy stock
        await this.autoResolveAlert(ALERT_TYPES.INVENTORY_LOW_STOCK, ENTITY_TYPES.PRODUCT, product.id, stats);
        await this.autoResolveAlert(ALERT_TYPES.REORDER_RECOMMENDED, ENTITY_TYPES.PRODUCT, product.id, stats);
      }
    }
  }

  /**
   * 2. Evaluator: Purchasing & Receiving Conditions
   */
  static async evaluatePurchasing(stats) {
    const poRes = await db.getPurchaseOrders({ limit: 500 });
    const purchaseOrders = Array.isArray(poRes?.data) ? poRes.data : (Array.isArray(poRes) ? poRes : []);

    for (const po of purchaseOrders) {
      const poNumber = po.po_number || po.id;
      const supplierName = po.supplier?.name || po.supplier_name || 'المورد';

      if (po.status === 'DRAFT') {
        await this.syncAlert({
          type: ALERT_TYPES.PURCHASE_ORDER_PENDING,
          severity: ALERT_SEVERITIES.INFO,
          title: `مسودة أمر شراء بانتظار الاعتماد: ${poNumber}`,
          message: `أمر الشراء ${poNumber} للمورد "${supplierName}" ما زال في حالة مسودة وبانتظار المراجعة والاعتماد.`,
          entity_type: ENTITY_TYPES.PURCHASE_ORDER,
          entity_id: po.id,
          metadata: {
            po_number: poNumber,
            supplier_id: po.supplier_id,
            total_amount: po.total_amount,
            status: po.status,
          },
        }, stats);
        await this.autoResolveAlert(ALERT_TYPES.PURCHASE_ORDER_PARTIALLY_RECEIVED, ENTITY_TYPES.PURCHASE_ORDER, po.id, stats);
      } else if (po.status === 'CONFIRMED') {
        if (po.receiving_status === 'PARTIALLY_RECEIVED') {
          await this.syncAlert({
            type: ALERT_TYPES.PURCHASE_ORDER_PARTIALLY_RECEIVED,
            severity: ALERT_SEVERITIES.WARNING,
            title: `أمر شراء مستلم جزئياً: ${poNumber}`,
            message: `أمر الشراء ${poNumber} للمورد "${supplierName}" تم استلام جزء منه ويحتوي على كميات متبقية قيد الانتظار.`,
            entity_type: ENTITY_TYPES.PURCHASE_ORDER,
            entity_id: po.id,
            metadata: {
              po_number: poNumber,
              supplier_id: po.supplier_id,
              receiving_status: po.receiving_status,
            },
          }, stats);
          await this.autoResolveAlert(ALERT_TYPES.PURCHASE_ORDER_PENDING, ENTITY_TYPES.PURCHASE_ORDER, po.id, stats);
        } else if (po.receiving_status === 'UNRECEIVED' || !po.receiving_status) {
          await this.syncAlert({
            type: ALERT_TYPES.PURCHASE_ORDER_PENDING,
            severity: ALERT_SEVERITIES.INFO,
            title: `أمر شراء معتمد بانتظار الشحن والتوريد: ${poNumber}`,
            message: `أمر الشراء ${poNumber} معتمد وبانتظار وصول الشحنة من "${supplierName}".`,
            entity_type: ENTITY_TYPES.PURCHASE_ORDER,
            entity_id: po.id,
            metadata: {
              po_number: poNumber,
              supplier_id: po.supplier_id,
              receiving_status: po.receiving_status || 'UNRECEIVED',
            },
          }, stats);
          await this.autoResolveAlert(ALERT_TYPES.PURCHASE_ORDER_PARTIALLY_RECEIVED, ENTITY_TYPES.PURCHASE_ORDER, po.id, stats);
        } else if (po.receiving_status === 'FULLY_RECEIVED') {
          await this.autoResolveAlert(ALERT_TYPES.PURCHASE_ORDER_PENDING, ENTITY_TYPES.PURCHASE_ORDER, po.id, stats);
          await this.autoResolveAlert(ALERT_TYPES.PURCHASE_ORDER_PARTIALLY_RECEIVED, ENTITY_TYPES.PURCHASE_ORDER, po.id, stats);
        }
      } else {
        // CLOSED or CANCELLED
        await this.autoResolveAlert(ALERT_TYPES.PURCHASE_ORDER_PENDING, ENTITY_TYPES.PURCHASE_ORDER, po.id, stats);
        await this.autoResolveAlert(ALERT_TYPES.PURCHASE_ORDER_PARTIALLY_RECEIVED, ENTITY_TYPES.PURCHASE_ORDER, po.id, stats);
      }
    }
  }

  /**
   * 3. Evaluator: B2B Operational Customer Balances
   */
  static async evaluateB2BBalances(stats) {
    const custRes = await db.getB2BCustomers({ limit: 500 });
    const customers = Array.isArray(custRes?.data) ? custRes.data : (Array.isArray(custRes) ? custRes : []);

    for (const cust of customers) {
      const balance = Math.round(Number(cust.balance || 0) * 100) / 100;
      const creditLimit = Math.round(Number(cust.credit_limit || 0) * 100) / 100;
      const companyName = cust.company_name || 'عميل تجاري';

      if (creditLimit > 0 && balance > creditLimit) {
        // Exceeded credit limit
        await this.syncAlert({
          type: ALERT_TYPES.B2B_CREDIT_LIMIT_EXCEEDED,
          severity: ALERT_SEVERITIES.CRITICAL,
          title: `تجاوز الحد الائتماني لشركة: ${companyName}`,
          message: `تجاوز رصيد الشركة المستحق (${balance.toLocaleString()} ج.م) الحد الائتماني المعتمد (${creditLimit.toLocaleString()} ج.م).`,
          entity_type: ENTITY_TYPES.B2B_CUSTOMER,
          entity_id: cust.id,
          metadata: {
            company_name: companyName,
            balance,
            credit_limit: creditLimit,
            exceeded_by: Math.round((balance - creditLimit) * 100) / 100,
          },
        }, stats);
        await this.autoResolveAlert(ALERT_TYPES.B2B_CREDIT_LIMIT_REACHED, ENTITY_TYPES.B2B_CUSTOMER, cust.id, stats);
      } else if (creditLimit > 0 && balance >= creditLimit && balance > 0) {
        // Reached credit limit
        await this.syncAlert({
          type: ALERT_TYPES.B2B_CREDIT_LIMIT_REACHED,
          severity: ALERT_SEVERITIES.WARNING,
          title: `بلوغ الحد الائتماني لشركة: ${companyName}`,
          message: `بلغ رصيد الشركة المستحق (${balance.toLocaleString()} ج.م) الحد الائتماني بالكامل (${creditLimit.toLocaleString()} ج.م).`,
          entity_type: ENTITY_TYPES.B2B_CUSTOMER,
          entity_id: cust.id,
          metadata: {
            company_name: companyName,
            balance,
            credit_limit: creditLimit,
          },
        }, stats);
        await this.autoResolveAlert(ALERT_TYPES.B2B_CREDIT_LIMIT_EXCEEDED, ENTITY_TYPES.B2B_CUSTOMER, cust.id, stats);
      } else {
        // Within safe limits or settled
        await this.autoResolveAlert(ALERT_TYPES.B2B_CREDIT_LIMIT_REACHED, ENTITY_TYPES.B2B_CUSTOMER, cust.id, stats);
        await this.autoResolveAlert(ALERT_TYPES.B2B_CREDIT_LIMIT_EXCEEDED, ENTITY_TYPES.B2B_CUSTOMER, cust.id, stats);
      }
    }
  }

  /**
   * 4. Evaluator: Order Fulfillment Queue
   */
  static async evaluateOrderFulfillment(stats) {
    const ordersRes = await db.getOrders();
    const orders = Array.isArray(ordersRes) ? ordersRes : [];

    for (const order of orders) {
      const orderNumber = order.order_number || order.id;
      const status = String(order.status || '').toLowerCase();

      // Orders in pending, confirmed, or processing require fulfillment
      if (['pending', 'confirmed', 'processing'].includes(status)) {
        await this.syncAlert({
          type: ALERT_TYPES.ORDER_REQUIRES_FULFILLMENT,
          severity: ALERT_SEVERITIES.INFO,
          title: `طلب بانتظار التجهيز والشحن: #${orderNumber}`,
          message: `الطلب رقم #${orderNumber} بمبلغ ${(Number(order.total) || 0).toLocaleString()} ج.م في حالة (${order.status}) وبانتظار التجهيز والشحن.`,
          entity_type: ENTITY_TYPES.ORDER,
          entity_id: order.id,
          metadata: {
            order_number: orderNumber,
            status: order.status,
            total: order.total,
            customer_name: order.shipping_address?.full_name || order.user?.name || 'عميل',
            created_at: order.created_at,
          },
        }, stats);
      } else {
        // Shipped, delivered, or cancelled
        await this.autoResolveAlert(ALERT_TYPES.ORDER_REQUIRES_FULFILLMENT, ENTITY_TYPES.ORDER, order.id, stats);
      }
    }
  }

  /**
   * Master Automation Evaluator: Runs all domain evaluations with error isolation
   */
  static async evaluateAll(triggerSource = 'MANUAL', actorUser = null) {
    const startTime = new Date().toISOString();
    const run = await db.createAutomationRun({
      started_at: startTime,
      status: 'RUNNING',
      trigger_source: triggerSource,
      actor_id: actorUser?.id || actorUser?.userId || 'system',
    });

    const stats = {
      created: 0,
      updated: 0,
      resolved: 0,
    };
    const errors = [];

    // Evaluator list with isolated execution
    const evaluators = [
      { name: 'Inventory & Reorder', fn: () => this.evaluateInventoryAndReorder(stats) },
      { name: 'Purchasing & Receiving', fn: () => this.evaluatePurchasing(stats) },
      { name: 'B2B Customer Balances', fn: () => this.evaluateB2BBalances(stats) },
      { name: 'Order Fulfillment', fn: () => this.evaluateOrderFulfillment(stats) },
    ];

    for (const item of evaluators) {
      try {
        await item.fn();
      } catch (err) {
        console.error(`[Automation] Evaluation failure in ${item.name}:`, err);
        errors.push({
          evaluator: item.name,
          error: err.message || String(err),
          time: new Date().toISOString(),
        });

        // Record automation failure alert
        await this.syncAlert({
          type: ALERT_TYPES.AUTOMATION_FAILURE,
          severity: ALERT_SEVERITIES.CRITICAL,
          title: `فشل تقييم أوتوماتيكي: ${item.name}`,
          message: `حدث خطأ أثناء فحص ${item.name}: ${err.message}`,
          entity_type: ENTITY_TYPES.SYSTEM,
          entity_id: item.name.toLowerCase().replace(/\s+/g, '_'),
          metadata: {
            evaluator: item.name,
            error: err.message,
          },
        }, stats);
      }
    }

    const finishedTime = new Date().toISOString();
    const finalStatus = errors.length === 0 ? 'COMPLETED' : 'FAILED';

    await db.updateAutomationRun(run.id, {
      finished_at: finishedTime,
      status: finalStatus,
      alerts_created: stats.created,
      alerts_updated: stats.updated,
      alerts_resolved: stats.resolved,
      error_count: errors.length,
      error_details: errors,
    });

    invalidateCache('/api/alerts');
    invalidateCache('/api/alerts/summary');

    return {
      run_id: run.id,
      status: finalStatus,
      started_at: startTime,
      finished_at: finishedTime,
      alerts_created: stats.created,
      alerts_updated: stats.updated,
      alerts_resolved: stats.resolved,
      error_count: errors.length,
      errors,
    };
  }

  /**
   * Get paginated operational alerts
   */
  static async getAlerts(options = {}) {
    return await db.getOperationalAlerts(options);
  }

  /**
   * Get single operational alert by ID
   */
  static async getAlert(id) {
    if (!id) {
      const err = new Error('معرف التنبيه مطلوب');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }
    const alert = await db.getOperationalAlert(id);
    if (!alert) {
      const err = new Error('التنبيه غير موجود');
      err.code = 'ALERT_NOT_FOUND';
      err.status = 404;
      throw err;
    }
    return alert;
  }

  /**
   * Acknowledge an alert (staff acknowledgement)
   */
  static async acknowledgeAlert(id, actorUser = null) {
    const alert = await this.getAlert(id);

    if (alert.status === ALERT_STATUSES.RESOLVED) {
      const err = new Error('لا يمكن تأكيد استلام تنبيه تم حله وإغلاقه');
      err.code = 'ALERT_ALREADY_RESOLVED';
      err.status = 400;
      throw err;
    }

    const updated = await db.updateOperationalAlert(id, {
      status: ALERT_STATUSES.ACKNOWLEDGED,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: actorUser?.id || actorUser?.userId || 'staff',
    });

    invalidateCache('/api/alerts');
    invalidateCache('/api/alerts/summary');
    return updated;
  }

  /**
   * Manually resolve an alert
   */
  static async resolveAlert(id, actorUser = null) {
    await this.getAlert(id);

    const updated = await db.updateOperationalAlert(id, {
      status: ALERT_STATUSES.RESOLVED,
      resolved_at: new Date().toISOString(),
      resolved_by: actorUser?.id || actorUser?.userId || 'staff',
    });

    invalidateCache('/api/alerts');
    invalidateCache('/api/alerts/summary');
    return updated;
  }

  /**
   * Operational summary for Admin Dashboard and top header widgets
   */
  static async getSummary() {
    const res = await db.getOperationalAlerts({ limit: 1000 });
    const all = res.data || [];

    let totalOpen = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let acknowledgedCount = 0;
    let resolvedCount = 0;

    const byEntityType = {
      PRODUCT: 0,
      PURCHASE_ORDER: 0,
      B2B_CUSTOMER: 0,
      ORDER: 0,
      SYSTEM: 0,
    };

    for (const a of all) {
      if (a.status === ALERT_STATUSES.OPEN || a.status === ALERT_STATUSES.ACKNOWLEDGED) {
        totalOpen++;
        if (a.severity === ALERT_SEVERITIES.CRITICAL) criticalCount++;
        else if (a.severity === ALERT_SEVERITIES.WARNING) warningCount++;
        else if (a.severity === ALERT_SEVERITIES.INFO) infoCount++;

        if (a.status === ALERT_STATUSES.ACKNOWLEDGED) {
          acknowledgedCount++;
        }

        const et = a.entity_type || 'SYSTEM';
        if (byEntityType[et] !== undefined) {
          byEntityType[et]++;
        }
      } else if (a.status === ALERT_STATUSES.RESOLVED) {
        resolvedCount++;
      }
    }

    return {
      total_active_alerts: totalOpen,
      critical_count: criticalCount,
      warning_count: warningCount,
      info_count: infoCount,
      acknowledged_count: acknowledgedCount,
      resolved_count: resolvedCount,
      by_entity_type: byEntityType,
    };
  }
}

export default AutomationService;
