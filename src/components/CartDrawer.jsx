import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  X,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Truck,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { formatEGP } from '../lib/utils';

export default function CartDrawer() {
  const { cart, open, setOpen, subtotal, updateQuantity, removeItem, addItem } = useCart();
  const { lang, isRtl, t } = useLanguage();
  const { settings } = useSettings();

  if (!open) return null;

  const items = cart || [];
  const freeShippingThreshold = Number(settings?.free_shipping_threshold) || 2500;
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 15, 0.75)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        justifyContent: isRtl ? 'flex-start' : 'flex-end',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          height: '100vh',
          background: '#14161F',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
          animation: 'appleDrawerInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#10121A',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(255, 94, 20, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-orange)',
              }}
            >
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{t('cart_title')}</h3>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                {items.length} {items.length === 1 ? t('cart_unique_item') : t('cart_items')}
              </span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '8px', color: '#9CA3AF' }}
            aria-label={isRtl ? 'إغلاق السلة' : 'Close Cart'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div
          style={{
            padding: '12px 24px',
            background: 'rgba(255, 94, 20, 0.06)',
            borderBottom: '1px solid rgba(255, 94, 20, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Truck size={15} style={{ color: 'var(--brand-orange)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>
              {remainingForFreeShipping === 0 ? (
                <span style={{ color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} /> {t('cart_free_shipping_achieved')}
                </span>
              ) : (
                <span>
                  {t('cart_free_shipping_remaining')} <strong style={{ color: 'var(--brand-orange)' }}>{remainingForFreeShipping.toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}</strong> {t('cart_free_shipping_remaining_suffix')}
                </span>
              )}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '5px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${freeShippingProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--brand-orange), #FFA502)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-6)' }}>
          {items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-16) var(--space-4)',
                color: 'var(--text-secondary)',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-card)',
                  border: '1px dashed var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-4)',
                  color: 'var(--text-muted)',
                }}
              >
                <ShoppingBag size={36} />
              </div>
              <h4 style={{ margin: '0 0 var(--space-2)', color: 'var(--text-primary)', fontSize: 'var(--text-lg)' }}>
                {t('cart_empty')}
              </h4>
              <p style={{ margin: '0 0 var(--space-6)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                {t('cart_empty_sub')}
              </p>
              <Link
                to="/shop"
                className="btn btn-primary"
                onClick={() => setOpen(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <span>{t('cart_start_shopping')}</span>
                <ArrowLeft size={16} />
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {items.map((item) => {
                const itemId = item.product_id || item.id || item.product?.id;
                const unitPrice = item.price || item.unit_price || item.product?.price || 0;
                const itemTotal = unitPrice * (item.quantity || 1);
                const itemImage =
                  item.thumbnail ||
                  item.image ||
                  (Array.isArray(item.images) && item.images[0]) ||
                  item.product?.thumbnail ||
                  item.product?.image ||
                  (Array.isArray(item.product?.images) && item.product.images[0]) ||
                  '/images/prod-headphones.jpg';
                const itemName = item.name || item.product?.name || item.product_name || 'منتج عتاد';

                return (
                  <div
                    key={item.id || itemId}
                    style={{
                      display: 'flex',
                      gap: 'var(--space-3)',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-3)',
                      border: '1px solid var(--border)',
                      transition: 'border-color var(--transition-fast)',
                    }}
                  >
                    <img
                      src={itemImage}
                      alt={itemName}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=300&auto=format&fit=crop&q=80';
                      }}
                      style={{
                        width: '74px',
                        height: '74px',
                        objectFit: 'contain',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-primary)',
                        padding: '4px',
                        border: '1px solid var(--border)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <Link
                          to={`/product/${itemId}`}
                          onClick={() => setOpen(false)}
                          style={{
                            margin: '0 0 var(--space-1)',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.4,
                          }}
                        >
                          {itemName}
                        </Link>
                        <div style={{ color: 'var(--brand-orange)', fontWeight: 800, fontSize: 'var(--text-sm)' }}>
                          {formatEGP(itemTotal)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 'var(--space-2)',
                        }}
                      >
                        {/* Quantity controls */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: '#0D0E13',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            overflow: 'hidden',
                          }}
                        >
                          <button
                            type="button"
                            className="btn-apple-tactile"
                            onClick={() => updateQuantity(itemId, (item.quantity || 1) - 1)}
                            disabled={(item.quantity || 1) <= 1}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: (item.quantity || 1) <= 1 ? '#6B7280' : '#FFFFFF',
                              cursor: (item.quantity || 1) <= 1 ? 'not-allowed' : 'pointer',
                              padding: '5px 9px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="إنقاص"
                          >
                            <Minus size={13} />
                          </button>
                          <span
                            style={{
                              minWidth: '24px',
                              textAlign: 'center',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              color: '#FFFFFF',
                            }}
                          >
                            {item.quantity || 1}
                          </span>
                          <button
                            type="button"
                            className="btn-apple-tactile"
                            onClick={() => updateQuantity(itemId, (item.quantity || 1) + 1)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#FFFFFF',
                              cursor: 'pointer',
                              padding: '5px 9px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="زيادة"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {/* Remove item */}
                        <button
                          type="button"
                          className="btn-apple-tactile"
                          onClick={() => {
                            removeItem(itemId);
                            toast.success(`تم حذف "${itemName}" من السلة`, {
                              action: {
                                label: 'تراجع ↩',
                                onClick: () => addItem(item, item.quantity || 1),
                              },
                              duration: 4000,
                            });
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: 'var(--radius-sm)',
                            transition: 'color var(--transition-fast)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
                          title={isRtl ? "إزالة من السلة" : "Remove from cart"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Checkout Summary */}
        {items.length > 0 && (
          <div
            style={{
              padding: '18px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#10121A',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '10px',
              }}
            >
              <span style={{ fontSize: '0.88rem', color: '#9CA3AF' }}>{t('cart_subtotal')}:</span>
              <span
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {(subtotal || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.75rem',
                color: '#9CA3AF',
                marginBottom: '16px',
              }}
            >
              <ShieldCheck size={15} style={{ color: '#10B981' }} />
              <span>{isRtl ? 'ضمان محلي معتمد مع إمكانية الدفع عند الاستلام' : 'Official certified warranty with Cash on Delivery option'}</span>
            </div>

            <Link
              to="/checkout"
              className="btn btn-primary btn-apple-tactile"
              onClick={() => setOpen(false)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '13px',
                fontSize: '0.95rem',
                fontWeight: 800,
                borderRadius: '10px',
              }}
            >
              <span>{t('cart_checkout')}</span>
              {isRtl ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
            </Link>

            <button
              type="button"
              className="btn btn-ghost btn-apple-tactile"
              onClick={() => setOpen(false)}
              style={{
                width: '100%',
                marginTop: '8px',
                fontSize: '0.82rem',
                color: '#9CA3AF',
              }}
            >
              {isRtl ? 'مواصلة التسوق' : 'Continue Shopping'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

