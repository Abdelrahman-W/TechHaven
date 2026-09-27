import { Router } from 'express';
import { db } from '../lib/supabase.js';
import { requireAuth, requirePermission, getOptionalUser } from '../middleware/auth.js';
import { invalidateCache } from '../middleware/cache.js';

const router = Router();

// Whitelist of public non-sensitive settings fields
const PUBLIC_SETTINGS_KEYS = new Set([
  'store_name',
  'store_name_en',
  'slogan',
  'hotline',
  'email',
  'whatsapp_phone',
  'address',
  'commercial_reg',
  'tax_card',
  'shipping_cairo',
  'shipping_governorates',
  'shipping_express',
  'free_shipping_threshold',
  'estimated_days',
  'estimated_days_gov',
  'return_policy_days',
  'cod_extra_fee',
  'enable_visa',
  'enable_meeza',
  'enable_vodafone_cash',
  'enable_instapay',
  'enable_cod',
  'vodafone_cash_phone',
  'instapay_address',
  'maintenance_mode',
  'announcement_active',
  'announcement_text',
  'announcement_link',
  'paymob_mode',
  'paymob_public_key',
  'ga4_measurement_id',
  'meta_pixel_id',
  'gtm_id',
  'tiktok_pixel_id',
]);

// ── GET /api/settings (Public Safe Whitelist / Full if Admin) ──
router.get('/', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    const settings = await db.getSettings();
    const user = getOptionalUser(req);

    // If caller is an authenticated staff/admin, return full settings
    if (user && (user.role === 'admin' || user.role === 'owner' || user.role === 'store_manager')) {
      return res.json({ success: true, data: settings });
    }

    // Public / unauthenticated: return ONLY safe non-sensitive configuration
    const publicSettings = {};
    for (const key of PUBLIC_SETTINGS_KEYS) {
      if (settings[key] !== undefined) {
        publicSettings[key] = settings[key];
      }
    }

    res.json({ success: true, data: publicSettings });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/settings (Admin Only: settings.manage) ─────────
router.put('/', requireAuth, requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const updated = await db.updateSettings(req.body);
    invalidateCache('/api/settings', { scope: 'settings' });
    res.json({
      success: true,
      message: 'تم حفظ إعدادات النظام والمتجر بنجاح!',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
