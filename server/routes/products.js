import { Router } from 'express';
import { db } from '../lib/supabase.js';
import { cacheMiddleware, invalidateCache } from '../middleware/cache.js';
import { InventoryService } from '../lib/inventoryService.js';
import ReorderService from '../lib/reorderService.js';
import { requireAuth, requirePermission, requireAnyPermission } from '../middleware/auth.js';

const router = Router();

// ── GET /api/products ───────────────────────────────────
router.get('/', cacheMiddleware(300), async (req, res, next) => { // 5 minutes TTL
  try {
    const {
      category,
      search,
      sort = 'newest',
      page = 1,
      limit = 50,
      minPrice,
      maxPrice,
      brand,
      inStock,
      featured,
    } = req.query;

    const result = await db.queryProducts({
      category,
      search,
      sort,
      page,
      limit,
      minPrice,
      maxPrice,
      brand,
      inStock,
      featured,
    });

    res.json({
      data: result.data || result.products || [],
      pagination: result.pagination || {
        page: result.page || 1,
        limit: result.limit || 50,
        total: result.total || 0,
        pages: result.pages || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/:id ───────────────────────────────
router.get('/:id', cacheMiddleware(300), async (req, res, next) => {
  try {
    const rawId = req.params.id;
    let product = await db.getProduct(rawId);

    // Legacy support: exact slug / SKU lookup (kept from original design,
    // e.g. direct links using a slug instead of an id). Exact match only —
    // NO fuzzy/partial matching, NO fallback to the first product.
    if (!product && rawId) {
      if (typeof db.getProductBySlugOrSku === 'function') {
        product = await db.getProductBySlugOrSku(rawId);
      } else {
        const all = await db.getAllProducts();
        product = all.find((p) => p.slug === rawId) ||
                  all.find((p) => p.sku && p.sku.toLowerCase() === rawId.toLowerCase());
      }
    }

    if (!product) {
      return res.status(404).json({ error: 'المنتج غير موجود', code: 'NOT_FOUND' });
    }

    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/products/:id/review ───────────────────────
router.post('/:id/review', async (req, res, next) => {
  try {
    const { rating } = req.body;
    const product = await db.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'المنتج غير موجود', code: 'NOT_FOUND' });
    }

    const currentCount = product.review_count || 0;
    const currentRating = product.rating || 5;
    const newRating = ((currentRating * currentCount) + Number(rating)) / (currentCount + 1);

    const updated = await db.updateProduct(req.params.id, {
      rating: Number(newRating.toFixed(2)),
      review_count: currentCount + 1,
    });

    invalidateCache('/api/products', { scope: 'products' });

    res.json({
      success: true,
      message: 'تمت إضافة تقييمك بنجاح!',
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/products (Admin Only) ───────────────────────
router.post('/', requireAuth, requirePermission('products.create'), async (req, res, next) => {
  try {
    const {
      name,
      name_en,
      slug,
      description,
      description_en,
      category_id,
      brand,
      model,
      price,
      old_price,
      cost_price,
      stock_qty,
      images,
      thumbnail,
      specs,
      features,
      tags,
      badge,
      badge_color,
      is_featured
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'اسم المنتج وسعره حقول إلزامية', code: 'MISSING_FIELDS' });
    }

    const id = `prod-${Date.now()}`;
    const product = {
      id,
      sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
      name,
      name_en: name_en || name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description || '',
      description_en: description_en || '',
      category_id: category_id || 'cat-gpu',
      brand: brand || 'Generic',
      model: model || '',
      price: Math.max(0, Number(price) || 0),
      old_price: old_price ? Math.max(0, Number(old_price)) : null,
      cost_price: cost_price ? Math.max(0, Number(cost_price)) : null,
      stock_qty: Math.max(0, Number(stock_qty) || 0),
      images: images?.length ? images : [thumbnail || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80'],
      thumbnail: thumbnail || images?.[0] || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80',
      specs: specs || {},
      features: features || [],
      tags: tags || [],
      badge: badge || 'جديد',
      badge_color: badge_color || 'hot',
      rating: 5.0,
      review_count: 0,
      sold_count: 0,
      is_active: true,
      is_featured: !!is_featured,
      created_at: new Date().toISOString()
    };

    const created = await db.createProduct(product);
    invalidateCache('/api/products', { scope: 'products' });
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/products/:id (Admin Only) ────────────────────
router.put('/:id', requireAuth, requirePermission('products.edit'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };

    // If stock_qty is explicitly sent and differs, adjust via InventoryService
    if (body.stock_qty !== undefined && !isNaN(Number(body.stock_qty))) {
      const current = await db.getProduct(id);
      if (current) {
        const currentStock = current.stock_qty !== undefined ? Number(current.stock_qty) : (Number(current.stock) || 0);
        const targetStock = Math.max(0, parseInt(body.stock_qty, 10));
        const delta = targetStock - currentStock;
        if (delta !== 0) {
          await InventoryService.adjustStock({
            productId: id,
            quantityDelta: delta,
            reason: 'تعديل المخزون من شاشة تعديل بيانات المنتج',
            actorId: req.user?.id || 'admin',
            referenceType: 'STOCK_ADJUSTMENT',
            referenceId: `prod-edit-${Date.now()}`,
          });
        }
      }
      delete body.stock_qty;
      delete body.stock;
    }

    const updated = await db.updateProduct(id, body);
    if (!updated) {
      return res.status(404).json({ error: 'المنتج غير موجود', code: 'NOT_FOUND' });
    }
    invalidateCache('/api/products', { scope: 'products' });
    invalidateCache(`/api/products/${id}`);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ── Fast Inventory Adjustment Handlers (PUT /:id/stock & POST /:id/adjust-stock) ─
const handleFastStockAdjustment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stock_qty, delta, reason } = req.body;

    let quantityDelta;
    if (delta !== undefined && !isNaN(Number(delta))) {
      quantityDelta = parseInt(delta, 10);
    } else if (stock_qty !== undefined && !isNaN(Number(stock_qty))) {
      const product = await db.getProduct(id);
      if (!product) {
        return res.status(404).json({ error: 'المنتج غير موجود', code: 'NOT_FOUND' });
      }
      const currentStock = product.stock_qty !== undefined ? Number(product.stock_qty) : (Number(product.stock) || 0);
      const targetStock = Math.max(0, parseInt(stock_qty, 10));
      quantityDelta = targetStock - currentStock;
    } else {
      return res.status(400).json({ error: 'يرجى تحديد كمية المخزون أو التغير المطلوب بشكل صحيح', code: 'INVALID_QUANTITY' });
    }

    if (quantityDelta === 0) {
      const product = await db.getProduct(id);
      return res.json({
        success: true,
        message: 'الكمية مطابقة للمخزون الحالي دون تغيير',
        data: { id, stock_qty: product?.stock_qty ?? 0, stock: product?.stock_qty ?? 0 },
      });
    }

    const movement = await InventoryService.adjustStock({
      productId: id,
      quantityDelta,
      reason: reason || 'تعديل مخزون سريع من لوحة التحكم',
      actorId: req.user?.id || 'admin',
      referenceType: 'STOCK_ADJUSTMENT',
      referenceId: `adj-${Date.now()}`,
    });

    res.json({
      success: true,
      message: 'تم تحديث كمية المخزون وتسجيلها في سجل الحركات بنجاح',
      data: { id, stock_qty: movement.stock_after, stock: movement.stock_after, movement },
    });
  } catch (err) {
    if (err.code === 'INSUFFICIENT_STOCK' || err.code === 'INVALID_QUANTITY' || err.code === 'PRODUCT_NOT_FOUND') {
      return res.status(400).json({ error: err.message, code: err.code, details: err.details || null });
    }
    next(err);
  }
};

router.put('/:id/stock', requireAuth, requireAnyPermission(['inventory.adjust', 'products.stock', 'products.edit']), handleFastStockAdjustment);
router.post('/:id/adjust-stock', requireAuth, requireAnyPermission(['inventory.adjust', 'products.stock', 'products.edit']), handleFastStockAdjustment);

// ── DELETE /api/products/:id (Admin Only) ─────────────────
router.delete('/:id', requireAuth, requirePermission('products.delete'), async (req, res, next) => {
  try {
    await db.deleteProduct(req.params.id);
    invalidateCache('/api/products', { scope: 'products' });
    res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    next(err);
  }
});

// ── Reorder Settings Endpoints (Batch 06) ───────────────────
router.get('/:id/reorder', requireAuth, requireAnyPermission(['inventory.reorder.view', 'inventory.view', 'products.view']), async (req, res, next) => {
  try {
    const productReorder = await ReorderService.getProductReorder(req.params.id, req.user);
    res.json({
      success: true,
      data: productReorder,
    });
  } catch (err) {
    if (err.code === 'PRODUCT_NOT_FOUND' || err.code === 'INVALID_PRODUCT_ID') {
      return res.status(err.status || 404).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

router.put('/:id/reorder-settings', requireAuth, requireAnyPermission(['inventory.reorder.manage', 'inventory.adjust', 'products.edit']), async (req, res, next) => {
  try {
    const updated = await ReorderService.updateProductReorderSettings(req.params.id, req.body, req.user);
    res.json({
      success: true,
      message: 'تم تحديث إعدادات إعادة الطلب بنجاح',
      data: updated,
    });
  } catch (err) {
    if (err.code && err.code.startsWith('INVALID_')) {
      return res.status(400).json({ error: err.message, code: err.code, details: err.details || null });
    }
    next(err);
  }
});

export default router;
