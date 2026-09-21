import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale,
  Plus,
  Trash2,
  ShoppingBag,
  Check,
  Zap,
  ArrowRight,
  Shield,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatEGP } from '../lib/utils';

export default function Compare() {
  const { addToCart } = useCart();
  const { isRtl, t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getProducts({ limit: 12 })
      .then((res) => {
        const list = res.data || res.products || [];
        setAllProducts(list);
        // Pre-select first 3 products
        setProducts(list.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAdd = (prod) => {
    if (products.length >= 4) {
      toast.warning(t('compare_max_limit'));
      return;
    }
    if (!products.some((p) => p.id === prod.id)) {
      setProducts((prev) => [...prev, prod]);
      toast.success(isRtl ? `تمت إضافة "${prod.name}" لجدول المقارنة` : `Added "${prod.name_en || prod.name}" to comparison`);
    }
    setIsPickerOpen(false);
  };

  const filteredPickerProducts = allProducts.filter(
    (p) =>
      !products.some((selected) => selected.id === p.id) &&
      (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.brand?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="page" style={{ padding: 'var(--space-8) 0 var(--space-16)', direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="container">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
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
                background: 'rgba(0, 212, 170, 0.12)',
                color: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Scale size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
                {t('compare_hero_title')}
              </h1>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {t('compare_hero_sub')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {products.length < 4 && (
              <button
                type="button"
                className="btn btn-primary btn-sm btn-apple-tactile"
                onClick={() => setIsPickerOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} />
                <span>{t('compare_add_btn')} ({products.length}/4)</span>
              </button>
            )}
            {products.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setProducts([])}
                style={{ color: 'var(--danger)', fontSize: '0.8rem' }}
              >
                {t('compare_clear_all')}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Swipe Notice */}
        {products.length > 1 && (
          <div
            style={{
              background: 'rgba(108, 99, 255, 0.1)',
              border: '1px solid rgba(108, 99, 255, 0.25)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              color: 'var(--primary-light, #B4B0FF)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{t('compare_swipe_hint')}</span>
          </div>
        )}

        {loading ? (
          <div className="card skeleton" style={{ height: '400px', borderRadius: 'var(--radius-xl)' }} />
        ) : products.length === 0 ? (
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
            <Scale size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
            <h3 style={{ margin: '0 0 var(--space-2)' }}>{t('compare_empty_title')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
              {t('compare_empty_sub')}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsPickerOpen(true)}
            >
              {t('compare_add_btn')}
            </button>
          </div>
        ) : (
          <div
            className="card"
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: isRtl ? 'right' : 'left',
                minWidth: '650px',
              }}
            >
              <tbody>
                {/* Row 1: Product Cards & Images */}
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td
                    style={{
                      padding: 'var(--space-4)',
                      width: '180px',
                      fontWeight: 700,
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-muted)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    {t('compare_col_product')}
                  </td>
                  {products.map((p) => (
                    <td key={p.id} style={{ padding: 'var(--space-5)', verticalAlign: 'top', minWidth: '200px' }}>
                      <div style={{ position: 'relative', textAlign: 'center', marginBottom: 'var(--space-3)' }}>
                        <img
                          src={p.thumbnail || p.images?.[0] || 'https://placehold.co/180x140/1a1a25/6c63ff?text=HW'}
                          alt={p.name}
                          style={{
                            width: '140px',
                            height: '120px',
                            objectFit: 'contain',
                            background: 'var(--bg-primary)',
                            borderRadius: 'var(--radius-md)',
                            padding: '4px',
                            border: '1px solid var(--border)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemove(p.id)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            [isRtl ? 'left' : 'right']: '4px',
                            background: 'rgba(255, 71, 87, 0.1)',
                            border: 'none',
                            borderRadius: 'var(--radius-full)',
                            padding: '4px',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                          }}
                          title={t('compare_remove')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <Link
                        to={`/product/${p.id}`}
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
                          marginBottom: 'var(--space-2)',
                        }}
                      >
                        {isRtl ? p.name : (p.name_en || p.name)}
                      </Link>
                      <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 'var(--text-base)', fontFamily: 'var(--font-mono)' }}>
                        {formatEGP(p.price)}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Row 2: Brand */}
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                    {t('compare_col_brand')}
                  </td>
                  {products.map((p) => (
                    <td key={p.id} style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--primary)' }}>
                      {p.brand || 'Original'}
                    </td>
                  ))}
                </tr>

                {/* Row 3: Category */}
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                    {t('compare_col_category')}
                  </td>
                  {products.map((p) => (
                    <td key={p.id} style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-sm)' }}>
                      {isRtl ? (p.category?.name || 'مكونات تجميع') : (p.category?.name_en || p.category?.name || 'Components')}
                    </td>
                  ))}
                </tr>

                {/* Row 4: Stock Status */}
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                    {t('compare_col_stock')}
                  </td>
                  {products.map((p) => (
                    <td key={p.id} style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-xs)' }}>
                      {p.in_stock ? (
                        <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <Check size={14} /> {isRtl ? 'متوفر وجاهز للشحن الفوري' : 'In Stock & Ready for Shipping'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                          {isRtl ? 'حجز مسبق / قيد التوريد' : 'Pre-Order / On Demand'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Row 5: Warranty */}
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                    {isRtl ? 'فترة الضمان' : 'Warranty'}
                  </td>
                  {products.map((p) => (
                    <td key={p.id} style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-sm)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={14} style={{ color: 'var(--secondary)' }} />
                        <span>{isRtl ? '3 سنوات ضمان محلي معتمد' : '3-Year Certified Official Warranty'}</span>
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Row 6: Add to Cart CTA */}
                <tr>
                  <td style={{ padding: 'var(--space-4)', background: 'var(--bg-secondary)' }}>
                    {t('compare_col_actions')}
                  </td>
                  {products.map((p) => (
                    <td key={p.id} style={{ padding: 'var(--space-4) var(--space-5)' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => addToCart(p)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <ShoppingBag size={15} />
                        <span>{t('add_to_cart')}</span>
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Product Picker */}
        {isPickerOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 'var(--z-modal)',
              background: 'rgba(5, 7, 15, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-4)',
            }}
            onClick={() => setIsPickerOpen(false)}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '560px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border)',
                padding: 'var(--space-6)',
                direction: isRtl ? 'rtl' : 'ltr',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-lg)' }}>
                {isRtl ? 'اختر قطعة لإضافتها لجدول المقارنة' : 'Select a component to add to comparison'}
              </h3>
              <input
                type="text"
                className="input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('compare_search_placeholder')}
                style={{ width: '100%', marginBottom: 'var(--space-4)' }}
                autoFocus
              />

              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredPickerProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleAdd(prod)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <img
                      src={prod.thumbnail || prod.images?.[0] || 'https://placehold.co/60x60/1a1a25/6c63ff?text=HW'}
                      alt={prod.name}
                      style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isRtl ? prod.name : (prod.name_en || prod.name)}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {formatEGP(prod.price)}
                      </div>
                    </div>
                    <Plus size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsPickerOpen(false)}
                style={{ width: '100%', marginTop: 'var(--space-4)' }}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

