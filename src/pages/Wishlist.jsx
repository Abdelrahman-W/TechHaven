import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Trash2,
  Share2,
  ArrowRight,
  Check
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';

export default function Wishlist() {
  const { addToCart } = useCart();
  const { isRtl, t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [addedIds, setAddedIds] = useState({});

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('eh_token');
    if (!token) {
      // Guest behavior stays exactly as before: localStorage fallback only.
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem('egy_wishlist') || 'null');
      } catch {
        saved = null;
      }
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setItems(saved);
      } else {
        setItems([]);
      }
      setLoading(false);
      return;
    }
    // Authenticated: server is the source of truth. No localStorage preference.
    api.getWishlist()
      .then((res) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        setItems(items);
      })
      .catch((err) => {
        console.warn('Failed to load server wishlist, falling back to empty:', err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = (id) => {
    const token = localStorage.getItem('eh_token');
    if (!token) {
      // Guest behavior unchanged: local removal only.
      const next = items.filter((item) => item.id !== id);
      setItems(next);
      try {
        localStorage.setItem('egy_wishlist', JSON.stringify(next));
      } catch { /* non-fatal */ }
      return;
    }
    // Authenticated: remove via API (optimistic, rollback on failure).
    const prev = items;
    const next = items.filter((item) => (item.product_id || item.id) !== id);
    setItems(next);
    api.removeFromWishlist(id)
      .then((res) => {
        const serverItems = Array.isArray(res?.data) ? res.data : null;
        if (serverItems) setItems(serverItems);
        try {
          localStorage.setItem('egy_wishlist', JSON.stringify(serverItems || next));
        } catch { /* non-fatal */ }
      })
      .catch(() => {
        setItems(prev);
        window.alert(isRtl ? 'تعذر الحذف من المفضلة' : 'Could not remove from wishlist');
      });
  };

  const handleAddToCart = (item) => {
    addToCart(item);
    setAddedIds((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [item.id]: false }));
    }, 1500);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="page" style={{ padding: 'var(--space-8) 0 var(--space-16)' }}>
      <div className="container">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-8)',
            borderBottom: '1px solid var(--border)',
            paddingBottom: 'var(--space-6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(255, 71, 87, 0.12)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={24} fill="currentColor" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
                {isRtl ? 'قائمة رغباتي ومفضلتي' : 'My Wishlist & Saved Items'}
              </h1>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {items.length} {isRtl ? (items.length === 1 ? 'منتج محفوظ' : 'منتجات محفوظة') : 'items saved for later'}
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-apple-tactile"
                onClick={handleShare}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Share2 size={14} />}
                <span>{copied ? (isRtl ? 'تم نسخ الرابط!' : 'Link Copied!') : (isRtl ? 'مشاركة القائمة' : 'Share Wishlist')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid-auto" style={{ gap: 'var(--space-4)' }}>
            {[1, 2, 3].map((n) => (
              <div key={n} className="card skeleton" style={{ height: '260px', borderRadius: 'var(--radius-xl)' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: 'var(--space-16) var(--space-4)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px dashed var(--border)',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)',
                color: 'var(--text-muted)',
              }}
            >
              <Heart size={32} />
            </div>
            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-xl)' }}>
              {isRtl ? 'قائمة رغباتك فارغة' : 'Your Wishlist is Empty'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
              {isRtl
                ? 'اضغط على رمز القلب عند تصفح أي منتج لحفظه هنا ومتابعة تغيرات سعره ومخزونه.'
                : 'Click the heart icon on any product to save it here for later.'}
            </p>
            <Link to="/shop" className="btn btn-primary btn-apple-tactile" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>{isRtl ? 'استكشف عروض الهاردوير الآن' : 'Explore Hardware Catalog'}</span>
              <ArrowRight size={16} style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} />
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            {items.map((item) => {
              const isAdded = addedIds[item.id];
              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: 'var(--space-4)',
                    transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div>
                    {/* Image */}
                    <div
                      style={{
                        position: 'relative',
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-4)',
                        textAlign: 'center',
                        marginBottom: 'var(--space-4)',
                        height: '180px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={item.thumbnail || item.images?.[0] || 'https://placehold.co/240x180/1a1a25/6c63ff?text=HW'}
                        alt={item.name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          [isRtl ? 'left' : 'right']: '10px',
                          background: 'rgba(10, 10, 15, 0.75)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-full)',
                          padding: '6px',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backdropFilter: 'blur(4px)',
                        }}
                        title={isRtl ? 'إزالة من المفضلة' : 'Remove from Wishlist'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Meta */}
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--primary)', fontWeight: 700, marginBottom: '4px' }}>
                      {item.brand || (isRtl ? 'عتاد احترافي' : 'Hardware')}
                    </div>
                    <Link
                      to={`/product/${item.id}`}
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                        marginBottom: 'var(--space-3)',
                      }}
                    >
                      {isRtl ? item.name : (item.name_en || item.name)}
                    </Link>

                    {/* Price */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: 'var(--space-4)' }}>
                      <span style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {(item.price || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                      </span>
                      {item.old_price && item.old_price > item.price && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textDecoration: 'line-through', fontFamily: 'var(--font-mono)' }}>
                          {(item.old_price || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm btn-apple-tactile"
                      onClick={() => handleAddToCart(item)}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: isAdded ? 'var(--success)' : 'var(--primary)',
                      }}
                    >
                      {isAdded ? <Check size={16} /> : <ShoppingBag size={16} />}
                      <span>{isAdded ? (isRtl ? 'تمت الإضافة!' : 'Added!') : (isRtl ? 'إضافة إلى السلة' : 'Add to Cart')}</span>
                    </button>
                    <Link
                      to={`/product/${item.id}`}
                      className="btn btn-secondary btn-sm btn-apple-tactile"
                      style={{ padding: '6px 12px' }}
                    >
                      {isRtl ? 'التفاصيل' : 'Details'}
                    </Link>
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
