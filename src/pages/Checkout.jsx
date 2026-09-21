import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  Lock,
  ArrowRight,
  ArrowLeft,
  Clock,
  ShoppingBag
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { formatEGP } from '../lib/utils';

const CITIES = [
  { ar: 'القاهرة', en: 'Cairo' },
  { ar: 'الجيزة', en: 'Giza' },
  { ar: 'الإسكندرية', en: 'Alexandria' },
  { ar: 'القليوبية', en: 'Qalyubia' },
  { ar: 'الشرقية', en: 'Sharqia' },
  { ar: 'الدقهلية', en: 'Dakahlia' },
  { ar: 'الغربية', en: 'Gharbia' },
  { ar: 'المنوفية', en: 'Monufia' },
  { ar: 'البحيرة', en: 'Beheira' },
  { ar: 'كفر الشيخ', en: 'Kafr El Sheikh' },
  { ar: 'دمياط', en: 'Damietta' },
  { ar: 'بورسعيد', en: 'Port Said' },
  { ar: 'الإسماعيلية', en: 'Ismailia' },
  { ar: 'السويس', en: 'Suez' },
  { ar: 'بني سويف', en: 'Beni Suef' },
  { ar: 'الفيوم', en: 'Fayoum' },
  { ar: 'المنيا', en: 'Minya' },
  { ar: 'أسيوط', en: 'Asyut' },
  { ar: 'سوهاج', en: 'Sohag' },
  { ar: 'قنا', en: 'Qena' },
  { ar: 'الأقصر', en: 'Luxor' },
  { ar: 'أسوان', en: 'Aswan' },
  { ar: 'البحر الأحمر', en: 'Red Sea' },
  { ar: 'مطروح', en: 'Matrouh' },
];

