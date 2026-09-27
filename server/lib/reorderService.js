/**
 * TechHaven Reorder Intelligence Domain Service (ERP-Lite Batch 06)
 * Server-authoritative replenishment logic, stock health calculations,
 * reorder suggestions, and financial replenishment estimates with strict RBAC cost isolation.
 */

import { db } from './supabase.js';
import { hasPermission } from './rbac.js';
import { invalidateCache } from '../middleware/cache.js';

export const STOCK_STATUSES = {
  HEALTHY: 'HEALTHY',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  NO_REORDER_RULE: 'NO_REORDER_RULE',
};

export class ReorderService {
  /**
   * Evaluates if a user has permission to view cost prices and financial values.
   */
  static canUserViewCost(user) {
    if (!user) return false;
    if (user.role === 'owner' || user.role === 'admin') return true;
    if (Array.isArray(user.permissions) && (user.permissions.includes('*') || user.permissions.includes('products.cost.view'))) {
      return true;
    }
    return hasPermission(user.role, 'products.cost.view');
  }

  /**
   * Authoritative server-side stock health & reorder calculation for a single product.
   *
   * Business Rules:
   * 1. current_stock <= 0 => OUT_OF_STOCK
   * 2. !reorder_enabled   => NO_REORDER_RULE (reorder_quantity = 0)
   * 3. current_stock <= reorder_point => LOW_STOCK (reorder_quantity = max(target_stock - current_stock, 0))
   * 4. current_stock > reorder_point  => HEALTHY (reorder_quantity = 0)
   */
  static calculateStockHealth(product) {
    const currentStock = Number(
      product.stock_qty !== undefined ? product.stock_qty : (product.stock || 0)
    );
    const reorderPoint = Number(product.reorder_point || 0);
    const targetStock = Number(product.target_stock || 0);
    const reorderEnabled = Boolean(product.reorder_enabled);

    let stockStatus = STOCK_STATUSES.HEALTHY;
    let reorderQuantity = 0;

    if (currentStock <= 0) {
      stockStatus = STOCK_STATUSES.OUT_OF_STOCK;
      if (reorderEnabled) {
        reorderQuantity = Math.max(0, targetStock - currentStock);
      }
    } else if (!reorderEnabled) {
      stockStatus = STOCK_STATUSES.NO_REORDER_RULE;
      reorderQuantity = 0;
    } else if (currentStock <= reorderPoint) {
      stockStatus = STOCK_STATUSES.LOW_STOCK;
      reorderQuantity = Math.max(0, targetStock - currentStock);
    } else {
      stockStatus = STOCK_STATUSES.HEALTHY;
      reorderQuantity = 0;
    }

    return {
      current_stock: currentStock,
      reorder_point: reorderPoint,
      target_stock: targetStock,
      reorder_enabled: reorderEnabled,
      stock_status: stockStatus,
      reorder_quantity: reorderQuantity,
      is_low_stock: stockStatus === STOCK_STATUSES.LOW_STOCK,
      is_out_of_stock: stockStatus === STOCK_STATUSES.OUT_OF_STOCK,
      is_healthy: stockStatus === STOCK_STATUSES.HEALTHY,
      needs_reorder: reorderQuantity > 0,
    };
  }

  /**
   * Enriches a product record with computed reorder intelligence and cost isolation.
   */
  static enrichProduct(product, canViewCost = false) {
    const health = this.calculateStockHealth(product);
    const costPrice = product.cost_price !== undefined && product.cost_price !== null ? Number(product.cost_price) : 0;

    const enriched = {
      id: product.id,
      product_id: product.id,
      name: product.name,
      name_en: product.name_en || product.name,
      sku: product.sku || product.id,
      category_id: product.category_id,
      brand: product.brand || null,
      model: product.model || null,
      price: Number(product.price || 0),
      current_stock: health.current_stock,
      stock_qty: health.current_stock,
      reorder_point: health.reorder_point,
      target_stock: health.target_stock,
      reorder_enabled: health.reorder_enabled,
      stock_status: health.stock_status,
      reorder_quantity: health.reorder_quantity,
      needs_reorder: health.needs_reorder,
      images: product.images || [],
      thumbnail: product.thumbnail || (product.images && product.images[0]) || null,
    };

    if (canViewCost) {
      enriched.cost_price = costPrice;
      enriched.estimated_reorder_value = Math.round(health.reorder_quantity * costPrice * 100) / 100;
    } else {
      enriched.cost_price = undefined;
      enriched.estimated_reorder_value = undefined;
    }

    return enriched;
  }

