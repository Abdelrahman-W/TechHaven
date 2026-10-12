import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, requireVendor } from '../middleware/auth.js';
import { db } from '../lib/supabase.js';
import { invalidateCache } from '../middleware/cache.js';

const router = Router();

const vendorRegisterSchema = z.object({
  company_name: z.string().min(2, 'اسم الشركة / المتجر مطلوب'),
  company_name_en: z.string().optional(),
  tax_number: z.string().optional(),
  commercial_register: z.string().optional(),
  phone: z.string().min(8, 'رقم الهاتف مطلوب'),
  email: z.string().email('البريد الإلكتروني غير صالح').optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  bank_account: z.any().optional(),
});

// ── POST /api/vendors/register (Register as Marketplace Vendor) ──
router.post('/register', requireAuth, async (req, res, next) => {
  try {
    const parsed = vendorRegisterSchema.parse(req.body);
    const userId = req.user.id || req.user.userId;

    const existingVendor = await db.getVendorByUserId(userId);
    if (existingVendor) {
      return res.status(400).json({
        error: 'لديك ملف تاجر مسجل مسبقاً بالفعل',
        code: 'VENDOR_ALREADY_EXISTS',
        data: existingVendor,
      });
    }

    const vendor = await db.createVendor({
      user_id: userId,
      company_name: parsed.company_name,
      company_name_en: parsed.company_name_en || parsed.company_name,
      tax_number: parsed.tax_number || '',
      commercial_register: parsed.commercial_register || '',
      phone: parsed.phone,
      email: parsed.email || req.user.email,
      city: parsed.city || '',
      address: parsed.address || '',
      description: parsed.description || '',
      bank_account: parsed.bank_account || null,
      status: 'pending',
      commission_rate: 10.0,
    });

    // Upgrade user role to vendor if currently normal user
    if ((req.user.role || '').toLowerCase() === 'user') {
      await db.updateUser(userId, { role: 'vendor' });
    }

    res.status(201).json({
      success: true,
      message: 'تم تسجيل طلب انضمام التاجر بنجاح، بانتظار مراجعة الإدارة',
      data: vendor,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: err.errors[0]?.message || 'بيانات غير صحيحة',
        code: 'VALIDATION_ERROR',
      });
    }
    next(err);
  }
});

