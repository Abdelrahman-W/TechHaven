import { Router } from 'express';
import { db } from '../lib/supabase.js';
import bcrypt from 'bcryptjs';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Protect ALL admin endpoints: strictly requires valid JWT with role === 'admin'
router.use(requireAuth, requireAdmin);

// ── GET /api/admin/stats ────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [products, orderStats, b2b, users] = await Promise.all([
      db.getAllProducts(),
      db.getAdminOrderStats(),
      db.getB2BRequests(),
      db.getAllUsers(),
    ]);

    const totalRevenue = orderStats.totalRevenue;
    const completedOrders = orderStats.completedOrders;

    res.json({
      data: {
        totalRevenue,
        revenue: totalRevenue,
        totalOrders: orderStats.totalOrders,
        orders: orderStats.totalOrders,
        completedOrders,
        totalProducts: products.length,
        products: products.length,
        totalUsers: users.length,
        users: users.length,
        totalB2B: b2b.length,
        recentOrders: orderStats.recentOrders,
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/users ────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const users = await db.getAllUsers();
    // Exclude password hashes
    const safeUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      phone: u.phone,
      role: u.role,
      is_super_admin: u.is_super_admin || false,
      created_at: u.created_at
    }));
    res.json({ data: safeUsers });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/users (Create Admin or User) ───────
router.post('/users', async (req, res, next) => {
  try {
    const { email, password, full_name, phone, role } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني، كلمة المرور، والاسم الكامل', code: 'MISSING_FIELDS' });
    }

    const existing = await db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'هذا البريد الإلكتروني مسجل بالفعل', code: 'EMAIL_EXISTS' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user-${Date.now()}`;
    const newUser = {
      id: userId,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      full_name: full_name.trim(),
      phone: phone?.trim() || '',
      role: role === 'admin' ? 'admin' : 'user',
      created_at: new Date().toISOString()
    };

    const created = await db.createUser(newUser);

    res.status(201).json({
      success: true,
      message: role === 'admin' ? 'تم إنشاء حساب المسؤول بنجاح!' : 'تم إنشاء الحساب بنجاح!',
      data: {
        id: created.id,
        email: created.email,
        full_name: created.full_name,
        phone: created.phone,
        role: created.role,
        created_at: created.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/users/:id (Update User / Change Role) ─
router.put('/users/:id', async (req, res, next) => {
  try {
    const { full_name, phone, role, password } = req.body;
    const updates = {};
    if (full_name) updates.full_name = full_name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (role && ['admin', 'user'].includes(role)) updates.role = role;
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    const updated = await db.updateUser(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'المستخدم غير موجود', code: 'NOT_FOUND' });
    }

    res.json({
      success: true,
      message: 'تم تحديث بيانات المستخدم بنجاح',
      data: {
        id: updated.id,
        email: updated.email,
        full_name: updated.full_name,
        phone: updated.phone,
        role: updated.role,
        created_at: updated.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/users/:id ─────────────────────────
router.delete('/users/:id', async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (targetId === 'admin-abdelrahman') {
      return res.status(403).json({ error: 'لا يمكن حذف حساب المدير العام الرئيسي (عبد الرحمن)', code: 'FORBIDDEN' });
    }

    const user = await db.findUserById(targetId);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود', code: 'NOT_FOUND' });
    }

    if (user.email === 'abdelrahman959@gmail.com') {
      return res.status(403).json({ error: 'لا يمكن حذف حساب المدير العام الرئيسي', code: 'FORBIDDEN' });
    }

    await db.deleteUser(targetId);
    res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/orders ───────────────────────────────
router.get('/orders', async (req, res, next) => {
  try {
    const orders = await db.getOrders();
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/orders/:id/status ────────────────────
router.put('/orders/:id/status', async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await db.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'الطلب غير موجود', code: 'NOT_FOUND' });
    }

    const timeline = order.timeline || [];
    timeline.push({
      status,
      label: note || `تحديث حالة الطلب إلى: ${status}`,
      time: new Date().toISOString()
    });

    const updated = await db.updateOrder(order.id, {
      status,
      timeline,
      updated_at: new Date().toISOString()
    });

    res.json({ success: true, message: 'تم تحديث حالة الطلب بنجاح', data: updated });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/settings ─────────────────────────────
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await db.getSettings();
    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/settings ─────────────────────────────
router.put('/settings', async (req, res, next) => {
  try {
    const updated = await db.updateSettings(req.body);
    res.json({
      success: true,
      message: 'تم حفظ إعدادات النظام والمتجر بنجاح!',
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

export default router;
