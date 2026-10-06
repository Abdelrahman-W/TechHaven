import { Router } from 'express';
import { db } from '../lib/supabase.js';
import { requireAuth, requirePermission, getOptionalUser, getOptionalUserAsync } from '../middleware/auth.js';
import { invalidateCache } from '../middleware/cache.js';

const router = Router();

// ── GET /api/orders ─────────────────────────────────────
// Returns only the authenticated user's orders, or all orders if admin. Unauthenticated callers get []
router.get('/', async (req, res, next) => {
  try {
    const user = await getOptionalUserAsync(req);
    if (!user || !(user.id || user.userId)) {
      return res.json({ data: [] });
    }

    const isAdmin = ['admin', 'owner'].includes(String(user.role).toLowerCase());
    const orders = await db.getOrders(isAdmin ? null : (user.id || user.userId));
    const normalizedOrders = orders.map((order) => ({
      ...order,
      items: (order.items || order.order_items || []).map((item) => {
        const { unit_cost, total_cost, ...rest } = item;
        return {
          ...rest,
          unit_cost: unit_cost == null ? 0 : Number(unit_cost),
          total_cost: total_cost == null ? 0 : Number(total_cost),
        };
      }),
    }));
    res.json({ data: normalizedOrders });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders/:idOrRef ────────────────────────────
// Protected against IDOR/BOLA and unauthorized Guest Order exposure
router.get('/:idOrRef', async (req, res, next) => {
  try {
    const order = await db.getOrder(req.params.idOrRef);
    if (!order) {
      return res.status(404).json({ error: 'الطلب غير موجود', code: 'NOT_FOUND' });
    }

    const user = await getOptionalUserAsync(req);
    const isAdmin = Boolean(user && ['admin', 'owner'].includes(String(user.role).toLowerCase()));

    // 1. Admin has full access to any order
    if (isAdmin) {
      return res.json({ data: order });
    }

    // 2. Account-bound order: strictly only the account owner
    if (order.user_id) {
      if (!user || (user.id || user.userId) !== order.user_id) {
        return res.status(403).json({ error: 'غير مصرح لك بالاطلاع على هذا الطلب', code: 'FORBIDDEN' });
      }
      return res.json({ data: order });
    }

    // 3. Guest order (order.user_id is null):
    // Must NOT be retrievable using order reference or ID alone.
    // Authorization requirements:
    // A) Caller session matches the session that created the order (x-session-id header).
    // B) Or caller provides matching phone verification (?phone=... or x-order-phone header).
    const reqSessionId = req.headers['x-session-id'];
    const reqPhone = (req.query.phone || req.headers['x-order-phone'] || '').toString().trim();

    const normalizePhone = (p) => (p || '').replace(/[^0-9]/g, '');
    const cleanReqPhone = normalizePhone(reqPhone);
    const cleanOrderPhone = normalizePhone(order.customer_phone);

    const isSessionMatch = Boolean(
      order.session_id &&
      reqSessionId &&
      reqSessionId !== 'guest-session' &&
      reqSessionId === order.session_id
    );

    const isPhoneMatch = Boolean(
      cleanReqPhone.length >= 10 &&
      cleanOrderPhone.length >= 10 &&
      cleanReqPhone === cleanOrderPhone
    );

    if (!isSessionMatch && !isPhoneMatch) {
      return res.status(403).json({ error: 'غير مصرح لك بالاطلاع على هذا الطلب', code: 'FORBIDDEN' });
    }

    // Response minimization for guest tracking: protect sensitive personal contact fields
    const maskedPhone = order.customer_phone
      ? order.customer_phone.replace(/^(\+?2?0?1\d{1})(\d{4,6})(\d{2,3})$/, '$1****$3')
      : '';
    const maskedAddress = order.customer_address
      ? (order.customer_address.length > 12 ? order.customer_address.slice(0, 10) + '...' : order.customer_address)
      : '';

    const sanitizedGuestOrder = {
      id: order.id,
      reference: order.reference,
      order_number: order.order_number || order.reference,
      status: order.status,
      status_label_ar: order.status_label_ar,
      status_label_en: order.status_label_en,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      subtotal: order.subtotal,
      shipping_cost: order.shipping_cost,
      discount_amount: order.discount_amount,
      total: order.total,
      items: (order.items || order.order_items || []).map((item) => ({
        id: item.id || item.product_id,
        product_id: item.product_id || item.id,
        name: item.name || item.product_name,
        product_name: item.product_name || item.name,
        name_en: item.name_en,
        quantity: item.quantity,
        unit_price: item.unit_price || item.price,
        price: item.price || item.unit_price,
        total_price: item.total_price || (item.price || item.unit_price) * item.quantity,
        thumbnail: item.thumbnail
      })),
      timeline: order.timeline || [],
      created_at: order.created_at,
      updated_at: order.updated_at,
      estimated_delivery: order.estimated_delivery,
      customer_city: order.customer_city,
      customer_name: order.customer_name,
      customer_phone: maskedPhone || (order.customer_phone ? '010****' : ''),
      customer_address: maskedAddress || '***'
    };

    return res.json({ data: sanitizedGuestOrder });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/orders ────────────────────────────────────
// Server-enforced pricing, authoritative database stock check & deduction via Atomic Checkout RPC
router.post('/', async (req, res, next) => {
  try {
    const user = getOptionalUser(req);
    const {
      customer,
      items,
      notes
    } = req.body;

    const customerName = customer?.fullName || customer?.name;
    if (!customerName || !customer?.phone || !customer?.address || !customer?.city) {
      return res.status(400).json({ error: 'يرجى إكمال جميع بيانات العميل والعنوان', code: 'INVALID_DATA' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'سلة المشتريات فارغة', code: 'EMPTY_CART' });
    }

    // Pre-validate item structure and calculate tentative subtotal for shipping tier
    let tentativeSubtotal = 0;
    for (const it of items) {
      const productId = it.productId || it.product_id || it.id;
      if (!productId) {
        return res.status(400).json({ error: 'بيانات المنتج غير صالحة', code: 'INVALID_ITEM' });
      }

      const rawQty = parseInt(it.quantity, 10);
      if (isNaN(rawQty) || rawQty <= 0) {
        return res.status(400).json({ error: 'الكمية المطلوبة يجب أن تكون 1 أو أكثر', code: 'INVALID_QUANTITY' });
      }

      const dbProduct = await db.getProduct(productId);
      if (!dbProduct) {
        return res.status(400).json({ error: `المنتج غير موجود: ${productId}`, code: 'PRODUCT_NOT_FOUND' });
      }

      const authPrice = Number(dbProduct.price) || 0;
      tentativeSubtotal += authPrice * rawQty;
    }

    // Server-authoritative shipping calculation
    const customerCity = customer.city?.trim().toLowerCase() || '';
    const isCairo = ['القاهرة', 'Cairo', 'cairo', 'eg-ca', 'ca'].some(val => customerCity.includes(val));
    const isGiza = ['الجيزة', 'Giza', 'giza', 'eg-gz', 'gz'].some(val => customerCity.includes(val));

    let calculatedShipping = 0;
    if (tentativeSubtotal >= 2500) {
      calculatedShipping = 0; // Free shipping threshold
    } else if (isCairo) {
      calculatedShipping = 55;
    } else if (isGiza) {
      calculatedShipping = 80;
    } else {
      calculatedShipping = 75; // Fallback for other locations
    }

    // Order discount is strictly server-authorized (0 until server-side promotion rules are defined).
    const serverAuthorizedDiscount = 0;

    const reference = `TH-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderId = `order-${Date.now()}`;
    const paymentMethod = customer?.paymentMethod || customer?.payment_method || req.body.payment_method || 'cod';

    // Strict payment status determination
    let payment_status = 'pending_payment';
    let initialStatus = 'pending';

    if (paymentMethod === 'cod') {
      payment_status = 'pending_cod';
      initialStatus = 'confirmed';
    } else if (paymentMethod === 'card' || paymentMethod === 'wallet') {
      payment_status = 'pending_payment';
      initialStatus = 'pending';
    } else if (paymentMethod === 'instapay' || paymentMethod === 'vodafone_cash') {
      payment_status = 'pending_verification';
      initialStatus = 'pending';
    }

    const rawSessionId = req.headers['x-session-id'];
    const validSessionId = rawSessionId && rawSessionId !== 'guest-session' ? rawSessionId : null;

    const timeline = [
      { status: 'created', label: 'تم إنشاء الطلب بنجاح', time: new Date().toISOString() },
      {
        status: initialStatus,
        label: paymentMethod === 'cod'
          ? 'تم تأكيد الطلب وجاري تجهيز الشحنة للدفع عند الاستلام'
          : 'الطلب بانتظار استكمال عملية السداد',
        time: new Date().toISOString()
      }
    ];

    const orderPayload = {
      id: orderId,
      reference,
      user_id: user?.id || user?.userId || null,
      session_id: validSessionId,
      customer_name: customerName,
      customer_phone: customer.phone,
      customer_email: customer.email || '',
      customer_city: customer.city,
      customer_address: customer.address,
      customer_notes: notes || '',
      payment_method: paymentMethod,
      payment_status,
      status: initialStatus,
      shipping_cost: calculatedShipping,
      discount_amount: serverAuthorizedDiscount,
      coupon_code: null,
      items,
      timeline
    };

    // Execute atomic checkout transaction (RPC in Supabase, atomic memory/disk transaction in local fallback)
    const created = await db.processOrderCheckout(orderPayload);

    // Invalidate product & inventory caches
    invalidateCache('/api/products', { scope: 'products' });
    for (const it of items) {
      const pId = it.productId || it.product_id || it.id;
      if (pId) invalidateCache(`/api/products/${pId}`);
    }
    invalidateCache('/api/inventory/movements');

    // Clear cart if authenticated
    if (user?.userId) {
      await db.clearCart(user.userId);
    }

    res.status(201).json({
      success: true,
      message: 'تم تسجيل طلبك بنجاح!',
      data: created
    });
  } catch (err) {
    if (err.code === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({
        error: err.message || 'الكمية المطلوبة غير متوفرة',
        code: 'INSUFFICIENT_STOCK',
        details: err.details || null
      });
    }
    if (err.code === 'PRODUCT_NOT_FOUND') {
      return res.status(400).json({
        error: err.message || 'المنتج غير موجود',
        code: 'PRODUCT_NOT_FOUND'
      });
    }
    if (err.code === 'INVALID_DATA' || err.code === 'INVALID_ITEM' || err.code === 'INVALID_QUANTITY' || err.code === 'EMPTY_CART') {
      return res.status(400).json({
        error: err.message,
        code: err.code
      });
    }
    next(err);
  }
});

// ── PUT/PATCH /api/orders/:id/status (Admin Only) ───────
const updateStatusHandler = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'حالة الطلب مطلوبة', code: 'MISSING_STATUS' });
    }

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

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

router.put('/:id/status', requireAuth, requirePermission('orders.edit'), updateStatusHandler);
router.patch('/:id/status', requireAuth, requirePermission('orders.edit'), updateStatusHandler);

export default router;
