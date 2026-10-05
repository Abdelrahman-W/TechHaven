import { Router } from 'express';
import { db } from '../lib/supabase.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ── GET /api/payments/paymob/config ─────────────────────
router.get('/paymob/config', async (req, res) => {
  try {
    const settings = await db.getSettings();
    const apiKey = settings.paymob_api_key || process.env.PAYMOB_API_KEY;
    const cardIntegrationId = settings.paymob_card_integration_id || process.env.PAYMOB_INTEGRATION_ID;
    const isConfigured = Boolean(apiKey && cardIntegrationId);

    res.json({
      success: true,
      data: {
        isConfigured,
        mode: settings.paymob_mode || 'sandbox',
        publicKey: settings.paymob_public_key || '',
        cardIntegrationId: cardIntegrationId || '',
        walletIntegrationId: settings.paymob_wallet_integration_id || '',
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/paymob/test-connection (Admin Only) ─
router.post('/paymob/test-connection', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await db.getSettings();
    const apiKey = req.body?.api_key || settings.paymob_api_key || process.env.PAYMOB_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال مفتاح الـ API الخاص بـ Paymob أولاً (Paymob API Key)'
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      const paymobRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim() }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await paymobRes.json();
      if (paymobRes.ok && data?.token) {
        return res.json({
          success: true,
          message: 'تم الاتصال والتحقق من حساب Paymob بنجاح! بيانات الاعتماد سليمة وجاهزة لاستقبال المدفوعات.',
          profile: {
            id: data.profile?.id,
            company_name: data.profile?.company_name || data.profile?.username || 'TechHaven Partner',
            email: data.profile?.email,
          }
        });
      } else {
        const errorDetail = data?.detail || data?.message || 'فشل التحقق من مفتاح الـ API، يرجى مراجعة المفتاح من لوحة Paymob Dashboard.';
        return res.status(400).json({
          success: false,
          error: errorDetail
        });
      }
    } catch (netErr) {
      clearTimeout(timeoutId);
      if (netErr.name === 'AbortError') {
        return res.status(504).json({ success: false, error: 'استغرقت خوادم Paymob وقتاً أطول من المعتاد للاستجابة. يرجى إعادة المحاولة.' });
      }
      return res.status(500).json({ success: false, error: `تعذر الاتصال بخوادم Paymob: ${netErr.message}` });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/payments/paymob/initiate ──────────────────
router.post('/paymob/initiate', async (req, res) => {
  try {
    const { order_id, customer } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, error: 'رقم الطلب مطلوب' });
    }

    const order = await db.getOrder(order_id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }

    let tokenUser = null;
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.slice(7).trim(), JWT_SECRET);
        tokenUser = decoded?.userId ? await db.findUserById(decoded.userId) : null;
      } catch { tokenUser = null; }
    }
    const normalizePhone = (value) => String(value || '').replace(/[^0-9]/g, '');
    const isOwner = tokenUser && (tokenUser.id || tokenUser.userId) === order.user_id;
    const sessionId = req.headers['x-session-id'];
    const guestSessionMatch = !order.user_id && order.session_id && sessionId === order.session_id;
    const requestPhone = normalizePhone(customer?.phone);
    const orderPhone = normalizePhone(order.customer_phone);
    const guestPhoneMatch = !order.user_id && requestPhone.length >= 10 && requestPhone === orderPhone;
    if (!isOwner && !guestSessionMatch && !guestPhoneMatch) {
      return res.status(403).json({ success: false, error: 'غير مصرح لك ببدء سداد هذا الطلب', code: 'FORBIDDEN' });
    }

    const authoritativeTotal = Number(order.total);
    if (!authoritativeTotal || authoritativeTotal <= 0) {
      return res.status(400).json({ success: false, error: 'قيمة الطلب غير صالحة للسداد' });
    }

    const settings = await db.getSettings();
    const apiKey = settings.paymob_api_key || process.env.PAYMOB_API_KEY;
    const integrationId = settings.paymob_card_integration_id || process.env.PAYMOB_INTEGRATION_ID;
    const mode = settings.paymob_mode || 'sandbox';

    // If live/configured credentials are present, attempt Paymob 3-step session creation
    if (apiKey && integrationId && mode === 'live') {
      try {
        // Step 1: Authentication Token
        const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey.trim() }),
        });
        const authData = await authRes.json();

        if (authData?.token) {
          const authToken = authData.token;
          const amountCents = Math.round(authoritativeTotal * 100);

          // Step 2: Order Registration
          const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auth_token: authToken,
              delivery_needed: 'false',
              amount_cents: amountCents,
              currency: 'EGP',
              merchant_order_id: String(order.id),
              items: [],
            }),
          });
          const paymobOrder = await orderRes.json();

          if (paymobOrder?.id) {
            // Step 3: Payment Key
            const keyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                auth_token: authToken,
                amount_cents: amountCents,
                expiration: 3600,
                order_id: paymobOrder.id,
                billing_data: {
                  apartment: 'NA',
                  email: customer?.email || order.customer_email || 'client@techhaven.eg',
                  floor: 'NA',
                  first_name: customer?.name?.split(' ')[0] || order.customer_name?.split(' ')[0] || 'Client',
                  street: customer?.address || order.customer_address || 'Cairo',
                  building: 'NA',
                  phone_number: customer?.phone || order.customer_phone || '01000000000',
                  shipping_method: 'PKG',
                  postal_code: 'NA',
                  city: customer?.city || order.customer_city || 'Cairo',
                  country: 'EGY',
                  last_name: customer?.name?.split(' ')[1] || order.customer_name?.split(' ')[1] || 'Customer',
                  state: customer?.city || order.customer_city || 'Cairo',
                },
                currency: 'EGP',
                integration_id: Number(integrationId),
              }),
            });
            const keyData = await keyRes.json();

            if (keyData?.token) {
              return res.json({
                success: true,
                data: {
                  payment_token: keyData.token,
                  payment_url: `https://accept.paymob.com/api/acceptance/iframes/live?payment_token=${keyData.token}`,
                  order_id: order.id,
                  amount: authoritativeTotal,
                  mode: 'live'
                }
              });
            }
          }
        }
      } catch (paymobErr) {
        console.warn('Paymob Live session generation fallback to sandbox simulation:', paymobErr.message);
      }
    }

    // Sandbox / Test Mode Simulation
    const clientSecret = `paymob_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const paymobIframeUrl = `https://techhaven.com.eg/paymob-mock-iframe?order_id=${encodeURIComponent(order.id)}&amount=${authoritativeTotal}&currency=EGP&mode=${mode}`;

    res.json({
      success: true,
      data: {
        payment_url: paymobIframeUrl,
        client_secret: clientSecret,
        order_id: order.id,
        amount: authoritativeTotal,
        mode,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/instructions ─────────────────────
// Returns payment instructions for Egyptian local payment methods
router.post('/instructions', async (req, res) => {
  const { method } = req.body; // 'vodafone_cash' | 'instapay' | 'fawry'
  const settings = await db.getSettings();

  const instructions = {
    'vodafone_cash': {
      title: 'فودافون كاش / محافظ إلكترونية',
      phone: settings.vodafone_cash_phone || '01012345678',
      merchant_name: `${settings.store_name || 'TechHaven'} Official Cash`,
      steps: [
        'افتح تطبيق أنا فودافون أو اطلب كود *9*7*رقم المحفظة*المبلغ#',
        'قم بتحويل المبلغ بدقة مع حفظ رسالة التأكيد أو رقم المعاملة (Ref ID)',
        'سيتم تفعيل وتجهيز طلبك تلقائياً فور مطابقة التحويل خلال دقائق.'
      ]
    },
    'instapay': {
      title: 'تحويل عبر تطبيق انستاباي (InstaPay)',
      ipa: settings.instapay_address || 'techhaven@instapay',
      account_name: `${settings.store_name || 'TechHaven'} للتقنية والتجارة`,
      steps: [
        'افتح تطبيق InstaPay على هاتفك المحمول',
        `اختر إرسال نقود إلى عنوان الدفع اللحظي (IPA): ${settings.instapay_address || 'techhaven@instapay'}`,
        'اكتب رقم الطلب في خانة الملاحظات/الغرض من التحويل',
        'سيتم تأكيد العملية فوراً دون أي رسوم إضافية.'
      ]
    },
    'fawry': {
      title: 'خدمة فوري (Fawry Pay)',
      code: `789${Math.floor(100000 + Math.random() * 900000)}`,
      expire_hours: 48,
      steps: [
        'توجه لأي منفذ أو ماكينة فوري في مصر',
        'اختر مدفوعات فوري باي برقم الكود الموضح أعلاه',
        'سدد المبلغ واحصل على إيصال السداد الورقي'
      ]
    }
  };

  res.json({
    success: true,
    data: instructions[method] || instructions['instapay']
  });
});

// ── POST /api/payments/paymob/webhook ───────────────────
router.post('/paymob/webhook', async (req, res) => {
  try {
    const data = req.body?.obj || req.body;
    const settings = await db.getSettings();
    const hmacSecret = settings.paymob_hmac_secret || process.env.PAYMOB_HMAC_SECRET;

    // Verify HMAC signature
    if (hmacSecret) {
      const incomingHmac = req.query?.hmac;
      if (!incomingHmac || !data) {
        return res.status(403).json({ error: 'Missing HMAC signature', code: 'FORBIDDEN' });
      }

      const hmacKeys = [
        'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
        'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
        'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
        'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success'
      ];

      let concatenated = '';
      for (const k of hmacKeys) {
        if (k.includes('.')) {
          const [p1, p2] = k.split('.');
          concatenated += (data[p1] && data[p1][p2] !== undefined ? String(data[p1][p2]) : '');
        } else {
          concatenated += (data[k] !== undefined ? String(data[k]) : '');
        }
      }

      const calculatedHmac = crypto
        .createHmac('sha512', hmacSecret)
        .update(concatenated)
        .digest('hex');

      const calculatedBuf = Buffer.from(calculatedHmac.toLowerCase(), 'utf8');
      const incomingBuf = Buffer.from(String(incomingHmac).toLowerCase(), 'utf8');

      if (calculatedBuf.length !== incomingBuf.length || !crypto.timingSafeEqual(calculatedBuf, incomingBuf)) {
        console.warn('Paymob Webhook HMAC verification failed');
        return res.status(403).json({ error: 'HMAC verification failed', code: 'INVALID_SIGNATURE' });
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.warn('Paymob Webhook rejected: HMAC secret not configured in production');
      return res.status(403).json({ error: 'Webhook signature verification required', code: 'FORBIDDEN' });
    }

    const orderId = data?.merchant_order_id || data?.order?.merchant_order_id || data?.order_id;
    const isSuccess = data?.success === true || data?.success === 'true';

    if (orderId && isSuccess) {
      const order = await db.getOrder(orderId);
      if (order) {
        const transactionId = String(data?.id || 'online');
        const timeline = order.timeline || [];
        if (order.payment_status === 'paid' || timeline.some((entry) => entry.payment_transaction_id === transactionId)) {
          return res.json({ accepted: true, duplicate: true, order_id: order.id });
        }
        timeline.push({
          status: 'paid',
          label: `تم استلام الدفع الإلكتروني بنجاح عبر Paymob (معاملة: ${data?.id || 'online'})`,
          time: new Date().toISOString(),
          payment_transaction_id: transactionId,
        });

        await db.updateOrder(order.id, {
          payment_status: 'paid',
          status: 'confirmed',
          timeline,
          updated_at: new Date().toISOString()
        });
        console.log(`Order ${order.id} marked as PAID via verified Paymob Webhook.`);
      } else {
        console.warn(`Webhook received for non-existent order: ${orderId}`);
      }
    }

    res.json({ accepted: true, order_id: orderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