// ── GET /api/vendors/me (Vendor's Own Profile) ───────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const vendor = await db.getVendorByUserId(userId);
    if (!vendor) {
      return res.status(404).json({
        error: 'لم يتم العثور على ملف تاجر مرتبط بحسابك',
        code: 'VENDOR_NOT_FOUND',
      });
    }
    res.json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/vendors/me (Update Vendor's Profile) ───────────────
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const vendor = await db.getVendorByUserId(userId);
    if (!vendor) {
      return res.status(404).json({
        error: 'لم يتم العثور على ملف تاجر مرتبط بحسابك',
        code: 'VENDOR_NOT_FOUND',
      });
    }

    const {
      company_name,
      company_name_en,
      phone,
      email,
      city,
      address,
      description,
      logo_url,
      banner_url,
      bank_account,
    } = req.body;

    const updates = {};
    if (company_name) updates.company_name = company_name;
    if (company_name_en) updates.company_name_en = company_name_en;
    if (phone) updates.phone = phone;
    if (email) updates.email = email;
    if (city) updates.city = city;
    if (address) updates.address = address;
    if (description !== undefined) updates.description = description;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (banner_url !== undefined) updates.banner_url = banner_url;
    if (bank_account !== undefined) updates.bank_account = bank_account;

    const updated = await db.updateVendor(vendor.id, updates);
    res.json({
      success: true,
      message: 'تم تحديث بيانات ملف التاجر بنجاح',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/vendors/products (List Vendor's Own Products) ──────
router.get('/products', requireAuth, requireVendor, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const vendor = await db.getVendorByUserId(userId);
    if (!vendor) {
      return res.status(404).json({
        error: 'ملف التاجر غير موجود',
        code: 'VENDOR_NOT_FOUND',
      });
    }

    const result = await db.getVendorProducts(vendor.id, req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/vendors/products (Create Vendor Product) ───────────
router.post('/products', requireAuth, requireVendor, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const vendor = await db.getVendorByUserId(userId);
    if (!vendor) {
      return res.status(404).json({
        error: 'ملف التاجر غير موجود',
        code: 'VENDOR_NOT_FOUND',
      });
    }

    if (vendor.status !== 'approved') {
      return res.status(403).json({
        error: 'حساب التاجر قيد المراجعة أو معلق، ولا يمكن إضافة منتجات حالياً',
        code: 'VENDOR_NOT_APPROVED',
        vendor_status: vendor.status,
      });
    }

    const {
      name,
      name_en,
      description,
      description_en,
      category_id,
      brand,
      model,
      price,
      old_price,
      stock_qty,
      images,
      thumbnail,
      specs,
      features,
      tags,
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        error: 'اسم المنتج وسعره حقول إلزامية',
        code: 'MISSING_FIELDS',
      });
    }

    const prodId = `prod-v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sku = `VND-${vendor.id.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const productData = {
      id: prodId,
      sku,
      vendor_id: vendor.id,
      seller_id: vendor.id,
      seller_name: vendor.company_name,
      name,
      name_en: name_en || name,
      slug: (name_en || name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + prodId.slice(-4),
      description: description || '',
      description_en: description_en || '',
      category_id: category_id || 'cat-gpu',
      brand: brand || vendor.company_name,
      model: model || '',
      price: Math.max(0, Number(price) || 0),
      old_price: old_price ? Math.max(0, Number(old_price)) : null,
      stock_qty: Math.max(0, parseInt(stock_qty, 10) || 0),
      images: images?.length ? images : [thumbnail || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80'],
      thumbnail: thumbnail || images?.[0] || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80',
      specs: specs || {},
      features: features || [],
      tags: tags || [],
      rating: 5.0,
      review_count: 0,
      sold_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const created = await db.createProduct(productData);
    invalidateCache('/api/products', { scope: 'products' });

    res.status(201).json({
      success: true,
      message: 'تم إضافة المنتج بنجاح إلى متجرك',
      data: created,
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/vendors/products/:id (Update Vendor's Product with Data Isolation) ──
router.put('/products/:id', requireAuth, requireVendor, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const vendor = await db.getVendorByUserId(userId);
    if (!vendor) {
      return res.status(404).json({
        error: 'ملف التاجر غير موجود',
        code: 'VENDOR_NOT_FOUND',
      });
    }

    const product = await db.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({
        error: 'المنتج غير موجود',
        code: 'PRODUCT_NOT_FOUND',
      });
    }

    // STRICT DATA ISOLATION: A vendor can only modify their own products
    const isOwner = (product.vendor_id === vendor.id || product.seller_id === vendor.id);
    if (!isOwner) {
      return res.status(403).json({
        error: 'غير مصرح لك بتعديل منتجات تابعة لتاجر آخر (انتهاك العزل)',
        code: 'FORBIDDEN_VENDOR_MISMATCH',
      });
    }

    const updates = { ...req.body };
    // Prevent tampering with ownership
    delete updates.id;
    delete updates.vendor_id;
    delete updates.seller_id;

    if (updates.price !== undefined) updates.price = Math.max(0, Number(updates.price) || 0);
    if (updates.stock_qty !== undefined) updates.stock_qty = Math.max(0, parseInt(updates.stock_qty, 10) || 0);

    const updated = await db.updateProduct(req.params.id, updates);
    invalidateCache('/api/products', { scope: 'products' });
    invalidateCache(`/api/products/${req.params.id}`);

    res.json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/vendors/products/:id (Delete Vendor's Product with Isolation) ──
router.delete('/products/:id', requireAuth, requireVendor, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const vendor = await db.getVendorByUserId(userId);
    if (!vendor) {
      return res.status(404).json({
        error: 'ملف التاجر غير موجود',
        code: 'VENDOR_NOT_FOUND',
      });
    }

    const product = await db.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({
        error: 'المنتج غير موجود',
        code: 'PRODUCT_NOT_FOUND',
      });
    }

    // STRICT DATA ISOLATION
    const isOwner = (product.vendor_id === vendor.id || product.seller_id === vendor.id);
    if (!isOwner) {
      return res.status(403).json({
        error: 'غير مصرح لك بحذف منتجات تابعة لتاجر آخر (انتهاك العزل)',
        code: 'FORBIDDEN_VENDOR_MISMATCH',
      });
    }

    await db.deleteProduct(req.params.id);
    invalidateCache('/api/products', { scope: 'products' });
    invalidateCache(`/api/products/${req.params.id}`);

    res.json({
      success: true,
      message: 'تم حذف المنتج بنجاح',
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/vendors/orders (Isolated Order List for Vendor) ─────
router.get('/orders', requireAuth, requireVendor, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const vendor = await db.getVendorByUserId(userId);
    if (!vendor) {
      return res.status(404).json({
        error: 'ملف التاجر غير موجود',
        code: 'VENDOR_NOT_FOUND',
      });
    }

    const orders = await db.getVendorOrders(vendor.id);
    res.json({
      success: true,
      data: orders,
      total: orders.length,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/vendors/analytics (Sales & Commission Summary) ─────
router.get('/analytics', requireAuth, requireVendor, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const vendor = await db.getVendorByUserId(userId);
    if (!vendor) {
      return res.status(404).json({
        error: 'ملف التاجر غير موجود',
        code: 'VENDOR_NOT_FOUND',
      });
    }

    const analytics = await db.getVendorAnalytics(vendor.id);
    res.json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
});

// ── ADMIN VENDOR MANAGEMENT ─────────────────────────────────────
// GET /api/vendors/admin/list
router.get('/admin/list', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const list = await db.listVendors(req.query);
    res.json({
      success: true,
      data: list.data,
      pagination: list.pagination,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/vendors/admin/:id
router.get('/admin/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const vendor = await db.getVendor(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'التاجر غير موجود', code: 'VENDOR_NOT_FOUND' });
    }
    res.json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
});

// PUT /api/vendors/admin/:id/status (Approve, Suspend, Update Commission)
router.put('/admin/:id/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status, commission_rate, notes } = req.body;
    const vendor = await db.getVendor(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'التاجر غير موجود', code: 'VENDOR_NOT_FOUND' });
    }

    const validStatuses = ['pending', 'approved', 'suspended', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'حالة التاجر غير صالحة. الحالات المتاحة: ' + validStatuses.join(', '),
        code: 'INVALID_STATUS',
      });
    }

    const updates = {};
    if (status) updates.status = status;
    if (commission_rate !== undefined && !isNaN(Number(commission_rate))) {
      updates.commission_rate = Math.max(0, Math.min(100, Number(commission_rate)));
    }
    if (notes !== undefined) updates.admin_notes = notes;

    const updated = await db.updateVendor(vendor.id, updates);
    res.json({
      success: true,
      message: `تم تحديث حالة التاجر إلى: ${status || vendor.status}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
