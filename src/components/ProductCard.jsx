import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Heart, Eye, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import { toast } from 'sonner';
import QuickViewModal from './QuickViewModal';

export default function ProductCard({ product }) {
  const { addItem, addToCart } = useCart();
  const { isRtl, t } = useLanguage();
  const { isWishlisted: isProductWishlisted, addToWishlist, removeFromWishlist } = useWishlist();
  const [isAdded, setIsAdded] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  // Hooks must run before the early return below so the hook order is
  // identical on every render (including null/undefined product renders).
  // Their initializers are constant values and do not depend on `product`.
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [swipeClass, setSwipeClass] = useState('');
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  if (!product) return null;

  const isWishlisted = isProductWishlisted(product.id);

  const rawImages = (product.images && product.images.length > 0)
    ? product.images
    : (product.thumbnail ? [product.thumbnail] : (product.image ? [product.image] : []));

  const images = rawImages.filter(Boolean).length > 0
    ? rawImages.filter(Boolean)
    : ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80'];

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (images.length <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartXRef.current;
    const diffY = touchEndY - touchStartYRef.current;

    // Detect horizontal swipe
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        handlePrevImage();
      } else {
        handleNextImage();
      }
    }
  };

  const handleNextImage = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSwipeClass('th-img-swipe-left');
    setActiveImgIndex((prev) => (prev + 1) % images.length);
    setTimeout(() => setSwipeClass(''), 320);
  };

  const handlePrevImage = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSwipeClass('th-img-swipe-right');
    setActiveImgIndex((prev) => (prev - 1 + images.length) % images.length);
    setTimeout(() => setSwipeClass(''), 320);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const addFn = addItem || addToCart;
    if (addFn) {
      addFn(product, 1, false);
      setIsAdded(true);
      toast.success(isRtl ? `تمت إضافة "${product.name}" إلى السلة 🛒` : `Added "${product.name_en || product.name}" to cart 🛒`);
      setTimeout(() => setIsAdded(false), 1800);
    }
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Prevent duplicate requests on rapid clicks
    if (wishlistBusy) return;
    const token = localStorage.getItem('eh_token');
    if (!token) {
      toast.info(isRtl ? 'سجّل الدخول لإضافة المنتجات للمفضلة' : 'Please log in to add products to your wishlist');
      return;
    }
    const next = !isWishlisted;
    setWishlistBusy(true);
    try {
      if (next) {
        await addToWishlist(product);
      } else {
        await removeFromWishlist(product.id);
      }
    } catch (err) {
      toast.error(isRtl ? 'تعذر تحديث المفضلة، حاول مرة أخرى' : 'Could not update wishlist. Please try again.');
    } finally {
      setWishlistBusy(false);
    }
  };

  const price = product.price || 0;
  const oldPrice = product.old_price || product.oldPrice || 0;
  const discountPercent =
    oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  const rating = Number(product.rating) || 0;

  const currentImgSrc = images[activeImgIndex] || images[0];

  return (
    <>
      <div className="th-product-card">
        {/* ── Badges ────────────────────────────────────────── */}
        <div style={{ position: 'absolute', top: 10, [isRtl ? 'left' : 'right']: 10, zIndex: 8, display: 'flex', gap: 6 }}>
          {discountPercent > 0 && (
            <span className="th-card-badge sale">{isRtl ? `خصم ${discountPercent}%` : `${discountPercent}% ${t('off')}`}</span>
          )}
          {product.badge ? (
            <span className="th-card-badge new th-badge-pulsing">{product.badge}</span>
          ) : product.is_featured ? (
            <span className="th-card-badge new">NEW</span>
          ) : null}
        </div>

        {/* ── Quick Wishlist Heart Icon ─────────── */}
        <button
          onClick={handleWishlist}
          aria-pressed={isWishlisted}
          style={{
            position: 'absolute',
            top: 10,
            [isRtl ? 'right' : 'left']: 10,
            zIndex: 8,
            background: 'rgba(10, 11, 14, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isWishlisted ? '#EF4444' : '#9CA3AF',
            transition: 'all 0.15s ease',
          }}
          title={isWishlisted ? (isRtl ? 'إزالة من المفضلة' : 'Remove from Wishlist') : (isRtl ? 'إضافة للمفضلة' : 'Add to Wishlist')}
          aria-label={isWishlisted ? (isRtl ? 'إزالة من قائمة المفضلة' : 'Remove from Wishlist') : (isRtl ? 'إضافة إلى قائمة المفضلة' : 'Add to Wishlist')}
        >
          <Heart size={15} fill={isWishlisted ? '#EF4444' : 'none'} />
        </button>

        {/* ── Product Photo with Link to /product/:id & Touch Swiping ─── */}
        <div
          style={{ position: 'relative', width: '100%' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Link to={`/product/${product.id}`} className="th-card-img-link">
            <img
              key={activeImgIndex}
              src={currentImgSrc}
              alt={isRtl ? product.name : (product.name_en || product.name)}
              loading="lazy"
              decoding="async"
              className={swipeClass}
            />
          </Link>

          {/* Desktop Hover Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="th-card-nav-arrow th-card-nav-next"
                onClick={handleNextImage}
                title={isRtl ? 'الصورة التالية' : 'Next Image'}
                aria-label={isRtl ? 'الصورة التالية' : 'Next Image'}
              >
                {isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
              <button
                type="button"
                className="th-card-nav-arrow th-card-nav-prev"
                onClick={handlePrevImage}
                title={isRtl ? 'الصورة السابقة' : 'Previous Image'}
                aria-label={isRtl ? 'الصورة السابقة' : 'Previous Image'}
              >
                {isRtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>

              {/* Multi-Image Dots Indicator */}
              <div className="th-card-dots">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`th-card-dot ${idx === activeImgIndex ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSwipeClass(idx > activeImgIndex ? 'th-img-swipe-left' : 'th-img-swipe-right');
                      setActiveImgIndex(idx);
                      setTimeout(() => setSwipeClass(''), 320);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Card Content ──────────────────────────────────── */}
        <div className="th-card-content">
          {product.brand && (
            <span className="th-card-brand">{product.brand}</span>
          )}
          <Link to={`/product/${product.id}`} className="th-card-title" title={isRtl ? product.name : (product.name_en || product.name)}>
            {isRtl ? product.name : (product.name_en || product.name)}
          </Link>

          {/* Price Row */}
          <div className="th-card-price-row">
            <span className="th-price-main">
              {price.toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
            </span>
            {oldPrice > price && (
              <span className="th-price-old">
                {oldPrice.toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
              </span>
            )}
          </div>

          {/* Orange Stars Rating */}
          <div className="th-card-stars-row">
            <div style={{ display: 'flex', gap: 2 }}>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  className="th-star-icon"
                  fill="#FF5E14"
                  stroke="#FF5E14"
                />
              ))}
            </div>
            <span className="th-rating-reviews">{rating > 0 ? `(${rating})` : (isRtl ? 'لا توجد تقييمات' : 'No reviews')}</span>
          </div>

          {/* Action Row: Orange ADD TO CART + Quick View Modal Trigger */}
          <div className="th-card-action-row">
            <button
              className="btn-th-card-add btn-apple-tactile"
              onClick={handleAdd}
              title={isRtl ? 'إضافة المنتج إلى سلة المشتريات' : 'Add product to shopping cart'}
            >
              {isAdded ? (
                <>
                  <Check size={14} />
                  <span>{isRtl ? 'تمت الإضافة ✓' : 'Added ✓'}</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={14} />
                  <span>{t('add_to_cart')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-th-quick-cart btn-apple-tactile"
              onClick={handleQuickView}
              title={isRtl ? 'نظرة سريعة على المواصفات' : 'Quick View'}
            >
              <Eye size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
}
