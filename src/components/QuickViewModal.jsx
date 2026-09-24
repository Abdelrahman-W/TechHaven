import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  ShoppingCart,
  Check,
  Star,
  ShieldCheck,
  Truck,
  Plus,
  Minus,
  ExternalLink,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { formatEGP } from '../lib/utils';

export default function QuickViewModal({ product, isOpen, onClose }) {
  const { t, isRtl } = useLanguage();
  const { addItem, addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [activeImg, setActiveImg] = useState('');
  const modalRef = useRef(null);
  const prevFocusRef = useRef(null);

  useEffect(() => {
    if (product) {
      const first =
        product.thumbnail ||
        (product.images && product.images[0]) ||
        product.image ||
        'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80';
      setActiveImg(first);
      setQty(1);
      setIsAdded(false);
    }
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    if (isOpen) {
      prevFocusRef.current = document.activeElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        const firstFocus = modalRef.current?.querySelector('button, [href], input');
        firstFocus?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
      if (prevFocusRef.current && typeof prevFocusRef.current.focus === 'function') {
        prevFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const price = product.price || 0;
  const oldPrice = product.old_price || product.oldPrice || 0;
  const discountPercent =
    oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  const stockQty = product.stock_qty ?? product.stock ?? 10;
  const isOutOfStock = stockQty <= 0;

  const imagesList =
    product.images && product.images.length > 0
      ? product.images
      : [activeImg];

  const handleAdd = () => {
    const addFn = addItem || addToCart;
    if (addFn) {
      addFn(product, qty, false);
      setIsAdded(true);
      toast.success(isRtl ? `تمت إضافة "${product.name}" إلى السلة 🛒` : `Added "${product.name_en || product.name}" to cart 🛒`);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        style={{
          background: '#14161F',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 18,
          maxWidth: 820,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          position: 'relative',
          animation: 'appleSheetEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            insetInlineEnd: 16,
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#FFFFFF',
            width: 36,
            height: 36,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#FF5E14')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            padding: 'clamp(16px, 3vw, 28px)',
          }}
          className="th-quickview-grid"
        >
          {/* Left: Gallery Showcase */}
          <div style={{ flex: '1 1 280px', minWidth: 'min(100%, 280px)' }}>
            <div
              style={{
                width: '100%',
                height: 320,
                background: '#0D0E14',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                position: 'relative',
                marginBottom: 12,
              }}
            >
              {discountPercent > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    insetInlineEnd: 12,
                    background: '#EF4444',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: 4,
                  }}
                >
                  {isRtl ? `خصم ${discountPercent}%` : `${discountPercent}% Off`}
                </span>
              )}
              <img
                src={activeImg}
                alt={product.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
                }}
              />
            </div>

            {/* Thumbnail Pickers if multiple images */}
            {imagesList.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {imagesList.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(img)}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 8,
                      background: '#0D0E14',
                      border: activeImg === img ? '2px solid #FF5E14' : '1px solid rgba(255,255,255,0.08)',
                      padding: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img src={img} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info & Purchase Controls */}
          <div style={{ flex: '1 1 280px', minWidth: 'min(100%, 280px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  background: 'rgba(255, 94, 20, 0.12)',
                  color: 'var(--brand-orange)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}
              >
                {product.brand || (isRtl ? 'عالمي' : 'Global')}
              </span>

              <span
                style={{
                  fontSize: '0.75rem',
                  color: isOutOfStock ? '#EF4444' : '#10B981',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isOutOfStock ? '#EF4444' : '#10B981',
                  }}
                />
                {isOutOfStock ? t('quickview_out_stock') : t('quickview_in_stock')}
              </span>
            </div>

            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.35,
                margin: '0 0 12px',
              }}
            >
              {product.name}
            </h2>

            {/* Stars & Reviews */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="#FF5E14" stroke="#FF5E14" />
                ))}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                ({product.rating || 4.9}) • {product.review_count || 34} {isRtl ? 'تقييم' : 'reviews'}
              </span>
            </div>

            {/* Price Box */}
            <div
              style={{
                background: '#0D0E14',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                  {formatEGP(price)}
                </span>
                {oldPrice > price && (
                  <span style={{ textDecoration: 'line-through', color: '#6B7280', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                    {formatEGP(oldPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Description Snippet */}
            {product.description && (
              <p style={{ fontSize: '0.82rem', color: '#9CA3AF', lineHeight: 1.6, margin: '0 0 16px' }}>
                {product.description}
              </p>
            )}

            {/* Micro Specs */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {Object.entries(product.specs).slice(0, 4).map(([k, v]) => (
                  <span
                    key={k}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 4,
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      color: '#D1D5DB',
                    }}
                  >
                    <strong>{k}:</strong> {v}
                  </span>
                ))}
              </div>
            )}

            {/* Quantity Stepper & Add to Cart */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', marginBottom: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#0D0E14',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                }}
              >
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <Minus size={14} />
                </button>
                <span style={{ fontWeight: 800, color: '#fff', padding: '0 8px' }}>{qty}</span>
                <button
                  onClick={() => setQty(qty + 1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                onClick={handleAdd}
                disabled={isOutOfStock}
                style={{
                  flex: 1,
                  background: isOutOfStock ? '#374151' : 'var(--brand-orange)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 16px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 14px rgba(255, 94, 20, 0.35)',
                }}
              >
                {isAdded ? (
                  <>
                    <Check size={18} />
                    <span>{t('quickview_added_btn')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    <span>{t('quickview_add_btn')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Link to Full Details */}
            <Link
              to={`/product/${product.id}`}
              onClick={onClose}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: '0.82rem',
                color: 'var(--brand-orange)',
                textDecoration: 'none',
                fontWeight: 700,
                padding: '8px 0',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span>{t('quickview_view_full')}</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
