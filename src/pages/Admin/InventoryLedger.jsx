import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Filter,
  Search,
  RefreshCw,
  Package,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  FileText,
  User,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../../lib/api';

const TYPE_CONFIG = {
  INITIAL_IMPORT: { label: 'استيراد رصيد أولي', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)', icon: Package },
  SALE: { label: 'مبيعات طلبات', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', icon: TrendingDown },
  ADJUSTMENT_IN: { label: 'إضافة مخزون (+)', color: '#34D399', bg: 'rgba(52, 211, 153, 0.12)', icon: PlusCircle },
  ADJUSTMENT_OUT: { label: 'خصم مخزون (-)', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', icon: TrendingDown },
  DAMAGE: { label: 'تالف / هالك', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', icon: AlertCircle },
  RETURN_RESTOCK: { label: 'مرتجع للرصيد', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)', icon: TrendingUp },
  PURCHASE_RECEIPT: { label: 'استلام مشتريات', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)', icon: Package },
};

export default function InventoryLedger() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });
  const [filterType, setFilterType] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustSuccess, setAdjustSuccess] = useState(null);

  // Modal form state
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    quantityDelta: '',
    type: 'ADJUSTMENT_IN',
    reason: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [movRes, prodRes] = await Promise.all([
        api.getInventoryMovements({
          page,
          limit: 20,
          type: filterType || undefined,
          productId: filterProduct || undefined,
        }),
        api.getProducts({ limit: 100 }),
      ]);

      const movList = movRes?.data || [];
      setMovements(movList);
      if (movRes?.pagination) {
        setPagination(movRes.pagination);
      }

      const prodList = prodRes?.data?.products || prodRes?.products || prodRes?.data || [];
      setProducts(Array.isArray(prodList) ? prodList : []);
    } catch (err) {
      console.error('Failed to load inventory ledger data:', err);
      setError('تعذر تحميل بيانات سجل حركات المخزون');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterProduct]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustForm.productId) {
      alert('يرجى اختيار المنتج');
      return;
    }
    const delta = parseInt(adjustForm.quantityDelta, 10);
    if (isNaN(delta) || delta === 0) {
      alert('يرجى إدخال كمية تعديل صالحة وغير صفرية');
      return;
    }
    if (!adjustForm.reason.trim()) {
      alert('يرجى كتابة سبب التعديل');
      return;
    }

    try {
      setAdjustSubmitting(true);
      const actualDelta = adjustForm.type === 'ADJUSTMENT_OUT' || adjustForm.type === 'DAMAGE'
        ? -Math.abs(delta)
        : Math.abs(delta);

      await api.adjustInventory({
        productId: adjustForm.productId,
        quantityDelta: actualDelta,
        type: adjustForm.type,
        reason: adjustForm.reason.trim(),
      });

      setAdjustSuccess('تم تسجيل حركة المخزون وتحديث الرصيد بنجاح');
      setTimeout(() => {
        setAdjustSuccess(null);
        setIsAdjustModalOpen(false);
        setAdjustForm({ productId: '', quantityDelta: '', type: 'ADJUSTMENT_IN', reason: '' });
        loadData();
      }, 1000);
    } catch (err) {
      alert(err.message || 'حدث خطأ أثناء تعديل المخزون');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const filteredMovements = movements.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.product_name && m.product_name.toLowerCase().includes(q)) ||
      (m.product_sku && m.product_sku.toLowerCase().includes(q)) ||
      (m.reference_id && m.reference_id.toLowerCase().includes(q)) ||
      (m.reason && m.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', direction: 'rtl' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255, 94, 20, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-orange)' }}>
              <History size={20} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              سجل حركات المخزون (Inventory Ledger)
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            المصدر المعتمد لتتبع وتدقيق جميع حركات المخزون والتسويات ومبيعات الطلبات تاريخياً
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>

          <button
            type="button"
            onClick={() => setIsAdjustModalOpen(true)}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--brand-orange), #FF8040)',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.85rem',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(255, 94, 20, 0.3)',
            }}
          >
            <PlusCircle size={16} />
            تسوية مخزون جديدة
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 18, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255, 94, 20, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-orange)' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>إجمالي حركات السجل</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {pagination.total || movements.length}
            </div>
          </div>
        </div>

        <div style={{ padding: 18, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
            <TrendingDown size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>حركات مبيعات الطلبات</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
              {movements.filter((m) => m.type === 'SALE').length}
            </div>
          </div>
        </div>

        <div style={{ padding: 18, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
            <PlusCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>التسويات والإضافات</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
              {movements.filter((m) => m.type.startsWith('ADJUSTMENT')).length}
            </div>
          </div>
        </div>

        <div style={{ padding: 18, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(168, 85, 247, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A855F7' }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>الأرصدة الافتتاحية</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#A855F7', fontFamily: 'var(--font-mono)' }}>
              {movements.filter((m) => m.type === 'INITIAL_IMPORT').length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1, minWidth: 280 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: 220, flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="بحث بالمنتج، الكود SKU، المرجع أو السبب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 38px 9px 12px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value="">جميع أنواع الحركات</option>
            {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
              <option key={key} value={key}>{conf.label}</option>
            ))}
          </select>

          {/* Product Filter */}
          <select
            value={filterProduct}
            onChange={(e) => {
              setFilterProduct(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              maxWidth: 240,
            }}
          >
            <option value="">جميع المنتجات</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {(filterType || filterProduct || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setFilterType('');
              setFilterProduct('');
              setSearchQuery('');
              setPage(1);
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: 'none',
              color: '#EF4444',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Movements Table */}
      <div style={{ borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 800 }}>التاريخ والوقت</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 800 }}>المنتج</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 800 }}>نوع الحركة</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 800 }}>مقدار التغير</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 800 }}>الرصيد قبل → بعد</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 800 }}>المرجع / المستند</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 800 }}>السبب / الملاحظات</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 800 }}>المسؤول</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <div style={{ color: 'var(--text-muted)' }}>جارِ تحميل حركات المخزون...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#EF4444' }}>
                    <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
                    <div>{error}</div>
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    لا توجد حركات مخزون مطابقة للبحث أو الفلتر
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const conf = TYPE_CONFIG[m.type] || { label: m.type, color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' };
                  const isPositive = m.quantity_delta > 0;

                  return (
                    <tr
                      key={m.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Date */}
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {new Date(m.created_at).toLocaleString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Product */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {m.product_name || `المنتج (${m.product_id})`}
                        </div>
                        {m.product_sku && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            SKU: {m.product_sku}
                          </div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: conf.color,
                            backgroundColor: conf.bg,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {conf.label}
                        </span>
                      </td>

                      {/* Delta */}
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '0.9rem' }}>
                        <span style={{ color: isPositive ? '#10B981' : '#EF4444' }}>
                          {isPositive ? `+${m.quantity_delta}` : m.quantity_delta}
                        </span>
                      </td>

                      {/* Before -> After */}
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{m.stock_before}</span>
                        <span style={{ margin: '0 6px', color: 'var(--brand-orange)' }}>←</span>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{m.stock_after}</span>
                      </td>

                      {/* Reference */}
                      <td style={{ padding: '12px 16px', fontSize: '0.75rem' }}>
                        <div style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{m.reference_type}</div>
                        {m.reference_id && (
                          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                            {m.reference_id}
                          </div>
                        )}
                      </td>

                      {/* Reason */}
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: 220, wordBreak: 'break-word', fontSize: '0.8rem' }}>
                        {m.reason || '—'}
                      </td>

                      {/* Actor */}
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {m.actor_id === 'system' ? 'النظام' : m.actor_id || 'إدارة المتجر'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            صفحة {pagination.page || page} من {pagination.totalPages || 1} (إجمالي {pagination.total || 0} حركة)
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.8rem',
              }}
            >
              <ChevronRight size={16} />
              السابق
            </button>

            <button
              type="button"
              disabled={page >= (pagination.totalPages || 1) || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                color: page >= (pagination.totalPages || 1) ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: page >= (pagination.totalPages || 1) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.8rem',
              }}
            >
              التالي
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && (
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
              maxWidth: 520,
              backgroundColor: 'var(--bg-card)',
              borderRadius: 14,
              border: '1px solid var(--border)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              direction: 'rtl',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PlusCircle size={20} color="var(--brand-orange)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  تسوية وتعديل مخزون منتج
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAdjustSubmit} style={{ padding: 20 }}>
              {adjustSuccess && (
                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                  <CheckCircle2 size={18} />
                  {adjustSuccess}
                </div>
              )}

              {/* Product Selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  اختر المنتج *
                </label>
                <select
                  value={adjustForm.productId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="">-- اختر المنتج من القائمة --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (المتاح حالياً: {p.stock_qty ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Movement Type */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  نوع التسوية *
                </label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="ADJUSTMENT_IN">إضافة مخزون (+) - جرد أو توريد إضافي</option>
                  <option value="ADJUSTMENT_OUT">خصم مخزون (-) - تسوية أو تعديل نقص</option>
                  <option value="DAMAGE">خصم تالف (-) - بضاعة متضررة أو هالكة</option>
                  <option value="RETURN_RESTOCK">مرتجع للرصيد (+) - استرجاع بضاعة</option>
                </select>
              </div>

              {/* Quantity Delta */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  الكمية المراد تعديلها *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="مثال: 5"
                  value={adjustForm.quantityDelta}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantityDelta: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>

              {/* Reason */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  سبب التعديل / رقم المستند *
                </label>
                <textarea
                  rows="3"
                  placeholder="اكتب سبب التعديل لتسجيله في السجل التاريخي..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, var(--brand-orange), #FF8040)',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: adjustSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                  }}
                >
                  {adjustSubmitting ? 'جارِ التسجيل...' : 'تأكيد وحفظ الحركة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
