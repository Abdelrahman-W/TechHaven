/**
 * TechHaven Purchase Orders Domain Service (ERP-Lite Batch 04)
 * Authoritative management, lifecycle transitions, and calculations for purchase orders.
 */

import { db } from './supabase.js';

export const PO_STATUSES = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  CLOSED: 'CLOSED',
};

export const ALLOWED_TRANSITIONS = {
  [PO_STATUSES.DRAFT]: [PO_STATUSES.CONFIRMED, PO_STATUSES.CANCELLED],
  [PO_STATUSES.CONFIRMED]: [PO_STATUSES.CANCELLED, PO_STATUSES.CLOSED],
  [PO_STATUSES.CANCELLED]: [],
  [PO_STATUSES.CLOSED]: [],
};

export class PurchaseOrderService {
  /**
   * Generate a collision-safe, deterministic PO reference number.
   * Format: PO-YYYY-XXXXX (e.g., PO-2026-A8K2F)
   */
  static generatePoNumber() {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 5; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `PO-${year}-${suffix}`;
  }

  /**
   * Validate items array and resolve authoritative product snapshots & line totals.
   */
  static async validateAndCalculateItems(rawItems) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      const err = new Error('يجب إضافة منتج واحد على الأقل لأمر الشراء');
      err.code = 'EMPTY_PO_ITEMS';
      err.status = 400;
      throw err;
    }

    const validatedItems = [];
    let subtotal = 0;

    for (let idx = 0; idx < rawItems.length; idx++) {
      const it = rawItems[idx];
      const productId = it.product_id || it.productId || it.id;

      if (!productId) {
        const err = new Error(`المنتج في السطر ${idx + 1} غير محدد`);
        err.code = 'MISSING_PRODUCT_ID';
        err.status = 400;
        throw err;
      }

      // Check product existence in catalog
      const product = await db.getProduct(productId);
      if (!product) {
        const err = new Error(`المنتج بالمعرف (${productId}) غير موجود في النظام`);
        err.code = 'PRODUCT_NOT_FOUND';
        err.status = 400;
        err.product_id = productId;
        throw err;
      }

      const quantity = parseInt(it.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        const err = new Error(`الكمية في السطر ${idx + 1} (${product.name}) يجب أن تكون عدداً صحيحاً أكبر من صفر`);
        err.code = 'INVALID_QUANTITY';
        err.status = 400;
        throw err;
      }

      const unitPrice = Number(it.unit_price ?? it.unitPrice ?? product.cost_price ?? product.price ?? 0);
      if (isNaN(unitPrice) || unitPrice < 0) {
        const err = new Error(`سعر الشراء في السطر ${idx + 1} (${product.name}) غير صالح أو سالب`);
        err.code = 'INVALID_UNIT_PRICE';
        err.status = 400;
        throw err;
      }

      // Authoritative line total calculation
      const lineTotal = Number((quantity * unitPrice).toFixed(2));
      subtotal += lineTotal;

      validatedItems.push({
        id: it.id || `poi-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku || product.id,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    subtotal = Number(subtotal.toFixed(2));
    const total = subtotal; // No purchasing taxes/discounts in ERP-lite B04 scope

    return {
      items: validatedItems,
      subtotal,
      total,
    };
  }

  /**
   * Create a new purchase order.
   */
  static async createPurchaseOrder(payload, actor = 'admin') {
    if (!payload.supplier_id && !payload.supplierId) {
      const err = new Error('المورد مطلوب لإنشاء أمر الشراء');
      err.code = 'MISSING_SUPPLIER_ID';
      err.status = 400;
      throw err;
    }

    const supplierId = payload.supplier_id || payload.supplierId;
    const supplier = await db.getSupplier(supplierId);
    if (!supplier) {
      const err = new Error('المورد المحدد غير موجود');
      err.code = 'SUPPLIER_NOT_FOUND';
      err.status = 400;
      throw err;
    }

    // Process and validate items + authoritative calculations
    const { items, subtotal, total } = await this.validateAndCalculateItems(payload.items);

    const poNumber = payload.po_number || payload.poNumber || this.generatePoNumber();

    const poData = {
      id: payload.id || `po-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      po_number: poNumber,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      status: PO_STATUSES.DRAFT,
      order_date: payload.order_date || new Date().toISOString(),
      expected_date: payload.expected_date || null,
      notes: payload.notes ? String(payload.notes).trim() : null,
      created_by: actor?.id || actor?.username || 'system',
      subtotal,
      total,
      items,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return await db.createPurchaseOrder(poData);
  }

  /**
   * Update an existing purchase order (only permissible in DRAFT status).
   */
  static async updatePurchaseOrder(id, payload, actor = 'admin') {
    if (!id) {
      const err = new Error('معرف أمر الشراء مطلوب');
      err.code = 'MISSING_PO_ID';
      err.status = 400;
      throw err;
    }

    const existing = await db.getPurchaseOrder(id);
    if (!existing) {
      const err = new Error('أمر الشراء غير موجود');
      err.code = 'PO_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (existing.status !== PO_STATUSES.DRAFT) {
      const err = new Error(`لا يمكن تعديل أمر الشراء لأنه في حالة (${existing.status}). التعديل متاح فقط في حالة المسودة (DRAFT).`);
      err.code = 'PO_NOT_EDITABLE';
      err.status = 400;
      throw err;
    }

    const updates = {
      updated_at: new Date().toISOString(),
      updated_by: actor?.id || actor?.username || 'system',
    };

    if (payload.notes !== undefined) {
      updates.notes = payload.notes ? String(payload.notes).trim() : null;
    }
    if (payload.expected_date !== undefined) {
      updates.expected_date = payload.expected_date || null;
    }

    if (payload.supplier_id || payload.supplierId) {
      const supplierId = payload.supplier_id || payload.supplierId;
      const supplier = await db.getSupplier(supplierId);
      if (!supplier) {
        const err = new Error('المورد المحدد غير موجود');
        err.code = 'SUPPLIER_NOT_FOUND';
        err.status = 400;
        throw err;
      }
      updates.supplier_id = supplier.id;
      updates.supplier_name = supplier.name;
    }

    if (payload.items) {
      const { items, subtotal, total } = await this.validateAndCalculateItems(payload.items);
      updates.items = items;
      updates.subtotal = subtotal;
      updates.total = total;
    }

    return await db.updatePurchaseOrder(id, updates);
  }

  /**
   * Transition Purchase Order status with strict lifecycle rules.
   */
  static async transitionStatus(id, targetStatus, actor = 'admin', reason = null) {
    if (!id) {
      const err = new Error('معرف أمر الشراء مطلوب');
      err.code = 'MISSING_PO_ID';
      err.status = 400;
      throw err;
    }

    const upperStatus = String(targetStatus).toUpperCase();
    if (!Object.values(PO_STATUSES).includes(upperStatus)) {
      const err = new Error(`الحالة المطلوبة (${targetStatus}) غير صالحة`);
      err.code = 'INVALID_STATUS';
      err.status = 400;
      throw err;
    }

    const existing = await db.getPurchaseOrder(id);
    if (!existing) {
      const err = new Error('أمر الشراء غير موجود');
      err.code = 'PO_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const currentStatus = existing.status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(upperStatus)) {
      const err = new Error(`لا يمكن الانتقال من حالة (${currentStatus}) إلى حالة (${upperStatus})`);
      err.code = 'INVALID_STATUS_TRANSITION';
      err.status = 400;
      err.current_status = currentStatus;
      err.target_status = upperStatus;
      err.allowed_transitions = allowed;
      throw err;
    }

    const updates = {
      status: upperStatus,
      status_reason: reason ? String(reason).trim() : null,
      updated_at: new Date().toISOString(),
      updated_by: actor?.id || actor?.username || 'system',
    };

    return await db.updatePurchaseOrder(id, updates);
  }

  /**
   * Get purchase order by ID with supplier snapshot and items.
   */
  static async getPurchaseOrderById(id) {
    if (!id) return null;
    return await db.getPurchaseOrder(id);
  }

  /**
   * List purchase orders with filtering and pagination.
   */
  static async listPurchaseOrders(options = {}) {
    return await db.getPurchaseOrders(options);
  }
}

export default PurchaseOrderService;
