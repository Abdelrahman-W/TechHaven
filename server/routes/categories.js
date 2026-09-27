import { Router } from 'express';
import { SEED_CATEGORIES, db } from '../lib/supabase.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { invalidateCache } from '../middleware/cache.js';

const router = Router();

// ── GET /api/categories ───────────────────────────────────
router.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  try {
    const cats = await db.getAllCategories();
    res.json({ data: cats || SEED_CATEGORIES });
  } catch {
    res.json({ data: SEED_CATEGORIES });
  }
});

// ── GET /api/categories/:slug ─────────────────────────────
router.get('/:slug', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  try {
    const category = await db.getCategoryBySlug(req.params.slug);
    if (!category) {
      return res.status(404).json({ error: 'القسم غير موجود', code: 'NOT_FOUND' });
    }
    res.json({ data: category });
  } catch {
    const fallback = SEED_CATEGORIES.find(c => c.slug === req.params.slug || c.id === req.params.slug);
    if (fallback) return res.json({ data: fallback });
    res.status(404).json({ error: 'القسم غير موجود', code: 'NOT_FOUND' });
  }
});

// ── POST /api/categories (Admin Only) ─────────────────────
router.post('/', requireAuth, requirePermission('categories.create'), async (req, res, next) => {
  try {
    const { name, name_en, slug, icon = '📦', description, sort_order = 10 } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'يرجى إدخال اسم القسم', code: 'MISSING_NAME' });
    }

    const newSlug = slug || name_en?.toLowerCase().replace(/\s+/g, '-') || `cat-${Date.now()}`;
    const newCat = await db.createCategory({
      name,
      name_en: name_en || name,
      slug: newSlug,
      icon,
      description: description || '',
      sort_order: Number(sort_order) || 10,
      is_active: true
    });

    invalidateCache('/api/categories', { scope: 'categories' });

    res.status(201).json({
      success: true,
      message: 'تم إضافة القسم بنجاح!',
      data: newCat
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/categories/:id (Admin Only) ──────────────────
router.put('/:id', requireAuth, requirePermission('categories.edit'), async (req, res, next) => {
  try {
    const updated = await db.updateCategory(req.params.id, req.body);
    invalidateCache('/api/categories', { scope: 'categories' });
    res.json({
      success: true,
      message: 'تم تعديل بيانات القسم بنجاح!',
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/categories/:id (Admin Only) ───────────────
router.delete('/:id', requireAuth, requirePermission('categories.delete'), async (req, res, next) => {
  try {
    await db.deleteCategory(req.params.id);
    invalidateCache('/api/categories', { scope: 'categories' });
    res.json({ success: true, message: 'تم حذف القسم بنجاح' });
  } catch (err) {
    next(err);
  }
});

export default router;