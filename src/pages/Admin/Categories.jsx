import React, { useState, useEffect } from 'react';
import {
  Layers,
  Package,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  X,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  Sparkles,
  Gamepad2,
  Laptop,
  Monitor,
  Zap,
  HardDrive,
  Cpu,
  Volume2,
  Keyboard,
  Mouse,
  Smartphone,
  Sliders,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatEGP } from '../../lib/utils';

const CATEGORY_ICON_MAP = {
  '\uD83C\uDFAE': Gamepad2,
  '\uD83D\uDCBB': Laptop,
  '\uD83D\uDDA5\uFE0F': Monitor,
  '\u26A1': Zap,
  '\uD83D\uDCBE': HardDrive,
  '\u2699\uFE0F': Cpu,
  '\uD83D\uDD0A': Volume2,
  '\uD83C\uDFA7': Volume2,
  '\u2328\uFE0F': Keyboard,
  '\uD83D\uDDB2\uFE0F': Mouse,
  '\uD83D\uDCF1': Smartphone,
  '\uD83D\uDD0C': Zap,
  '\uD83C\uDF9B\uFE0F': Sliders,
  '\uD83D\uDCE6': Package,
  'gaming': Gamepad2,
  'laptop': Laptop,
  'desktop': Monitor,
  'gpu': Monitor,
  'cpu': Cpu,
  'ram': Zap,
  'storage': HardDrive,
  'audio': Volume2,
  'peripherals': Keyboard,
  'mouse': Mouse,
  'phone': Smartphone,
  'package': Package,
};

const availableIcons = [
  { id: 'gaming', label: 'ألعاب', Icon: Gamepad2 },
  { id: 'laptop', label: 'لابتوب', Icon: Laptop },
  { id: 'desktop', label: 'شاشات', Icon: Monitor },
  { id: 'cpu', label: 'معالجات', Icon: Cpu },
  { id: 'storage', label: 'تخزين', Icon: HardDrive },
  { id: 'ram', label: 'طاقة ورام', Icon: Zap },
  { id: 'audio', label: 'صوتيات', Icon: Volume2 },
  { id: 'peripherals', label: 'لوحات مفاتيح', Icon: Keyboard },
  { id: 'mouse', label: 'ماوسات', Icon: Mouse },
  { id: 'package', label: 'عام', Icon: Package },
];

