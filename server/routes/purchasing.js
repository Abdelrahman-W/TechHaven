import { Router } from 'express';
import { requireAuth, requireAdmin, requirePermission, requireAnyPermission } from '../middleware/auth.js';
import PurchaseOrderService from '../lib/purchaseOrderService.js';
import ReceivingService from '../lib/receivingService.js';

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

// ── Physical Receiving Workflow (Batch 05) ─────────────────────

// ── POST /api/purchasing/orders/:id/receive ───────────────────
router.post('/orders/:id/receive', requirePermission('purchasing.receive'), async (req, res, next) => {
  try {
    const { items, notes, idempotency_key } = req.body;
    const idempotencyKey = idempotency_key || req.headers['x-idempotency-key'] || null;
    const actorId = req.user?.email || req.user?.name || req.user?.id || req.user?.userId || 'staff';

    const result = await ReceivingService.processReceiving({
      purchaseOrderId: req.params.id,
      items,
      notes,
      actorId,
      idempotencyKey,
    });

    res.status(result.is_duplicate ? 200 : 201).json({
      success: true,
      data: result,
      message: result.is_duplicate
        ? 'تم استرجاع إذن الاستلام المسجل مسبقاً (Idempotent Response)'
        : 'تم تسجيل استلام البضاعة وتحديث المخزون ومتوسط التكلفة (WAC) بنجاح',
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/purchasing/orders/:id/receivings ──────────────────
router.get('/orders/:id/receivings', requirePermission('purchasing.view'), async (req, res, next) => {
  try {
    const receivings = await ReceivingService.getReceivings({
      purchase_order_id: req.params.id,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({
      success: true,
      data: receivings.data,
      pagination: receivings.pagination,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/purchasing/receivings/:id ─────────────────────────
router.get('/receivings/:id', requirePermission('purchasing.view'), async (req, res, next) => {
  try {
    const receiving = await ReceivingService.getReceiving(req.params.id);
    if (!receiving) {
      return res.status(404).json({
        success: false,
        error: 'إذن الاستلام غير موجود',
        code: 'RECEIVING_NOT_FOUND',
      });
    }
    res.json({
      success: true,
      data: receiving,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