export default function Checkout() {
  const { user } = useAuth();
  const { cart, subtotal, clearCart } = useCart();
  const { lang, isRtl, t } = useLanguage();
  const { settings } = useSettings();
  const [shippingCity, setShippingCity] = useState(isRtl ? 'القاهرة' : 'Cairo');
  const [payment, setPayment] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    fullName: user?.full_name || user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: user?.address || '',
    notes: '',
  });

  const freeShippingThreshold = Number(settings?.free_shipping_threshold) || 2500;
  const isCairoOrGiza = shippingCity === 'القاهرة' || shippingCity === 'Cairo' || shippingCity === 'الجيزة' || shippingCity === 'Giza';
  const baseShippingCost = isCairoOrGiza ? (Number(settings?.shipping_cairo) || 55) : (Number(settings?.shipping_governorates) || 80);
  const shippingCost = subtotal >= freeShippingThreshold ? 0 : baseShippingCost;
  const total = subtotal + shippingCost;

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const phoneClean = form.phone.replace(/[\s-]/g, '');
    if (!/^01[0125][0-9]{8}$/.test(phoneClean)) {
      setError(
        isRtl
          ? 'يرجى إدخال رقم هاتف محمول مصري صحيح (مثال: 01012345678 مكون من 11 رقماً)'
          : 'Please enter a valid Egyptian mobile number (e.g. 01012345678, 11 digits)'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.createOrder({
        customer: {
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          address: form.address,
          city: shippingCity,
          paymentMethod: payment,
        },
        items: cart.map((i) => ({
          productId: i.product_id || i.id,
          product_name: i.product_name || i.name,
          quantity: i.quantity || 1,
          price: i.price || i.unit_price || 0,
          thumbnail: i.thumbnail || i.image,
        })),
        subtotal,
        shippingCost,
        total,
        notes: form.notes,
      });

      if (clearCart) clearCart();
      setSuccess(res.data || res);
    } catch (err) {
      setError(err.message || (isRtl ? 'تعذر إتمام الطلب، برجاء المحاولة مرة أخرى.' : 'Unable to complete order. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const orderRef = success.reference || success.id || `TH-${Math.floor(100000 + Math.random() * 900000)}`;
    return (
      <div className="page" style={{ padding: 'var(--space-12) 0' }}>
        <div className="container" style={{ maxWidth: '640px' }}>
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: 'var(--space-8)',
              border: '1px solid rgba(46, 213, 115, 0.3)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(46, 213, 115, 0.15)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)',
              }}
            >
              <CheckCircle2 size={42} />
            </div>

            <h1 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
              {isRtl ? 'تم استلام وتأكيد طلبك بنجاح!' : 'Order Confirmed Successfully!'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)' }}>
              {isRtl
                ? 'شكراً لثقتك في TechHaven. جاري فحص وتجهيز القطع بعناية قبل الشحن.'
                : 'Thank you for choosing TechHaven. Your hardware is being tested and packed for dispatch.'}
            </p>

            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
                textAlign: isRtl ? 'right' : 'left',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  {isRtl ? 'رقم الطلب المرجعي:' : 'Order Reference:'}
                </span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>{orderRef}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  {isRtl ? 'طريقة الدفع المختارة:' : 'Payment Method:'}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {payment === 'cod' && (isRtl ? 'الدفع عند الاستلام (كاش)' : 'Cash on Delivery')}
                  {payment === 'instapay' && (isRtl ? 'انستاباي / فودافون كاش' : 'InstaPay / E-Wallet')}
                  {payment === 'card' && (isRtl ? 'بطاقة بنكية إلكترونية' : 'Credit / Debit Card')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  {isRtl ? 'موعد التسليم المتوقع:' : 'Estimated Delivery:'}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                  {isRtl ? 'خلال 24 إلى 48 ساعة عمل' : 'Within 24 to 48 business hours'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <Link to="/orders" className="btn btn-primary btn-apple-tactile" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span>{isRtl ? 'متابعة حالة الطلب' : 'Track Order Status'}</span>
                {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Link>
              <Link to="/" className="btn btn-secondary btn-apple-tactile">
                {isRtl ? 'العودة للرئيسية' : 'Return to Home'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="page" style={{ padding: 'var(--space-16) 0' }}>
        <div className="container" style={{ maxWidth: '480px', textAlign: 'center' }}>
          <div
            className="card"
            style={{
              padding: 'var(--space-8)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <ShoppingBag size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
            <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-xl)' }}>
              {isRtl ? 'عربة التسوق فارغة' : 'Your Shopping Cart is Empty'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
              {isRtl
                ? 'يجب إضافة منتجات أولاً إلى السلة للتمكن من إتمام الطلب والدفع.'
                : 'Please add items to your cart before proceeding to checkout.'}
            </p>
            <Link to="/shop" className="btn btn-primary btn-apple-tactile">
              {isRtl ? 'تصفح أحدث عروض الهاردوير' : 'Browse Hardware Catalog'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: 'var(--space-8) 0 var(--space-16)' }}>
      <div className="container">
        {/* Step Indicator Header */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Lock size={16} style={{ color: 'var(--secondary)' }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--secondary)', fontWeight: 700 }}>
              {isRtl ? 'دفع مشفر وآمن 100% بنظام الحماية البنكية' : '100% Encrypted & Bank-Grade Secure Checkout'}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 'var(--text-3xl)', fontWeight: 900 }}>
            {isRtl ? 'إتمام وتأكيد الطلب' : 'Checkout & Confirm Order'}
          </h1>
        </div>

        <div className="checkout-layout">
          {/* Main Checkout Form */}
          <form className="checkout-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Step 1: Customer Info */}
            <section
              className="card"
              style={{
                padding: 'var(--space-6)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  1
                </span>
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                  {isRtl ? 'بيانات العميل وعنوان الشحن' : 'Customer Details & Shipping Address'}
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    {isRtl ? 'الاسم بالكامل *' : 'Full Name *'}
                  </label>
                  <input
                    required
                    className="input"
                    value={form.fullName}
                    onChange={update('fullName')}
                    placeholder={isRtl ? 'مثال: أحمد محمود إبراهيم' : 'e.g. John Doe'}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                      {isRtl ? 'رقم الهاتف للتواصل *' : 'Phone Number *'}
                    </label>
                    <input
                      required
                      className="input"
                      value={form.phone}
                      onChange={update('phone')}
                      placeholder="01XXXXXXXXX"
                      dir="ltr"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                      {isRtl ? 'البريد الإلكتروني (لتأكيد الفاتورة)' : 'Email Address (for invoice)'}
                    </label>
                    <input
                      type="email"
                      className="input"
                      value={form.email}
                      onChange={update('email')}
                      placeholder="name@domain.com"
                      dir="ltr"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    {isRtl ? 'المحافظة *' : 'Governorate / City *'}
                  </label>
                  <select
                    className="select"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {CITIES.map((c) => (
                      <option key={c.en} value={isRtl ? c.ar : c.en}>
                        {isRtl ? c.ar : c.en} ({isRtl ? 'توصيل خلال 24-48 ساعة' : 'Delivery in 24-48h'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    {isRtl ? 'العنوان بالتفصيل *' : 'Detailed Address *'}
                  </label>
                  <textarea
                    required
                    className="textarea"
                    value={form.address}
                    onChange={update('address')}
                    placeholder={
                      isRtl
                        ? 'اسم الشارع، رقم العمارة، الدور، رقم الشقة، علامة مميزة بجوارك...'
                        : 'Street name, building number, floor, apartment, nearby landmark...'
                    }
                    rows={3}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    {isRtl ? 'تعليمات إضافية للمندوب (اختياري)' : 'Delivery Notes (Optional)'}
                  </label>
                  <input
                    className="input"
                    value={form.notes}
                    onChange={update('notes')}
                    placeholder={isRtl ? 'مثال: يرجى الاتصال قبل الوصول بنصف ساعة' : 'e.g. Call before arrival'}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </section>

            {/* Step 2: Payment Method */}
            <section
              className="card"
              style={{
                padding: 'var(--space-6)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  2
                </span>
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                  {isRtl ? 'طريقة الدفع' : 'Payment Method'}
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {/* Option 1: COD */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    border: payment === 'cod' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: payment === 'cod' ? 'rgba(108, 99, 255, 0.08)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={payment === 'cod'}
                    onChange={(e) => setPayment(e.target.value)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(46, 213, 115, 0.15)',
                      color: 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Banknote size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {isRtl ? 'الدفع نقداً عند الاستلام (مع إمكانية فحص الشحنة)' : 'Cash on Delivery (Inspect upon delivery)'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {isRtl
                        ? 'ادفع للمندوب كاش بعد استلام طردك والتأكد من سلامة الصندوق'
                        : 'Pay cash to courier after inspecting package and tamper seal'}
                    </div>
                  </div>
                </label>

                {/* Option 2: InstaPay */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    border: payment === 'instapay' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: payment === 'instapay' ? 'rgba(108, 99, 255, 0.08)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="instapay"
                    checked={payment === 'instapay'}
                    onChange={(e) => setPayment(e.target.value)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(0, 212, 170, 0.15)',
                      color: 'var(--secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Smartphone size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {isRtl ? 'انستاباي / محافظ إلكترونية (فودافون كاش / أورانج / وي)' : 'InstaPay / Mobile Wallets (Vodafone / Orange / WE)'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {isRtl
                        ? `تحويل فوري إلى حساب انستاباي: (${settings?.instapay_address || 'techhaven@instapay'}) أو محفظة كاش (${settings?.vodafone_cash_phone || '01012345678'})`
                        : `Instant transfer to InstaPay: (${settings?.instapay_address || 'techhaven@instapay'}) or Wallet (${settings?.vodafone_cash_phone || '01012345678'})`}
                    </div>
                  </div>
                </label>

                {/* Option 3: Card */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    border: payment === 'card' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: payment === 'card' ? 'rgba(108, 99, 255, 0.08)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={payment === 'card'}
                    onChange={(e) => setPayment(e.target.value)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(108, 99, 255, 0.15)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CreditCard size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {isRtl ? 'بطاقات بنكية / ميزة / تقسيط (بوابة Paymob المعتمدة)' : 'Credit / Debit Cards / Meeza / Installments'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {isRtl
                        ? 'Visa, MasterCard, Meeza مع دعم برامج التقسيط البنكي'
                        : 'Visa, MasterCard, Meeza with 0% bank installment plans'}
                    </div>
                  </div>
                </label>
              </div>
            </section>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'rgba(255, 71, 87, 0.1)',
                  border: '1px solid rgba(255, 71, 87, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--danger)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-apple-tactile"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-4)',
                fontSize: 'var(--text-lg)',
                fontWeight: 800,
                borderRadius: 'var(--radius-xl)',
              }}
            >
              <PackageCheck size={22} />
              <span>
                {loading
                  ? (isRtl ? 'جاري تسجيل الطلب...' : 'Processing order...')
                  : `${isRtl ? 'تأكيد الطلب نهائياً' : 'Confirm & Place Order'} — ${(total || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} ${t('currency')}`}
              </span>
            </button>
          </form>

          {/* Sidebar Order Summary (Amazon / Micro Center style) */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              className="card"
              style={{
                padding: 'var(--space-5)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border)',
              }}
            >
              <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                {isRtl ? `ملخص السلة (${cart.length} قطع)` : `Order Summary (${cart.length} items)`}
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  marginBottom: 'var(--space-4)',
                  paddingInlineEnd: 'var(--space-1)',
                }}
              >
                {cart.map((item) => (
                  <div
                    key={item.product_id || item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      paddingBottom: 'var(--space-3)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <img
                      src={item.thumbnail || item.image || 'https://placehold.co/80x80/1a1a25/6c63ff?text=HW'}
                      alt={item.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        objectFit: 'contain',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-primary)',
                        padding: '2px',
                        border: '1px solid var(--border)',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isRtl ? (item.name || item.product_name) : (item.name_en || item.name || item.product_name)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {isRtl ? `الكمية: ${item.quantity || 1}` : `Qty: ${item.quantity || 1}`}
                      </div>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {(((item.price || item.unit_price || 0) * (item.quantity || 1)) || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <span>{t('cart_subtotal')}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {(subtotal || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <span>{isRtl ? 'مصاريف الشحن والتوصيل' : 'Shipping & Handling'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: shippingCost === 0 ? 'var(--secondary)' : 'inherit' }}>
                    {shippingCost === 0 ? (isRtl ? 'مجاناً' : 'FREE') : `${shippingCost.toLocaleString(isRtl ? 'ar-EG' : 'en-US')} ${t('currency')}`}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 800,
                    borderTop: '1px solid var(--border)',
                    paddingTop: 'var(--space-3)',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  <span>{isRtl ? 'الإجمالي الكلي' : 'Grand Total'}</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    {(total || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                  </span>
                </div>
              </div>
            </div>

            {/* Trust Badges Card */}
            <div
              className="card"
              style={{
                padding: 'var(--space-4)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
                <span>{isRtl ? 'ضمان محلي أصلي معتمد من الوكيل الرسمي' : 'Official certified local distributor warranty'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                <Truck size={16} style={{ color: 'var(--secondary)' }} />
                <span>{isRtl ? 'شحن وتوصيل مؤمّن ضد أضرار النقل في كافة المحافظات' : 'Insured door-to-door delivery across all regions'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                <Clock size={16} style={{ color: 'var(--accent)' }} />
                <span>{isRtl ? 'استرجاع أو استبدال فوري خلال 14 يوماً وفقاً للقانون' : '14-day hassle-free replacement guarantee'}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

