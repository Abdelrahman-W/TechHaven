import { Router } from 'express';
import { requireAuth, requireAdmin, requirePermission, requireAnyPermission } from '../middleware/auth.js';
import PurchaseOrderService from '../lib/purchaseOrderService.js';

const router = Router();

// Base protection: strictly requires staff authentication
router.use(requireAuth, requireAdmin);

// ── GET /api/purchasing/orders ────────────────────────────────
router.get('/orders', requirePermission('purchasing.view'), async (req, res, next) => {
  try {
    const result = await PurchaseOrderService.listPurchaseOrders(req.query);
    res.json({
      success: true,
      data: result.data || result,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/purchasing/orders/:id ────────────────────────────
router.get('/orders/:id', requirePermission('purchasing.view'), async (req, res, next) => {
  try {
    const po = await PurchaseOrderService.getPurchaseOrderById(req.params.id);
    if (!po) {
      return res.status(404).json({ error: 'أمر الشراء غير موجود', code: 'PO_NOT_FOUND' });
    }
    res.json({
      success: true,
      data: po,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/purchasing/orders ───────────────────────────────
router.post('/orders', requirePermission('purchasing.create'), async (req, res, next) => {
  try {
    const created = await PurchaseOrderService.createPurchaseOrder(req.body, req.user);
    res.status(201).json({
      success: true,
      data: created,
      message: 'تم إنشاء أمر الشراء بنجاح كمسودة',
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/purchasing/orders/:id ────────────────────────────
router.put('/orders/:id', requirePermission('purchasing.edit'), async (req, res, next) => {
  try {
    const updated = await PurchaseOrderService.updatePurchaseOrder(req.params.id, req.body, req.user);
    res.json({
      success: true,
      data: updated,
      message: 'تم تحديث أمر الشراء بنجاح',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/purchasing/orders/:id/status ────────────────────
router.post('/orders/:id/status', requirePermission('purchasing.approve'), async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const updated = await PurchaseOrderService.transitionStatus(req.params.id, status, req.user, reason);
    res.json({
      success: true,
      data: updated,
      message: `تم تحديث حالة أمر الشراء إلى ${status}`,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/purchasing/orders/:id/confirm ───────────────────
router.post('/orders/:id/confirm', requirePermission('purchasing.approve'), async (req, res, next) => {
  try {
    const updated = await PurchaseOrderService.transitionStatus(req.params.id, 'CONFIRMED', req.user, req.body?.reason);
    res.json({
      success: true,
      data: updated,
      message: 'تم تأكيد أمر الشراء بنجاح',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/purchasing/orders/:id/cancel ────────────────────
router.post('/orders/:id/cancel', requireAnyPermission(['purchasing.cancel', 'purchasing.approve']), async (req, res, next) => {
  try {
    const updated = await PurchaseOrderService.transitionStatus(req.params.id, 'CANCELLED', req.user, req.body?.reason);
    res.json({
      success: true,
      data: updated,
      message: 'تم إلغاء أمر الشراء بنجاح',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/purchasing/orders/:id/close ─────────────────────
router.post('/orders/:id/close', requirePermission('purchasing.approve'), async (req, res, next) => {
  try {
    const updated = await PurchaseOrderService.transitionStatus(req.params.id, 'CLOSED', req.user, req.body?.reason);
    res.json({
      success: true,
      data: updated,
      message: 'تم إغلاق أمر الشراء بنجاح',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
