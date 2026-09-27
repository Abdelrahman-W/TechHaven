import { Router } from 'express';
import { requireAuth, requirePermission, requireAnyPermission } from '../middleware/auth.js';
import { InventoryService } from '../lib/inventoryService.js';
import ReorderService from '../lib/reorderService.js';
import { PERMISSIONS } from '../lib/rbac.js';

const router = Router();

// Base protection: require authentication
router.use(requireAuth);

// ── GET /api/inventory/movements ─────────────────────────
// Paginated and filtered inventory movements
router.get('/movements', requireAnyPermission([
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_MOVEMENTS,
  PERMISSIONS.ADMIN_DASHBOARD_VIEW
]), async (req, res, next) => {
  try {
    const {
      productId,
      product_id,
      type,
      referenceType,
      reference_type,
      actorId,
      actor_id,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const result = await InventoryService.getMovements({
      productId: productId || product_id,
      type,
      referenceType: referenceType || reference_type,
      actorId: actorId || actor_id,
      startDate,
      endDate,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/inventory/products/:id/history ──────────────
// Stock history for a specific product
router.get('/products/:id/history', requireAnyPermission([
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_MOVEMENTS,
  PERMISSIONS.PRODUCTS_VIEW
]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await InventoryService.getProductStockHistory(id, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/inventory/adjust ───────────────────────────
// Execute an atomic stock adjustment
router.post('/adjust', requirePermission(PERMISSIONS.INVENTORY_ADJUST), async (req, res, next) => {
  try {
    const {
      productId,
      product_id,
      quantityDelta,
      quantity_delta,
      delta,
      type,
      reason,
      referenceType,
      reference_type,
      referenceId,
      reference_id
    } = req.body;

    const targetProductId = productId || product_id;
    const targetDelta = quantityDelta ?? quantity_delta ?? delta;

    if (!targetProductId) {
      return res.status(400).json({ error: 'معرف المنتج مطلوب', code: 'INVALID_PRODUCT_ID' });
    }

    if (targetDelta === undefined || targetDelta === null || isNaN(Number(targetDelta)) || Number(targetDelta) === 0) {
      return res.status(400).json({ error: 'قيمة التعديل يجب أن تكون رقماً غير صفري', code: 'INVALID_QUANTITY' });
    }

    const movement = await InventoryService.adjustStock({
      productId: targetProductId,
      quantityDelta: parseInt(targetDelta, 10),
      type,
      reason: reason || 'تعديل مخزون يدوي',
      actorId: req.user?.id || 'admin',
      referenceType: referenceType || reference_type || 'STOCK_ADJUSTMENT',
      referenceId: referenceId || reference_id || `adj-${Date.now()}`
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل حركة المخزون وتحديث الرصيد بنجاح',
      data: movement
    });
  } catch (err) {
    if (err.code === 'INSUFFICIENT_STOCK' || err.code === 'INVALID_QUANTITY' || err.code === 'INVALID_MOVEMENT_TYPE' || err.code === 'PRODUCT_NOT_FOUND') {
      return res.status(400).json({
        error: err.message,
        code: err.code,
        details: err.details || null
      });
    }
    next(err);
  }
});

// ── Reorder Intelligence Endpoints (Batch 06) ───────────────────

// ── GET /api/inventory/reorder ───────────────────────────
router.get('/reorder', requireAnyPermission([
  PERMISSIONS.INVENTORY_REORDER_VIEW,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.ADMIN_REORDER_VIEW,
  PERMISSIONS.ADMIN_DASHBOARD_VIEW,
]), async (req, res, next) => {
  try {
    const result = await ReorderService.getReorderList(req.query, req.user);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/inventory/reorder/summary ───────────────────
router.get('/reorder/summary', requireAnyPermission([
  PERMISSIONS.INVENTORY_REORDER_VIEW,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.ADMIN_REORDER_VIEW,
  PERMISSIONS.ADMIN_DASHBOARD_VIEW,
]), async (req, res, next) => {
  try {
    const summary = await ReorderService.getReorderSummary(req.user);
    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/inventory/products/:id/reorder ──────────────
router.get('/products/:id/reorder', requireAnyPermission([
  PERMISSIONS.INVENTORY_REORDER_VIEW,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.PRODUCTS_VIEW,
]), async (req, res, next) => {
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

// ── PUT /api/inventory/products/:id/reorder-settings ─────
router.put('/products/:id/reorder-settings', requireAnyPermission([
  PERMISSIONS.INVENTORY_REORDER_MANAGE,
  PERMISSIONS.INVENTORY_ADJUST,
  PERMISSIONS.PRODUCTS_EDIT,
]), async (req, res, next) => {
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
