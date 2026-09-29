import { Router } from 'express';
import { db } from '../lib/supabase.js';
import { requireAuth, requirePermission, requireAnyPermission } from '../middleware/auth.js';
import B2BBalanceService from '../lib/b2bBalanceService.js';

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
router.get('/', requireAuth, requirePermission('b2b.view'), async (req, res, next) => {
  try {
    const list = await db.getB2BRequests();
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/b2b/:id/status (Admin Only) ─────────────────
router.put('/:id/status', requireAuth, requirePermission('b2b.manage'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const allowed = ['new', 'pending', 'quoted', 'contracted', 'closed', 'cancelled'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ error: 'حالة غير صالحة', code: 'INVALID_STATUS' });
    }
    const updated = await db.updateB2BRequest(id, {
      ...(status ? { status } : {}),
      ...(admin_notes !== undefined ? { admin_notes } : {}),
    });
    if (!updated) {
      return res.status(404).json({ error: 'طلب عرض السعر غير موجود', code: 'NOT_FOUND' });
    }
    res.json({
      success: true,
      message: 'تم تحديث حالة طلب الشركة بنجاح',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/b2b/bulk-status (Admin Only) ────────────────
router.post('/bulk-status', requireAuth, requirePermission('b2b.manage'), async (req, res, next) => {
  try {
    const { ids, status, admin_notes } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'يرجى تحديد طلب واحد على الأقل', code: 'INVALID_IDS' });
    }
    const allowed = ['new', 'pending', 'quoted', 'contracted', 'closed', 'cancelled'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ error: 'حالة غير صالحة', code: 'INVALID_STATUS' });
    }
    let updatedCount = 0;
    for (const reqId of ids) {
      const resUpdate = await db.updateB2BRequest(reqId, {
        ...(status ? { status } : {}),
        ...(admin_notes !== undefined ? { admin_notes } : {}),
      });
      if (resUpdate) updatedCount++;
    }
    res.json({
      success: true,
      message: `تم تحديث حالة ${updatedCount} طلب بنجاح`,
      data: { updatedCount },
    });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════
// B2B Operational Customer Balances Endpoints (Batch 07)
// ══════════════════════════════════════════════════════════

// ── GET /api/b2b/balances/summary (Admin Only) ───────────
router.get('/balances/summary', requireAuth, requireAnyPermission(['b2b.balance.view', 'b2b.view', 'admin.b2b.view', 'admin.dashboard.view']), async (req, res, next) => {
  try {
    const summary = await B2BBalanceService.getBalancesSummary(req.user);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/b2b/me/balance (Customer Self-Service) ──────
router.get('/me/balance', requireAuth, async (req, res, next) => {
  try {
    const customer = await B2BBalanceService.getCustomerByUserId(req.user.id || req.user.userId);
    if (!customer) {
      return res.status(404).json({ error: 'لا يوجد حساب شركات B2B مرتبط بهذا المستخدم', code: 'B2B_ACCOUNT_NOT_FOUND' });
    }
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/b2b/me/transactions (Customer Self-Service) ─
router.get('/me/transactions', requireAuth, async (req, res, next) => {
  try {
    const customer = await B2BBalanceService.getCustomerByUserId(req.user.id || req.user.userId);
    if (!customer) {
      return res.status(404).json({ error: 'لا يوجد حساب شركات B2B مرتبط بهذا المستخدم', code: 'B2B_ACCOUNT_NOT_FOUND' });
    }
    const transactions = await B2BBalanceService.getTransactions(customer.id, req.query, req.user);
    res.json({ success: true, ...transactions });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/b2b/customers (Admin List) ──────────────────
router.get('/customers', requireAuth, requireAnyPermission(['b2b.balance.view', 'b2b.view', 'admin.b2b.view']), async (req, res, next) => {
  try {
    const result = await B2BBalanceService.getCustomers(req.query, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/b2b/customers (Admin Create) ───────────────
router.post('/customers', requireAuth, requireAnyPermission(['b2b.balance.manage', 'b2b.manage']), async (req, res, next) => {
  try {
    const created = await B2BBalanceService.createCustomer(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء حساب العميل التجاري B2B بنجاح',
      data: created,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/b2b/customers/:id (Single Customer View) ────
router.get('/customers/:id', requireAuth, async (req, res, next) => {
  try {
    const customer = await B2BBalanceService.getCustomer(req.params.id, req.user);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/b2b/customers/:id/balance ───────────────────
router.get('/customers/:id/balance', requireAuth, async (req, res, next) => {
  try {
    const customer = await B2BBalanceService.getCustomer(req.params.id, req.user);
    res.json({
      success: true,
      data: {
        id: customer.id,
        balance: customer.balance,
        credit_limit: customer.credit_limit,
        available_credit: customer.available_credit,
        account_status: customer.account_status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/b2b/customers/:id/transactions ──────────────
router.get('/customers/:id/transactions', requireAuth, async (req, res, next) => {
  try {
    const result = await B2BBalanceService.getTransactions(req.params.id, req.query, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/b2b/customers/:id/settings (Admin Update) ───
router.put('/customers/:id/settings', requireAuth, requireAnyPermission(['b2b.balance.manage', 'b2b.manage']), async (req, res, next) => {
  try {
    const updated = await B2BBalanceService.updateCustomerSettings(req.params.id, req.body, req.user);
    res.json({
      success: true,
      message: 'تم تحديث إعدادات حساب الشركة بنجاح',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/b2b/customers/:id/account-status ────────────
router.put('/customers/:id/account-status', requireAuth, requireAnyPermission(['b2b.balance.manage', 'b2b.manage']), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const updated = await B2BBalanceService.updateAccountStatus(req.params.id, status, notes, req.user);
    res.json({
      success: true,
      message: `تم تغيير حالة حساب الشركة إلى ${status} بنجاح`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/b2b/customers/:id/payments ─────────────────
router.post('/customers/:id/payments', requireAuth, requireAnyPermission(['b2b.payments.record', 'b2b.balance.manage', 'b2b.manage']), async (req, res, next) => {
  try {
    const result = await B2BBalanceService.recordPayment(req.params.id, req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل دفعة السداد وتحديث رصيد حساب الشركة بنجاح',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/b2b/customers/:id/adjustments ──────────────
router.post('/customers/:id/adjustments', requireAuth, requireAnyPermission(['b2b.adjustments.manage', 'b2b.balance.manage', 'b2b.manage']), async (req, res, next) => {
  try {
    const result = await B2BBalanceService.recordAdjustment(req.params.id, req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل التسوية المالية وتحديث رصيد الحساب بنجاح',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/b2b/customers/:id/credit ───────────────────
router.post('/customers/:id/credit', requireAuth, requireAnyPermission(['b2b.adjustments.manage', 'b2b.balance.manage', 'b2b.manage']), async (req, res, next) => {
  try {
    const result = await B2BBalanceService.recordAdjustment(req.params.id, { ...req.body, type: 'CREDIT' }, req.user);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل قيد دائن (إشعار خصم/رصيد) بنجاح',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/b2b/customers/:id/debit ────────────────────
router.post('/customers/:id/debit', requireAuth, requireAnyPermission(['b2b.adjustments.manage', 'b2b.balance.manage', 'b2b.manage']), async (req, res, next) => {
  try {
    const result = await B2BBalanceService.recordAdjustment(req.params.id, { ...req.body, type: 'DEBIT' }, req.user);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل قيد مدين (إضافة مستحق) بنجاح',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/b2b/customers/:id/invoices ─────────────────
router.post('/customers/:id/invoices', requireAuth, requireAnyPermission(['b2b.balance.manage', 'b2b.manage', 'orders.create']), async (req, res, next) => {
  try {
    const result = await B2BBalanceService.recordInvoice(req.params.id, req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل فاتورة طلب B2B على الحساب بنجاح',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