  /**
   * Fetch paginated and filtered reorder intelligence items.
   */
  static async getReorderList(params = {}, user = null) {
    const {
      status,
      category,
      search,
      reorder_enabled,
      sort = 'stock_asc',
      page = 1,
      limit = 20,
    } = params;

    const canViewCost = this.canUserViewCost(user);
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    // Fetch all products via db adapter
    const allProducts = await db.getAllProducts();
    let enrichedList = allProducts.map(prod => this.enrichProduct(prod, canViewCost));

    // 1. Filter by search
    if (search && String(search).trim()) {
      const q = String(search).toLowerCase().trim();
      enrichedList = enrichedList.filter(it =>
        (it.name && it.name.toLowerCase().includes(q)) ||
        (it.name_en && it.name_en.toLowerCase().includes(q)) ||
        (it.sku && it.sku.toLowerCase().includes(q)) ||
        (it.brand && it.brand.toLowerCase().includes(q))
      );
    }

    // 2. Filter by category
    if (category && String(category).trim() && category !== 'ALL') {
      enrichedList = enrichedList.filter(it => it.category_id === category);
    }

    // 3. Filter by reorder_enabled
    if (reorder_enabled !== undefined && reorder_enabled !== null && reorder_enabled !== '') {
      const isEnabled = String(reorder_enabled) === 'true';
      enrichedList = enrichedList.filter(it => it.reorder_enabled === isEnabled);
    }

    // 4. Filter by stock status / reorder suggestions
    if (status && status !== 'ALL') {
      if (status === 'REORDER_SUGGESTION' || status === 'NEEDS_REORDER') {
        enrichedList = enrichedList.filter(it => it.needs_reorder);
      } else {
        enrichedList = enrichedList.filter(it => it.stock_status === status);
      }
    }

    // 5. Sorting
    enrichedList.sort((a, b) => {
      switch (sort) {
        case 'stock_asc':
          return a.current_stock - b.current_stock;
        case 'stock_desc':
          return b.current_stock - a.current_stock;
        case 'suggested_desc':
          return b.reorder_quantity - a.reorder_quantity;
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '', 'ar');
        case 'value_desc':
          if (canViewCost) {
            return (b.estimated_reorder_value || 0) - (a.estimated_reorder_value || 0);
          }
          return b.reorder_quantity - a.reorder_quantity;
        default:
          return a.current_stock - b.current_stock;
      }
    });

    const total = enrichedList.length;
    const from = (p - 1) * l;
    const paginated = enrichedList.slice(from, from + l);

