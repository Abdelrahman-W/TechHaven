import { Router } from 'express';
import { requireAuth, requireAdmin, requirePermission } from '../middleware/auth.js';
import SupplierService from '../lib/supplierService.js';

const router = Router();

// Base protection: all supplier operations require authentication and staff access
router.use(requireAuth, requireAdmin);

// ── GET /api/suppliers ────────────────────────────────────────
router.get('/', requirePermission('suppliers.view'), async (req, res, next) => {
  try {
    const result = await SupplierService.listSuppliers(req.query);
    res.json({
      success: true,
      data: result.data || result,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/suppliers/:id ────────────────────────────────────
router.get('/:id', requirePermission('suppliers.view'), async (req, res, next) => {
  try {
    const supplier = await SupplierService.getSupplierById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'المورد غير موجود', code: 'SUPPLIER_NOT_FOUND' });
    }
    res.json({
      success: true,
      data: supplier,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/suppliers ───────────────────────────────────────
router.post('/', requirePermission('suppliers.create'), async (req, res, next) => {
  try {
    const created = await SupplierService.createSupplier(req.body, req.user);
    res.status(201).json({
      success: true,
      data: created,
      message: 'تم إضافة المورد بنجاح',
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/suppliers/:id ────────────────────────────────────
router.put('/:id', requirePermission('suppliers.edit'), async (req, res, next) => {
  try {
    const updated = await SupplierService.updateSupplier(req.params.id, req.body, req.user);
    res.json({
      success: true,
      data: updated,
      message: 'تم تحديث بيانات المورد بنجاح',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/suppliers/:id/deactivate ────────────────────────
router.post('/:id/deactivate', requirePermission('suppliers.edit'), async (req, res, next) => {
  try {
    const updated = await SupplierService.deactivateSupplier(req.params.id, req.user);
    res.json({
      success: true,
      data: updated,
      message: 'تم تعطيل حساب المورد بنجاح',
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/suppliers/:id ─────────────────────────────────
router.delete('/:id', requirePermission('suppliers.delete'), async (req, res, next) => {
  try {
    await SupplierService.deleteSupplier(req.params.id, req.user);
    res.json({
      success: true,
      message: 'تم حذف المورد بنجاح',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
