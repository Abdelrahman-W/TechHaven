import { Router } from 'express';
import { db } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { cacheMiddleware, invalidateCache } from '../middleware/cache.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ── GET /api/reviews (Admin Only: All Reviews Across Catalog) ─
router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح لك', code: 'FORBIDDEN' });
    }
    const reviews = await db.getAllReviews();
    res.json({ data: reviews });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reviews/product/:productId ─────────────────
router.get('/product/:productId', cacheMiddleware(300), async (req, res, next) => {
  try {
    const { productId } = req.params;
    const reviews = await db.getReviewsByProduct(productId);
    res.json({ data: reviews });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/reviews ───────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { product_id, rating, comment } = req.body;
    
    if (!product_id || rating === undefined || rating === null) {
      return res.status(400).json({ error: 'البيانات غير مكتملة', code: 'BAD_REQUEST' });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'التقييم يجب أن يكون بين 1 و 5', code: 'BAD_REQUEST' });
    }
    
    const review = {
      id: `rev-${Date.now()}-${uuidv4().substring(0, 8)}`,
      product_id,
      user_id: req.user.id,
      user_name: req.user.full_name || req.user.name || 'User',
      rating: numRating,
      comment: (comment || '').trim(),
      created_at: new Date().toISOString()
    };
    
    const saved = await db.createReview(review);

    // Invalidate caches
    invalidateCache('/api/reviews');
    invalidateCache(`/api/products/${product_id}`);
    invalidateCache('/api/products', { scope: 'products' });
    
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/reviews/:id ─────────────────────────────
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const review = await db.getReviewById(reviewId);
    
    if (!review) {
      return res.status(404).json({ error: 'التقييم غير موجود', code: 'NOT_FOUND' });
    }
    
    // Check ownership or admin role
    if (review.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح لك', code: 'FORBIDDEN' });
    }
    
    await db.deleteReviewById(reviewId, req.user.id, req.user.role);

    // Invalidate caches
    invalidateCache('/api/reviews');
    if (review.product_id) {
      invalidateCache(`/api/products/${review.product_id}`);
      invalidateCache('/api/products', { scope: 'products' });
    }
    
    res.json({ success: true, message: 'تم حذف التقييم' });
  } catch (err) {
    next(err);
  }
});

export default router;
