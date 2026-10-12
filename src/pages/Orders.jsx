import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldAlert, Package, PackageOpen } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Orders() {
  const { user, loading: authLoading } = useAuth();
  const { isRtl, t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);

  // Guest tracking states
  const [guestOrderRef, setGuestOrderRef] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestOrder, setGuestOrder] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState('');

  useEffect(() => {
    if (user) {
      setLoading(true);
      api.getOrders()
        .then((res) => {
          const data = res.data || res.orders || (Array.isArray(res) ? res : []);
          setOrders(Array.isArray(data) ? data : []);
        })
        .catch(() => setOrders([]))
        .finally(() => setLoading(false));
    } else {
      setOrders([]);
    }
  }, [user]);

  const handleGuestTrack = async (e) => {
    e?.preventDefault();
    if (!guestOrderRef.trim()) return;
    setGuestLoading(true);
    setGuestError('');
    setGuestOrder(null);
    try {
      const res = await api.getOrder(guestOrderRef.trim(), { phone: guestPhone.trim() });
      if (res.data) {
        setGuestOrder(res.data);
      } else {
        setGuestError(isRtl ? 'تعذر العثور على الطلب أو أن بيانات التحقق غير صحيحة.' : 'Could not find order or authorization failed.');
      }
    } catch (err) {
      setGuestError(
        err.message ||
        (isRtl ? 'غير مصرح بالاطلاع على هذا الطلب أو بيانات التحقق غير صحيحة.' : 'Unauthorized to view this order or invalid verification.')
      );
    } finally {
      setGuestLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'delivered':
        return { bg: 'rgba(0, 184, 148, 0.15)', text: '#00B894', border: '#00B894' };
      case 'shipped':
        return { bg: 'rgba(116, 185, 255, 0.15)', text: '#74B9FF', border: '#74B9FF' };
      case 'confirmed':
        return { bg: 'rgba(108, 92, 231, 0.15)', text: '#6C5CE7', border: '#6C5CE7' };
      default:
        return { bg: 'rgba(253, 203, 110, 0.15)', text: '#FDCB6E', border: '#FDCB6E' };
    }
  };

  // Render Guest Tracking View if user is not authenticated
  if (!user) {
    const badge = guestOrder ? getStatusBadgeColor(guestOrder.status) : null;

    return (
      <div style={{ background: 'var(--bg-body)', minHeight: '100vh', padding: '30px 0 80px' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Package size={26} style={{ color: 'var(--brand-orange)' }} />
              <span>{isRtl ? 'تتبع شحنة وطلب الزائر' : 'Guest Order Tracking'}</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {isRtl
                ? 'أدخل الرقم المرجعي للطلب ورقم الهاتف لمتابعة خط سير شحنتك وحالة التجهيز بأمان.'
                : 'Enter your order reference and phone number to securely track your shipment.'}
            </p>
          </div>

          {/* Secure Search Card */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <form onSubmit={handleGuestTrack} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                  {isRtl ? 'الرقم المرجعي للطلب (Reference / ID):' : 'Order Reference / ID:'}
                </label>
                <input
                  type="text"
                  placeholder="TH-2026-XXXXXX"
                  value={guestOrderRef}
                  onChange={(e) => setGuestOrderRef(e.target.value)}
                  className="input input-bordered w-full"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: '#fff' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                  {isRtl ? 'رقم الهاتف المسجل (للتحقق الآمن):' : 'Phone Number (for verification):'}
                </label>
                <input
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="input input-bordered w-full"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: '#fff' }}
                />
              </div>

              <button
                type="submit"
                disabled={guestLoading || !guestOrderRef.trim()}
                className="btn btn-primary btn-apple-tactile"
                style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {guestLoading ? <div className="spinner-sm" /> : <Search size={18} />}
                <span>{isRtl ? 'تتبع الطلب الآن' : 'Track Order Now'}</span>
              </button>
            </form>

            {guestError && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: 'var(--radius-md)', color: '#EF4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={18} />
                <span>{guestError}</span>
              </div>
            )}
          </div>

          {/* Guest Order Result */}
          {guestOrder && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
                marginBottom: '24px',
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '14px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                      {isRtl ? 'تاريخ الطلب:' : 'Order Date:'}
                    </span>
                    <strong style={{ color: '#fff' }}>
                      {new Date(guestOrder.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                      {isRtl ? 'الإجمالي الكلي:' : 'Total Amount:'}
                    </span>
                    <strong style={{ color: 'var(--secondary)' }}>
                      {(guestOrder.total || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                      {isRtl ? 'مدينة التوصيل:' : 'Destination City:'}
                    </span>
                    <strong style={{ color: '#fff' }}>
                      {guestOrder.customer_city || (isRtl ? 'مصر' : 'Egypt')}
                    </strong>
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {isRtl ? 'الرقم المرجعي:' : 'Reference:'}{' '}
                  </span>
                  <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    #{guestOrder.reference || guestOrder.id}
                  </strong>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span
                    style={{
                      background: badge?.bg,
                      color: badge?.text,
                      border: `1px solid ${badge?.border}`,
                      padding: '4px 12px',
                      borderRadius: '99px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                    }}
                  >
                    ● {isRtl ? (guestOrder.status_label_ar || guestOrder.status) : (guestOrder.status_label_en || guestOrder.status)}
                  </span>
                  <small style={{ color: 'var(--text-muted)' }}>
                    {isRtl ? 'المستلم:' : 'Recipient:'}{' '}
                    <strong style={{ color: '#fff' }}>{guestOrder.customer_name}</strong>
                  </small>
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(guestOrder.items || []).map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        paddingBottom: idx !== guestOrder.items.length - 1 ? '14px' : 0,
                        borderBottom: idx !== guestOrder.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img
                          src={item.thumbnail || 'https://via.placeholder.com/80'}
                          alt={item.name || item.product_name}
                          style={{ width: 56, height: 56, objectFit: 'contain', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 4 }}
                        />
                        <div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                            {isRtl ? (item.name || item.product_name) : (item.name_en || item.name || item.product_name)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            {isRtl ? 'الكمية:' : 'Qty:'} {item.quantity || 1} • {isRtl ? 'السعر:' : 'Price:'} {(item.unit_price || item.price || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Account Login Prompt */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
              {isRtl ? 'هل قمت بإنشاء حساب مسجل لدينا؟' : 'Have a registered account with us?'}
            </p>
            <Link to="/login" className="btn btn-secondary btn-apple-tactile">
              {isRtl ? 'تسجيل الدخول لعرض كافة طلباتك السابقة' : 'Sign in to view all your past orders'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrders =
    filterStatus === 'all'
      ? orders
      : orders.filter((o) => o.status === filterStatus);

  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100vh', padding: '30px 0 80px' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={26} style={{ color: 'var(--brand-orange)' }} />
            <span>{isRtl ? 'مشترياتي وطلباتي' : 'My Orders & Purchases'}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isRtl
              ? 'تتبع خط سير شحناتك، راجع فواتيرك، وقم بإعادة شراء القطع السابقة بضغطة واحدة.'
              : 'Track your shipments, review receipts, and re-order previous hardware with one click.'}
          </p>
        </div>

        {/* Filter Tabs (Amazon style) */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '14px',
            marginBottom: '24px',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'all', label: isRtl ? 'جميع الطلبات' : 'All Orders' },
            { id: 'shipped', label: isRtl ? 'في الطريق إليك' : 'Out for Delivery' },
            { id: 'delivered', label: isRtl ? 'تم الاستلام' : 'Delivered' },
            { id: 'pending', label: isRtl ? 'قيد التجهيز' : 'Processing' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`btn btn-sm btn-apple-tactile ${filterStatus === tab.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterStatus(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-xl)' }} />
            <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-xl)' }} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-sm)', background: 'rgba(255, 94, 20, 0.1)', color: 'var(--brand-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <PackageOpen size={32} />
            </div>
            <h3 style={{ color: '#fff', marginBottom: '8px' }}>
              {isRtl ? 'لا توجد طلبات في هذا القسم' : 'No orders found in this category'}
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              {isRtl ? 'تصفح أحدث قطع الهاردوير وأضف ما يعجبك إلى السلة!' : 'Browse our catalog and add components to your cart!'}
            </p>
            <Link to="/shop" className="btn btn-primary btn-apple-tactile">
              {isRtl ? 'تصفح المتجر الآن' : 'Browse Catalog Now'}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredOrders.map((order) => {
              const badge = getStatusBadgeColor(order.status);
              return (
                <div
                  key={order.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-xl)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  {/* Order Card Header (Amazon style) */}
                  <div
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '14px 24px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                          {isRtl ? 'تاريخ الطلب:' : 'Order Date:'}
                        </span>
                        <strong style={{ color: '#fff' }}>
                          {new Date(order.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                          {isRtl ? 'الإجمالي الكلي:' : 'Total Amount:'}
                        </span>
                        <strong style={{ color: 'var(--secondary)' }}>
                          {(order.total || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                          {isRtl ? 'التوصيل إلى:' : 'Ship to:'}
                        </span>
                        <strong style={{ color: '#fff' }}>
                          {user.name || user.full_name || (isRtl ? 'مصر' : 'Egypt')}
                        </strong>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {isRtl ? 'رقم الطلب:' : 'Order Ref:'}{' '}
                      </span>
                      <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        #{order.id}
                      </strong>
                    </div>
                  </div>

                  {/* Order Body Details */}
                  <div style={{ padding: '24px' }}>
                    {/* Status Ribbon */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          padding: '4px 12px',
                          borderRadius: '99px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                        }}
                      >
                        ● {isRtl ? (order.status_label_ar || order.status_label || order.status) : (order.status_label_en || order.status)}
                      </span>
                      {order.estimated_delivery && (
                        <small style={{ color: 'var(--text-muted)' }}>
                          {isRtl ? 'موعد الوصول المتوقع:' : 'Estimated Delivery:'}{' '}
                          <strong style={{ color: '#fff' }}>
                            {isRtl ? order.estimated_delivery : 'Within 24-48 hours'}
                          </strong>
                        </small>
                      )}
                    </div>

                    {/* Items List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {(order.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            paddingBottom: idx !== order.items.length - 1 ? '14px' : 0,
                            borderBottom: idx !== order.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <img
                              src={item.thumbnail || 'https://via.placeholder.com/80'}
                              alt={item.name}
                              style={{ width: 64, height: 64, objectFit: 'contain', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 4 }}
                            />
                            <div>
                              <Link
                                to={`/product/${item.id || item.productId || ''}`}
                                style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}
                              >
                                {isRtl ? (item.name || item.product_name) : (item.name_en || item.name || item.product_name)}
                              </Link>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                {isRtl ? 'الكمية:' : 'Qty:'} {item.quantity || 1} • {isRtl ? 'السعر للقطعة:' : 'Unit Price:'} {(item.price || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Link to={`/product/${item.id || item.productId || ''}`} className="btn btn-sm btn-ghost btn-apple-tactile">
                              {isRtl ? 'عرض المنتج' : 'View Item'}
                            </Link>
                            <Link to="/shop" className="btn btn-sm btn-secondary btn-apple-tactile">
                              {isRtl ? 'شراء مرة أخرى ↺' : 'Buy Again ↺'}
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
