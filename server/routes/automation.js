/**
 * Automation REST Routes (Batch 08)
 * Explicit evaluation triggers and background automation run metrics
 */

import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import AutomationService from '../lib/automationService.js';

const router = Router();

// ── POST /api/automation/evaluate ────────────────────────────
router.post('/evaluate', requireAuth, requirePermission('automation.evaluate'), async (req, res, next) => {
  try {
    const result = await AutomationService.evaluateAll('MANUAL', req.user);
    res.json({
      success: true,
      message: 'تم تشغيل التقييم الأوتوماتيكي وتحديث التنبيهات التشغيلية بنجاح',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
