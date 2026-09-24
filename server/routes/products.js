import { Router } from 'express';
import { db } from '../lib/supabase.js';
import { cacheMiddleware, invalidateCache } from '../middleware/cache.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

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
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
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
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const updated = await db.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'المنتج غير موجود', code: 'NOT_FOUND' });
    }
    invalidateCache('/api/products', { scope: 'products' });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/products/:id/stock (Fast Inventory Adjustment) ─
router.put('/:id/stock', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stock_qty } = req.body;
    if (stock_qty === undefined || stock_qty === null || isNaN(Number(stock_qty))) {
      return res.status(400).json({ error: 'يرجى تحديد كمية المخزون بشكل صحيح', code: 'INVALID_QUANTITY' });
    }
    const qty = Math.max(0, parseInt(stock_qty, 10));
    const updated = await db.updateProduct(id, {
      stock_qty: qty,
      stock: qty,
    });
    if (!updated) {
      return res.status(404).json({ error: 'المنتج غير موجود', code: 'NOT_FOUND' });
    }
    invalidateCache('/api/products', { scope: 'products' });
    invalidateCache(`/api/products/${id}`);
    res.json({
      success: true,
      message: 'تم تحديث كمية المخزون بنجاح',
      data: { id, stock_qty: qty },
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/products/:id (Admin Only) ─────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await db.deleteProduct(req.params.id);
    invalidateCache('/api/products', { scope: 'products' });
    res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    next(err);
  }
});

export default router;
