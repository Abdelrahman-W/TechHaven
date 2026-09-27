/**
 * TechHaven Inventory Domain Service (ERP-Lite Batch 02)
 * Single authoritative service layer for stock mutations and inventory ledger operations.
 */

import { db } from './supabase.js';
import { invalidateCache } from '../middleware/cache.js';

export const MOVEMENT_TYPES = {
  INITIAL_IMPORT: 'INITIAL_IMPORT',
  SALE: 'SALE',
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',
  DAMAGE: 'DAMAGE',
  RETURN_RESTOCK: 'RETURN_RESTOCK',
  PURCHASE_RECEIPT: 'PURCHASE_RECEIPT',
};

export const REFERENCE_TYPES = {
  MIGRATION: 'MIGRATION',
  ORDER: 'ORDER',
  STOCK_ADJUSTMENT: 'STOCK_ADJUSTMENT',
  MANUAL: 'MANUAL',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  DAMAGE_REPORT: 'DAMAGE_REPORT',
  RETURN: 'RETURN',
};

export class InventoryService {
  /**
   * Adjust stock for a product atomically and append an inventory movement record.
   */
  static async adjustStock({
    productId,
    quantityDelta,
    type,
    reason = '',
    actorId = null,
    referenceType = REFERENCE_TYPES.STOCK_ADJUSTMENT,
    referenceId = null,
  }) {
    if (!productId) {
      const err = new Error('معرف المنتج مطلوب');
      err.code = 'INVALID_PRODUCT_ID';
      throw err;
    }

    const delta = parseInt(quantityDelta, 10);
    if (isNaN(delta) || delta === 0) {
      const err = new Error('قيمة التعديل يجب أن تكون رقماً صحيحاً لا يساوي صفراً');
      err.code = 'INVALID_QUANTITY';
      throw err;
    }

    // Determine movement type if not explicitly supplied
    let determinedType = type;
    if (!determinedType) {
      determinedType = delta > 0 ? MOVEMENT_TYPES.ADJUSTMENT_IN : MOVEMENT_TYPES.ADJUSTMENT_OUT;
    }

    if (!Object.values(MOVEMENT_TYPES).includes(determinedType)) {
      const err = new Error(`نوع حركة المخزون غير صالح: ${determinedType}`);
      err.code = 'INVALID_MOVEMENT_TYPE';
      throw err;
    }

    // Execute atomic mutation via db adapter (handles PostgreSQL RPC or atomic serialized memory store)
    const result = await db.adjustProductInventory({
      productId,
      quantityDelta: delta,
      type: determinedType,
      reason: reason ? reason.trim() : '',
      actorId: actorId || null,
      referenceType: referenceType || REFERENCE_TYPES.STOCK_ADJUSTMENT,
      referenceId: referenceId || null,
    });

    // Invalidate product caches across workers after successful commit
    invalidateCache('/api/products', { scope: 'products' });
    invalidateCache(`/api/products/${productId}`);
    invalidateCache('/api/inventory/movements');
    invalidateCache('/api/inventory/reorder');
    invalidateCache('/api/inventory/reorder/summary');

    return result;
  }

  /**
   * Retrieve paginated and filtered inventory movements.
   */
  static async getMovements(params = {}) {
    return db.getInventoryMovements(params);
  }

  /**
   * Retrieve stock history for a specific product.
   */
  static async getProductStockHistory(productId, options = {}) {
    if (!productId) {
      const err = new Error('معرف المنتج مطلوب');
      err.code = 'INVALID_PRODUCT_ID';
      throw err;
    }
    return db.getInventoryMovements({
      ...options,
      productId,
    });
  }
}

export default InventoryService;