const renderCatIcon = (iconKey, size = 22) => {
  const IconComponent = CATEGORY_ICON_MAP[iconKey] || Package;
  return <IconComponent size={size} />;
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [selectedCat, setSelectedCat] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    slug: '',
    icon: 'package',
    description: '',
    is_active: true,
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catsRes, prodsRes] = await Promise.all([
        api.getCategories().catch(() => ({ data: [] })),
        api.getProducts({ limit: 200 }).catch(() => ({ data: [] })),
      ]);
      const catList = catsRes?.data || catsRes || [];
      const prodList = prodsRes?.data || prodsRes?.products || [];
      setCategories(Array.isArray(catList) ? catList : []);
      setProducts(Array.isArray(prodList) ? prodList : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setFormData({
      name: '',
      name_en: '',
      slug: '',
      icon: 'gaming',
      description: '',
      is_active: true,
    });
    setModalMode('create');
  };

  const openEditModal = (cat) => {
    setSelectedCat(cat);
    setFormData({
      name: cat.name || '',
      name_en: cat.name_en || '',
      slug: cat.slug || '',
      icon: cat.icon || 'package',
      description: cat.description || '',
      is_active: cat.is_active !== false,
    });
    setModalMode('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('يرجى إدخال اسم القسم بالعربية');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    const generatedSlug =
      formData.slug.trim() ||
      (formData.name_en ? formData.name_en.toLowerCase().replace(/\s+/g, '-') : `cat-${Date.now()}`);

    const payload = {
      ...formData,
      slug: generatedSlug,
    };

    try {
      if (modalMode === 'create') {
        await api.createCategory(payload);
        showToast(`تم إنشاء قسم "${payload.name}" بنجاح!`);
      } else if (modalMode === 'edit' && selectedCat) {
        await api.updateCategory(selectedCat.id, payload);
        showToast(`تم تحديث بيانات قسم "${payload.name}" بنجاح!`);
      }
      setModalMode(null);
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ القسم');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (cat) => {
    const catProds = products.filter((p) => p.category_id === cat.id || p.category === cat.slug);
    if (catProds.length > 0) {
      if (!window.confirm(`تحذير: هذا القسم يحتوي على ${catProds.length} منتج! هل أنت متأكد من حذفه؟`)) {
        return;
      }
    } else {
      if (!window.confirm(`هل أنت متأكد من حذف قسم "${cat.name}"؟`)) {
        return;
      }
    }

    setActionLoading(true);
    try {
      await api.deleteCategory(cat.id);
      showToast(`تم حذف قسم "${cat.name}" بنجاح`);
      fetchData();
    } catch (err) {
      alert(err.message || 'تعذر حذف القسم');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Categories by search
  const filteredCategories = categories.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.name_en && c.name_en.toLowerCase().includes(q)) ||
      (c.slug && c.slug.toLowerCase().includes(q))
    );
  });

  // Calculate Metrics
  const totalCategories = categories.length;
  const totalProductsCount = products.length;
  const totalInventoryValuation = products.reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 1),
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, direction: 'rtl' }}>
      {/* ── Top Header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={28} color="var(--brand-orange)" />
            أقسام وفئات المتجر (Taxonomy & Categories)
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            تنظيم شجرة تصنيفات الهاردوير، ربط المنتجات، ومراقبة قيمة المخزون لكل قسم
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              padding: '10px 18px',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            تحديث البيانات
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, var(--brand-orange) 0%, #FF2E00 100%)',
              border: 'none',
              color: '#FFFFFF',
              padding: '10px 22px',
              borderRadius: 10,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(255, 94, 20, 0.35)',
            }}
          >
            <Plus size={18} />
            إضافة قسم جديد
          </button>
        </div>
      </div>

      {/* ── Toast Alert ──────────────────────────────────────── */}
      {toastMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 12,
            padding: '14px 20px',
            color: '#10B981',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── KPI Summary Cards ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div
          className="card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: 'rgba(255, 94, 20, 0.12)',
              border: '1px solid rgba(255, 94, 20, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-orange)',
            }}
          >
            <Layers size={26} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>إجمالي الفئات</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFF' }}>{totalCategories}</div>
          </div>
        </div>

        <div
          className="card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
            }}
          >
            <Package size={26} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>المنتجات المرتبطة</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFF' }}>{totalProductsCount}</div>
          </div>
        </div>

        <div
          className="card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
            }}
          >
            <DollarSign size={26} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>تقييم المخزون الكلي</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10B981' }}>{formatEGP(totalInventoryValuation)}</div>
          </div>
        </div>
      </div>

      {/* ── Search Bar ───────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 18px',
        }}
      >
        <Search size={18} color="var(--text-secondary)" />
        <input
          type="text"
          placeholder="ابحث عن قسم بالاسم، الاسم بالإنجليزية، أو المعرف اللطيف (Slug)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '0.95rem',
            width: '100%',
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Categories Grid ──────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <RefreshCw size={36} className="spin" style={{ margin: '0 auto 16px', display: 'block', color: 'var(--brand-orange)' }} />
          <p>جارٍ تحميل الأقسام والمخزون...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
          }}
        >
          <Layers size={48} color="var(--text-secondary)" style={{ opacity: 0.4, marginBottom: 12 }} />
          <h3 style={{ color: '#FFF', margin: '0 0 8px' }}>لم يتم العثور على أي أقسام</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px' }}>
            {searchQuery ? 'لا توجد نتائج تطابق معيار البحث المدخل.' : 'ابدأ بإضافة أول قسم لمتجرك الآن.'}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="btn btn-primary"
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              background: 'var(--brand-orange)',
              border: 'none',
              color: '#FFF',
              fontWeight: 700,
            }}
          >
            + إضافة قسم جديد
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredCategories.map((cat) => {
            const catProds = products.filter(
              (p) => p.category_id === cat.id || p.category === cat.slug || p.category === cat.name
            );
            const count = catProds.length;
            const categoryValuation = catProds.reduce(
              (sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 1),
              0
            );

            return (
              <div
                key={cat.id}
                className="card"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(255, 94, 20, 0.4)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(255, 94, 20, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
                }}
              >
                {/* Header: Icon + Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: 'rgba(255, 94, 20, 0.12)',
                      border: '1px solid rgba(255, 94, 20, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-orange)',
                      flexShrink: 0,
                    }}
                  >
                    {renderCatIcon(cat.icon, 24)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {cat.name}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontWeight: 700,
                          background: cat.is_active !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: cat.is_active !== false ? '#10B981' : '#EF4444',
                        }}
                      >
                        {cat.is_active !== false ? 'نشط' : 'معطل'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                      {cat.name_en || cat.slug}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                      /{cat.slug}
                    </div>
                  </div>
                </div>

                {/* Description if any */}
                {cat.description && (
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.83rem',
                      margin: 0,
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {cat.description}
                  </p>
                )}

                {/* Stats row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    background: 'var(--bg-secondary)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>المنتجات المتاحة</div>
                    <div style={{ color: 'var(--brand-orange)', fontWeight: 800, fontSize: '1.05rem', marginTop: 2 }}>
                      {count} منتج
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>قيمة المنتجات</div>
                    <div style={{ color: '#10B981', fontWeight: 800, fontSize: '0.95rem', marginTop: 2 }}>
                      {formatEGP(categoryValuation)}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => openEditModal(cat)}
                    className="btn"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border)',
                      color: '#FFF',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Edit2 size={14} color="var(--primary)" />
                    تعديل
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#EF4444',
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────── */}
      {modalMode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
            direction: 'rtl',
          }}
          onClick={() => setModalMode(null)}
        >
          <div
            className="card"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 28,
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.3rem', fontWeight: 800 }}>
                {modalMode === 'create' ? 'إضافة قسم جديد للمتجر' : `تعديل قسم: ${selectedCat?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#EF4444',
                  fontSize: '0.88rem',
                  marginBottom: 16,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                  اسم القسم (بالعربية) *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: كروت الشاشة (Graphics Cards)"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                  اسم القسم (English)
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  placeholder="مثال: Graphics Cards"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                  المعرّف اللطيف (Slug) - باللغة الإنجليزية
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="مثال: gpus أو graphics-cards"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF', fontFamily: 'monospace' }}
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                  أيقونة القسم (اختر الرمز)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {availableIcons.map(({ id, Icon, label }) => {
                    const isSelected = formData.icon === id || (id === 'gaming' && formData.icon === '\uD83C\uDFAE') || (id === 'package' && formData.icon === '\uD83D\uDCE6');
                    return (
                      <button
                        key={id}
                        type="button"
                        title={label}
                        onClick={() => setFormData({ ...formData, icon: id })}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: isSelected ? 'rgba(255, 94, 20, 0.25)' : 'var(--bg-secondary)',
                          border: isSelected ? '2px solid var(--brand-orange)' : '1px solid var(--border)',
                          color: isSelected ? 'var(--brand-orange)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
                  الوصف المختصر للقسم
                </label>
                <textarea
                  rows={2}
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف محتويات هذا القسم ومميزات القطع..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: '#FFF', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="cat_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--brand-orange)', cursor: 'pointer' }}
                />
                <label htmlFor="cat_active" style={{ color: '#FFF', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
                  تفعيل القسم وظهوره في قوائم المتجر
                </label>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="btn"
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, var(--brand-orange) 0%, #FF2E00 100%)',
                    border: 'none',
                    color: '#FFF',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(255, 94, 20, 0.3)',
                  }}
                >
                  {actionLoading ? 'جارٍ الحفظ...' : modalMode === 'create' ? 'إنشاء القسم' : 'تحديث البيانات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

