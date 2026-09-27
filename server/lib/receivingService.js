/**
 * TechHaven Receiving Domain Service (ERP-Lite Batch 05)
 * Physical Purchase Order Receiving Workflow, Weighted Average Cost (WAC) calculations,
 * and authoritative inventory ledger integration.
 */

import { db } from './supabase.js';
import { invalidateCache } from '../middleware/cache.js';

export class ReceivingService {
  /**
   * Authoritative calculation of Weighted Average Cost (WAC).
   * Formula:
   *   old_qty = current stock quantity
   *   old_cost = current products.cost_price (or initial purchase unit price if null/unset)
   *   receipt_qty = quantity being received
   *   receipt_unit_cost = authoritative purchase price from PO item
   *
   *   If old_qty == 0 or cost_price is null:
   *     new_cost = receipt_unit_cost
   *   Else:
   *     new_cost = round(((old_qty * old_cost) + (receipt_qty * receipt_unit_cost)) / (old_qty + receipt_qty), 2)
   */
  static calculateWAC({ oldQty, oldCost, receiptQty, receiptUnitCost }) {
    const qOld = Number(oldQty) || 0;
    const cOld = oldCost !== null && oldCost !== undefined ? Number(oldCost) : Number(receiptUnitCost);
    const qRecv = Number(receiptQty);
    const cRecv = Number(receiptUnitCost);

    if (isNaN(qRecv) || qRecv <= 0) {
      throw new Error('كمية الاستلام يجب أن تكون أكبر من صفر');
    }
    if (isNaN(cRecv) || cRecv < 0) {
      throw new Error('سعر التوريد يجب أن يكون صفراً أو أكثر');
    }

    const newQty = qOld + qRecv;
    if (newQty <= 0) return cRecv;

    if (qOld <= 0 || oldCost === null || oldCost === undefined) {
      return Math.round(cRecv * 100) / 100;
    }

    const totalValue = (qOld * cOld) + (qRecv * cRecv);
    return Math.round((totalValue / newQty) * 100) / 100;
  }

  /**
   * Process physical receipt of purchase order items atomically.
   */
  static async processReceiving({
    purchaseOrderId,
    items,
    notes = null,
    actorId = null,
    idempotencyKey = null,
  }) {
    if (!purchaseOrderId) {
      const err = new Error('معرف أمر الشراء مطلوب');
      err.code = 'INVALID_PO_ID';
      err.status = 400;
      throw err;
    }

    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('يجب تحديد صنف واحد على الأقل للاستلام');
      err.code = 'EMPTY_RECEIVING_ITEMS';
      err.status = 400;
      throw err;
    }

    // Process atomic receiving via db adapter (PostgreSQL RPC or atomic serialized store)
    const result = await db.processPurchaseOrderReceiving({
      purchaseOrderId,
      items,
      notes: notes ? String(notes).trim() : null,
      actorId: actorId || null,
      idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : null,
    });

    // Invalidate affected caches
    invalidateCache('/api/products', { scope: 'products' });
    invalidateCache('/api/inventory/movements');
    invalidateCache('/api/purchasing/orders');
    invalidateCache(`/api/purchasing/orders/${purchaseOrderId}`);
    invalidateCache('/api/purchasing/receivings');
    if (result.items && Array.isArray(result.items)) {
      for (const item of result.items) {
        if (item.product_id) {
          invalidateCache(`/api/products/${item.product_id}`);
        }
      }
    }

    return result;
  }

  /**
   * Retrieve receiving record by ID.
   */
  static async getReceiving(receivingId) {
    if (!receivingId) {
      const err = new Error('معرف إذن الاستلام مطلوب');
      err.code = 'INVALID_RECEIVING_ID';
      err.status = 400;
      throw err;
    }
    return db.getReceiving(receivingId);
  }

  /**
   * Retrieve paginated receiving records.
   */
  static async getReceivings(params = {}) {
    return db.getReceivings(params);
  }
}

export default ReceivingService;
