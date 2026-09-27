import React, { useState, useEffect } from 'react';
import {
  Package,
  History,
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  AlertCircle,
  X,
  ExternalLink,
  DollarSign,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';

const DEFAULT_CATEGORIES = [
  { id: 'cat-headphones', name: 'سماعات الرأس (Headphones)' },
  { id: 'cat-smartwatches', name: 'ساعات ذكية (Smart Watches)' },
  { id: 'cat-smartphones', name: 'هواتف ذكية (Smartphones)' },
  { id: 'cat-laptops', name: 'أجهزة لابتوب (Laptops)' },
  { id: 'cat-cameras', name: 'كاميرات احترافية (Cameras)' },
  { id: 'cat-speakers', name: 'مكبرات صوت (Speakers)' },
  { id: 'cat-gaming', name: 'ألعاب وكونسول (Gaming)' },
  { id: 'cat-drones', name: 'طائرات درونز (Drones)' },
];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Modal State for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: 'cat-headphones',
    price: '',
    old_price: '',
    stock_qty: 10,
    brand: 'TechHaven',
    thumbnail: '',
    description: '',
    reorder_enabled: false,
    reorder_point: 5,
    target_stock: 20,
  });

  // History Modal State
  const [historyProduct, setHistoryProduct] = useState(null);
  const [historyMovements, setHistoryMovements] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistoryModal = async (product) => {
    setHistoryProduct(product);
    setHistoryLoading(true);
    try {
      const res = await api.getProductStockHistory(product.id, { limit: 50 });
      setHistoryMovements(res?.data || []);
    } catch (err) {
      console.error('Failed to load product stock history:', err);
      setHistoryMovements([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories();
      const list = res?.data || res?.categories || res || [];
      if (Array.isArray(list) && list.length > 0) {
        setCategories(list.map((c) => ({ id: c.id, name: `${c.name} (${c.name_en || c.name})` })));
      }
    } catch {
      // keep fallback
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.getProducts({ limit: 100 });
      const list = res?.data || res?.products || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const handleQuickStock = async (productId, delta) => {
    const p = products.find((prod) => prod.id === productId);
    if (!p) return;
    const newQty = Math.max(0, (p.stock_qty ?? 0) + delta);
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((prod) => (prod.id === productId ? { ...prod, stock_qty: newQty, stock: newQty } : prod))
    );
    try {
      await api.updateProductStock(productId, newQty, `تعديل سريع للمخزون (${delta > 0 ? '+' + delta : delta})`);
    } catch (err) {
      alert(err.message || 'فشل تحديث المخزون');
      fetchProducts();
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: 'cat-headphones',
      price: '',
      old_price: '',
      stock_qty: 10,
      brand: 'TechHaven',
      thumbnail: '/images/prod-airpods.jpg',
      images: ['/images/prod-watch.jpg'],
      description: '',
      specs: '',
      features: '',
      tags: '',
      reorder_enabled: false,
      reorder_point: 5,
      target_stock: 20,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    const existingImages = Array.isArray(p.images) ? p.images : (p.thumbnail ? [p.thumbnail] : []);
    setFormData({
      name: p.name || '',
      category_id: p.category_id || 'cat-headphones',
      price: p.price || '',
      old_price: p.old_price || '',
      stock_qty: p.stock_qty ?? 10,
      brand: p.brand || 'TechHaven',
      thumbnail: p.thumbnail || existingImages[0] || '',
      images: existingImages.length > 1 ? existingImages.slice(1) : [],
      description: p.description || '',
      specs: typeof p.specs === 'object' ? JSON.stringify(p.specs, null, 2) : (p.specs || ''),
      features: Array.isArray(p.features) ? p.features.join('\n') : (p.features || ''),
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
      reorder_enabled: Boolean(p.reorder_enabled),
      reorder_point: p.reorder_point ?? 5,
      target_stock: p.target_stock ?? 20,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    let parsedSpecs = null;
    try {
      if (formData.specs) {
        if (formData.specs.trim().startsWith('{')) {
          parsedSpecs = JSON.parse(formData.specs);
        } else {
          parsedSpecs = Object.fromEntries(
            formData.specs.split('\n').filter(Boolean).map(l => l.split(':').map(s => s.trim()))
          );
        }
      }
    } catch (e) {
      // ignore parse errors for now
    }

    const allImages = [formData.thumbnail, ...(formData.images || [])].filter(Boolean);

    const payload = {
      ...formData,
      price: Number(formData.price),
      old_price: formData.old_price ? Number(formData.old_price) : null,
      stock_qty: Number(formData.stock_qty),
      reorder_enabled: Boolean(formData.reorder_enabled),
      reorder_point: Number(formData.reorder_point || 0),
      target_stock: Number(formData.target_stock || 0),
      images: allImages.length > 0 ? allImages : [formData.thumbnail],
      thumbnail: formData.thumbnail || allImages[0] || '',
      specs: parsedSpecs,
      features: formData.features ? formData.features.split('\n').filter(Boolean).map(s => s.trim()) : [],
      tags: formData.tags ? formData.tags.split(',').filter(Boolean).map(s => s.trim()) : [],
    };

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
      } else {
        await api.createProduct(payload);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFormError(err.message || 'فشل حفظ المنتج، تأكد من صحة البيانات');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف المنتج "${name}"؟`)) return;
    try {
      await api.deleteProduct(id);
      fetchProducts();
    } catch (err) {
      alert(err.message || 'فشل حذف المنتج');
    }
  };

  const filtered = products.filter((p) => {
    const matchesCat = catFilter === 'all' || p.category_id === catFilter;
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, direction: 'rtl' }}>

      {/* ── Top Header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px' }}>
            إدارة المنتجات والمخزون
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            إضافة منتجات جديدة، تعديل الأسعار، ومراقبة وتحديث كميات المخزون مباشرة في المتجر.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="btn btn-th-orange btn-apple-tactile"
          style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontWeight: 800, fontSize: 'var(--text-xs)', gap: 8 }}
        >
          <Plus size={16} />
          <span>➕ إضافة منتج جديد (Add Product)</span>
        </button>
      </div>

      {/* ── Search & Filters Bar ─────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="بحث باسم المنتج أو الماركة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ padding: '8px 12px', fontSize: 'var(--text-xs)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="select"
            style={{ padding: '8px 14px', fontSize: 'var(--text-xs)', minWidth: 160 }}
          >
            <option value="all">كل الأقسام</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchProducts}
            className="btn btn-secondary btn-apple-tactile"
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
            title="تحديث القائمة"
          >
            <RefreshCw size={14} className={loading ? 'spin-slow' : ''} />
          </button>
        </div>
      </div>

      {/* ── Products Table ───────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  المنتج
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  القسم
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  السعر الحالي
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  المخزون
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800 }}>
                  الحالة
                </th>
                <th style={{ padding: '14px 18px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 800, textAlign: 'center' }}>
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center' }}>
                    <div className="skeleton" style={{ height: 40, margin: '10px 0', borderRadius: 6 }} />
                    <div className="skeleton" style={{ height: 40, margin: '10px 0', borderRadius: 6 }} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    لا توجد منتجات مسجلة. أضف منتجك الأول الآن!
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const stock = p.stock_qty ?? 0;
                  const isOutOfStock = stock <= 0;
                  const categoryName = DEFAULT_CATEGORIES.find((c) => c.id === p.category_id)?.name.split(' (')[0] || p.category_id;

                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Product Name & Photo */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img
                            src={p.thumbnail || (p.images && p.images[0]) || '/images/prod-airpods.jpg'}
                            alt=""
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 6,
                              objectFit: 'contain',
                              background: '#0D0E13',
                              padding: 3,
                              border: '1px solid var(--border)',
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: 'var(--text-xs)' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              الماركة: {p.brand || 'TechHaven'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 18px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                        {categoryName}
                      </td>

                      {/* Price */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
                          {Number(p.price).toLocaleString('ar-EG')} ج.م
                        </div>
                        {p.old_price && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                            {Number(p.old_price).toLocaleString('ar-EG')} ج.م
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td style={{ padding: '12px 18px', fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleQuickStock(p.id, -1)}
                            style={{ padding: '2px 7px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: '#FFF', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
                            title="إنقاص المخزون بمقدار 1"
                          >-</button>
                          <span style={{ color: isOutOfStock ? '#EF4444' : stock < 5 ? '#F59E0B' : '#10B981', minWidth: 45, textAlign: 'center' }}>
                            {stock}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickStock(p.id, 1)}
                            style={{ padding: '2px 7px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: '#FFF', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
                            title="زيادة المخزون بمقدار 1"
                          >+</button>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 18px' }}>
                        {isOutOfStock ? (
                          <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 800 }}>
                            نفد المخزون
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 800 }}>
                            نشط ومتاح
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            style={{
                              background: 'rgba(255, 94, 20, 0.1)',
                              border: 'none',
                              color: 'var(--brand-orange)',
                              padding: '6px 10px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                            title="تعديل المنتج"
                          >
                            <Edit2 size={13} />
                            <span>تعديل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openHistoryModal(p)}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: 'none',
                              color: '#38BDF8',
                              padding: '6px 10px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                            title="سجل حركات المخزون"
                          >
                            <History size={13} />
                            <span>السجل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              color: '#EF4444',
                              padding: '6px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="حذف المنتج"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Add / Edit Product ────────────────────────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="apple-scale-in"
            style={{
              width: '100%',
              maxWidth: 540,
              background: '#14161F',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-lg)',
              padding: 28,
              boxShadow: 'var(--shadow-xl)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 800, color: '#FFFFFF' }}>
                {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للمتجر'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: 6, padding: '10px', color: '#EF4444', fontSize: 'var(--text-xs)', marginBottom: 14 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  اسم المنتج:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: TechHaven AirPods Pro 2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    القسم (Category):
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="select"
                    style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    الماركة (Brand):
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="input"
                    style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    السعر (ج.م):
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="8499"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input"
                    style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    السعر قبل الخصم:
                  </label>
                  <input
                    type="number"
                    placeholder="9999"
                    value={formData.old_price}
                    onChange={(e) => setFormData({ ...formData, old_price: e.target.value })}
                    className="input"
                    style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    كمية المخزون:
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                    className="input"
                    style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    نقطة إعادة الطلب:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorder_point}
                    onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                    className="input"
                    style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    المخزون المستهدف:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.target_stock}
                    onChange={(e) => setFormData({ ...formData, target_stock: e.target.value })}
                    className="input"
                    style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                  />
                </div>
              </div>

              {/* Reorder Enabled Switch */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={formData.reorder_enabled}
                    onChange={(e) => setFormData({ ...formData, reorder_enabled: e.target.checked })}
                    style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                  />
                  <span>تفعيل تتبع ذكاء إعادة الطلب لهذا المنتج (Reorder Intelligence)</span>
                </label>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                  عند تفعيل هذا الخيار، سيقوم النظام بتنبيه الإدارة واقتراح كمية إعادة التوريد فور وصول المخزون لنقطة إعادة الطلب أو أقل.
                </div>
              </div>

              {/* Primary Cover Image */}
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  صورة الغلاف الأساسية (Primary Image URL):
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    required
                    placeholder="/images/prod-airpods.jpg أو رابط خارجي"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                    className="input"
                    style={{ fontSize: 'var(--text-xs)', padding: '10px 12px', flex: 1, direction: 'ltr', textAlign: 'right' }}
                  />
                  {formData.thumbnail && (
                    <img
                      src={formData.thumbnail}
                      alt="معاينة"
                      style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'contain', background: '#0D0E13', border: '1px solid var(--border)' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>
              </div>

              {/* Additional Gallery Images */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>
                    صور إضافية للمنتج (معرض الصور للتقليب):
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, images: [...(formData.images || []), ''] })}
                    className="btn btn-secondary btn-apple-tactile"
                    style={{ padding: '4px 10px', fontSize: '11px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Plus size={12} />
                    <span>إضافة صورة أخرى</span>
                  </button>
                </div>

                {(formData.images || []).map((imgUrl, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="text"
                      placeholder={`رابط الصورة ${idx + 2} (للمعرض)`}
                      value={imgUrl}
                      onChange={(e) => {
                        const next = [...(formData.images || [])];
                        next[idx] = e.target.value;
                        setFormData({ ...formData, images: next });
                      }}
                      className="input"
                      style={{ fontSize: 'var(--text-xs)', padding: '8px 12px', flex: 1, direction: 'ltr', textAlign: 'right' }}
                    />
                    {imgUrl && (
                      <img
                        src={imgUrl}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'contain', background: '#0D0E13', border: '1px solid var(--border)' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const next = (formData.images || []).filter((_, i) => i !== idx);
                        setFormData({ ...formData, images: next });
                      }}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                      title="حذف هذه الصورة"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  وصف المنتج:
                </label>
                <textarea
                  rows={3}
                  placeholder="وصف تفصيلي للمنتج ومميزاته..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="textarea"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  المواصفات التقنية (Specs):
                </label>
                <textarea
                  rows={4}
                  placeholder="إما بصيغة JSON أو كل مواصفة في سطر (المفتاح: القيمة)"
                  value={formData.specs}
                  onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
                  className="textarea"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px', direction: 'ltr', textAlign: 'left' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  المميزات (Features):
                </label>
                <textarea
                  rows={3}
                  placeholder="ميزة واحدة في كل سطر"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  className="textarea"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  الكلمات المفتاحية (Tags):
                </label>
                <input
                  type="text"
                  placeholder="مفصولة بفاصلة (مثال: سماعة, أبل, بلوتوث)"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="input"
                  style={{ fontSize: 'var(--text-xs)', padding: '10px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-th-orange btn-apple-tactile"
                  style={{ flex: 1, padding: 12, borderRadius: 'var(--radius-sm)', fontWeight: 800 }}
                >
                  {submitting ? 'جارِ الحفظ...' : editingProduct ? 'حفظ التعديلات ✓' : 'إضافة المنتج للمتجر ✓'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '12px 20px', borderRadius: 'var(--radius-sm)' }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Stock History Modal */}
      {historyProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 680,
              backgroundColor: 'var(--bg-card)',
              borderRadius: 14,
              border: '1px solid var(--border)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              direction: 'rtl',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                  سجل حركات المخزون: {historyProduct.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  الرصيد المتاح الحالي: <strong style={{ color: 'var(--brand-orange)' }}>{historyProduct.stock_qty ?? 0}</strong> وحدة
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              {historyLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }} />
                  جارِ تحميل سجل الحركات...
                </div>
              ) : historyMovements.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                  لا توجد حركات مسجلة لهذا المنتج
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {historyMovements.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        fontSize: '0.8rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {m.type === 'SALE' ? 'مبيعات طلب' : m.type === 'INITIAL_IMPORT' ? 'رصيد افتتاحي' : m.type === 'ADJUSTMENT_IN' ? 'إضافة مخزون' : m.type === 'ADJUSTMENT_OUT' ? 'خصم مخزون' : m.type}
                          <span style={{ marginRight: 8, color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            ({new Date(m.created_at).toLocaleString('ar-EG')})
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {m.reason || m.reference_type}
                        </div>
                      </div>

                      <div style={{ textAlign: 'left', fontFamily: 'var(--font-mono)' }}>
                        <div style={{ fontWeight: 900, color: m.quantity_delta > 0 ? '#10B981' : '#EF4444' }}>
                          {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {m.stock_before} ← {m.stock_after}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
