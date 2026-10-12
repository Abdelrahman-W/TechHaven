import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  SlidersHorizontal,
  Grid,
  List,
  Search,
  Check,
} from 'lucide-react';
import { api } from '../lib/api';
import ProductCard from '../components/ProductCard';
import SideDrawer from '../components/SideDrawer';
import { useLanguage } from '../context/LanguageContext';

function applyProductSort(items, sortKey) {
  const list = [...items];
  switch (sortKey) {
    case 'price_asc':
    case 'price-asc':
      return list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    case 'price_desc':
    case 'price-desc':
      return list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    case 'rating':
      return list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    case 'newest':
      return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    case 'featured':
    default:
      return list.sort((a, b) => {
        if (b.is_featured !== a.is_featured) return b.is_featured ? 1 : -1;
        return (Number(b.sold_count) || 0) - (Number(a.sold_count) || 0);
      });
  }
}

export default function Shop() {
  const { lang, isRtl, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  // Official Store State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('q') || '';
  const dealsParam = searchParams.get('deals') === 'true';

  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('inStock') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'featured');

  // Keep local filter controls synchronized with browser back/forward and
  // links that update the query string outside this component.
  useEffect(() => {
    setSelectedBrand(searchParams.get('brand') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setInStockOnly(searchParams.get('inStock') === 'true');
    setSortBy(searchParams.get('sort') || 'featured');
  }, [searchParams]);

  // Fetch Categories for Official Store
  useEffect(() => {
    api.getCategories()
      .then((res) => setCategories(res.data || res.categories || []))
      .catch(() => setCategories([]));
  }, []);

  // Fetch Official Store Products
  useEffect(() => {
    setLoading(true);
    const params = {
      category: categoryParam || undefined,
      search: searchParam || undefined,
      brand: selectedBrand || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      inStock: inStockOnly ? 'true' : undefined,
      sort: sortBy || undefined,
    };

    api.getProducts(params)
      .then((res) => {
        let prods = res.data || res.products || [];
        if (dealsParam) {
          prods = prods.filter((p) => p.old_price && p.old_price > p.price);
        }
        setProducts(applyProductSort(prods, sortBy));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [categoryParam, searchParam, dealsParam, selectedBrand, minPrice, maxPrice, inStockOnly, sortBy]);

  const BRANDS = [...new Set(products.map((p) => p.brand && p.brand.trim()).filter(Boolean))];

  const renderNewStoreFilterBody = (isMobile = false) => (
    <>
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>
            {t('shop_filter_title', 'فلاتر البحث')}
          </span>
          <button
            onClick={() => {
              setSelectedBrand('');
              setMinPrice('');
              setMaxPrice('');
              setInStockOnly(false);
              setSearchParams({});
            }}
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', color: 'var(--brand-orange)', padding: 0 }}
          >
            {t('shop_reset_filters', 'إعادة ضبط')}
          </button>
        </div>
      )}

      {/* Categories */}
      <div className="filter-group-box" style={{ marginBottom: '16px' }}>
        <div className="filter-group-title">{t('shop_category', 'التصنيف')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { id: '', name: isRtl ? 'الكل' : 'All' },
            ...categories.map((c) => ({ id: c.id || c.slug || c.name, name: isRtl ? c.name : (c.name_en || c.name) })),
          ].map((cat) => {
            const isSelected = categoryParam === cat.id;
            return (
              <button
                key={cat.id || cat.name}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  if (cat.id === '') {
                    next.delete('category');
                  } else {
                    next.set('category', cat.id);
                  }
                  setSearchParams(next);
                }}
                style={{
                  textAlign: isRtl ? 'right' : 'left',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-xs)',
                  border: isSelected ? '1px solid var(--brand-orange)' : '1px solid transparent',
                  background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                  color: isSelected ? 'var(--brand-orange)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 800 : 500,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brands Filter */}
      <div className="filter-group-box">
        <div className="filter-group-title">{t('shop_brand')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
          {BRANDS.map((brand) => (
            <label key={brand} className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={selectedBrand === brand}
                onChange={() => {
                  const next = new URLSearchParams(searchParams);
                  if (selectedBrand === brand) {
                    setSelectedBrand('');
                    next.delete('brand');
                  } else {
                    setSelectedBrand(brand);
                    next.set('brand', brand);
                  }
                  setSearchParams(next);
                }}
              />
              <span>{brand}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="filter-group-box" style={{ marginBottom: '16px' }}>
        <div className="filter-group-title">{t('shop_price', 'نطاق السعر (ج.م)')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <input
            type="number"
            placeholder={isRtl ? 'الحد الأدنى' : 'Min'}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            style={{
              background: '#0B0C10',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '6px 8px',
              color: '#fff',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          />
          <input
            type="number"
            placeholder={isRtl ? 'الحد الأقصى' : 'Max'}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={{
              background: '#0B0C10',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '6px 8px',
              color: '#fff',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* In-Stock Only */}
      <div className="filter-group-box">
        <label className="filter-checkbox-label">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => {
              setInStockOnly(e.target.checked);
              const next = new URLSearchParams(searchParams);
              if (e.target.checked) {
                next.set('inStock', 'true');
              } else {
                next.delete('inStock');
              }
              setSearchParams(next);
            }}
          />
          <span>{isRtl ? 'المتاح فقط' : 'In stock only'}</span>
        </label>
      </div>
    </>
  );

  return (
    <div style={{ background: 'var(--bg-primary, #0A0A0F)', minHeight: '100vh', padding: '24px 0 60px' }}>
      <div className="container">

        {/* ── Breadcrumb Navigation ────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            color: 'var(--text-muted, #9ca3af)',
            marginBottom: '18px',
          }}
        >
          <Link to="/" style={{ color: 'var(--text-secondary, #cbd5e1)', textDecoration: 'none' }}>
            {t('nav_home')}
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--brand-orange)', fontWeight: 700 }}>
            {t('nav_shop')}
          </span>
        </div>

        {/* ── Main Catalog Layout (Sidebar + Results) ───────────── */}
        <div className="shop-catalog-layout">
          {/* ── Desktop Sidebar Filters ─────────────────────────── */}
          <aside className="filters-sidebar-wrap">
            {renderNewStoreFilterBody(false)}
          </aside>

          {/* ── Mobile Filter Drawer ────────────────────────────── */}
          <SideDrawer
            isOpen={isMobileFilterOpen}
            onClose={() => setIsMobileFilterOpen(false)}
            ariaLabel={t('shop_filter_title', 'فلاتر البحث')}
            title={
              <div className="th-drawer-header-title">
                <SlidersHorizontal size={18} style={{ color: 'var(--brand-orange)' }} />
                <span>{t('shop_filter_title', 'فلاتر البحث')}</span>
              </div>
            }
            headerActions={
              <button
                type="button"
                className="th-drawer-reset-btn"
                onClick={() => {
                  setSelectedBrand('');
                  setMinPrice('');
                  setMaxPrice('');
                  setInStockOnly(false);
                  setSearchParams({});
                }}
              >
                {t('shop_reset_filters', isRtl ? 'إعادة ضبط' : 'Reset')}
              </button>
            }
            stickyFooter={
              <button
                type="button"
                className="th-drawer-cta-btn btn-apple-tactile"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                <span>
                  {isRtl
                    ? `عرض النتائج (${products.length})`
                    : `Show Results (${products.length})`}
                </span>
                <Check size={14} />
              </button>
            }
            contentStyle={{ padding: '16px 14px' }}
          >
            {renderNewStoreFilterBody(true)}
          </SideDrawer>

          {/* ── Main Catalog Content ────────────────────────────── */}
          <main>
            {/* Catalog Toolbar */}
            <div className="catalog-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-sm btn-secondary mobile-filter-toggle btn-apple-tactile"
                  onClick={() => setIsMobileFilterOpen(true)}
                  style={{ gap: 6 }}
                >
                  <SlidersHorizontal size={15} style={{ color: 'var(--brand-orange)' }} />
                  <span>{t('shop_mobile_filters')}</span>
                </button>

                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {isRtl
                    ? <>عرض <strong style={{ color: '#fff' }}>{products.length}</strong> منتج جديد</>
                    : <>Showing <strong style={{ color: '#fff' }}>{products.length}</strong> new products</>}
                </span>
              </div>

              {/* Sorting */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const newSort = e.target.value;
                    setSortBy(newSort);
                    setProducts((prev) => applyProductSort(prev, newSort));
                    const next = new URLSearchParams(searchParams);
                    next.set('sort', newSort);
                    setSearchParams(next);
                  }}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="featured">{t('shop_sort_featured')}</option>
                  <option value="price_asc">{t('shop_sort_price_asc')}</option>
                  <option value="price_desc">{t('shop_sort_price_desc')}</option>
                  <option value="rating">{t('shop_sort_rating')}</option>
                  <option value="newest">{t('shop_sort_newest')}</option>
                </select>

                <div className="view-switch-btns">
                  <button
                    className={`view-switch-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title={t('shop_grid_view')}
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    className={`view-switch-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title={t('shop_list_view')}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Official Store Products (New with Warranty) ───── */}
            {loading ? (
              <div className="product-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '380px', borderRadius: 'var(--radius-xl)' }} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Search size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 14px' }} />
                <h3 style={{ color: '#fff', marginBottom: '8px', fontSize: '1.2rem', fontWeight: 800 }}>
                  {categoryParam
                    ? (isRtl ? 'لا توجد منتجات متوفرة حالياً في هذا القسم' : 'No Products Currently Available in this Category')
                    : t('shop_no_products', 'لا توجد منتجات مطابقة')}
                </h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto 20px', lineHeight: 1.6, fontSize: '0.88rem' }}>
                  {categoryParam
                    ? (isRtl ? 'القسم المطلوب غير متوفر في الكتالوج الحالي أو نفدت كمياته مؤقتاً. يمكنك استعراض جميع المنتجات المتوفرة في المتجر.' : 'The requested category is currently out of stock. You can browse all available hardware in the catalog.')
                    : t('shop_no_products_sub', 'جرّب تغيير فلاتر البحث أو تصفح الأقسام الأخرى')}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => setSearchParams({})} className="btn btn-primary btn-apple-tactile" style={{ padding: '10px 22px' }}>
                    {isRtl ? 'عرض جميع المنتجات المتاحة' : 'View All Available Products'}
                  </button>
                  {categoryParam && (
                    <button
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.delete('category');
                        setSearchParams(next);
                      }}
                      className="btn btn-secondary btn-apple-tactile"
                      style={{ padding: '10px 18px' }}
                    >
                      {isRtl ? 'إلغاء فلتر القسم' : 'Clear Category Filter'}
                    </button>
                  )}
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="product-grid">
                {products.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {products.map((item) => (
                  <div key={item.id} className="tech-product-card th-list-item-card">
                    <Link
                      to={`/product/${item.id}`}
                      style={{
                        background: 'radial-gradient(circle, #1E2230 0%, #151821 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        minHeight: '160px',
                      }}
                    >
                      <img
                        src={item.thumbnail || (item.images && item.images[0]) || 'https://via.placeholder.com/200'}
                        alt={isRtl ? item.name : (item.name_en || item.name)}
                        style={{ maxHeight: 150, maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </Link>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase' }}>
                        {item.brand || (isRtl ? 'عالمي' : 'Global')}
                      </div>
                      <Link
                        to={`/product/${item.id}`}
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          color: '#fff',
                          margin: '4px 0 8px',
                          textDecoration: 'none',
                        }}
                      >
                        {isRtl ? item.name : (item.name_en || item.name)}
                      </Link>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '12px' }}>
                        {isRtl ? item.description : (item.description_en || item.description)}
                      </p>
                    </div>
                    <div style={{ padding: '20px', borderInlineStart: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>
                        {item.price?.toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                      </div>
                      <Link to={`/product/${item.id}`} className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 8 }}>
                        {t('shop_view_details')}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>

      </div>
    </div>
  );
}