    return {
      data: paginated,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
      can_view_cost: canViewCost,
    };
  }

  /**
   * Aggregate reorder intelligence summary.
   */
  static async getReorderSummary(user = null) {
    const canViewCost = this.canUserViewCost(user);
    const allProducts = await db.getAllProducts();

    let totalProducts = allProducts.length;
    let totalTracked = 0;
    let healthyCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let noRuleCount = 0;
    let totalSuggestions = 0;
    let totalSuggestedUnits = 0;
    let totalEstimatedValue = 0;

    for (const prod of allProducts) {
      const health = this.calculateStockHealth(prod);
      const cost = Number(prod.cost_price || 0);

      if (health.reorder_enabled) {
        totalTracked++;
      }

      switch (health.stock_status) {
        case STOCK_STATUSES.HEALTHY:
          healthyCount++;
          break;
        case STOCK_STATUSES.LOW_STOCK:
          lowStockCount++;
          break;
        case STOCK_STATUSES.OUT_OF_STOCK:
          outOfStockCount++;
          break;
        case STOCK_STATUSES.NO_REORDER_RULE:
          noRuleCount++;
          break;
      }

      if (health.needs_reorder) {
        totalSuggestions++;
        totalSuggestedUnits += health.reorder_quantity;
        if (canViewCost) {
          totalEstimatedValue += health.reorder_quantity * cost;
        }
      }
    }

    return {
      total_products: totalProducts,
      total_tracked_products: totalTracked,
      healthy_count: healthyCount,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      no_rule_count: noRuleCount,
      total_reorder_suggestions: totalSuggestions,
      total_suggested_units: totalSuggestedUnits,
      total_estimated_replenishment_value: canViewCost
        ? Math.round(totalEstimatedValue * 100) / 100
        : null,
      can_view_cost: canViewCost,
    };
  }

  /**
   * Get single product reorder status & settings.
   */
  static async getProductReorder(productId, user = null) {
    if (!productId) {
      const err = new Error('معرف المنتج مطلوب');
      err.code = 'INVALID_PRODUCT_ID';
      err.status = 400;
      throw err;
    }

    const product = await db.getProduct(productId);
    if (!product) {
      const err = new Error('المنتج غير موجود');
      err.code = 'PRODUCT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const canViewCost = this.canUserViewCost(user);
    return this.enrichProduct(product, canViewCost);
  }

  /**
   * Update product reorder configuration settings.
   */
  static async updateProductReorderSettings(productId, settings, actorUser = null) {
    if (!productId) {
      const err = new Error('معرف المنتج مطلوب');
      err.code = 'INVALID_PRODUCT_ID';
      err.status = 400;
      throw err;
    }

    const product = await db.getProduct(productId);
    if (!product) {
      const err = new Error('المنتج غير موجود');
      err.code = 'PRODUCT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const { reorder_point, reorderPoint, target_stock, targetStock, reorder_enabled, reorderEnabled } = settings;

    const rawReorderPoint = reorder_point !== undefined ? reorder_point : reorderPoint;
    const rawTargetStock = target_stock !== undefined ? target_stock : targetStock;
    const rawReorderEnabled = reorder_enabled !== undefined ? reorder_enabled : reorderEnabled;

    const parsedReorderPoint = rawReorderPoint !== undefined ? parseInt(rawReorderPoint, 10) : Number(product.reorder_point || 0);
    const parsedTargetStock = rawTargetStock !== undefined ? parseInt(rawTargetStock, 10) : Number(product.target_stock || 0);
    const parsedReorderEnabled = rawReorderEnabled !== undefined ? Boolean(rawReorderEnabled) : Boolean(product.reorder_enabled);

    // Validation
    if (isNaN(parsedReorderPoint) || parsedReorderPoint < 0) {
      const err = new Error('نقطة إعادة الطلب (reorder_point) يجب أن تكون رقماً صحيحاً موجباً أو صفراً');
      err.code = 'INVALID_REORDER_POINT';
      err.status = 400;
      throw err;
    }

    if (isNaN(parsedTargetStock) || parsedTargetStock < 0) {
      const err = new Error('الكمية المستهدفة (target_stock) يجب أن تكون رقماً صحيحاً موجباً أو صفراً');
      err.code = 'INVALID_TARGET_STOCK';
      err.status = 400;
      throw err;
    }

    if (parsedReorderEnabled && parsedTargetStock < parsedReorderPoint) {
      const err = new Error('الكمية المستهدفة (target_stock) يجب أن تكون أكبر من أو تساوي نقطة إعادة الطلب (reorder_point)');
      err.code = 'INVALID_REORDER_TARGET';
      err.status = 400;
      err.details = {
        reorder_point: parsedReorderPoint,
        target_stock: parsedTargetStock,
      };
      throw err;
    }

    const updates = {
      reorder_point: parsedReorderPoint,
      target_stock: parsedTargetStock,
      reorder_enabled: parsedReorderEnabled,
    };

    const updated = await db.updateProduct(productId, updates);

    // Invalidate reorder & product caches
    invalidateCache('/api/products', { scope: 'products' });
    invalidateCache(`/api/products/${productId}`);
    invalidateCache('/api/inventory/reorder');
    invalidateCache('/api/inventory/reorder/summary');

    const canViewCost = this.canUserViewCost(actorUser);
    return this.enrichProduct(updated || { ...product, ...updates }, canViewCost);
  }
}

export default ReorderService;
