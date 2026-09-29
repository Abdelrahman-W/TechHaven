/**
 * Operational Alerts & Automation REST Routes (Batch 08)
 * Protected by granular RBAC ('alerts.view', 'alerts.manage', 'automation.evaluate')
 */

import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import AutomationService from '../lib/automationService.js';

const router = Router();

// ── GET /api/alerts/summary ──────────────────────────────────
router.get('/summary', requireAuth, requirePermission('alerts.view'), async (req, res, next) => {
  try {
    const summary = await AutomationService.getSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/alerts ──────────────────────────────────────────
router.get('/', requireAuth, requirePermission('alerts.view'), async (req, res, next) => {
  try {
    const result = await AutomationService.getAlerts(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/alerts/:id ──────────────────────────────────────
router.get('/:id', requireAuth, requirePermission('alerts.view'), async (req, res, next) => {
  try {
    const alert = await AutomationService.getAlert(req.params.id);
    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/alerts/:id/acknowledge ──────────────────────────
router.put('/:id/acknowledge', requireAuth, requirePermission('alerts.manage'), async (req, res, next) => {
  try {
    const updated = await AutomationService.acknowledgeAlert(req.params.id, req.user);
    res.json({
      success: true,
      message: 'تم تأكيد استلام التنبيه التشغيلي بنجاح',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/alerts/:id/resolve ──────────────────────────────
router.put('/:id/resolve', requireAuth, requirePermission('alerts.manage'), async (req, res, next) => {
  try {
    const updated = await AutomationService.resolveAlert(req.params.id, req.user);
    res.json({
      success: true,
      message: 'تم حل وإغلاق التنبيه التشغيلي بنجاح',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
