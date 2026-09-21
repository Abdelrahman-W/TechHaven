import { Router } from 'express';
import { db } from '../lib/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ── POST /api/b2b/quote ─────────────────────────────────
router.post('/quote', async (req, res, next) => {
  try {
    const company_name = req.body.company_name || req.body.companyName;
    const contact_person = req.body.contact_person || req.body.contact_name || req.body.contactName;
    const email = req.body.email || '';
    const phone = req.body.phone;
    const city = req.body.city || 'القاهرة';
    const business_type = req.body.business_type || req.body.sector || 'cyber_cafe';
    const device_count = req.body.device_count || req.body.deviceCount || 5;
    const estimated_budget = req.body.estimated_budget || req.body.budget || 0;
    const spec_requirements = req.body.spec_requirements || req.body.notes || '';
    const tax_id = req.body.tax_id || req.body.taxId || '';
    const quote_ref = `TH-B2B-${Math.floor(100000 + Math.random() * 900000)}`;

    if (!company_name || !contact_person || !phone) {
      return res.status(400).json({ error: 'يرجى كتابة اسم الشركة والمسؤول ورقم التواصل', code: 'MISSING_FIELDS' });
    }

    const b2bReq = await db.createB2BRequest({
      quote_ref,
      company_name,
      contact_person,
      email: email || '',
      phone,
      city: city || 'القاهرة',
      business_type: business_type || 'cyber_cafe',
      device_count: Number(device_count) || 5,
      estimated_budget: Number(estimated_budget) || 0,
      spec_requirements: spec_requirements || '',
      tax_id: tax_id || ''
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل طلب عرض السعر لشركتكم بنجاح! سيقوم مدير الحسابات المخصصة بالتواصل معكم وإرسال عرض السعر خلال ساعات.',
      data: { ...b2bReq, quote_ref }
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/b2b (Admin Only) ───────────────────────────
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const list = await db.getB2BRequests();
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

export default router;
