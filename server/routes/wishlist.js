import { Router } from 'express';
import { requireAuth } from './auth.js';
import { db } from '../lib/supabase.js';

const router = Router();

// Enrich stored {product_id, added_at} refs with current product data so the
// frontend can render full cards without storing full product objects in the
// wishlist itself.
export async function enrichWishlist(items) {
  if (!Array.isArray(items)) return [];
  const enriched = [];
  for (const item of items) {
    const pid = item.product_id || item.productId || item.id;
    if (!pid) continue;
    const product = await db.getProduct(pid);
    if (!product) continue; // skip missing products (e.g. deleted)
    enriched.push({
      ...item,
      id: pid,
      product_id: pid,
      name: product.name,
      name_en: product.name_en,
      price: product.price,
      old_price: product.old_price,
      image: product.image || (Array.isArray(product.images) && product.images[0]) || '/images/prod-headphones.jpg',
      slug: product.slug,
      added_at: item.added_at || new Date().toISOString()
    });
  }
  return enriched;
}

// GET /api/wishlist — authenticated user only
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const items = await db.getWishlist(req.user.id);
    const enriched = await enrichWishlist(items);
    res.json({ data: enriched });
  } catch (err) {
    next(err);
  }
});

// POST /api/wishlist — { productId }
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required', code: 'BAD_REQUEST' });
    }

    await db.addToWishlist(req.user.id, productId);
    const items = await db.getWishlist(req.user.id);
    const enriched = await enrichWishlist(items);
    res.status(201).json({ success: true, data: enriched });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', requireAuth, async (req, res, next) => {
  try {
    const { productId } = req.params;
    await db.removeFromWishlist(req.user.id, productId);
    const items = await db.getWishlist(req.user.id);
    const enriched = await enrichWishlist(items);
    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

export default router;
